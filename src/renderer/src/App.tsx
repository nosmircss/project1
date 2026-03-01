import { useState } from 'react'
import type { LocationInfo } from './lib/types'
import { useWeather } from './hooks/useWeather'
import { useSettings } from './hooks/useSettings'
import { WelcomeScreen } from './components/WelcomeScreen'
import { Sidebar } from './components/Sidebar'
import { WeatherPanel } from './components/WeatherPanel'

/**
 * Root application component.
 * Wires together WelcomeScreen (first launch), Sidebar, and WeatherPanel.
 * Per user decision: welcome screen shows when no locations exist (no sidebar).
 * Per user decision: valid zip auto-navigates to new location.
 * Settings-aware: loads settings from electron-conf first; gates weather fetch on loaded flag
 * to prevent double-fetch (stale-unit fetch before settings arrive).
 */
function App(): React.JSX.Element {
  const [locations, setLocations] = useState<LocationInfo[]>([])
  const [activeIndex, setActiveIndex] = useState(0)

  // Load settings first — gate weather fetch on loaded flag to prevent double-fetch
  const { settings, loaded: settingsLoaded, updateSetting } = useSettings()

  const activeLocation = locations[activeIndex] ?? null

  // Only pass activeLocation when settings are loaded — prevents stale-unit fetch on startup
  const { weather, loading, error, refetch } = useWeather(
    settingsLoaded ? activeLocation : null,
    settings
  )

  const handleAdd = (location: LocationInfo) => {
    setLocations((prev) => {
      const newLocations = [...prev, location]
      // Auto-navigate to newly added location
      setActiveIndex(newLocations.length - 1)
      return newLocations
    })
  }

  const handleSelect = (index: number) => {
    setActiveIndex(index)
  }

  // First launch: no locations yet — show welcome screen full-screen (no sidebar)
  if (locations.length === 0) {
    return (
      <div className="h-screen flex bg-bg-dark cyber-grid overflow-hidden">
        <WelcomeScreen onLocationAdd={handleAdd} />
      </div>
    )
  }

  // Locations exist — show sidebar + main panel layout
  return (
    <div className="h-screen flex bg-bg-dark cyber-grid overflow-hidden">
      <Sidebar
        locations={locations}
        activeIndex={activeIndex}
        onSelect={handleSelect}
        onAdd={handleAdd}
      />
      <WeatherPanel
        loading={loading}
        weather={weather}
        error={error}
        locationName={activeLocation?.displayName ?? ''}
        refetch={refetch}
        settings={settings}
        onSettingsChange={updateSetting}
      />
    </div>
  )
}

export default App
