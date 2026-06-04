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

  return `You are a real estate assistant.

User requirement:
${requirement}.

Available matching properties:
${propertyList}

Rules:
- Answer ONLY from the available property data above.
- Do not invent or assume price, location, area, availability, RERA, or possession date.
- If no properties match, say no exact match was found and suggest relaxing filters (e.g. higher budget, a different sector, or allowing a greater distance from the metro).
- Be concise. Present each option clearly with its key details.`
}
