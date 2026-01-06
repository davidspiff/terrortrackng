// Delete junk articles: rescues, arrests, condemnations, 0/0/0 incidents

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Fetching all incidents...\n');
  
  const { data: incidents, error } = await supabase
    .from('incidents')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error:', error.message);
    return;
  }
  
  const toDelete = [];
  
  for (const inc of incidents) {
    const title = (inc.title || '').toLowerCase();
    const desc = (inc.description || '').toLowerCase();
    const text = title + ' ' + desc;
    
    // Check for 0/0/0
    if (inc.fatalities === 0 && inc.injuries === 0 && inc.kidnapped === 0) {
      toDelete.push({ id: inc.id, reason: '0/0/0', title: inc.title });
      continue;
    }
    
    // Check for rescue/release articles
    if ((title.includes('freed') || title.includes('released') || title.includes('rescue') || title.includes('regain freedom') || title.includes('now free')) &&
        !title.includes('kill') && !title.includes('attack')) {
      toDelete.push({ id: inc.id, reason: 'rescue/release', title: inc.title });
      continue;
    }
    
    // Check for arrest articles
    if ((title.includes('arrest') || title.includes('nabbed') || title.includes('apprehend')) &&
        !title.includes('kill') && !title.includes('attack')) {
      toDelete.push({ id: inc.id, reason: 'arrest', title: inc.title });
      continue;
    }
    
    // Check for condemnation/reaction articles
    if (title.includes('condemn') || title.includes('decry') || title.includes('lament') || 
        title.includes('react to') || title.includes('response to') || title.includes('vow to')) {
      toDelete.push({ id: inc.id, reason: 'condemnation/reaction', title: inc.title });
      continue;
    }
    
    // Check for analysis/opinion
    if (title.includes('analysis:') || title.includes('opinion:') || title.includes('why ') || 
        title.includes('how ') || title.includes('creating ')) {
      toDelete.push({ id: inc.id, reason: 'analysis/opinion', title: inc.title });
      continue;
    }
  }
  
  console.log(`Found ${toDelete.length} junk articles to delete:\n`);
  
  toDelete.forEach(item => {
    console.log(`[${item.reason}] ${item.title.substring(0, 70)}...`);
  });
  
  if (toDelete.length > 0) {
    console.log(`\nDeleting...`);
    
    const { error: deleteError } = await supabase
      .from('incidents')
      .delete()
      .in('id', toDelete.map(i => i.id));
    
    if (deleteError) {
      console.error('Delete error:', deleteError.message);
    } else {
      console.log(`✓ Deleted ${toDelete.length} junk articles`);
    }
  }
}

main().catch(console.error);
