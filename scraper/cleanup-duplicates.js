// One-time script to clean up duplicate incidents from the database

import { createClient } from '@supabase/supabase-js';
import { titleSimilarity } from './deduplicator.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Fetching all incidents...');
  
  const { data: incidents, error } = await supabase
    .from('incidents')
    .select('*')
    .order('date', { ascending: false });
  
  if (error) {
    console.error('Error:', error.message);
    return;
  }
  
  console.log(`Found ${incidents.length} total incidents`);
  
  const duplicateIds = new Set();
  const kept = [];
  
  for (const incident of incidents) {
    if (duplicateIds.has(incident.id)) continue;
    
    // Check if this is a duplicate of something we're keeping
    let isDupe = false;
    
    for (const keptIncident of kept) {
      // Same date (within 2 days)?
      const daysDiff = Math.abs(new Date(incident.date) - new Date(keptIncident.date)) / (1000 * 60 * 60 * 24);
      
      if (daysDiff <= 2) {
        // Same state?
        if ((incident.state || '').toLowerCase() === (keptIncident.state || '').toLowerCase()) {
          // Similar title?
          const similarity = titleSimilarity(incident.title, keptIncident.title);
          
          if (similarity >= 0.4) {
            duplicateIds.add(incident.id);
            isDupe = true;
            console.log(`Duplicate: "${incident.title.substring(0, 50)}..." ~ "${keptIncident.title.substring(0, 50)}..."`);
            break;
          }
          
          // Same casualties?
          if (incident.fatalities === keptIncident.fatalities && 
              incident.kidnapped === keptIncident.kidnapped &&
              incident.fatalities + incident.kidnapped > 0) {
            duplicateIds.add(incident.id);
            isDupe = true;
            console.log(`Duplicate (casualties): "${incident.title.substring(0, 50)}..."`);
            break;
          }
        }
      }
    }
    
    if (!isDupe) {
      kept.push(incident);
    }
  }
  
  console.log(`\nFound ${duplicateIds.size} duplicates to remove`);
  console.log(`Keeping ${kept.length} unique incidents`);
  
  if (duplicateIds.size > 0) {
    console.log('\nDeleting duplicates...');
    
    const { error: deleteError } = await supabase
      .from('incidents')
      .delete()
      .in('id', [...duplicateIds]);
    
    if (deleteError) {
      console.error('Delete error:', deleteError.message);
    } else {
      console.log(`✓ Deleted ${duplicateIds.size} duplicate incidents`);
    }
  }
}

main().catch(console.error);
