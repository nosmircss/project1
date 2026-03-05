import type { LucideIcon } from 'lucide-react'

export interface LocationInfo {
  zip: string
  city: string
  stateCode: string
  lat: number
  lon: number
  displayName: string // "Denver, CO"
}

export interface HourlySlice {
  time: string              // ISO 8601 local, e.g. "2026-03-04T15:00"
  temperature: number       // in user's selected unit
  weatherCode: number       // WMO code
  precipProbability: number // 0-100
}

export interface HourlyData {
  time: string[]
  temperature: number[]
  weatherCode: number[]
  precipProbability: number[]
}

export interface WeatherData {
  temperature: number
  feelsLike: number
  weatherCode: number
  isDay: boolean
  time: string
  windSpeed: number       // in user's selected unit (mph or km/h)
  windDirection: number   // degrees 0-360 — convert to compass in UI
  humidity: number        // percent
  uvIndex: number         // float, e.g. 2.30
  pressure: number        // hPa
  sunrise: string         // ISO 8601 local time, e.g. "2026-03-01T06:32"
  sunset: string          // ISO 8601 local time, e.g. "2026-03-01T17:51"
  units: {
    temperature: string   // "°F" or "°C"
    windSpeed: string     // display string: always show "mph" or "km/h" (NOT raw API "mp/h")
  }
  hourly?: HourlyData     // raw parallel arrays from API; slicing to HourlySlice[] happens in useWeather
}

export interface AppSettings {
  temperatureUnit: 'fahrenheit' | 'celsius'
  windSpeedUnit: 'mph' | 'kmh'   // 'kmh' matches Open-Meteo param value (NOT 'km/h')
  refreshInterval: number         // minutes, default 5
}

export interface WeatherDisplay {
  Icon: LucideIcon
  label: string
}

// App-level state combining location + weather
export interface LocationWeather {
  location: LocationInfo
  weather: WeatherData | null
  loading: boolean
  error: string | null
}
