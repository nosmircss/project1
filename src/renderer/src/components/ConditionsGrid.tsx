import { Wind, Droplets, Sun, Gauge, Sunrise, Sunset } from 'lucide-react'
import { ConditionCard } from './ConditionCard'
import { degreesToCompass } from '../lib/windDirection'
import type { WeatherData } from '../lib/types'

function uvRiskLabel(uv: number): { label: string; color: string } {
  if (uv < 3)  return { label: 'Low',       color: '#00cc44' }
  if (uv < 6)  return { label: 'Moderate',  color: '#ffcc00' }
  if (uv < 8)  return { label: 'High',      color: '#ff8800' }
  if (uv < 11) return { label: 'Very High', color: '#ff4444' }
  return               { label: 'Extreme',  color: '#cc00ff' }
}

function formatSunTime(isoString: string): string {
  // Parse without 'Z' — API returns times in location's local timezone (timezone: 'auto')
  // Appending 'Z' would shift by UTC offset — DO NOT do that
  const date = new Date(isoString)
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit'
    // No hour12 specified — respects OS locale (12h/24h)
  })
}

interface ConditionsGridProps {
  weather: WeatherData
}

export function ConditionsGrid({ weather }: ConditionsGridProps): React.JSX.Element {
  const compass = degreesToCompass(weather.windDirection)
  const windValue = `${Math.round(weather.windSpeed)} ${weather.units.windSpeed} ${compass}`
  const humidityValue = `${weather.humidity}%`
  const { label: uvLabel, color: uvColor } = uvRiskLabel(weather.uvIndex)
  const uvValue = `${weather.uvIndex.toFixed(1)} ${uvLabel}`
  const pressureValue = `${Math.round(weather.pressure)} hPa`
  const sunriseValue = formatSunTime(weather.sunrise)
  const sunsetValue = formatSunTime(weather.sunset)

  return (
    <div className="grid grid-cols-2 gap-3 w-full px-4">
      <ConditionCard Icon={Wind}    label="Wind"      value={windValue} />
      <ConditionCard Icon={Droplets} label="Humidity"  value={humidityValue} />
      <ConditionCard Icon={Sun}     label="UV Index"  value={uvValue} iconColor={uvColor} glowColor={uvColor} />
      <ConditionCard Icon={Gauge}   label="Pressure"  value={pressureValue} />
      <ConditionCard Icon={Sunrise} label="Sunrise"   value={sunriseValue} />
      <ConditionCard Icon={Sunset}  label="Sunset"    value={sunsetValue} />
    </div>
  )
}
