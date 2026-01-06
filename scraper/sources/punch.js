import * as cheerio from 'cheerio';

const BASE_URL = 'https://punchng.com';
const SECURITY_URL = `${BASE_URL}/topics/security/`;

export async function scrapePunch() {
  const articles = [];
  
  try {
    // Fetch security news page
    const response = await fetch(SECURITY_URL, {
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
    $('article a, .post-title a, h2 a, h3 a').each((_, el) => {
      const href = $(el).attr('href');
      if (href && href.includes('punchng.com') && !articleLinks.includes(href)) {
        articleLinks.push(href);
      }
    });

    console.log(`Found ${articleLinks.length} article links from Punch`);

    // Fetch each article (limit to 20 to avoid rate limiting)
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

        const title = $article('h1').first().text().trim();
        const content = $article('.post-content p, article p, .entry-content p')
          .map((_, el) => $article(el).text())
          .get()
          .join(' ')
          .substring(0, 2000);

        const dateStr = $article('time').attr('datetime') || 
                       $article('.post-date').text() ||
                       new Date().toISOString();

        if (title && content) {
          articles.push({
            title,
            content,
            url,
            date: dateStr,
            source: 'Punch',
          });
        }

        // Rate limiting
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        console.error(`Error fetching article: ${url}`, err.message);
      }
    }
  } catch (err) {
    console.error('Error scraping Punch:', err.message);
  }

  return articles;
}
