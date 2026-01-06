import { createClient } from '@supabase/supabase-js';
import { scrapePunch } from './sources/punch.js';
import { scrapeVanguard } from './sources/vanguard.js';
import { classifyWithChutes } from './classifier.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicate(title, date) {
  const { data } = await supabase
    .from('incidents')
    .select('id')
    .ilike('title', `%${title.substring(0, 50)}%`)
    .gte('date', new Date(new Date(date).getTime() - 86400000 * 3).toISOString())
    .lte('date', new Date(new Date(date).getTime() + 86400000 * 3).toISOString())
    .limit(1);

  return data && data.length > 0;
}

async function saveIncident(incident) {
  const isDuplicate = await checkDuplicate(incident.title, incident.date);
  
  if (isDuplicate) {
    console.log(`Skipping duplicate: ${incident.title.substring(0, 50)}...`);
    return false;
  }

  const { error } = await supabase.from('incidents').insert(incident);
  
  if (error) {
    console.error(`Failed to save: ${incident.title}`, error.message);
    return false;
  }
  
  console.log(`Saved: ${incident.title.substring(0, 50)}...`);
  return true;
}

async function main() {
  console.log('Starting news scrape at', new Date().toISOString());
  
  const sources = [
    { name: 'Punch', scraper: scrapePunch },
    { name: 'Vanguard', scraper: scrapeVanguard },
  ];

  let totalScraped = 0;
  let totalSaved = 0;

  for (const source of sources) {
    console.log(`\nScraping ${source.name}...`);
    
    try {
      const articles = await source.scraper();
      console.log(`Found ${articles.length} articles from ${source.name}`);
      
      for (const article of articles) {
        totalScraped++;
        
        // Use Chutes AI to classify and extract incident data
        const incident = await classifyWithChutes(article);
        
        if (incident) {
          const saved = await saveIncident({
            ...incident,
            sources: [source.name],
          });
          if (saved) totalSaved++;
        }
        
        // Rate limiting
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (err) {
      console.error(`Error scraping ${source.name}:`, err.message);
    }
  }

  console.log(`\nScrape complete!`);
  console.log(`Total articles scraped: ${totalScraped}`);
  console.log(`New incidents saved: ${totalSaved}`);
}

main().catch(console.error);
