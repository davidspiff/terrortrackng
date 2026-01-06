// Smart AI Classification with context-aware duplicate detection
// Handles follow-up articles, releases, and extracts actual incident dates

const CHUTES_API_KEY = process.env.CHUTES_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const AI_PROVIDER = process.env.AI_PROVIDER || 'openrouter';

const CHUTES_API_URL = 'https://llm.chutes.ai/v1/chat/completions';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Nigerian state coordinates
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

// All Nigerian states for validation
const NIGERIAN_STATES = Object.keys(STATE_COORDS);

const SYSTEM_PROMPT = `You are an expert security analyst classifying Nigerian news articles. Your job is to identify ONLY articles that report NEW, ACTUAL violent incidents.

CRITICAL RULES - BE EXTREMELY STRICT:
1. ONLY classify as a new incident if the article reports a SPECIFIC violent event that JUST HAPPENED
2. Articles about CONDEMNATIONS, REACTIONS, STATEMENTS, or CALLS FOR ACTION are NOT incidents
3. Articles about RELEASES, RESCUES, or FREED hostages are NOT new incidents
4. Articles that are FOLLOW-UPS, UPDATES, or ANALYSIS of previous incidents are NOT new
5. Opinion pieces, editorials, or general security discussions are NOT incidents
6. Articles about ARRESTS or INVESTIGATIONS of past events are NOT new incidents
7. Articles about GOVERNMENT RESPONSES or POLICY are NOT incidents
8. Extract the ACTUAL DATE the incident occurred (not the article publish date)
9. Nigerian states MUST be one of: Abia, Adamawa, Akwa Ibom, Anambra, Bauchi, Bayelsa, Benue, Borno, Cross River, Delta, Ebonyi, Edo, Ekiti, Enugu, FCT, Gombe, Imo, Jigawa, Kaduna, Kano, Katsina, Kebbi, Kogi, Kwara, Lagos, Nasarawa, Niger, Ogun, Ondo, Osun, Oyo, Plateau, Rivers, Sokoto, Taraba, Yobe, Zamfara
10. An incident MUST have at least ONE of: fatalities > 0, injuries > 0, or kidnapped > 0

EXAMPLES OF WHAT TO REJECT:
- "Governor condemns attack" → REJECT (reaction, not incident)
- "NBA condemns bandit attacks" → REJECT (statement, not incident)
- "130 students released" → REJECT (release, not new incident)
- "Police arrest suspects" → REJECT (arrest, not new incident)
- "Analysis: Why attacks are increasing" → REJECT (analysis, not incident)
- "Government vows to tackle insecurity" → REJECT (policy, not incident)

ONLY ACCEPT articles that clearly describe a specific violent event with casualties.

Return ONLY valid JSON (no markdown, no explanation):
{
  "is_new_incident": boolean,
  "rejection_reason": string or null (if rejected, explain: "condemnation/reaction", "release/rescue", "follow-up", "arrest/investigation", "opinion/analysis", "no casualties", "not specific event", etc.),
  "title": string (concise title, max 70 chars, NO HTML),
  "summary": string (2-3 sentence summary of what happened, NO HTML, NO links, plain text only),
  "incident_date": string (ISO date when incident ACTUALLY occurred, parse from article content),
  "state": string (Nigerian state from the list above, or "Unknown"),
  "lga": string (Local Government Area if mentioned),
  "town_village": string (specific town/village name if mentioned),
  "fatalities": number (people killed, 0 if none or unknown),
  "injuries": number (people injured, 0 if none or unknown),
  "kidnapped": number (people abducted/kidnapped, 0 if none - do NOT count released people),
  "incident_type": string (one of: "Terrorism", "Banditry", "Civil Unrest", "Unknown Gunmen", "Police Clash", "Cult Clash"),
  "severity": string (one of: "Low", "Medium", "High", "Critical"),
  "perpetrators": string (who did it: "Boko Haram", "ISWAP", "Bandits", "Unknown Gunmen", "Fulani Militia", etc.),
  "is_follow_up": boolean (true if this is reporting on a previous incident)
}`;

// Retry with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 2000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isRateLimit = error.message?.includes('429') || 
                          error.message?.includes('402') || 
                          error.message?.includes('rate') ||
                          error.message?.includes('limit');
      
      if (isRateLimit && attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`  ⏳ Rate limited, retrying in ${delay/1000}s (attempt ${attempt + 2}/${maxRetries})...`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw error;
      }
    }
  }
}

// Clean HTML from text
function cleanHtml(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
    .replace(/\s+/g, ' ')
    .trim();
}

// Call Chutes API
async function callChutes(article) {
  if (!CHUTES_API_KEY) throw new Error('CHUTES_API_KEY not set');

  const cleanContent = cleanHtml(article.content);
  const cleanTitle = cleanHtml(article.title);

  const response = await fetch(CHUTES_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CHUTES_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'MiniMaxAI/MiniMax-M2.1-TEE',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Analyze this Nigerian news article:\n\nTitle: ${cleanTitle}\n\nContent: ${cleanContent}\n\nArticle Date: ${article.date}` }
      ],
      temperature: 0.1,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) throw new Error(`Chutes API error: ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content;
}

// Call OpenRouter API
async function callOpenRouter(article) {
  if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not set');

  const cleanContent = cleanHtml(article.content);
  const cleanTitle = cleanHtml(article.title);

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://terrortrackng.web.app',
      'X-Title': 'Sentinel-NG Security Tracker',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-exp:free',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Analyze this Nigerian news article:\n\nTitle: ${cleanTitle}\n\nContent: ${cleanContent}\n\nArticle Date: ${article.date}` }
      ],
      temperature: 0.1,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content;
}

// Validate and fix state name
function validateState(state) {
  if (!state) return 'Unknown';
  
  const normalized = state.trim();
  
  // Direct match
  if (NIGERIAN_STATES.includes(normalized)) return normalized;
  
  // Case-insensitive match
  const found = NIGERIAN_STATES.find(s => s.toLowerCase() === normalized.toLowerCase());
  if (found) return found;
  
  // Partial match
  const partial = NIGERIAN_STATES.find(s => 
    normalized.toLowerCase().includes(s.toLowerCase()) ||
    s.toLowerCase().includes(normalized.toLowerCase())
  );
  if (partial) return partial;
  
  // Common aliases
  const aliases = {
    'fct': 'FCT',
    'abuja': 'FCT',
    'federal capital': 'FCT',
    'niger state': 'Niger',
    'rivers state': 'Rivers',
    'delta state': 'Delta',
  };
  
  const aliasMatch = aliases[normalized.toLowerCase()];
  if (aliasMatch) return aliasMatch;
  
  return 'Unknown';
}

// Main classification function
export async function classifyWithChutes(article) {
  const provider = AI_PROVIDER.toLowerCase();
  const apiCall = provider === 'chutes' ? () => callChutes(article) : () => callOpenRouter(article);
  const providerName = provider === 'chutes' ? 'Chutes' : 'OpenRouter';

  try {
    let content = await retryWithBackoff(apiCall);
    
    if (!content) throw new Error(`Empty response from ${providerName}`);

    // Strip markdown code blocks
    content = content.trim();
    if (content.startsWith('```json')) content = content.slice(7);
    else if (content.startsWith('```')) content = content.slice(3);
    if (content.endsWith('```')) content = content.slice(0, -3);
    content = content.trim();

    const parsed = JSON.parse(content);
    
    // Check if it's a new incident
    if (!parsed.is_new_incident) {
      const reason = parsed.rejection_reason || 'not a new incident';
      console.log(`  ⊘ Skipped: ${reason}`);
      return null;
    }

    // Check for follow-up articles
    if (parsed.is_follow_up) {
      console.log(`  ⊘ Skipped: follow-up article`);
      return null;
    }

    // CRITICAL: Must have at least one casualty
    const totalCasualties = (parsed.fatalities || 0) + (parsed.injuries || 0) + (parsed.kidnapped || 0);
    if (totalCasualties === 0) {
      console.log(`  ⊘ Skipped: no casualties (0/0/0)`);
      return null;
    }

    // Validate state
    const state = validateState(parsed.state);
    
    // Get coordinates
    const coords = STATE_COORDS[state] || STATE_COORDS['FCT'];
    const lat = coords.lat + (Math.random() - 0.5) * 0.3;
    const lng = coords.lng + (Math.random() - 0.5) * 0.3;

    // Clean the summary
    const cleanSummary = cleanHtml(parsed.summary);

    // Use incident_date if provided, otherwise article date
    const incidentDate = parsed.incident_date || article.date || new Date().toISOString();

    return {
      title: cleanHtml(parsed.title) || cleanHtml(article.title).substring(0, 70),
      description: cleanSummary || cleanHtml(article.content).substring(0, 200),
      date: incidentDate,
      state: state,
      lga: parsed.lga || parsed.town_village || 'Unknown',
      lat,
      lng,
      fatalities: Math.max(0, parseInt(parsed.fatalities) || 0),
      injuries: Math.max(0, parseInt(parsed.injuries) || 0),
      kidnapped: Math.max(0, parseInt(parsed.kidnapped) || 0),
      incident_type: parsed.incident_type || 'Unknown Gunmen',
      severity: parsed.severity || 'Medium',
      source_url: article.url || null,
      verified: false,
    };
  } catch (err) {
    console.log(`  ✗ ${providerName} failed: ${err.message}`);
    return fallbackClassify(article);
  }
}

// Fallback classification without AI
function fallbackClassify(article) {
  const text = cleanHtml(`${article.title} ${article.content}`).toLowerCase();
  
  // Skip releases/rescues
  if (text.includes('released') || text.includes('freed') || text.includes('rescued') || text.includes('regain freedom')) {
    console.log(`  ⊘ Skipped: release/rescue article`);
    return null;
  }
  
  // Check if it's a security incident
  const securityKeywords = ['kill', 'attack', 'kidnap', 'abduct', 'bandit', 'terrorist', 'gunmen', 'dead', 'shot', 'bomb', 'massacre'];
  const isSecurityIncident = securityKeywords.some(kw => text.includes(kw));
  
  if (!isSecurityIncident) return null;

  // Extract state
  let state = 'Unknown';
  for (const s of NIGERIAN_STATES) {
    if (text.includes(s.toLowerCase())) {
      state = s;
      break;
    }
  }

  // Extract numbers
  const deathMatch = text.match(/(\d+)\s*(killed|dead|death|die)/);
  const kidnappedMatch = text.match(/(\d+)\s*(kidnapped|abducted|taken)/);
  const injuredMatch = text.match(/(\d+)\s*(injured|wounded)/);

  const fatalities = deathMatch ? parseInt(deathMatch[1]) : 0;
  const kidnapped = kidnappedMatch ? parseInt(kidnappedMatch[1]) : 0;
  const injuries = injuredMatch ? parseInt(injuredMatch[1]) : 0;

  // Classify type
  let incident_type = 'Unknown Gunmen';
  if (text.includes('boko haram') || text.includes('iswap') || text.includes('terrorist')) {
    incident_type = 'Terrorism';
  } else if (text.includes('bandit')) {
    incident_type = 'Banditry';
  } else if (text.includes('cult')) {
    incident_type = 'Cult Clash';
  } else if (text.includes('police') || text.includes('army') || text.includes('troops')) {
    incident_type = 'Police Clash';
  }

  // Severity
  const total = fatalities + kidnapped + injuries;
  let severity = 'Low';
  if (fatalities >= 10 || total >= 30) severity = 'Critical';
  else if (fatalities >= 5 || total >= 15) severity = 'High';
  else if (fatalities >= 1 || total >= 5) severity = 'Medium';

  const coords = STATE_COORDS[state] || STATE_COORDS['FCT'];

  return {
    title: cleanHtml(article.title).substring(0, 70),
    description: cleanHtml(article.content).substring(0, 200),
    date: article.date || new Date().toISOString(),
    state,
    lga: 'Unknown',
    lat: coords.lat + (Math.random() - 0.5) * 0.3,
    lng: coords.lng + (Math.random() - 0.5) * 0.3,
    fatalities,
    injuries,
    kidnapped,
    incident_type,
    severity,
    source_url: article.url || null,
    verified: false,
  };
}
