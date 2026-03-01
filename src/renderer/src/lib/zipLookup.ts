// Load zipcodes-us only in the renderer process to avoid doubling memory usage.
// Per RESEARCH.md Pitfall 5: zipcodes-us bundles the full US dataset in memory.
import zipcodes from 'zipcodes-us'
import type { LocationInfo } from './types'

/**
 * Resolves a US zip code to a LocationInfo object.
 * Returns null for empty strings, non-5-digit strings, and invalid/unknown zips.
 * Never throws.
 */
export function resolveZip(zip: string): LocationInfo | null {
  // Validate: must be exactly 5 digits
  if (!zip || !/^\d{5}$/.test(zip)) {
    return null
  }

  const result = zipcodes.find(zip)
  if (!result || !result.isValid) {
    return null
  }

  return {
    zip,
    city: result.city,
    stateCode: result.stateCode,
    lat: result.latitude,
    lon: result.longitude,
    displayName: `${result.city}, ${result.stateCode}`
  }
}
