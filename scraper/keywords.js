// Security incident keywords for filtering relevant news
export const SECURITY_KEYWORDS = [
  // Boko Haram & affiliates
  'boko haram', 'iswap', 'islamic state west africa', 'shekau', 'sambisa',
  'jama\'atu ahlis sunna', 'jasad', 'wilayat gharb ifriqiyya',
  
  // Al-Qaeda affiliates
  'ansaru', 'aqim', 'al-qaeda', 'jnim', 'islamic state greater sahara', 'isgs',
  
  // Banditry
  'bandit', 'bandits', 'banditry', 'armed bandits', 'bandit kingpin',
  'bello turji', 'turji', 'cattle rustl', 'rustlers',
  
  // Regional banditry
  'zamfara', 'katsina', 'kaduna', 'sokoto', 'niger state',
  
  // Kidnapping
  'kidnap', 'abduct', 'mass kidnapping', 'school abduction', 'ransom',
  
  // Fulani-related
  'fulani herds', 'fulani militia', 'fulani gunmen', 'fulani attack',
  'pastoralist militia', 'herder',
  
  // Unknown gunmen
  'unknown gunmen', 'gunmen attack', 'masked gunmen', 'armed gunmen',
  
  // IPOB/Biafra
  'ipob', 'indigenous people of biafra', 'biafra', 'esn', 'eastern security network',
  
  // Attack types
  'suicide bomb', 'ied', 'improvised explosive', 'car bomb', 'roadside bomb',
  'ambush', 'raid', 'massacre', 'attack', 'killed', 'dead', 'death',
  'slain', 'murder', 'assassin', 'shot dead', 'gunned down',
  
  // Injuries
  'injured', 'wounded', 'casualt',
  
  // General security
  'insurgent', 'militant', 'extremist', 'terrorist', 'terrorism',
  'jihadist', 'security forces', 'troops', 'soldiers',
  
  // Incident indicators
  'attack', 'strike', 'assault', 'invasion', 'overrun', 'siege',
];

// Check if article content matches security keywords
export function isSecurityIncident(text) {
  const lowerText = text.toLowerCase();
  return SECURITY_KEYWORDS.some(keyword => lowerText.includes(keyword));
}
