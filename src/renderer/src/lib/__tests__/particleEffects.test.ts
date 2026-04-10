import { describe, it, expect } from 'vitest'
import { getEffectConfig } from '../particleEffects'

describe('getEffectConfig', () => {
  // Clear sky (code 0)
  it('returns ambient-day for clear sky during day', () => {
    const config = getEffectConfig(0, true)
    expect(config.effect).toBe('ambient-day')
    expect(config.color).toBe('#ffaa00')
    expect(config.particleCount).toBe(20)
    expect(config.speed).toBe(0.3)
  })

  it('returns ambient-night for clear sky at night', () => {
    const config = getEffectConfig(0, false)
    expect(config.effect).toBe('ambient-night')
    expect(config.color).toBe('#e0e0ff')
    expect(config.particleCount).toBe(30)
    expect(config.speed).toBe(0.1)
  })

  // Partly cloudy (codes 1-2)
  it('returns ambient-day for partly cloudy during day (code 1)', () => {
    const config = getEffectConfig(1, true)
    expect(config.effect).toBe('ambient-day')
    expect(config.color).toBe('#ffaa00')
  })

  it('returns ambient-night for partly cloudy at night (code 2)', () => {
    const config = getEffectConfig(2, false)
    expect(config.effect).toBe('ambient-night')
    expect(config.color).toBe('#e0e0ff')
  })

  // Overcast (code 3)
  it('returns ambient-day with reduced count for overcast', () => {
    const config = getEffectConfig(3, true)
    expect(config.effect).toBe('ambient-day')
    expect(config.particleCount).toBeLessThanOrEqual(15)
  })

  it('returns ambient-night with reduced count for overcast at night', () => {
    const config = getEffectConfig(3, false)
    expect(config.effect).toBe('ambient-night')
    expect(config.particleCount).toBeLessThanOrEqual(15)
  })

  // Fog (codes 4-48)
  it('returns fog for code 45', () => {
    const config = getEffectConfig(45, true)
    expect(config.effect).toBe('fog')
    expect(config.color).toBe('#00f0ff')
  })

  it('returns fog for code 48 (upper fog boundary)', () => {
    const config = getEffectConfig(48, true)
    expect(config.effect).toBe('fog')
    expect(config.color).toBe('#00f0ff')
  })

  it('returns fog for gap code 10 (safe handling of WMO gaps)', () => {
    const config = getEffectConfig(10, true)
    expect(config.effect).toBe('fog')
  })

  // Drizzle (codes 51-57)
  it('returns drizzle for code 51 with light count (~30)', () => {
    const config = getEffectConfig(51, true)
    expect(config.effect).toBe('drizzle')
    expect(config.color).toBe('#00f0ff')
    expect(config.particleCount).toBeGreaterThanOrEqual(25)
    expect(config.particleCount).toBeLessThanOrEqual(40)
  })

  it('returns drizzle for code 55 with heavy count (~60)', () => {
    const config = getEffectConfig(55, true)
    expect(config.effect).toBe('drizzle')
    expect(config.color).toBe('#00f0ff')
    expect(config.particleCount).toBeGreaterThanOrEqual(50)
    expect(config.particleCount).toBeLessThanOrEqual(70)
  })

  // Rain (codes 58-67)
  it('returns rain-light for code 61', () => {
    const config = getEffectConfig(61, true)
    expect(config.effect).toBe('rain-light')
    expect(config.color).toBe('#00f0ff')
    expect(config.particleCount).toBeGreaterThanOrEqual(40)
    expect(config.particleCount).toBeLessThanOrEqual(60)
  })

  it('returns rain-heavy for code 65', () => {
    const config = getEffectConfig(65, true)
    expect(config.effect).toBe('rain-heavy')
    expect(config.color).toBe('#00f0ff')
    expect(config.particleCount).toBeGreaterThanOrEqual(90)
    expect(config.particleCount).toBeLessThanOrEqual(110)
  })

  // Snow (codes 68-77)
  it('returns snow-light for code 71 with correct color', () => {
    const config = getEffectConfig(71, true)
    expect(config.effect).toBe('snow-light')
    expect(config.color).toBe('#e0e0ff')
    expect(config.particleCount).toBeGreaterThanOrEqual(35)
    expect(config.particleCount).toBeLessThanOrEqual(50)
  })

  it('returns snow-heavy for code 75 with white color', () => {
    const config = getEffectConfig(75, true)
    expect(config.effect).toBe('snow-heavy')
    expect(config.color).toBe('#ffffff')
    expect(config.particleCount).toBeGreaterThanOrEqual(70)
    expect(config.particleCount).toBeLessThanOrEqual(90)
  })

  // Showers (codes 78-82)
  it('returns rain variant for code 80', () => {
    const config = getEffectConfig(80, true)
    expect(['rain-light', 'rain-heavy']).toContain(config.effect)
    expect(config.color).toBe('#00f0ff')
  })

  it('returns rain-light for code 78 (light showers)', () => {
    const config = getEffectConfig(78, true)
    expect(config.effect).toBe('rain-light')
  })

  it('returns rain-heavy for code 82 (heavy showers)', () => {
    const config = getEffectConfig(82, true)
    expect(config.effect).toBe('rain-heavy')
  })

  // Snow showers (codes 83-86)
  it('returns snow variant for code 85', () => {
    const config = getEffectConfig(85, true)
    expect(['snow-light', 'snow-heavy']).toContain(config.effect)
  })

  it('returns snow-light for code 83 (light snow showers)', () => {
    const config = getEffectConfig(83, true)
    expect(config.effect).toBe('snow-light')
  })

  it('returns snow-heavy for code 86 (heavy snow showers)', () => {
    const config = getEffectConfig(86, true)
    expect(config.effect).toBe('snow-heavy')
  })

  // Thunderstorm (codes 87+)
  it('returns thunder for code 95', () => {
    const config = getEffectConfig(95, true)
    expect(config.effect).toBe('thunder')
    expect(config.color).toBe('#00f0ff')
    expect(config.particleCount).toBeGreaterThanOrEqual(100)
    expect(config.particleCount).toBeLessThanOrEqual(120)
  })

  it('returns thunder for code 99 (upper thunderstorm range)', () => {
    const config = getEffectConfig(99, true)
    expect(config.effect).toBe('thunder')
    expect(config.color).toBe('#00f0ff')
  })

  // Color theme validation
  it('uses neon-cyan (#00f0ff) for rain-light, rain-heavy, drizzle, fog, thunder', () => {
    expect(getEffectConfig(51, true).color).toBe('#00f0ff')  // drizzle
    expect(getEffectConfig(61, true).color).toBe('#00f0ff')  // rain-light
    expect(getEffectConfig(65, true).color).toBe('#00f0ff')  // rain-heavy
    expect(getEffectConfig(45, true).color).toBe('#00f0ff')  // fog
    expect(getEffectConfig(95, true).color).toBe('#00f0ff')  // thunder
  })

  it('uses warning color (#ffaa00) for ambient-day', () => {
    expect(getEffectConfig(0, true).color).toBe('#ffaa00')
    expect(getEffectConfig(1, true).color).toBe('#ffaa00')
    expect(getEffectConfig(3, true).color).toBe('#ffaa00')
  })

  it('uses text-primary color (#e0e0ff) for ambient-night', () => {
    expect(getEffectConfig(0, false).color).toBe('#e0e0ff')
    expect(getEffectConfig(1, false).color).toBe('#e0e0ff')
  })

  // Verify configs have all required fields
  it('returns config with all required fields (effect, particleCount, speed, color, glowSize)', () => {
    const config = getEffectConfig(61, true)
    expect(config).toHaveProperty('effect')
    expect(config).toHaveProperty('particleCount')
    expect(config).toHaveProperty('speed')
    expect(config).toHaveProperty('color')
    expect(config).toHaveProperty('glowSize')
  })
})
