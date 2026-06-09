import { formatProperty, formatPrice } from './propertyStore.js'

/** Human-readable one-line summary of what the user is looking for. */
export function summarizeRequirements(req) {
  const parts = []
  if (req.bhk) parts.push(`${req.bhk} BHK`)
  if (req.city) parts.push(`in ${req.city}`)
  if (req.locality) parts.push(`(${req.locality})`)
  if (req.maxBudget) parts.push(`under ${formatPrice(req.maxBudget)}`)
  if (req.minBudget) parts.push(`above ${formatPrice(req.minBudget)}`)
  if (req.nearMetro) parts.push('near metro')
  if (req.status === 'ready-to-move') parts.push('ready to move')
  if (req.status === 'under-construction') parts.push('under construction')
  return parts.join(' ') || 'a property'
}

/**
 * Builds the grounded system prompt: injects the matched properties and the
 * anti-hallucination rules so the model answers only from real data.
 */
export function buildGroundedSystemPrompt(req, matches) {
  const requirement = summarizeRequirements(req)
  const propertyList = matches.length
    ? matches.map(formatProperty).join('\n')
    : '(none matched the criteria)'

  const hasMatches = matches.length > 0

  return `You are a real estate assistant.

User requirement:
${requirement}.

Available matching properties:
${propertyList}

The matching properties are ALSO shown to the user as visual cards directly below your message, so you do not need to repeat each property's full details.

Rules:
- Answer ONLY from the available property data above. Never invent price, location, area, availability, RERA, or possession date.
${hasMatches
  ? `- Since the cards already list the details, reply with ONE short, friendly sentence introducing the ${matches.length} option${matches.length > 1 ? 's' : ''} (e.g. "Here are a few options that match your requirement:"). Do NOT list the individual properties in prose.`
  : `- No properties matched. Tell the user no exact match was found and suggest relaxing filters (e.g. a higher budget, a different sector, or allowing a greater distance from the metro). Keep it to one or two sentences.`}
- If the user asks a specific question about a listed property (e.g. which is cheapest), answer it directly from the data above.`
}
