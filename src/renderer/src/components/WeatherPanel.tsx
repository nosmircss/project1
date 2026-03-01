import { getWeatherDisplay } from '../lib/weatherCodeMap'
import { WeatherIcon } from './WeatherIcon'
import { TemperatureHero } from './TemperatureHero'
import { WeatherSkeleton } from './SkeletonLoader'
import { ErrorCard } from './ErrorCard'
import type { WeatherData, AppSettings } from '../lib/types'

interface WeatherPanelProps {
  loading: boolean
  weather: WeatherData | null
  error: string | null
  locationName: string
  refetch: () => void
  // Optional — consumed by SettingsModal in Plan 02-03
  settings?: AppSettings
  onSettingsChange?: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>
}

/**
 * Main weather display area — orchestrates sub-components based on loading/error/data state.
 * Per user decision on stale data: show weather + "Data may be outdated" warning if error + weather.
 */
export function WeatherPanel({
  loading,
  weather,
  error,
  locationName,
  refetch
}: WeatherPanelProps): React.JSX.Element {
  // Loading with no data yet — show skeleton
  if (loading && !weather) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center bg-bg-panel">
        <WeatherSkeleton />
      </main>
    )
  }

  // Error with no data — show error card
  if (error && !weather) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center bg-bg-panel">
        <ErrorCard message={error} onRetry={refetch} />
      </main>
    )
  }

  // Weather data available (may have stale data warning)
  if (weather) {
    const { Icon, label } = getWeatherDisplay(weather.weatherCode, weather.isDay)

    return (
      <main className="flex-1 flex flex-col items-center justify-center bg-bg-panel">
        <div className="flex flex-col items-center gap-6 px-8 text-center">
          {/* Location name */}
          <p className="text-text-secondary font-sans text-sm tracking-wide uppercase">
            {locationName}
          </p>

          {/* Weather icon with neon glow */}
          <WeatherIcon Icon={Icon} size={64} />

          {/* Condition label */}
          <p className="text-neon-magenta font-sans text-sm neon-text-glow-magenta tracking-wide">
            {label}
          </p>

          {/* Temperature hero — dominant element */}
          <TemperatureHero
            temperature={weather.temperature}
            feelsLike={weather.feelsLike}
            units={weather.units.temperature}
          />

          {/* Stale data warning (error + weather = refresh failed but old data exists) */}
          {error && (
            <p className="text-warning text-sm font-mono">
              Data may be outdated
            </p>
          )}
        </div>
      </main>
    )
  }

  // Fallback — empty state (no location selected)
  return (
    <main className="flex-1 flex flex-col items-center justify-center bg-bg-panel">
      <p className="text-text-dim font-mono text-sm">Select a location</p>
    </main>
  )
}
