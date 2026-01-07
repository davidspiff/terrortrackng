// Smart security incident filtering - TERRORISM & BANDITRY FOCUS
// Excludes ordinary crime, cult clashes, domestic incidents
// Requires violence indicator + terror/bandit context

// Violence/casualty indicators
export const VIOLENCE_KEYWORDS = [
  'killed', 'kill', 'dead', 'death', 'slain', 'massacre',
  'shot', 'gunned down', 'bomb', 'explosion', 'blast',
  'kidnap', 'abduct', 'mass abduction', 'hostage',
  'attack', 'ambush', 'raid', 'overrun', 'invasion',
  'injured', 'wounded', 'casualt',
  'burnt', 'razed', 'destroyed',
];

// TERRORISM & BANDITRY context - MUST match one of these
export const CONTEXT_KEYWORDS = [
  // Boko Haram & affiliates
  'boko haram', 'iswap', 'islamic state west africa', 'shekau', 
  'jama\'atu ahlis sunna', 'wilayat', 'caliphate',
  
  // Al-Qaeda affiliates
  'ansaru', 'aqim', 'al-qaeda', 'jnim',
  
  // Bandits (Northwest crisis)
  'bandit', 'bandits', 'banditry', 'armed bandits', 'bandit kingpin',
  'bello turji', 'turji', 'dogo gide', 'kachalla',
  'cattle rustl', 'rustlers',
  
  // Unknown gunmen / armed groups
  'unknown gunmen', 'gunmen attack', 'gunmen kill', 'gunmen abduct',
  'masked gunmen', 'armed gunmen', 'suspected gunmen',
  'armed men', 'armed group', 'militia',
  
  // Fulani militia attacks
  'fulani militia', 'fulani gunmen', 'fulani attack', 'fulani herders attack',
  'herdsmen attack', 'herders attack', 'pastoralist',
  
  // IPOB/ESN (Southeast insurgency)
  'ipob', 'indigenous people of biafra', 'esn', 'eastern security network',
  'sit-at-home', 'unknown gunmen', 'biafra',
  
  // Terror indicators
  'terrorist', 'terrorists', 'terrorism', 'insurgent', 'insurgents', 'insurgency',
  'jihadist', 'extremist', 'militant', 'militants',
  
  // IED/Bombing
  'ied', 'improvised explosive', 'suicide bomb', 'car bomb', 'roadside bomb',
  'explosive device',
  
  // Mass casualty indicators
  'massacre', 'mass killing', 'village attack', 'community attack',
  'razed', 'burnt down', 'set ablaze',
  
  // Hotspot states (only when combined with violence)
  'sambisa', 'lake chad',
];

// Exclusion patterns - skip these even if keywords match
export const EXCLUSION_PATTERNS = [
  // Sports
  'football', 'soccer', 'premier league', 'la liga', 'champions league',
  'nba', 'basketball', 'tennis', 'golf', 'olympics', 'world cup',
  'real madrid', 'barcelona', 'manchester', 'chelsea', 'arsenal', 'liverpool',
  
  // Entertainment
  'movie', 'film', 'nollywood', 'actor', 'actress', 'celebrity', 'music',
  'big brother', 'reality show',
  
  // Business/Economy
  'stock', 'market', 'naira', 'dollar', 'economy', 'gdp', 'inflation',
  'crude oil', 'opec', 'forex',
  
  // Politics (non-violence)
  'election', 'campaign', 'vote', 'ballot', 'inec', 'tribunal',
  'swearing-in', 'inaugurat',
  
  // Social
  'birthday', 'wedding', 'anniversary', 'obituary', 'funeral', 'burial',
  
  // Ordinary crime (not terrorism/banditry)
  'armed robber', 'robbery suspect', 'yahoo boy', 'fraud', 'scam',
  'domestic violence', 'lover', 'husband kill', 'wife kill',
  'cult clash', 'cultist', 'rival cult', 'secret cult',
  'one chance', 'ritual killing',
  
  // Accidents
  'road accident', 'car crash', 'truck accident', 'boat capsize', 'boat accident',
  'building collapse', 'fire outbreak', 'gas explosion',
  
  // Foreign news
  'venezuela', 'ukraine', 'russia', 'gaza', 'israel', 'palestine',
  'united states', 'united kingdom', 'china',
];

// Smart filter - requires violence + terror/bandit context, excludes noise
export function isSecurityIncident(text) {
  const lowerText = text.toLowerCase();
  
  // First check exclusions
  if (EXCLUSION_PATTERNS.some(pattern => lowerText.includes(pattern))) {
    return false;
  }
  
  // Must have a violence keyword
  const hasViolence = VIOLENCE_KEYWORDS.some(kw => lowerText.includes(kw));
  if (!hasViolence) return false;
  
  // Must also have a terror/bandit context keyword
  const hasContext = CONTEXT_KEYWORDS.some(kw => lowerText.includes(kw));
  return hasContext;
}

// Legacy export for compatibility
export const SECURITY_KEYWORDS = [...VIOLENCE_KEYWORDS, ...CONTEXT_KEYWORDS];
