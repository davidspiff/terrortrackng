export enum IncidentType {
  TERRORISM = 'Terrorism',
  BANDITRY = 'Banditry',
  CIVIL_UNREST = 'Civil Unrest',
  UNKNOWN_GUNMEN = 'Unknown Gunmen',
  POLICE_CLASH = 'Police Clash',
  CULT_CLASH = 'Cult Clash'
}

export enum Severity {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical'
}

export interface Incident {
  id: string;
  title: string;
  date: string;
  location: {
    state: string;
    lga: string;
    lat: number;
    lng: number;
  };
  fatalities: number;
  injuries: number;
  kidnapped: number;
  type: IncidentType;
  severity: Severity;
  description: string;
  verified: boolean;
  source_url?: string;
}

export interface FilterState {
  searchQuery: string;
  minFatalities: number;
  dateRange: '24h' | '7d' | '30d' | 'all';
  state: string | 'All';
  type: IncidentType | 'All';
  severity: Severity | 'All';
}

