import * as cheerio from 'cheerio';

const BASE_URL = 'https://www.vanguardngr.com';
const NEWS_URL = `${BASE_URL}/category/news/`;

export async function scrapeVanguard() {
  const articles = [];
  
  try {
    const response = await fetch(NEWS_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Find article links
    const articleLinks = [];
    $('article a, .entry-title a, h2 a, h3 a').each((_, el) => {
      const href = $(el).attr('href');
      if (href && href.includes('vanguardngr.com') && !articleLinks.includes(href)) {
        articleLinks.push(href);
      }
    });

    console.log(`Found ${articleLinks.length} article links from Vanguard`);

    // Fetch each article (limit to 20)
    for (const url of articleLinks.slice(0, 20)) {
      try {
        const articleResponse = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        if (!articleResponse.ok) continue;

        const articleHtml = await articleResponse.text();
        const $article = cheerio.load(articleHtml);

        const title = $article('h1.entry-title, h1').first().text().trim();
        const content = $article('.entry-content p, article p')
          .map((_, el) => $article(el).text())
          .get()
          .join(' ')
          .substring(0, 2000);

        const dateStr = $article('time').attr('datetime') || 
                       $article('.entry-date').text() ||
                       new Date().toISOString();

        if (title && content) {
          articles.push({
            title,
            content,
            url,
            date: dateStr,
            source: 'Vanguard',
          });
        }

        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        console.error(`Error fetching article: ${url}`, err.message);
      }
    }
  } catch (err) {
    console.error('Error scraping Vanguard:', err.message);
  }

  return articles;
}
