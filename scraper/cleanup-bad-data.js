// Clean up bad data: HTML in summaries, wrong classifications, etc.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function cleanHtml(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  console.log('Fetching incidents with potential issues...\n');
  
  const { data: incidents, error } = await supabase
    .from('incidents')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error:', error.message);
    return;
  }
  
  console.log(`Found ${incidents.length} total incidents\n`);
  
  let cleaned = 0;
  let deleted = 0;
  
  for (const inc of incidents) {
    const issues = [];
    const updates = {};
    
    // Check for HTML in description
    if (inc.description && (inc.description.includes('<') || inc.description.includes('http'))) {
      const cleanDesc = cleanHtml(inc.description);
      if (cleanDesc !== inc.description) {
        updates.description = cleanDesc || 'No description available';
        issues.push('HTML in description');
      }
    }
    
    // Check for HTML in title
    if (inc.title && (inc.title.includes('<') || inc.title.includes('&lt;'))) {
      const cleanTitle = cleanHtml(inc.title);
      if (cleanTitle !== inc.title) {
        updates.title = cleanTitle;
        issues.push('HTML in title');
      }
    }
    
    // Check for "released" incidents that shouldn't be logged
    const titleLower = (inc.title || '').toLowerCase();
    const descLower = (inc.description || '').toLowerCase();
    const isRelease = (titleLower.includes('released') || titleLower.includes('freed') || titleLower.includes('regain freedom')) &&
                      !titleLower.includes('killed') && !titleLower.includes('attack');
    
    if (isRelease && inc.kidnapped > 0) {
      // This is a release article incorrectly logged as kidnapping
      console.log(`Deleting release article: ${inc.title.substring(0, 50)}...`);
      await supabase.from('incidents').delete().eq('id', inc.id);
      deleted++;
      continue;
    }
    
    // Check for empty/garbage descriptions
    if (!inc.description || inc.description.length < 10 || inc.description.startsWith('http')) {
      updates.description = `Security incident in ${inc.state || 'Nigeria'}. ${inc.fatalities > 0 ? inc.fatalities + ' killed. ' : ''}${inc.kidnapped > 0 ? inc.kidnapped + ' abducted. ' : ''}${inc.injuries > 0 ? inc.injuries + ' injured.' : ''}`.trim();
      issues.push('Bad description');
    }
    
    // Apply updates
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('incidents')
        .update(updates)
        .eq('id', inc.id);
      
      if (updateError) {
        console.error(`Failed to update ${inc.id}:`, updateError.message);
      } else {
        console.log(`Cleaned: ${inc.title.substring(0, 50)}... (${issues.join(', ')})`);
        cleaned++;
      }
    }
  }
  
  console.log(`\n========================================`);
  console.log(`Cleanup complete!`);
  console.log(`Records cleaned: ${cleaned}`);
  console.log(`Records deleted: ${deleted}`);
}

main().catch(console.error);
