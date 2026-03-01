import { describe, it, expect } from 'vitest'
import { degreesToCompass } from '../windDirection'

describe('degreesToCompass', () => {
  it('converts cardinal directions', () => {
    expect(degreesToCompass(0)).toBe('N')
    expect(degreesToCompass(90)).toBe('E')
    expect(degreesToCompass(180)).toBe('S')
    expect(degreesToCompass(270)).toBe('W')
  })
  it('converts intercardinal directions', () => {
    expect(degreesToCompass(45)).toBe('NE')
    expect(degreesToCompass(135)).toBe('SE')
    expect(degreesToCompass(225)).toBe('SW')
    expect(degreesToCompass(315)).toBe('NW')
  })
  it('wraps 360 back to N', () => {
    expect(degreesToCompass(360)).toBe('N')
  })
  it('handles boundary near N (354°)', () => {
    expect(degreesToCompass(354)).toBe('N')
  })
})
