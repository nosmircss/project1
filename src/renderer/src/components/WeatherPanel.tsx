import { useState } from 'react'
import { Settings } from 'lucide-react'
import { getWeatherDisplay } from '../lib/weatherCodeMap'
import { WeatherIcon } from './WeatherIcon'
import { TemperatureHero } from './TemperatureHero'
import { WeatherSkeleton, ConditionCardSkeleton } from './SkeletonLoader'
import { ErrorCard } from './ErrorCard'
import { ConditionsGrid } from './ConditionsGrid'
import { SettingsModal } from './SettingsModal'
import type { WeatherData, AppSettings } from '../lib/types'

interface WeatherPanelProps {
  loading: boolean
  weather: WeatherData | null
  error: string | null
  locationName: string
  refetch: () => void
  settings: AppSettings
  onSettingsChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>
}

/**
 * Main weather display area — orchestrates sub-components based on loading/error/data state.
 * Per user decision on stale data: show weather + "Data may be outdated" warning if error + weather.
 * Gear icon appears in all states (loading, error, data) so settings are always accessible.
 */
export function WeatherPanel({
  loading,
  weather,
  error,
  locationName,
  refetch,
  settings,
  onSettingsChange
}: WeatherPanelProps): React.JSX.Element {
  const [showSettings, setShowSettings] = useState(false)

  // Loading with no data yet — show skeleton
  if (loading && !weather) {
    return (
      <main className="flex-1 flex flex-col bg-bg-panel overflow-y-auto">
        {/* Header with gear icon (always rendered) */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <span className="text-text-secondary font-sans text-sm tracking-wide uppercase">
            {locationName}
          </span>
          <button
            onClick={() => setShowSettings(true)}
            className="text-text-dim hover:text-neon-cyan transition-colors"
            aria-label="Open settings"
          >
            <Settings size={18} />
          </button>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 gap-8 px-4 pb-6">
          <WeatherSkeleton />
          <ConditionCardSkeleton />
        </div>
        {showSettings && (
          <SettingsModal settings={settings} onUpdate={onSettingsChange} onClose={() => setShowSettings(false)} />
        )}
      </main>
    )
  }

  // Error with no data — show error card
  if (error && !weather) {
    return (
      <main className="flex-1 flex flex-col bg-bg-panel overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <span className="text-text-secondary font-sans text-sm tracking-wide uppercase">
            {locationName}
          </span>
          <button
            onClick={() => setShowSettings(true)}
            className="text-text-dim hover:text-neon-cyan transition-colors"
            aria-label="Open settings"
          >
            <Settings size={18} />
          </button>
        </div>
        <div className="flex flex-col items-center justify-center flex-1">
          <ErrorCard message={error} onRetry={refetch} />
        </div>
        {showSettings && (
          <SettingsModal settings={settings} onUpdate={onSettingsChange} onClose={() => setShowSettings(false)} />
        )}
      </main>
    )
  }

  // Weather data available (may have stale data warning)
  if (weather) {
    const { Icon, label } = getWeatherDisplay(weather.weatherCode, weather.isDay)

    return (
      <main className="flex-1 flex flex-col bg-bg-panel overflow-y-auto">
        {/* Header: location name + gear icon */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <span className="text-text-secondary font-sans text-sm tracking-wide uppercase">
            {locationName}
          </span>
          <button
            onClick={() => setShowSettings(true)}
            className="text-text-dim hover:text-neon-cyan transition-colors"
            aria-label="Open settings"
          >
            <Settings size={18} />
          </button>
        </div>

        {/* Hero section */}
        <div className="flex flex-col items-center gap-6 px-8 pt-4 pb-6 text-center">
          <WeatherIcon Icon={Icon} size={64} />
          <p className="text-neon-magenta font-sans text-sm neon-text-glow-magenta tracking-wide">
            {label}
          </p>
          <TemperatureHero
            temperature={weather.temperature}
            feelsLike={weather.feelsLike}
            units={weather.units.temperature}
          />
          {error && (
            <p className="text-warning text-sm font-mono">Data may be outdated</p>
          )}
        </div>

        {/* Conditions grid — 6 metric cards */}
        <ConditionsGrid weather={weather} />

        {/* Bottom padding */}
        <div className="pb-6" />

        {/* Settings modal — rendered above everything */}
        {showSettings && (
          <SettingsModal settings={settings} onUpdate={onSettingsChange} onClose={() => setShowSettings(false)} />
        )}
      </main>
    )
  }

  // Fallback — empty state
  return (
    <main className="flex-1 flex flex-col items-center justify-center bg-bg-panel">
      <p className="text-text-dim font-mono text-sm">Select a location</p>
    </main>
  )
}
