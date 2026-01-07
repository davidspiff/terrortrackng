// Main scraper - runs every 7 hours via GitHub Actions
// Uses Google News RSS to find articles from Punch & Vanguard, then fetches full content

import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import { classifyWithChutes } from './classifier.js';
import { isDuplicate } from './deduplicator.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Search queries for Google News - focused on security incidents
const SEARCH_QUERIES = [
  'site:punchng.com killed attack Nigeria',
  'site:punchng.com bandits gunmen Nigeria',
  'site:punchng.com kidnapped abducted Nigeria',
  'site:punchng.com Boko Haram ISWAP',
  'site:vanguardngr.com killed attack Nigeria',
  'site:vanguardngr.com bandits gunmen Nigeria',
  'site:vanguardngr.com kidnapped abducted Nigeria',
  'site:vanguardngr.com Boko Haram ISWAP',
];

// Fetch articles from Google News RSS
async function fetchGoogleNews(query) {
  // Get articles from last 3 days
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const dateStr = threeDaysAgo.toISOString().split('T')[0];
  
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}+after:${dateStr}&hl=en-NG&gl=NG&ceid=NG:en`;
  
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    
    if (!response.ok) return [];
    
    const xml = await response.text();
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    
    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];
      const title = itemXml.match(/<title>(.*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/, '$1') || '';
      const link = itemXml.match(/<link>(.*?)<\/link>/)?.[1] || '';
      const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
      
      // Extract actual source URL from Google redirect
      let sourceUrl = link;
      if (link.includes('news.google.com')) {
        // Google News links redirect - we'll resolve them later
        sourceUrl = link;
      }
      
      items.push({
        title: title.trim(),
        url: sourceUrl,
        date: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      });
    }
    
    return items;
  } catch (err) {
    console.error(`  Error searching "${query}":`, err.message);
    return [];
  }
}

// Fetch full article content from Punch
async function fetchPunchArticle(url) {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      redirect: 'follow',
    });
    
    if (!response.ok) return null;
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const title = $('h1').first().text().trim();
    const paragraphs = [];
    $('.entry-content p, .post-content p, article p').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 30 && !text.includes('PUNCH') && !text.includes('READ ALSO')) {
        paragraphs.push(text);
      }
    });
    
    return {
      title,
      content: paragraphs.slice(0, 15).join('\n\n'),
    };
  } catch (err) {
    return null;
  }
}

// Fetch full article content from Vanguard
async function fetchVanguardArticle(url) {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      redirect: 'follow',
    });
    
    if (!response.ok) return null;
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const title = $('h1.entry-title, h1').first().text().trim();
    const paragraphs = [];
    $('.entry-content p, article p').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 30 && !text.includes('Vanguard') && !text.includes('READ ALSO')) {
        paragraphs.push(text);
      }
    });
    
    return {
      title,
      content: paragraphs.slice(0, 15).join('\n\n'),
    };
  } catch (err) {
    return null;
  }
}

// Resolve Google News redirect URL to actual article URL
async function resolveGoogleUrl(googleUrl) {
  try {
    // Google News URLs contain the actual URL encoded in the path
    // Format: https://news.google.com/rss/articles/CBMi...
    // We need to follow the redirect
    
    const response = await fetch(googleUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
      redirect: 'follow',
    });
    
    // The final URL after redirects is the actual article
    const finalUrl = response.url;
    
    if (finalUrl.includes('punchng.com') || finalUrl.includes('vanguardngr.com')) {
      return finalUrl;
    }
    
    // If still on Google, try to extract from page content
    const html = await response.text();
    
    // Look for the actual article URL in the page
    const punchMatch = html.match(/https:\/\/punchng\.com\/[^"'\s<>]+/);
    if (punchMatch) return punchMatch[0];
    
    const vanguardMatch = html.match(/https:\/\/www\.vanguardngr\.com\/[^"'\s<>]+/);
    if (vanguardMatch) return vanguardMatch[0];
    
    return null;
  } catch (err) {
    return null;
  }
}

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
    console.error(`  ✗ DB Error: ${error.message}`);
    return { saved: false, reason: 'db_error' };
  }
  
  console.log(`  ✓ Saved: ${incident.title.substring(0, 60)}...`);
  return { saved: true };
}

async function main() {
  console.log('='.repeat(60));
  console.log('SENTINEL-NG SCRAPER (Punch + Vanguard via Google News)');
  console.log('Started:', new Date().toISOString());
  console.log('='.repeat(60));
  
  // Get recent incidents for duplicate checking
  console.log('\n📊 Fetching recent incidents...');
  const existingIncidents = await getRecentIncidents(7);
  console.log(`   Found ${existingIncidents.length} incidents from last 7 days\n`);
  
  // Step 1: Search Google News for articles from Punch & Vanguard
  console.log('🔍 Searching Google News for Punch & Vanguard articles...');
  const allArticles = new Map(); // Use Map to dedupe by URL
  
  for (const query of SEARCH_QUERIES) {
    const articles = await fetchGoogleNews(query);
    console.log(`   "${query.substring(0, 40)}...": ${articles.length} results`);
    
    for (const article of articles) {
      if (!allArticles.has(article.url)) {
        allArticles.set(article.url, article);
      }
    }
    
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log(`\n📰 Found ${allArticles.size} unique articles\n`);
  
  // Step 2: Fetch full content and process
  console.log('🤖 Fetching full articles and classifying...\n');
  
  let stats = { processed: 0, saved: 0, duplicates: 0, errors: 0, skipped: 0 };
  const articles = [...allArticles.values()];
  
  for (const article of articles) {
    stats.processed++;
    console.log(`[${stats.processed}/${articles.length}] ${article.title.substring(0, 55)}...`);
    
    try {
      // Resolve Google redirect URL
      let realUrl = article.url;
      if (article.url.includes('news.google.com')) {
        realUrl = await resolveGoogleUrl(article.url);
        await new Promise(r => setTimeout(r, 300));
      }
      
      // Determine source and fetch full content
      let fullArticle = null;
      let source = 'Unknown';
      
      if (realUrl.includes('punchng.com')) {
        source = 'Punch';
        fullArticle = await fetchPunchArticle(realUrl);
      } else if (realUrl.includes('vanguardngr.com')) {
        source = 'Vanguard';
        fullArticle = await fetchVanguardArticle(realUrl);
      }
      
      if (!fullArticle || !fullArticle.content || fullArticle.content.length < 100) {
        console.log(`  ⏭ Could not fetch article content`);
        stats.skipped++;
        continue;
      }
      
      // Classify with AI
      const incident = await classifyWithChutes({
        title: fullArticle.title || article.title,
        content: fullArticle.content,
        url: realUrl,
        date: article.date,
        source,
      });
      
      if (!incident) {
        stats.skipped++;
        continue;
      }
      
      // Save to database
      const result = await saveIncident({
        ...incident,
        source_url: realUrl,
        sources: [source],
      }, existingIncidents);
      
      if (result.saved) {
        stats.saved++;
        existingIncidents.push(incident);
      } else if (result.reason?.includes('duplicate') || result.reason?.includes('fingerprint')) {
        stats.duplicates++;
      } else {
        stats.errors++;
      }
      
    } catch (err) {
      stats.errors++;
      console.log(`  ✗ Error: ${err.message}`);
    }
    
    // Rate limiting
    await new Promise(r => setTimeout(r, 2000));
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SCRAPE COMPLETE');
  console.log('='.repeat(60));
  console.log(`📊 Articles processed: ${stats.processed}`);
  console.log(`✓  New incidents saved: ${stats.saved}`);
  console.log(`⏭  Duplicates skipped: ${stats.duplicates}`);
  console.log(`⊘  Non-incidents skipped: ${stats.skipped}`);
  console.log(`✗  Errors: ${stats.errors}`);
}

main().catch(console.error);
