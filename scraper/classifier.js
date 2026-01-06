const CHUTES_API_KEY = process.env.CHUTES_API_KEY;
const CHUTES_API_URL = 'https://llm.chutes.ai/v1/chat/completions';

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

const SYSTEM_PROMPT = `You are a security incident classifier for Nigerian news. Extract structured data from news articles about violence, terrorism, banditry, kidnapping, and security incidents in Nigeria.

Return a JSON object with these fields:
- is_security_incident: boolean (true if article is about violence/security)
- title: string (concise incident title, max 80 chars)
- description: string (brief summary, max 200 chars)
- state: string (Nigerian state name)
- lga: string (Local Government Area if mentioned)
- fatalities: number (deaths, 0 if unknown)
- injuries: number (injured count, 0 if unknown)
- kidnapped: number (abducted count, 0 if unknown)
- incident_type: one of ["Terrorism", "Banditry", "Civil Unrest", "Unknown Gunmen", "Police Clash", "Cult Clash"]
- severity: one of ["Low", "Medium", "High", "Critical"]
- date: ISO date string (from article or today if not mentioned)

Only return valid JSON, no markdown or explanation.`;

export async function classifyWithChutes(article) {
  if (!CHUTES_API_KEY) {
    console.warn('CHUTES_API_KEY not set, using fallback classification');
    return fallbackClassify(article);
  }

  try {
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
          { role: 'user', content: `Title: ${article.title}\n\nContent: ${article.content}\n\nURL: ${article.url}` }
        ],
        temperature: 0.1,
        max_tokens: 30000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Chutes API error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('Empty response from Chutes');
    }

    // Strip markdown code blocks if present
    content = content.trim();
    if (content.startsWith('```json')) {
      content = content.slice(7);
    } else if (content.startsWith('```')) {
      content = content.slice(3);
    }
    if (content.endsWith('```')) {
      content = content.slice(0, -3);
    }
    content = content.trim();

    const parsed = JSON.parse(content);
    
    if (!parsed.is_security_incident) {
      console.log(`Skipping non-security article: ${article.title.substring(0, 40)}...`);
      return null;
    }

    // Add coordinates
    const state = parsed.state || 'Unknown';
    const coords = STATE_COORDS[state] || STATE_COORDS['FCT'];
    const lat = coords.lat + (Math.random() - 0.5) * 0.3;
    const lng = coords.lng + (Math.random() - 0.5) * 0.3;

    return {
      title: parsed.title,
      description: parsed.description,
      date: parsed.date || new Date().toISOString(),
      state: state,
      lga: parsed.lga || 'Unknown',
      lat,
      lng,
      fatalities: parsed.fatalities || 0,
      injuries: parsed.injuries || 0,
      kidnapped: parsed.kidnapped || 0,
      incident_type: parsed.incident_type,
      severity: parsed.severity,
      source_url: article.url || null,
      verified: false,
    };
  } catch (err) {
    console.error('Chutes classification failed:', err.message);
    return fallbackClassify(article);
  }
}

function fallbackClassify(article) {
  const text = `${article.title} ${article.content}`.toLowerCase();
  
  // Check if it's a security incident
  const securityKeywords = ['kill', 'attack', 'kidnap', 'abduct', 'bandit', 'terrorist', 'gunmen', 'dead', 'shot', 'bomb'];
  const isSecurityIncident = securityKeywords.some(kw => text.includes(kw));
  
  if (!isSecurityIncident) {
    return null;
  }

  // Extract state
  let state = 'Unknown';
  for (const s of Object.keys(STATE_COORDS)) {
    if (text.includes(s.toLowerCase())) {
      state = s;
      break;
    }
  }

  // Extract numbers
  const deathMatch = text.match(/(\d+)\s*(killed|dead|death)/);
  const kidnappedMatch = text.match(/(\d+)\s*(kidnapped|abducted)/);
  const injuredMatch = text.match(/(\d+)\s*(injured|wounded)/);

  const fatalities = deathMatch ? parseInt(deathMatch[1]) : 0;
  const kidnapped = kidnappedMatch ? parseInt(kidnappedMatch[1]) : 0;
  const injuries = injuredMatch ? parseInt(injuredMatch[1]) : 0;

  // Classify type
  let incident_type = 'Unknown Gunmen';
  if (text.includes('boko haram') || text.includes('iswap') || text.includes('terrorist')) {
    incident_type = 'Terrorism';
  } else if (text.includes('bandit') || text.includes('kidnap')) {
    incident_type = 'Banditry';
  } else if (text.includes('cult')) {
    incident_type = 'Cult Clash';
  } else if (text.includes('police') || text.includes('army')) {
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
    title: article.title.substring(0, 80),
    description: article.content.substring(0, 200),
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
