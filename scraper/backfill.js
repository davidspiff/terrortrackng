// Smart backfill script - fetches news from Dec 21, 2025 to today
// With deduplication BEFORE AI calls to save API usage

import { createClient } from '@supabase/supabase-js';
import { classifyWithChutes } from './classifier.js';
import { isSecurityIncident } from './keywords.js';
import { deduplicateArticles, isDuplicate, titleSimilarity } from './deduplicator.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Focused search queries - fewer, more specific
const SEARCH_QUERIES = [
  'Nigeria+bandit+attack+killed',
  'Nigeria+boko+haram+attack',
  'Nigeria+kidnapping+abducted',
  'Nigeria+gunmen+killed',
  'ISWAP+attack+Nigeria',
  'Zamfara+Kaduna+bandit',
  'Borno+terrorist+attack',
];

async function fetchGoogleNews(query, afterDate) {
  const dateStr = afterDate.toISOString().split('T')[0];
  const url = `https://news.google.com/rss/search?q=${query}+after:${dateStr}&hl=en-NG&gl=NG&ceid=NG:en`;
  
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const xml = await response.text();
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    
    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];
      const title = itemXml.match(/<title>(.*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/, '$1') || '';
      const link = itemXml.match(/<link>(.*?)<\/link>/)?.[1] || '';
      const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
      const description = itemXml.match(/<description>(.*?)<\/description>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/, '$1')?.replace(/<[^>]*>/g, '') || '';
      
      if (title && isSecurityIncident(title + ' ' + description)) {
        items.push({
          title: title.trim(),
          content: description.trim(),
          url: link,
          date: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          source: 'Google News',
        });
      }
    }
    
    return items;
  } catch (err) {
    console.error(`Error fetching "${query}":`, err.message);
    return [];
  }
}

async function getExistingIncidents(afterDate) {
  const { data, error } = await supabase
    .from('incidents')
    .select('id, title, date, state, fatalities, kidnapped, injuries')
    .gte('date', afterDate.toISOString())
    .order('date', { ascending: false });
  
  if (error) {
    console.error('Error fetching existing incidents:', error.message);
    return [];
  }
  
  return data || [];
}

async function saveIncident(incident, existingIncidents) {
  // Smart duplicate check
  const dupeCheck = isDuplicate(incident, existingIncidents);
  
  if (dupeCheck.isDupe) {
    console.log(`  ⏭ Duplicate (${dupeCheck.reason}): ${incident.title.substring(0, 50)}...`);
    return { saved: false, reason: dupeCheck.reason };
  }

  const { error } = await supabase.from('incidents').insert(incident);
  
  if (error) {
    console.error(`  ✗ Failed: ${error.message}`);
    return { saved: false, reason: 'db_error' };
  }
  
  console.log(`  ✓ Saved: ${incident.title.substring(0, 60)}...`);
  return { saved: true };
}

async function main() {
  const afterDate = new Date('2025-12-20');
  
  console.log('='.repeat(60));
  console.log('SMART BACKFILL - Dec 21, 2025 to today');
  console.log('='.repeat(60));
  
  // Step 1: Fetch existing incidents to check against
  console.log('\n📊 Fetching existing incidents from database...');
  const existingIncidents = await getExistingIncidents(afterDate);
  console.log(`   Found ${existingIncidents.length} existing incidents\n`);
  
  // Step 2: Gather all articles
  console.log('🔍 Searching news sources...');
  let allArticles = [];
  
  for (const query of SEARCH_QUERIES) {
    const articles = await fetchGoogleNews(query, afterDate);
    console.log(`   ${query}: ${articles.length} articles`);
    allArticles.push(...articles);
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Step 3: Deduplicate articles BEFORE AI processing
  console.log(`\n📰 Total raw articles: ${allArticles.length}`);
  
  // Remove exact URL duplicates first
  const uniqueByUrl = [...new Map(allArticles.map(a => [a.url, a])).values()];
  console.log(`   After URL dedup: ${uniqueByUrl.length}`);
  
  // Smart title-based deduplication
  const dedupedArticles = deduplicateArticles(uniqueByUrl);
  console.log(`   After smart dedup: ${dedupedArticles.length}`);
  console.log(`   → Saved ${allArticles.length - dedupedArticles.length} API calls!\n`);
  
  // Step 4: Process with AI
  console.log('🤖 Processing with AI...\n');
  
  let stats = { processed: 0, saved: 0, duplicates: 0, errors: 0, skipped: 0 };
  
  for (const article of dedupedArticles) {
    stats.processed++;
    console.log(`[${stats.processed}/${dedupedArticles.length}] ${article.title.substring(0, 55)}...`);
    
    try {
      const incident = await classifyWithChutes(article);
      
      if (!incident) {
        stats.skipped++;
        console.log('  ⏭ Not a security incident');
        continue;
      }
      
      const result = await saveIncident({
        ...incident,
        source_url: article.url,
        sources: [article.source],
      }, existingIncidents);
      
      if (result.saved) {
        stats.saved++;
        // Add to existing list to catch duplicates within this batch
        existingIncidents.push(incident);
      } else if (result.reason?.includes('duplicate') || result.reason?.includes('similarity') || result.reason?.includes('fingerprint') || result.reason?.includes('casualty')) {
        stats.duplicates++;
      } else {
        stats.errors++;
      }
      
    } catch (err) {
      stats.errors++;
      console.log(`  ✗ Error: ${err.message}`);
    }
    
    // Rate limiting
    await new Promise(r => setTimeout(r, 1500));
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('BACKFILL COMPLETE');
  console.log('='.repeat(60));
  console.log(`📊 Articles processed: ${stats.processed}`);
  console.log(`✓  New incidents saved: ${stats.saved}`);
  console.log(`⏭  Duplicates skipped: ${stats.duplicates}`);
  console.log(`⊘  Non-security skipped: ${stats.skipped}`);
  console.log(`✗  Errors: ${stats.errors}`);
  console.log(`💰 API calls made: ${stats.processed} (saved ${allArticles.length - dedupedArticles.length} calls)`);
}

main().catch(console.error);
