import { describe, it, expect } from 'vitest'
import { Sun, Moon, Cloud, CloudSun, CloudMoon, CloudRain, CloudSnow, CloudDrizzle, CloudLightning, CloudFog } from 'lucide-react'
import { getWeatherDisplay } from '../weatherCodeMap'

describe('getWeatherDisplay', () => {
  // Code 0: Clear sky
  it('returns Sun for clear day (code 0, isDay true)', () => {
    const result = getWeatherDisplay(0, true)
    expect(result.Icon).toBe(Sun)
    expect(result.label).toBe('Clear')
  })

  it('returns Moon for clear night (code 0, isDay false)', () => {
    const result = getWeatherDisplay(0, false)
    expect(result.Icon).toBe(Moon)
    expect(result.label).toBe('Clear')
  })

  // Codes 1-2: Partly cloudy
  it('returns CloudSun for partly cloudy day (code 1)', () => {
    const result = getWeatherDisplay(1, true)
    expect(result.Icon).toBe(CloudSun)
  })

  it('returns CloudMoon for partly cloudy night (code 2)', () => {
    const result = getWeatherDisplay(2, false)
    expect(result.Icon).toBe(CloudMoon)
  })

  // Code 3: Overcast
  it('returns Cloud for overcast (code 3)', () => {
    const result = getWeatherDisplay(3, true)
    expect(result.Icon).toBe(Cloud)
    expect(result.label).toBe('Overcast')
  })

  // Code 4-48: Foggy
  it('returns CloudFog for foggy (code 45)', () => {
    const result = getWeatherDisplay(45, true)
    expect(result.Icon).toBe(CloudFog)
    expect(result.label).toBe('Foggy')
  })

  it('returns CloudFog for code 48', () => {
    const result = getWeatherDisplay(48, true)
    expect(result.Icon).toBe(CloudFog)
  })

  // Code 51-57: Drizzle
  it('returns CloudDrizzle for drizzle (code 51)', () => {
    const result = getWeatherDisplay(51, true)
    expect(result.Icon).toBe(CloudDrizzle)
    expect(result.label).toBe('Drizzle')
  })

  it('returns CloudDrizzle for code 57', () => {
    const result = getWeatherDisplay(57, true)
    expect(result.Icon).toBe(CloudDrizzle)
  })

  // Code 58-67: Rain
  it('returns CloudRain for rain (code 61)', () => {
    const result = getWeatherDisplay(61, true)
    expect(result.Icon).toBe(CloudRain)
    expect(result.label).toBe('Rain')
  })

  it('returns CloudRain for code 67', () => {
    const result = getWeatherDisplay(67, true)
    expect(result.Icon).toBe(CloudRain)
  })

  // Code 68-77: Snow
  it('returns CloudSnow for snow (code 71)', () => {
    const result = getWeatherDisplay(71, true)
    expect(result.Icon).toBe(CloudSnow)
    expect(result.label).toBe('Snow')
  })

  it('returns CloudSnow for code 77', () => {
    const result = getWeatherDisplay(77, true)
    expect(result.Icon).toBe(CloudSnow)
  })

  // Code 78-82: Showers
  it('returns CloudRain for showers (code 80)', () => {
    const result = getWeatherDisplay(80, true)
    expect(result.Icon).toBe(CloudRain)
    expect(result.label).toBe('Showers')
  })

  it('returns CloudRain for code 82', () => {
    const result = getWeatherDisplay(82, true)
    expect(result.Icon).toBe(CloudRain)
  })

  // Code 83-86: Snow showers
  it('returns CloudSnow for snow showers (code 85)', () => {
    const result = getWeatherDisplay(85, true)
    expect(result.Icon).toBe(CloudSnow)
    expect(result.label).toBe('Snow Showers')
  })

  it('returns CloudSnow for code 86', () => {
    const result = getWeatherDisplay(86, true)
    expect(result.Icon).toBe(CloudSnow)
  })

  // Code 87+: Thunderstorm
  it('returns CloudLightning for thunderstorm (code 95)', () => {
    const result = getWeatherDisplay(95, true)
    expect(result.Icon).toBe(CloudLightning)
    expect(result.label).toBe('Thunderstorm')
  })

  it('returns CloudLightning for code 99', () => {
    const result = getWeatherDisplay(99, true)
    expect(result.Icon).toBe(CloudLightning)
    expect(result.label).toBe('Thunderstorm')
  })
})
