// Test script for new Vanguard RSS scraper
// Deletes last 20 days of data, then scrapes and imports fresh
// Uses keyword pre-filtering to reduce AI API calls

import { createClient } from '@supabase/supabase-js';
import { scrapeVanguardByDate, filterSecurityArticles } from './sources/vanguard.js';
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

async function deleteRecentData(days = 20) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  console.log(`🗑️  Deleting incidents from last ${days} days (since ${cutoffDate.toISOString().split('T')[0]})...`);
  
  const { data, error, count } = await supabase
    .from('incidents')
    .delete()
    .gte('date', cutoffDate.toISOString())
    .select('id', { count: 'exact' });
  
  if (error) {
    console.error('Delete error:', error.message);
    return 0;
  }
  
  const deleted = data?.length || count || 0;
  console.log(`✓ Deleted ${deleted} incidents\n`);
  return deleted;
}

async function getRecentIncidents(days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const { data, error } = await supabase
    .from('incidents')
    .select('id, title, date, state, fatalities, kidnapped, injuries')
    .gte('date', since.toISOString())
    .order('date', { ascending: false });
  
  if (error) {
    console.error('Error fetching incidents:', error.message);
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
  console.log('VANGUARD RSS SCRAPER TEST');
  console.log('Started:', new Date().toISOString());
  console.log('='.repeat(60));
  
  // Step 1: Delete last 20 days of data
  await deleteRecentData(20);
  
  // Step 2: Scrape Vanguard RSS feeds for last 20 days
  console.log('📰 Scraping Vanguard RSS feeds for last 20 days...\n');
  
  const allArticles = [];
  for (let i = 0; i < 20; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}/${month}/${day}`;
    
    const articles = await scrapeVanguardByDate(dateStr);
    allArticles.push(...articles);
    
    // Delay between days
    await new Promise(r => setTimeout(r, 1500));
  }
  
  console.log(`\n📊 Total articles scraped: ${allArticles.length}`);
  
  // Pre-filter using keywords - dramatically reduces AI calls
  const securityArticles = allArticles.filter(article => {
    const text = `${article.title} ${article.content}`;
    return isSecurityIncident(text);
  });
  
  console.log(`🔍 Security-related articles: ${securityArticles.length} (filtered from ${allArticles.length})\n`);
  
  // Step 3: Get existing incidents for dedup
  const existingIncidents = await getRecentIncidents(30);
  console.log(`📋 Existing incidents in DB: ${existingIncidents.length}\n`);
  
  // Step 4: Classify and save (only filtered articles)
  console.log('🤖 Classifying security articles...\n');
  
  let stats = { processed: 0, saved: 0, duplicates: 0, skipped: 0, errors: 0 };
  
  for (const article of securityArticles) {
    stats.processed++;
    
    // Skip if content too short
    if (!article.content || article.content.length < 100) {
      stats.skipped++;
      continue;
    }
    
    console.log(`[${stats.processed}/${securityArticles.length}] ${article.title.substring(0, 55)}...`);
    
    try {
      // Clean content for classification
      const cleanContent = article.content
        .replace(/<[^>]*>/g, '')
        .replace(/&[a-z]+;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      const incident = await classifyWithChutes({
        title: article.title,
        content: cleanContent,
        url: article.link,
        date: article.pubDate,
        source: 'Vanguard',
      });
      
      if (!incident) {
        stats.skipped++;
        continue;
      }
      
      const result = await saveIncident({
        ...incident,
        source_url: article.link,
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
  console.log('TEST COMPLETE');
  console.log('='.repeat(60));
  console.log(`📰 Articles scraped: ${allArticles.length}`);
  console.log(`📊 Articles processed: ${stats.processed}`);
  console.log(`✓  Incidents saved: ${stats.saved}`);
  console.log(`⏭  Duplicates: ${stats.duplicates}`);
  console.log(`⊘  Non-incidents: ${stats.skipped}`);
  console.log(`✗  Errors: ${stats.errors}`);
}

main().catch(console.error);
