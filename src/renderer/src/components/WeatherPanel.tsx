import { useState } from 'react'
import { Settings } from 'lucide-react'
import { getWeatherDisplay } from '../lib/weatherCodeMap'
import { WeatherIcon } from './WeatherIcon'
import { TemperatureHero } from './TemperatureHero'
import { WeatherSkeleton, ConditionCardSkeleton, HourlyStripSkeleton } from './SkeletonLoader'
import { ErrorCard } from './ErrorCard'
import { ConditionsGrid } from './ConditionsGrid'
import { SettingsModal } from './SettingsModal'
import { HourlyStrip } from './HourlyStrip'
import { RefreshIndicator } from './RefreshIndicator'
import type { WeatherData, AppSettings, HourlySlice } from '../lib/types'

interface WeatherPanelProps {
  loading: boolean
  weather: WeatherData | null
  hourly: HourlySlice[]           // NEW — from useWeather
  isRefreshing: boolean           // NEW — true during silent background refresh
  lastUpdatedAt: Date | null      // NEW — timestamp of last successful fetch
  nextRefreshAt: number | null    // NEW — Date.now() ms target for next refresh
  error: string | null
  locationName: string
  activeZip: string               // NEW — for HourlyStrip scroll reset on location change
  refetch: () => void
  settings: AppSettings
  onSettingsChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>
}

/**
 * Main weather display area — orchestrates sub-components based on loading/error/data state.
 * Per user decision on stale data: show weather + "Data may be outdated" warning if error + weather.
 * Gear icon appears in all states (loading, error, data) so settings are always accessible.
 *
 * loading=true only when weather === null (initial load for a location) — shows skeleton.
 * isRefreshing=true during background auto-refresh — data updates silently, no skeleton.
 * RefreshIndicator only shown in the weather-data branch (meaningless during loading/error-only).
 */
export function WeatherPanel({
  loading,
  weather,
  hourly,
  isRefreshing,
  lastUpdatedAt,
  nextRefreshAt,
  error,
  locationName,
  activeZip,
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
          <HourlyStripSkeleton />
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
        {/* Header: location name + RefreshIndicator + gear icon */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <span className="text-text-secondary font-sans text-sm tracking-wide uppercase">
            {locationName}
          </span>
          <div className="flex items-center gap-3">
            <RefreshIndicator
              lastUpdatedAt={lastUpdatedAt}
              nextRefreshAt={nextRefreshAt}
              isRefreshing={isRefreshing}
            />
            <button
              onClick={() => setShowSettings(true)}
              className="text-text-dim hover:text-neon-cyan transition-colors"
              aria-label="Open settings"
            >
              <Settings size={18} />
            </button>
          </div>
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

        {/* Hourly forecast strip — between hero section and conditions grid */}
        {hourly.length > 0 && (
          <HourlyStrip
            hours={hourly}
            locationZip={activeZip}
            temperatureUnit={weather.units.temperature}
          />
        )}

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
