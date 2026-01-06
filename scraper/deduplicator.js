// Smart deduplication - context-aware matching to avoid duplicate incidents

/**
 * Extracts key terms from a title for similarity matching
 */
function extractKeyTerms(title) {
  const stopWords = ['the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'as', 'by', 'with', 'after', 'before', 'during', 'says', 'report', 'news', 'nigeria', 'nigerian'];
  return (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word));
}

/**
 * Extracts numbers from text (for casualty matching)
 */
function extractNumbers(text) {
  const matches = (text || '').match(/\d+/g);
  return matches ? matches.map(n => parseInt(n)).filter(n => n > 0 && n < 10000) : [];
}

/**
 * Calculates Jaccard similarity between two titles (0-1)
 */
export function titleSimilarity(title1, title2) {
  const terms1 = new Set(extractKeyTerms(title1));
  const terms2 = new Set(extractKeyTerms(title2));
  
  if (terms1.size === 0 || terms2.size === 0) return 0;
  
  const intersection = [...terms1].filter(t => terms2.has(t)).length;
  const union = new Set([...terms1, ...terms2]).size;
  
  return intersection / union;
}

/**
 * Checks if two incidents are likely the same event
 */
function isSameEvent(inc1, inc2) {
  // Same state?
  const state1 = (inc1.state || '').toLowerCase();
  const state2 = (inc2.state || '').toLowerCase();
  const sameState = state1 === state2 || state1 === 'unknown' || state2 === 'unknown';
  
  if (!sameState) return false;
  
  // Date within 5 days?
  const date1 = new Date(inc1.date);
  const date2 = new Date(inc2.date);
  const daysDiff = Math.abs(date1 - date2) / (1000 * 60 * 60 * 24);
  
  if (daysDiff > 5) return false;
  
  // Check multiple signals
  let matchScore = 0;
  
  // Title similarity
  const titleSim = titleSimilarity(inc1.title, inc2.title);
  if (titleSim >= 0.5) matchScore += 3;
  else if (titleSim >= 0.3) matchScore += 1;
  
  // Casualty numbers match
  const casualties1 = (inc1.fatalities || 0) + (inc1.kidnapped || 0);
  const casualties2 = (inc2.fatalities || 0) + (inc2.kidnapped || 0);
  
  if (casualties1 > 0 && casualties2 > 0) {
    if (casualties1 === casualties2) matchScore += 2;
    else if (Math.abs(casualties1 - casualties2) <= 5) matchScore += 1;
  }
  
  // Same fatality count specifically
  if (inc1.fatalities > 0 && inc1.fatalities === inc2.fatalities) matchScore += 2;
  
  // Same kidnapped count specifically
  if (inc1.kidnapped > 0 && inc1.kidnapped === inc2.kidnapped) matchScore += 2;
  
  // Same LGA
  const lga1 = (inc1.lga || '').toLowerCase();
  const lga2 = (inc2.lga || '').toLowerCase();
  if (lga1 !== 'unknown' && lga2 !== 'unknown' && lga1 === lga2) matchScore += 2;
  
  // Same incident type
  if (inc1.incident_type === inc2.incident_type) matchScore += 1;
  
  // Numbers in title match
  const nums1 = extractNumbers(inc1.title);
  const nums2 = extractNumbers(inc2.title);
  const sharedNums = nums1.filter(n => nums2.includes(n));
  if (sharedNums.length > 0) matchScore += 2;
  
  // Threshold: need at least 3 points to consider duplicate
  return matchScore >= 3;
}

/**
 * Generates a fingerprint for quick duplicate detection
 */
export function generateFingerprint(incident) {
  const date = new Date(incident.date).toISOString().split('T')[0];
  const state = (incident.state || 'unknown').toLowerCase().trim();
  const fatalities = incident.fatalities || 0;
  const kidnapped = incident.kidnapped || 0;
  
  return `${date}:${state}:${fatalities}:${kidnapped}`;
}

/**
 * Checks if a new incident is likely a duplicate of existing ones
 */
export function isDuplicate(newIncident, existingIncidents, threshold = 0.4) {
  const newFingerprint = generateFingerprint(newIncident);
  
  for (const existing of existingIncidents) {
    // Quick fingerprint check
    const existingFingerprint = generateFingerprint(existing);
    if (newFingerprint === existingFingerprint) {
      return { isDupe: true, reason: 'fingerprint', match: existing };
    }
    
    // Deep event matching
    if (isSameEvent(newIncident, existing)) {
      return { isDupe: true, reason: 'same_event', match: existing };
    }
  }
  
  return { isDupe: false };
}

/**
 * Deduplicates a batch of articles BEFORE sending to AI
 * Groups similar articles and picks the best one from each group
 */
export function deduplicateArticles(articles) {
  const groups = [];
  
  for (const article of articles) {
    let foundGroup = false;
    
    for (const group of groups) {
      const similarity = titleSimilarity(article.title, group[0].title);
      
      // Also check for shared numbers (like "30 killed")
      const nums1 = extractNumbers(article.title);
      const nums2 = extractNumbers(group[0].title);
      const sharedNums = nums1.filter(n => nums2.includes(n) && n >= 5);
      
      if (similarity >= 0.35 || sharedNums.length > 0) {
        group.push(article);
        foundGroup = true;
        break;
      }
    }
    
    if (!foundGroup) {
      groups.push([article]);
    }
  }
  
  // Pick the best article from each group (longest content, prefer non-Google-redirect URLs)
  return groups.map(group => {
    return group.reduce((best, current) => {
      const bestScore = (best.content?.length || 0) + (best.url?.includes('google.com') ? 0 : 100);
      const currentScore = (current.content?.length || 0) + (current.url?.includes('google.com') ? 0 : 100);
      return currentScore > bestScore ? current : best;
    });
  });
}
