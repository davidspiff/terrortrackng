// Smart security incident filtering
// Requires BOTH a violence indicator AND a perpetrator/context indicator
// This dramatically reduces false positives from sports, politics, obituaries

// Violence/casualty indicators
export const VIOLENCE_KEYWORDS = [
  'killed', 'kill', 'dead', 'death', 'died', 'slain', 'murder',
  'shot', 'gunned down', 'massacre', 'bomb', 'explosion',
  'kidnap', 'abduct', 'hostage', 'ransom',
  'attack', 'ambush', 'raid', 'invasion',
  'injured', 'wounded', 'casualt',
];

// Perpetrator/context indicators (must have one of these too)
export const CONTEXT_KEYWORDS = [
  // Terror groups
  'boko haram', 'iswap', 'islamic state', 'shekau', 'terrorist', 'insurgent',
  'ansaru', 'jihadist',
  
  // Bandits
  'bandit', 'bandits', 'banditry', 'cattle rustl', 'rustler',
  
  // Armed groups
  'gunmen', 'armed men', 'masked men', 'unknown gunmen', 'militia',
  'herdsmen', 'herders attack', 'fulani militia', 'fulani attack',
  
  // IPOB/ESN
  'ipob', 'esn', 'eastern security network', 'biafra',
  
  // Cult violence
  'cultist', 'cult clash', 'cult war', 'rival cult',
  
  // Security context
  'troops', 'soldiers', 'military', 'army', 'police',
  'security forces', 'security operatives',
  
  // Location context (hotspots)
  'sambisa', 'niger state', 'zamfara', 'katsina', 'kaduna',
  'borno', 'adamawa', 'yobe', 'plateau',
];

// Exclusion patterns - skip these even if keywords match
export const EXCLUSION_PATTERNS = [
  'football', 'soccer', 'premier league', 'la liga', 'champions league',
  'nba', 'basketball', 'tennis', 'golf', 'olympics',
  'movie', 'film', 'nollywood', 'actor', 'actress', 'celebrity',
  'stock', 'market', 'naira', 'dollar', 'economy', 'gdp', 'inflation',
  'election', 'campaign', 'vote', 'ballot', 'inec', 'tribunal',
  'birthday', 'wedding', 'anniversary', 'obituary', 'funeral',
  'real madrid', 'barcelona', 'manchester', 'chelsea', 'arsenal',
];

// Smart filter - requires violence + context, excludes noise
export function isSecurityIncident(text) {
  const lowerText = text.toLowerCase();
  
  // First check exclusions
  if (EXCLUSION_PATTERNS.some(pattern => lowerText.includes(pattern))) {
    return false;
  }
  
  // Must have a violence keyword
  const hasViolence = VIOLENCE_KEYWORDS.some(kw => lowerText.includes(kw));
  if (!hasViolence) return false;
  
  // Must also have a context keyword
  const hasContext = CONTEXT_KEYWORDS.some(kw => lowerText.includes(kw));
  return hasContext;
}

// Legacy export for compatibility
export const SECURITY_KEYWORDS = [...VIOLENCE_KEYWORDS, ...CONTEXT_KEYWORDS];
