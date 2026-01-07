import { Incident, IncidentType, Severity } from './types';

export const MOCK_INCIDENTS: Incident[] = [
  {
    id: 'inc-001',
    title: 'Kinetic Ambush: Borno Checkpoint',
    date: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    location: { state: 'Borno', lga: 'Konduga', lat: 11.8333, lng: 13.1500 },
    fatalities: 14,
    injuries: 2,
    kidnapped: 0,
    type: IncidentType.TERRORISM,
    severity: Severity.CRITICAL,
    description: 'Insurgents ambushed a joint task force patrol unit. Response teams deployed.',
    verified: true
  },
  {
    id: 'inc-002',
    title: 'Mass Abduction: Kaduna Corridor',
    date: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    location: { state: 'Kaduna', lga: 'Chikun', lat: 10.5105, lng: 7.4165 },
    fatalities: 2,
    injuries: 0,
    kidnapped: 28,
    type: IncidentType.BANDITRY,
    severity: Severity.HIGH,
    description: 'Armed intercept of commercial asset. Personnel tracking initiated.',
    verified: false
  },
  {
    id: 'inc-003',
    title: 'Sector Breach: Lagos Ikeja Hub',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    location: { state: 'Lagos', lga: 'Ikeja', lat: 6.5244, lng: 3.3792 },
    fatalities: 1,
    injuries: 15,
    kidnapped: 0,
    type: IncidentType.CIVIL_UNREST,
    severity: Severity.MEDIUM,
    description: 'Economic grievance demonstration. Security containment active.',
    verified: true
  },
  {
    id: 'inc-004',
    title: 'Village Neutralization: Benue Sector',
    date: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    location: { state: 'Benue', lga: 'Guma', lat: 7.7322, lng: 8.5211 },
    fatalities: 32,
    injuries: 8,
    kidnapped: 5,
    type: IncidentType.UNKNOWN_GUNMEN,
    severity: Severity.CRITICAL,
    description: 'A rural community sector was compromised overnight.',
    verified: true
  },
  {
    id: 'inc-010',
    title: 'High-Value Extraction: FCT Boundary',
    date: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
    location: { state: 'Abuja', lga: 'Kwali', lat: 9.0765, lng: 7.3986 },
    fatalities: 0,
    injuries: 1,
    kidnapped: 12,
    type: IncidentType.BANDITRY,
    severity: Severity.HIGH,
    description: 'Extraction incident in Kwali sector.',
    verified: true
  },
  {
    id: 'inc-011',
    title: 'Lethal Group Conflict: PH Sector',
    date: new Date(Date.now() - 1000 * 60 * 60 * 300).toISOString(),
    location: { state: 'Rivers', lga: 'Port Harcourt', lat: 4.8156, lng: 7.0498 },
    fatalities: 9,
    injuries: 4,
    kidnapped: 0,
    type: IncidentType.CULT_CLASH,
    severity: Severity.HIGH,
    description: 'Rival group neutralization in Diobu quadrant.',
    verified: true
  }
];

export const NIGERIA_CENTER: [number, number] = [9.5, 8.0];
export const NIGERIA_BOUNDS: [[number, number], [number, number]] = [
    [4.0, 2.5],
    [14.0, 15.0]
];
export const ZOOM_LEVEL = 6;

export const INCIDENT_COLORS: Record<IncidentType, string> = {
  [IncidentType.TERRORISM]: '#ef4444',     // Crimson
  [IncidentType.BANDITRY]: '#f97316',      // Orange
  [IncidentType.CIVIL_UNREST]: '#3b82f6',  // Blue
  [IncidentType.UNKNOWN_GUNMEN]: '#991b1b', // Dark Red
  [IncidentType.POLICE_CLASH]: '#10b981',   // Emerald
  [IncidentType.CULT_CLASH]: '#64748b'     // Slate
};

export const SEVERITY_COLORS: Record<Severity, string> = {
  [Severity.LOW]: '#10b981',
  [Severity.MEDIUM]: '#3b82f6',
  [Severity.HIGH]: '#f59e0b',
  [Severity.CRITICAL]: '#ef4444'
};