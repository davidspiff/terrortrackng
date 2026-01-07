// Main scraper - runs every 7 hours via GitHub Actions
// Uses Vanguard RSS feeds with keyword pre-filtering for efficiency

import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import { classifyWithChutes } from './classifier.js';
import { isDuplicate } from './deduplicator.js';
import { isSecurityIncident } from './keywords.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// Parse RSS XML and extract articles
function parseRssFeed(xml) {
  const articles = [];
  const $ = cheerio.load(xml, { xmlMode: true });

  $('item').each((_, item) => {
    const $item = $(item);
    
    const title = $item.find('title').text().trim();
    const link = $item.find('link').text().trim();
    const pubDate = $item.find('pubDate').text().trim();
    const contentEncoded = $item.find('content\\:encoded, encoded').text().trim();
    const description = $item.find('description').text().trim();
    
    if (title && link) {
      articles.push({
        title,
        link,
        pubDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        content: contentEncoded || description || '',
      });
    }
  });

  return articles;
}

// Clean HTML from content
function cleanContent(html) {
  if (!html) return '';
  const $ = cheerio.load(html);
  $('script, style, iframe, .sharedaddy, .jp-relatedposts').remove();
  
  const paragraphs = [];
  $('p').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 30 && !text.includes('READ ALSO') && !text.includes('Vanguard News')) {
      paragraphs.push(text);
    }
  });
  
  if (paragraphs.length === 0) {
    return $.text().replace(/\s+/g, ' ').trim().substring(0, 2000);
  }
  
  return paragraphs.slice(0, 15).join('\n\n');
}

// Scrape Vanguard RSS for a specific date
async function scrapeVanguardByDate(dateStr) {
  const feedBaseUrl = `https://www.vanguardngr.com/${dateStr}/feed/`;
  const allArticles = [];
  const seenLinks = new Set();
  let page = 1;

  console.log(`  📅 Scraping Vanguard for ${dateStr}...`);

  while (true) {
    const feedUrl = page === 1 ? feedBaseUrl : `${feedBaseUrl}?paged=${page}`;
    
    try {
      const response = await fetch(feedUrl, {
        headers: { 'User-Agent': USER_AGENT },
      });

      if (response.status === 404) {
        console.log(`  ✓ Finished at page ${page - 1}`);
        break;
      }

      if (!response.ok) {
        console.log(`  ⚠ Page ${page} returned ${response.status}`);
        break;
      }

      const xml = await response.text();
      const articles = parseRssFeed(xml);

      if (articles.length === 0) {
        console.log(`  ✓ Finished at page ${page} (empty)`);
        break;
      }

      let newCount = 0;
      for (const article of articles) {
        if (!seenLinks.has(article.link)) {
          seenLinks.add(article.link);
          allArticles.push(article);
          newCount++;
        }
      }

      console.log(`  📄 Page ${page}: ${newCount} new articles`);
      page++;

      await new Promise(r => setTimeout(r, 1000));

    } catch (err) {
      console.error(`  ✗ Error on page ${page}: ${err.message}`);
      break;
    }
  }

  return allArticles;
}

// Scrape last N days
async function scrapeVanguardRecent(days = 1) {
  const allArticles = [];
  
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}/${month}/${day}`;
    
    const articles = await scrapeVanguardByDate(dateStr);
    allArticles.push(...articles);
    
    if (i < days - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  
  return allArticles;
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
  console.log('SENTINEL-NG SCRAPER (Vanguard RSS + Keyword Filter)');
  console.log('Started:', new Date().toISOString());
  console.log('='.repeat(60));
  
  // Get recent incidents for duplicate checking
  console.log('\n📊 Fetching recent incidents...');
  const existingIncidents = await getRecentIncidents(7);
  console.log(`   Found ${existingIncidents.length} incidents from last 7 days\n`);
  
  // Step 1: Scrape Vanguard RSS for last 2 days (covers 7-hour gap with buffer)
  console.log('📰 Scraping Vanguard RSS feeds...');
  const rawArticles = await scrapeVanguardRecent(2);
  
  // Convert to standard format
  const allArticles = rawArticles.map(article => ({
    title: article.title,
    content: cleanContent(article.content),
    url: article.link,
    date: article.pubDate,
    source: 'Vanguard',
  })).filter(a => a.content.length > 100);

  console.log(`\n📊 Total articles: ${allArticles.length}`);
  
  // Step 2: Pre-filter using keywords
  const securityArticles = allArticles.filter(article => {
    const text = `${article.title} ${article.content}`;
    return isSecurityIncident(text);
  });
  
  console.log(`🔍 Security-related: ${securityArticles.length} (filtered from ${allArticles.length})\n`);
  
  // Step 3: Classify and save
  console.log('🤖 Classifying articles...\n');
  
  let stats = { processed: 0, saved: 0, duplicates: 0, skipped: 0, errors: 0 };
  
  for (const article of securityArticles) {
    stats.processed++;
    console.log(`[${stats.processed}/${securityArticles.length}] ${article.title.substring(0, 55)}...`);
    
    try {
      const incident = await classifyWithChutes({
        title: article.title,
        content: article.content,
        url: article.url,
        date: article.date,
        source: 'Vanguard',
      });
      
      if (!incident) {
        stats.skipped++;
        continue;
      }
      
      const result = await saveIncident({
        ...incident,
        source_url: article.url,
        sources: ['Vanguard'],
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
    
    // Rate limiting for AI API
    await new Promise(r => setTimeout(r, 2000));
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SCRAPE COMPLETE');
  console.log('='.repeat(60));
  console.log(`📰 Articles scraped: ${allArticles.length}`);
  console.log(`🔍 Security filtered: ${securityArticles.length}`);
  console.log(`✓  New incidents saved: ${stats.saved}`);
  console.log(`⏭  Duplicates skipped: ${stats.duplicates}`);
  console.log(`⊘  Non-incidents skipped: ${stats.skipped}`);
  console.log(`✗  Errors: ${stats.errors}`);
}

main().catch(console.error);
