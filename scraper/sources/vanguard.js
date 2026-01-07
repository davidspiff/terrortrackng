// Vanguard RSS Feed Scraper
// Uses paginated daily RSS feeds: https://www.vanguardngr.com/YYYY/MM/DD/feed/?paged=N
// Stops when hitting 404 (no more pages)
// Pre-filters articles using security keywords before AI classification

import * as cheerio from 'cheerio';
import { isSecurityIncident } from '../keywords.js';

const BASE_URL = 'https://www.vanguardngr.com';
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
    const author = $item.find('dc\\:creator, creator').text().trim() || 'Unknown';
    
    // Get full content from content:encoded
    const contentEncoded = $item.find('content\\:encoded, encoded').text().trim();
    
    // Get description as fallback
    const description = $item.find('description').text().trim();
    
    if (title && link) {
      articles.push({
        title,
        link,
        pubDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        author,
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
  
  // Remove unwanted elements
  $('script, style, iframe, .sharedaddy, .jp-relatedposts').remove();
  
  // Get text from paragraphs
  const paragraphs = [];
  $('p').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 30 && 
        !text.includes('READ ALSO') && 
        !text.includes('Vanguard News') &&
        !text.includes('CLICK HERE')) {
      paragraphs.push(text);
    }
  });
  
  // If no paragraphs, just get all text
  if (paragraphs.length === 0) {
    return $.text().replace(/\s+/g, ' ').trim().substring(0, 2000);
  }
  
  return paragraphs.slice(0, 15).join('\n\n');
}

// Scrape all articles for a specific date using paginated RSS
export async function scrapeVanguardByDate(dateStr) {
  // dateStr format: YYYY/MM/DD
  const feedBaseUrl = `${BASE_URL}/${dateStr}/feed/`;
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

      // 404 means no more pages - this is the exit condition
      if (response.status === 404) {
        console.log(`  ✓ Finished at page ${page - 1} (no more pages)`);
        break;
      }

      if (!response.ok) {
        console.log(`  ⚠ Page ${page} returned ${response.status}, stopping`);
        break;
      }

      const xml = await response.text();
      const articles = parseRssFeed(xml);

      if (articles.length === 0) {
        console.log(`  ✓ Finished at page ${page} (empty feed)`);
        break;
      }

      // Dedupe by link
      let newCount = 0;
      for (const article of articles) {
        if (!seenLinks.has(article.link)) {
          seenLinks.add(article.link);
          allArticles.push(article);
          newCount++;
        }
      }

      console.log(`  📄 Page ${page}: ${articles.length} articles (${newCount} new)`);
      page++;

      // Be polite to the server
      await new Promise(r => setTimeout(r, 1000));

    } catch (err) {
      console.error(`  ✗ Error on page ${page}: ${err.message}`);
      break;
    }
  }

  return allArticles;
}

// Scrape articles for the last N days
export async function scrapeVanguardRecent(days = 3) {
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
    
    // Delay between days
    if (i < days - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  
  return allArticles;
}

// Pre-filter articles using keywords (fast, no AI needed)
export function filterSecurityArticles(articles) {
  return articles.filter(article => {
    const text = `${article.title} ${article.content}`.toLowerCase();
    return isSecurityIncident(text);
  });
}

// Main export - scrapes recent articles and returns in standard format
export async function scrapeVanguard() {
  console.log('🗞️  Vanguard RSS Scraper');
  
  const rawArticles = await scrapeVanguardRecent(3);
  console.log(`  📰 Total: ${rawArticles.length} articles from last 3 days`);
  
  // Convert to standard format with cleaned content
  const allArticles = rawArticles.map(article => ({
    title: article.title,
    content: cleanContent(article.content),
    url: article.link,
    date: article.pubDate,
    source: 'Vanguard',
  })).filter(a => a.content.length > 100);

  // Pre-filter using keywords - only send relevant articles to AI
  const securityArticles = filterSecurityArticles(allArticles);
  
  console.log(`  🔍 Filtered: ${securityArticles.length}/${allArticles.length} potentially security-related`);
  return securityArticles;
}
