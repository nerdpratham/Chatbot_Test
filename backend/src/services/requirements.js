import { generateText } from './llm.js'

// Fields the user MUST provide before we can run a meaningful search.
const REQUIRED_FIELDS = ['city', 'bhk', 'maxBudget']

// Natural-language phrasing for each missing field, used to build follow-ups.
const FIELD_QUESTIONS = {
  city: 'which city or area you’re looking in',
  bhk: 'how many bedrooms you need (e.g. 2 BHK, 3 BHK)',
  maxBudget: 'your approximate budget',
}

const EXTRACTION_PROMPT = `You are a parser for a real estate assistant. Read the conversation and extract the user's property requirements.

Return ONLY a JSON object (no markdown, no commentary) with these keys:
- "city": string or null — the city, e.g. "Noida", "Gurgaon"
- "locality": string or null — sector/area if mentioned, e.g. "Sector 76"
- "bhk": number or null — number of bedrooms
- "maxBudget": number or null — maximum budget in RUPEES (e.g. "1.2 crore" => 12000000, "85 lakh" => 8500000)
- "minBudget": number or null — minimum budget in rupees if a range is given
- "nearMetro": boolean or null — true if the user wants to be near a metro
- "status": string or null — "ready-to-move" or "under-construction" if specified

Use null for anything not clearly stated. Do NOT guess values the user did not provide.`

/** Strips code fences and parses the first JSON object found in a string. */
function parseLooseJson(text) {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON object in extraction output')
  return JSON.parse(cleaned.slice(start, end + 1))
}

/**
 * Uses the LLM to extract a structured requirement object from the whole
 * conversation, so requirements accumulate as the user answers follow-ups.
 */
export async function extractRequirements(history) {
  const transcript = history
    .map(m => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`)
    .join('\n')

  const raw = await generateText(
    [{ role: 'user', content: `${EXTRACTION_PROMPT}\n\nConversation:\n${transcript}` }],
    'You output only valid minified JSON.',
  )
  return parseLooseJson(raw)
}

/** Returns the list of required fields still missing from the requirements. */
export function findMissingFields(req) {
  return REQUIRED_FIELDS.filter(f => req?.[f] == null || req[f] === '')
}

/** Builds a friendly follow-up question asking only for the missing fields. */
export function buildFollowUp(missing) {
  const asks = missing.map(f => FIELD_QUESTIONS[f]).filter(Boolean)
  let list
  if (asks.length === 1) list = asks[0]
  else if (asks.length === 2) list = `${asks[0]} and ${asks[1]}`
  else list = `${asks.slice(0, -1).join(', ')}, and ${asks[asks.length - 1]}`

  return `Happy to help you find a property! Could you tell me ${list}?`
}
