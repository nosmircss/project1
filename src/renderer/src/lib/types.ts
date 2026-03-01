import type { LucideIcon } from 'lucide-react'

export interface LocationInfo {
  zip: string
  city: string
  stateCode: string
  lat: number
  lon: number
  displayName: string // "Denver, CO"
}

export interface WeatherData {
  temperature: number // °F
  feelsLike: number // °F
  weatherCode: number // WMO code
  isDay: boolean
  time: string // ISO 8601
  units: {
    temperature: string // "°F"
  }
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
