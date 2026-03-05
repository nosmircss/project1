// Open-Meteo API client running in main process (Node.js context).
// CRITICAL: Always include timezone: 'auto' — without it, is_day is computed for UTC.
// CRITICAL: wind_speed_unit param must be 'kmh' not 'km/h' (API rejects slash).
// CRITICAL: API returns wind speed unit label as "mp/h" (not "mph") — normalize in units field.
const BASE = 'https://api.open-meteo.com/v1/forecast'

export interface OpenMeteoResult {
  temperature: number
  feelsLike: number
  weatherCode: number
  isDay: boolean
  time: string
  windSpeed: number
  windDirection: number
  humidity: number
  uvIndex: number
  pressure: number
  sunrise: string
  sunset: string
  units: {
    temperature: string
    windSpeed: string   // always 'mph' or 'km/h' (normalized from API's "mp/h")
  }
  hourly: {
    time: string[]
    temperature: number[]
    weatherCode: number[]
    precipProbability: number[]
  }
}

export async function fetchWeather(
  lat: number,
  lon: number,
  settings: { temperatureUnit: string; windSpeedUnit: string }
): Promise<OpenMeteoResult> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: [
      'temperature_2m', 'apparent_temperature', 'weather_code', 'is_day',
      'wind_speed_10m', 'wind_direction_10m', 'relative_humidity_2m',
      'uv_index', 'surface_pressure'
    ].join(','),
    daily: 'sunrise,sunset',
    temperature_unit: settings.temperatureUnit,
    wind_speed_unit: settings.windSpeedUnit,
    timezone: 'auto',
    forecast_days: '1'
  })
  params.set('hourly', 'temperature_2m,weather_code,precipitation_probability')
  params.set('forecast_hours', '24')

  const res = await fetch(`${BASE}?${params}`)
  if (!res.ok) throw new Error(`Weather API error: ${res.status} ${res.statusText}`)

  const json = await res.json()
  const current = json.current

  // Normalize wind speed display label — API returns "mp/h" not "mph"
  const rawWindUnit = json.current_units?.wind_speed_10m || 'mp/h'
  const windDisplayUnit = rawWindUnit === 'mp/h' ? 'mph' : 'km/h'

  return {
    temperature: current.temperature_2m,
    feelsLike: current.apparent_temperature,
    weatherCode: current.weather_code,
    isDay: current.is_day === 1,
    time: current.time,
    windSpeed: current.wind_speed_10m,
    windDirection: current.wind_direction_10m,
    humidity: current.relative_humidity_2m,
    uvIndex: current.uv_index,
    pressure: current.surface_pressure,
    sunrise: json.daily.sunrise[0],   // today's value is always index 0
    sunset: json.daily.sunset[0],
    units: {
      temperature: json.current_units?.temperature_2m || '°F',
      windSpeed: windDisplayUnit
    },
    hourly: {
      time: json.hourly.time as string[],
      temperature: json.hourly.temperature_2m as number[],
      weatherCode: json.hourly.weather_code as number[],
      precipProbability: json.hourly.precipitation_probability as number[]
    }
  }
}
