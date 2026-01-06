// Smart deduplication - checks multiple signals to avoid duplicate incidents

/**
 * Generates a fingerprint for an incident based on key attributes
 * Two articles about the same event should have similar fingerprints
 */
export function generateFingerprint(incident) {
  const date = new Date(incident.date).toISOString().split('T')[0]; // Just the date
  const state = (incident.state || '').toLowerCase().trim();
  const fatalities = incident.fatalities || 0;
  const kidnapped = incident.kidnapped || 0;
  
  // Fingerprint: date + state + casualty signature
  return `${date}:${state}:${fatalities}:${kidnapped}`;
}

/**
 * Extracts key terms from a title for similarity matching
 */
function extractKeyTerms(title) {
  const stopWords = ['the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'as', 'by', 'with'];
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word));
}

/**
 * Calculates similarity between two titles (0-1)
 */
export function titleSimilarity(title1, title2) {
  const terms1 = new Set(extractKeyTerms(title1));
  const terms2 = new Set(extractKeyTerms(title2));
  
  if (terms1.size === 0 || terms2.size === 0) return 0;
  
  const intersection = [...terms1].filter(t => terms2.has(t)).length;
  const union = new Set([...terms1, ...terms2]).size;
  
  return intersection / union; // Jaccard similarity
}

/**
 * Checks if a new incident is likely a duplicate of existing ones
 */
export function isDuplicate(newIncident, existingIncidents, threshold = 0.5) {
  const newFingerprint = generateFingerprint(newIncident);
  const newDate = new Date(newIncident.date);
  
  for (const existing of existingIncidents) {
    // Check fingerprint match (same date, state, casualties)
    const existingFingerprint = generateFingerprint(existing);
    if (newFingerprint === existingFingerprint) {
      return { isDupe: true, reason: 'fingerprint', match: existing };
    }
    
    // Check date proximity (within 2 days)
    const existingDate = new Date(existing.date);
    const daysDiff = Math.abs(newDate - existingDate) / (1000 * 60 * 60 * 24);
    
    if (daysDiff <= 2) {
      // Same state?
      const sameState = (newIncident.state || '').toLowerCase() === (existing.state || '').toLowerCase();
      
      if (sameState) {
        // Check title similarity
        const similarity = titleSimilarity(newIncident.title, existing.title);
        if (similarity >= threshold) {
          return { isDupe: true, reason: 'title_similarity', similarity, match: existing };
        }
        
        // Check casualty match (if both have casualties)
        const newCasualties = (newIncident.fatalities || 0) + (newIncident.kidnapped || 0);
        const existingCasualties = (existing.fatalities || 0) + (existing.kidnapped || 0);
        
        if (newCasualties > 0 && existingCasualties > 0) {
          // Within 20% of each other
          const ratio = Math.min(newCasualties, existingCasualties) / Math.max(newCasualties, existingCasualties);
          if (ratio >= 0.8) {
            return { isDupe: true, reason: 'casualty_match', match: existing };
          }
        }
      }
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
      // Check if this article belongs to an existing group
      const similarity = titleSimilarity(article.title, group[0].title);
      if (similarity >= 0.4) {
        group.push(article);
        foundGroup = true;
        break;
      }
    }
    
    if (!foundGroup) {
      groups.push([article]);
    }
  }
  
  // Pick the best article from each group (longest content)
  return groups.map(group => {
    return group.reduce((best, current) => {
      return (current.content?.length || 0) > (best.content?.length || 0) ? current : best;
    });
  });
}
