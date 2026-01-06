-- Enable PostGIS for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Incidents table
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMPTZ NOT NULL,
  state TEXT NOT NULL,
  lga TEXT NOT NULL,
  location GEOGRAPHY(POINT, 4326),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  fatalities INTEGER DEFAULT 0,
  injuries INTEGER DEFAULT 0,
  kidnapped INTEGER DEFAULT 0,
  incident_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  sources TEXT[],
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_incidents_date ON incidents(date DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_state ON incidents(state);
CREATE INDEX IF NOT EXISTS idx_incidents_type ON incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_location ON incidents USING GIST(location);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_incidents
  BEFORE UPDATE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Row Level Security
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public read access" ON incidents
  FOR SELECT USING (true);

-- Allow authenticated insert/update (for scraper)
CREATE POLICY "Service role full access" ON incidents
  FOR ALL USING (auth.role() = 'service_role');
