// Smart AI Classification with proper location extraction
// Uses Gemini for better understanding of Nigerian geography

const CHUTES_API_KEY = process.env.CHUTES_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const AI_PROVIDER = process.env.AI_PROVIDER || 'openrouter';

const CHUTES_API_URL = 'https://llm.chutes.ai/v1/chat/completions';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Nigerian states with their LGAs for validation
const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo',
  'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers',
  'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

// State coordinates
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

const SYSTEM_PROMPT = `You are a Nigerian security analyst tracking TERRORISM and BANDITRY incidents.

YOUR TASK: Determine if this article reports a RECENT terrorist or bandit attack with casualties.

ACCEPT articles about:
- Boko Haram / ISWAP attacks
- Bandit attacks (especially Northwest Nigeria - Zamfara, Katsina, Kaduna, Niger, Sokoto)
- Unknown gunmen attacks (especially Southeast - IPOB/ESN related)
- Fulani militia / herdsmen attacks on communities
- Mass kidnappings by terrorist groups or bandits
- IED/bomb attacks by insurgents

REJECT articles about:
- Ordinary crime (armed robbery, fraud, domestic violence)
- Cult clashes and gang violence
- Individual kidnappings by common criminals
- Government statements, reactions, condemnations
- Arrests, rescues, releases (law enforcement success stories)
- Analysis, opinion, or retrospective pieces
- Accidents (road, boat, fire, building collapse)
- Events outside Nigeria
- Articles with NO casualties (0 killed, 0 injured, 0 kidnapped)

LOCATION RULES:
- "Niger State" = state: "Niger" (NOT Niger Republic)
- Infer from context: Boko Haram/ISWAP → likely Borno/Adamawa/Yobe
- Bandits → likely Zamfara/Kaduna/Katsina/Niger

Nigerian states: ${NIGERIAN_STATES.join(', ')}

Return ONLY valid JSON:
{
  "is_valid_incident": boolean,
  "rejection_reason": string or null,
  "title": string (max 70 chars),
  "summary": string (2-3 sentences about what happened),
  "incident_date": string (ISO date),
  "state": string (Nigerian state),
  "lga": string (town/village),
  "fatalities": number,
  "injuries": number,
  "kidnapped": number,
  "incident_type": "Terrorism" | "Banditry" | "Unknown Gunmen" | "Herdsmen Attack" | "IPOB/ESN",
  "severity": "Low" | "Medium" | "High" | "Critical",
  "perpetrators": string (e.g., "Boko Haram", "Bandits", "Unknown Gunmen", "ISWAP", "Fulani Militia")
}`;

// Retry with exponential backoff - handles rate limits and empty responses
async function retryWithBackoff(fn, maxRetries = 4, baseDelay = 3000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await fn();
      // Retry on empty response
      if (!result || result.trim() === '') {
        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.log(`  ⏳ Empty response, retrying in ${delay/1000}s...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw new Error('Empty response after retries');
      }
      return result;
    } catch (error) {
      const isRetryable = error.message?.includes('429') || 
                          error.message?.includes('402') ||
                          error.message?.includes('Empty response') ||
                          error.message?.includes('timeout') ||
                          error.message?.includes('ECONNRESET');
      if (isRetryable && attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`  ⏳ ${error.message.substring(0, 30)}... retrying in ${delay/1000}s...`);
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
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract state from text as fallback
function extractStateFromText(text) {
  const lowerText = text.toLowerCase();
  
  // Check for explicit state mentions
  for (const state of NIGERIAN_STATES) {
    const patterns = [
      new RegExp(`\\b${state.toLowerCase()}\\s+state\\b`),
      new RegExp(`\\bin\\s+${state.toLowerCase()}\\b`),
      new RegExp(`\\b${state.toLowerCase()}\\s+community\\b`),
      new RegExp(`\\b${state.toLowerCase()}\\s+village\\b`),
    ];
    
    if (patterns.some(p => p.test(lowerText))) {
      return state;
    }
  }
  
  // Check for state name alone
  for (const state of NIGERIAN_STATES) {
    if (lowerText.includes(state.toLowerCase())) {
      // Avoid false positives
      if (state === 'Niger' && !lowerText.includes('niger state') && !lowerText.includes('niger community')) {
        continue; // Could be Niger Republic
      }
      return state;
    }
  }
  
  // Infer from perpetrators/context
  if (lowerText.includes('boko haram') || lowerText.includes('iswap')) {
    if (lowerText.includes('adamawa')) return 'Adamawa';
    if (lowerText.includes('yobe')) return 'Yobe';
    return 'Borno'; // Most likely
  }
  
  if (lowerText.includes('bandit') || lowerText.includes('cattle rustl')) {
    if (lowerText.includes('zamfara')) return 'Zamfara';
    if (lowerText.includes('katsina')) return 'Katsina';
    if (lowerText.includes('kaduna')) return 'Kaduna';
    if (lowerText.includes('niger')) return 'Niger';
  }
  
  return null;
}

// Validate and fix state
function validateState(state, articleText) {
  if (!state || state === 'Unknown') {
    const extracted = extractStateFromText(articleText);
    if (extracted) return extracted;
    return 'Unknown';
  }
  
  // Fix common issues
  const normalized = state.trim().replace(/\s+state$/i, '');
  
  // Direct match
  const found = NIGERIAN_STATES.find(s => s.toLowerCase() === normalized.toLowerCase());
  if (found) return found;
  
  // Handle "Niger State" being confused with Niger Republic
  if (normalized.toLowerCase() === 'niger') {
    return 'Niger';
  }
  
  // Fallback to text extraction
  const extracted = extractStateFromText(articleText);
  if (extracted) return extracted;
  
  return 'Unknown';
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
      'X-Title': 'Sentinel-NG',
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Classify this Nigerian news article:\n\nTitle: ${cleanTitle}\n\nContent: ${cleanContent}\n\nPublish Date: ${article.date}` }
      ],
      temperature: 0.1,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`OpenRouter error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content;
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
        { role: 'user', content: `Classify this Nigerian news article:\n\nTitle: ${cleanTitle}\n\nContent: ${cleanContent}\n\nPublish Date: ${article.date}` }
      ],
      temperature: 0.1,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) throw new Error(`Chutes error: ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content;
}

// Main classification function
export async function classifyWithChutes(article) {
  const provider = AI_PROVIDER.toLowerCase();
  const apiCall = provider === 'chutes' ? () => callChutes(article) : () => callOpenRouter(article);
  const providerName = provider === 'chutes' ? 'Chutes' : 'OpenRouter';
  const articleText = `${article.title} ${article.content}`;

  try {
    let content = await retryWithBackoff(apiCall);
    
    if (!content) throw new Error(`Empty response from ${providerName}`);

    // Strip markdown
    content = content.trim();
    if (content.startsWith('```json')) content = content.slice(7);
    else if (content.startsWith('```')) content = content.slice(3);
    if (content.endsWith('```')) content = content.slice(0, -3);
    content = content.trim();

    const parsed = JSON.parse(content);
    
    // Check validity
    if (!parsed.is_valid_incident) {
      console.log(`  ⊘ Rejected: ${parsed.rejection_reason || 'not valid'}`);
      return null;
    }

    // Must have casualties
    const totalCasualties = (parsed.fatalities || 0) + (parsed.injuries || 0) + (parsed.kidnapped || 0);
    if (totalCasualties === 0) {
      console.log(`  ⊘ Rejected: no casualties`);
      return null;
    }

    // Validate and fix state
    const state = validateState(parsed.state, articleText);
    if (state === 'Unknown') {
      console.log(`  ⚠ Warning: Could not determine state`);
    }
    
    // Get coordinates
    const coords = STATE_COORDS[state] || STATE_COORDS['FCT'];
    const lat = coords.lat + (Math.random() - 0.5) * 0.4;
    const lng = coords.lng + (Math.random() - 0.5) * 0.4;

    return {
      title: cleanHtml(parsed.title) || cleanHtml(article.title).substring(0, 70),
      description: cleanHtml(parsed.summary) || '',
      date: parsed.incident_date || article.date || new Date().toISOString(),
      state: state,
      lga: parsed.lga || 'Unknown',
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

// Fallback classification
function fallbackClassify(article) {
  const text = cleanHtml(`${article.title} ${article.content}`).toLowerCase();
  
  // Skip non-incidents
  const skipPatterns = ['released', 'freed', 'rescued', 'arrest', 'condemn', 'react', 'vow', 'analysis'];
  if (skipPatterns.some(p => text.includes(p)) && !text.includes('kill') && !text.includes('attack')) {
    return null;
  }
  
  // Must be security related
  const securityKeywords = ['kill', 'attack', 'kidnap', 'abduct', 'bandit', 'terrorist', 'gunmen', 'dead', 'shot', 'bomb'];
  if (!securityKeywords.some(kw => text.includes(kw))) return null;

  // Extract state
  const state = extractStateFromText(text) || 'Unknown';

  // Extract numbers
  const deathMatch = text.match(/(\d+)\s*(killed|dead|die)/);
  const kidnappedMatch = text.match(/(\d+)\s*(kidnapped|abducted|taken)/);
  const injuredMatch = text.match(/(\d+)\s*(injured|wounded)/);

  const fatalities = deathMatch ? parseInt(deathMatch[1]) : 0;
  const kidnapped = kidnappedMatch ? parseInt(kidnappedMatch[1]) : 0;
  const injuries = injuredMatch ? parseInt(injuredMatch[1]) : 0;

  if (fatalities + kidnapped + injuries === 0) return null;

  // Classify type
  let incident_type = 'Unknown Gunmen';
  if (text.includes('boko haram') || text.includes('iswap') || text.includes('terrorist')) {
    incident_type = 'Terrorism';
  } else if (text.includes('bandit')) {
    incident_type = 'Banditry';
  } else if (text.includes('cult')) {
    incident_type = 'Cult Clash';
  }

  const total = fatalities + kidnapped + injuries;
  let severity = 'Low';
  if (fatalities >= 10 || total >= 30) severity = 'Critical';
  else if (fatalities >= 5 || total >= 15) severity = 'High';
  else if (fatalities >= 1 || total >= 5) severity = 'Medium';

  const coords = STATE_COORDS[state] || STATE_COORDS['Borno'];

  return {
    title: cleanHtml(article.title).substring(0, 70),
    description: cleanHtml(article.content).substring(0, 200),
    date: article.date || new Date().toISOString(),
    state,
    lga: 'Unknown',
    lat: coords.lat + (Math.random() - 0.5) * 0.4,
    lng: coords.lng + (Math.random() - 0.5) * 0.4,
    fatalities,
    injuries,
    kidnapped,
    incident_type,
    severity,
    source_url: article.url || null,
    verified: false,
  };
}
