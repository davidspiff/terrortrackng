import * as cheerio from 'cheerio';

const BASE_URL = 'https://punchng.com';

export async function scrapePunch() {
  const articles = [];
  const seenUrls = new Set();
  
  // Punch homepage and latest news have the freshest articles
  const urls = [
    BASE_URL,
    `${BASE_URL}/latest`,
  ];
  
  for (const pageUrl of urls) {
    try {
      console.log(`  Fetching ${pageUrl}...`);
      const response = await fetch(pageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) continue;

      const html = await response.text();
      const $ = cheerio.load(html);

      // Get all article links - Punch uses slug-based URLs
      $('a[href*="punchng.com/"]').each((_, el) => {
        const href = $(el).attr('href');
        // Punch articles are like punchng.com/article-slug/
        if (href && href.includes('punchng.com/') && 
            !href.includes('/category/') && 
            !href.includes('/topics/') &&
            !href.includes('/author/') &&
            !href.includes('/tag/') &&
            !href.includes('/page/') &&
            href.split('/').filter(Boolean).length >= 2) {
          seenUrls.add(href);
        }
      });

      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error(`  Error: ${err.message}`);
    }
  }

  const articleLinks = [...seenUrls];
  console.log(`  Found ${articleLinks.length} article links from Punch`);

  // Fetch articles (limit to 25)
  for (const url of articleLinks.slice(0, 25)) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      });
      if (!res.ok) continue;

      const html = await res.text();
      const $ = cheerio.load(html);

      const title = $('h1').first().text().trim();
      
      // Get article paragraphs
      const paragraphs = [];
      $('.entry-content p, .post-content p, article p').each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 30) paragraphs.push(text);
      });
      const content = paragraphs.slice(0, 10).join('\n\n');

      const dateStr = $('time').attr('datetime') || 
                     $('meta[property="article:published_time"]').attr('content') ||
                     new Date().toISOString();

      if (title && content.length > 200) {
        articles.push({ title, content, url, date: dateStr, source: 'Punch' });
      }

      await new Promise(r => setTimeout(r, 600));
    } catch (err) {
      // Skip failed articles
    }
  }

  return articles;
}
