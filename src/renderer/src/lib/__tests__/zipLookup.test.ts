import { describe, it, expect } from 'vitest'
import { resolveZip } from '../zipLookup'

describe('resolveZip', () => {
  it('resolves a valid zip code to location info', () => {
    const result = resolveZip('80202')
    expect(result).not.toBeNull()
    expect(result?.city).toBeTruthy()
    expect(result?.stateCode).toBe('CO')
    expect(result?.lat).toBeTypeOf('number')
    expect(result?.lon).toBeTypeOf('number')
    expect(result?.displayName).toMatch(/,\s*CO$/)
  })

  it('returns null for invalid zip code 00000', () => {
    const result = resolveZip('00000')
    expect(result).toBeNull()
  })

  it('returns null for empty string', () => {
    const result = resolveZip('')
    expect(result).toBeNull()
  })

  it('returns null for non-numeric input', () => {
    const result = resolveZip('abc')
    expect(result).toBeNull()
  })

  it('returns null for too-short zip code', () => {
    const result = resolveZip('1234')
    expect(result).toBeNull()
  })

  it('returns null for too-long zip code', () => {
    const result = resolveZip('123456')
    expect(result).toBeNull()
  })

  it('includes zip code in result', () => {
    const result = resolveZip('90210')
    expect(result).not.toBeNull()
    expect(result?.zip).toBe('90210')
  })

  it('formats displayName as "City, ST"', () => {
    const result = resolveZip('10001')
    expect(result).not.toBeNull()
    expect(result?.displayName).toMatch(/^.+,\s*[A-Z]{2}$/)
  })
})
