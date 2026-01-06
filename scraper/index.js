// Main scraper - runs every 7 hours via GitHub Actions
// Smart deduplication to avoid duplicate incidents

import { createClient } from '@supabase/supabase-js';
import { scrapePunch } from './sources/punch.js';
import { scrapeVanguard } from './sources/vanguard.js';
import { classifyWithChutes } from './classifier.js';
import { isSecurityIncident } from './keywords.js';
import { deduplicateArticles, isDuplicate } from './deduplicator.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getRecentIncidents(days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const { data, error } = await supabase
    .from('incidents')
    .select('id, title, date, state, fatalities, kidnapped, injuries')
    .gte('date', since.toISOString())
    .order('date', { ascending: false });
  
  if (error) {
    console.error('Error fetching recent incidents:', error.message);
    return [];
  }
  
  return data || [];
}

async function saveIncident(incident, existingIncidents) {
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
  console.log('='.repeat(60));
  console.log('SENTINEL-NG SCRAPER');
  console.log('Started:', new Date().toISOString());
  console.log('='.repeat(60));
  
  // Get recent incidents for duplicate checking
  console.log('\n📊 Fetching recent incidents...');
  const existingIncidents = await getRecentIncidents(7);
  console.log(`   Found ${existingIncidents.length} incidents from last 7 days\n`);
  
  const sources = [
    { name: 'Punch', scraper: scrapePunch },
    { name: 'Vanguard', scraper: scrapeVanguard },
  ];

  let allArticles = [];
  
  // Scrape all sources
  for (const source of sources) {
    console.log(`🔍 Scraping ${source.name}...`);
    
    try {
      const articles = await source.scraper();
      // Filter to security-related only
      const securityArticles = articles.filter(a => isSecurityIncident(a.title + ' ' + a.content));
      console.log(`   Found ${securityArticles.length} security articles (${articles.length} total)`);
      allArticles.push(...securityArticles.map(a => ({ ...a, source: source.name })));
    } catch (err) {
      console.error(`   Error: ${err.message}`);
    }
  }
  
  // Deduplicate before AI processing
  console.log(`\n📰 Total articles: ${allArticles.length}`);
  const dedupedArticles = deduplicateArticles(allArticles);
  console.log(`   After dedup: ${dedupedArticles.length}`);
  console.log(`   → Saved ${allArticles.length - dedupedArticles.length} API calls!\n`);
  
  // Process with AI
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
    
    await new Promise(r => setTimeout(r, 1500));
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SCRAPE COMPLETE');
  console.log('='.repeat(60));
  console.log(`📊 Articles processed: ${stats.processed}`);
  console.log(`✓  New incidents saved: ${stats.saved}`);
  console.log(`⏭  Duplicates skipped: ${stats.duplicates}`);
  console.log(`⊘  Non-security skipped: ${stats.skipped}`);
  console.log(`✗  Errors: ${stats.errors}`);
}

main().catch(console.error);
