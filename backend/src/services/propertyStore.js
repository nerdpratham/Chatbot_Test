import { readdirSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../data/properties')

// "Near metro" means within this distance unless the user specifies otherwise.
const DEFAULT_METRO_RADIUS_M = 1500

/**
 * Loads every *.json document from the data/properties folder and flattens
 * them into a single list. Read fresh each call so edits to the data files
 * are reflected without a restart.
 */
export function loadProperties() {
  let files
  try {
    files = readdirSync(DATA_DIR).filter(f => f.endsWith('.json'))
  } catch {
    return [] // folder missing — treat as empty catalogue
  }

  const all = []
  for (const file of files) {
    try {
      const parsed = JSON.parse(readFileSync(join(DATA_DIR, file), 'utf-8'))
      if (Array.isArray(parsed)) all.push(...parsed)
      else all.push(parsed)
    } catch (err) {
      console.error(`Skipping malformed property file "${file}":`, err.message)
    }
  }
  return all
}

/**
 * Filters the catalogue against a structured requirement object.
 * Only fields that are present on `req` are applied as filters.
 */
export function searchProperties(req = {}) {
  const metroRadius = req.metroRadiusM ?? DEFAULT_METRO_RADIUS_M

  return loadProperties().filter(p => {
    if (req.city && p.city?.toLowerCase() !== req.city.toLowerCase()) return false
    if (req.bhk && p.bhk !== req.bhk) return false
    if (req.maxBudget && p.price > req.maxBudget) return false
    if (req.minBudget && p.price < req.minBudget) return false
    if (req.locality && !p.locality?.toLowerCase().includes(req.locality.toLowerCase())) return false
    if (req.status && p.status !== req.status) return false
    if (req.nearMetro) {
      if (p.distanceToMetroM == null || p.distanceToMetroM > metroRadius) return false
    }
    return true
  })
}

/** Formats rupees into a readable ₹ crore / lakh string. */
export function formatPrice(rupees) {
  if (rupees == null) return 'price N/A'
  if (rupees >= 10000000) {
    const cr = (rupees / 10000000).toFixed(2).replace(/\.?0+$/, '')
    return `₹${cr} crore`
  }
  if (rupees >= 100000) {
    const lakh = (rupees / 100000).toFixed(2).replace(/\.?0+$/, '')
    return `₹${lakh} lakh`
  }
  return `₹${rupees}`
}

/** Renders a single property as one human-readable line for the LLM prompt. */
export function formatProperty(p, index) {
  const availability = p.status === 'ready-to-move'
    ? 'ready to move'
    : `possession ${p.possession ?? 'TBD'}`
  const metro = p.distanceToMetroM != null ? `${p.distanceToMetroM}m from metro` : 'metro distance N/A'

  return `${index + 1}. ${p.project}, ${p.locality}, ${p.bhk} BHK, ${formatPrice(p.price)}, ` +
    `${p.areaSqft} sq.ft, ${metro}, ${availability}${p.rera ? `, RERA ${p.rera}` : ''}.`
}
