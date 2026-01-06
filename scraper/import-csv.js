import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Nigerian state coordinates (approximate centers)
const STATE_COORDS = {
  'Abia': { lat: 5.4527, lng: 7.5248 },
  'Adamawa': { lat: 9.3265, lng: 12.3984 },
  'Akwa Ibom': { lat: 5.0377, lng: 7.9128 },
  'Anambra': { lat: 6.2209, lng: 6.9370 },
  'Bauchi': { lat: 10.3158, lng: 9.8442 },
  'Bayelsa': { lat: 4.7719, lng: 6.0699 },
  'Benue': { lat: 7.3369, lng: 8.7404 },
  'Borno': { lat: 11.8333, lng: 13.1500 },
  'Cross River': { lat: 5.9631, lng: 8.3300 },
  'Delta': { lat: 5.7040, lng: 5.9339 },
  'Ebonyi': { lat: 6.2649, lng: 8.0137 },
  'Edo': { lat: 6.6342, lng: 5.9304 },
  'Ekiti': { lat: 7.7190, lng: 5.3110 },
  'Enugu': { lat: 6.4584, lng: 7.5464 },
  'FCT': { lat: 9.0765, lng: 7.3986 },
  'Abuja': { lat: 9.0765, lng: 7.3986 },
  'Gombe': { lat: 10.2897, lng: 11.1673 },
  'Imo': { lat: 5.5720, lng: 7.0588 },
  'Jigawa': { lat: 12.2280, lng: 9.5616 },
  'Kaduna': { lat: 10.5105, lng: 7.4165 },
  'Kano': { lat: 12.0022, lng: 8.5920 },
  'Katsina': { lat: 13.0059, lng: 7.6000 },
  'Kebbi': { lat: 12.4539, lng: 4.1975 },
  'Kogi': { lat: 7.7337, lng: 6.6906 },
  'Kwara': { lat: 8.9669, lng: 4.3874 },
  'Lagos': { lat: 6.5244, lng: 3.3792 },
  'Nasarawa': { lat: 8.5380, lng: 8.3220 },
  'Niger': { lat: 9.9309, lng: 5.5983 },
  'Ogun': { lat: 7.1608, lng: 3.3489 },
  'Ondo': { lat: 7.2500, lng: 5.1931 },
  'Osun': { lat: 7.5629, lng: 4.5200 },
  'Oyo': { lat: 8.1574, lng: 3.6147 },
  'Plateau': { lat: 9.2182, lng: 9.5175 },
  'Rivers': { lat: 4.8156, lng: 7.0498 },
  'Sokoto': { lat: 13.0533, lng: 5.2476 },
  'Taraba': { lat: 7.9994, lng: 10.7740 },
  'Yobe': { lat: 12.2939, lng: 11.4390 },
  'Zamfara': { lat: 12.1704, lng: 6.6600 },
};

function classifyIncidentType(title, description, causes) {
  const text = `${title} ${description} ${causes}`.toLowerCase();
  
  if (text.includes('boko haram') || text.includes('iswap') || text.includes('terrorist') || text.includes('insurgent')) {
    return 'Terrorism';
  }
  if (text.includes('bandit') || text.includes('kidnap') || text.includes('abduct') || text.includes('ransom')) {
    return 'Banditry';
  }
  if (text.includes('cult') || text.includes('rival')) {
    return 'Cult Clash';
  }
  if (text.includes('police') || text.includes('army') || text.includes('troops') || text.includes('soldiers')) {
    return 'Police Clash';
  }
  if (text.includes('protest') || text.includes('riot') || text.includes('demonstration')) {
    return 'Civil Unrest';
  }
  if (text.includes('gunmen') || text.includes('unknown')) {
    return 'Unknown Gunmen';
  }
  return 'Unknown Gunmen';
}

function classifySeverity(fatalities, kidnapped, injuries) {
  const total = fatalities + kidnapped + injuries;
  if (fatalities >= 10 || total >= 30) return 'Critical';
  if (fatalities >= 5 || total >= 15) return 'High';
  if (fatalities >= 1 || total >= 5) return 'Medium';
  return 'Low';
}

function extractState(place, title) {
  // Check title first (often has state name)
  for (const state of Object.keys(STATE_COORDS)) {
    if (title.toLowerCase().includes(state.toLowerCase())) {
      return state;
    }
  }
  // Check place
  for (const state of Object.keys(STATE_COORDS)) {
    if (place.toLowerCase().includes(state.toLowerCase())) {
      return state;
    }
  }
  return 'Unknown';
}

function extractLGA(place) {
  // LGA is usually the first part before comma
  const parts = place.split(',');
  return parts[0]?.trim() || place;
}

async function importCSV() {
  const csvPath = path.join(process.cwd(), '..', 'terrorism-data.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error('CSV file not found at:', csvPath);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`Found ${records.length} records to import`);

  const incidents = records.map((row, index) => {
    const state = extractState(row.place || '', row.title || '');
    const coords = STATE_COORDS[state] || { lat: 9.0820, lng: 8.6753 }; // Nigeria center as fallback
    const fatalities = parseInt(row.number_of_deaths) || 0;
    
    // Add some randomness to coords so markers don't stack
    const lat = coords.lat + (Math.random() - 0.5) * 0.5;
    const lng = coords.lng + (Math.random() - 0.5) * 0.5;

    return {
      title: row.title || `Incident ${index + 1}`,
      description: row.description || '',
      date: row.start_date || new Date().toISOString(),
      state: state,
      lga: row.lga || extractLGA(row.place || ''),
      lat,
      lng,
      fatalities,
      injuries: 0, // CSV doesn't have this
      kidnapped: 0, // CSV doesn't have this, could parse from description
      incident_type: classifyIncidentType(row.title || '', row.description || '', row.causes_of_violence || ''),
      severity: classifySeverity(fatalities, 0, 0),
      sources: row.sources_of_information ? [row.sources_of_information] : [],
      verified: true,
    };
  });

  // Insert in batches of 100
  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < incidents.length; i += batchSize) {
    const batch = incidents.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('incidents')
      .insert(batch);

    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error.message);
    } else {
      inserted += batch.length;
      console.log(`Inserted ${inserted}/${incidents.length} records`);
    }
  }

  console.log(`Import complete! ${inserted} records inserted.`);
}

importCSV().catch(console.error);
