// Open-Meteo API client running in main process (Node.js context).
// CRITICAL per RESEARCH.md Pitfall 6: Always include timezone: 'auto' —
// without it, is_day is computed for UTC, not the location's local time.
const BASE = 'https://api.open-meteo.com/v1/forecast'

export interface OpenMeteoResult {
  temperature: number
  feelsLike: number
  weatherCode: number
  isDay: boolean
  time: string
  units: { temperature: string }
}

export async function fetchWeather(lat: number, lon: number): Promise<OpenMeteoResult> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: ['temperature_2m', 'apparent_temperature', 'weather_code', 'is_day'].join(','),
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    timezone: 'auto'
  })

  const res = await fetch(`${BASE}?${params}`)
  if (!res.ok) throw new Error(`Weather API error: ${res.status} ${res.statusText}`)

  const json = await res.json()
  const current = json.current

  return {
    temperature: current.temperature_2m,
    feelsLike: current.apparent_temperature,
    weatherCode: current.weather_code,
    isDay: current.is_day === 1,
    time: current.time,
    units: {
      temperature: json.current_units?.temperature_2m || '°F'
    }
  }
}
