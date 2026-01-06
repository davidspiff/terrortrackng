import { createClient } from '@supabase/supabase-js';
import type { Incident } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Using mock data.');
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface DbIncident {
  id: string;
  title: string;
  description: string | null;
  date: string;
  state: string;
  lga: string;
  lat: number;
  lng: number;
  fatalities: number;
  injuries: number;
  kidnapped: number;
  incident_type: string;
  severity: string;
  sources: string[] | null;
  source_url: string | null;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

// Transform DB record to app Incident type
export function toIncident(db: DbIncident): Incident {
  return {
    id: db.id,
    title: db.title,
    description: db.description || '',
    date: db.date,
    location: {
      state: db.state,
      lga: db.lga,
      lat: db.lat,
      lng: db.lng,
    },
    fatalities: db.fatalities,
    injuries: db.injuries,
    kidnapped: db.kidnapped,
    type: db.incident_type as any,
    severity: db.severity as any,
    verified: db.verified,
    source_url: db.source_url || undefined,
  };
}
