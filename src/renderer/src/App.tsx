import type { LocationInfo } from './lib/types'
import { useWeather } from './hooks/useWeather'
import { useSettings } from './hooks/useSettings'
import { useLocations } from './hooks/useLocations'
import { WelcomeScreen } from './components/WelcomeScreen'
import { Sidebar } from './components/Sidebar'
import { WeatherPanel } from './components/WeatherPanel'
import { TitleBar } from './components/TitleBar'

function AppFrame({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="app-frame flex h-screen flex-col overflow-hidden bg-bg-dark">
      <TitleBar />
      <div className="flex min-h-0 flex-1 bg-bg-dark cyber-grid overflow-hidden">
        {children}
      </div>
    </div>
  )
}

/**
 * Root application component.
 * Three-state startup routing via useLocations:
 *   1. !hasLaunched  → WelcomeScreen full-screen (true first launch, no sidebar)
 *   2. hasLaunched && locations.length === 0 → Sidebar (empty) + empty state panel
 *   3. hasLaunched && locations.length > 0   → Sidebar + WeatherPanel (normal)
 *
 * Weather fetch gated on BOTH settingsLoaded AND locationsLoaded to prevent
 * race condition (stale-unit fetch before data arrives).
 */
function App(): React.JSX.Element {
  const { settings, loaded: settingsLoaded, updateSetting } = useSettings()
  const {
    locations,
    activeZip,
    hasLaunched,
    loaded: locationsLoaded,
    addLocation,
    deleteLocation,
    setActiveZip
  } = useLocations()

  // Derive active location from zip string (not index — survives reorders)
  const activeLocation = locations.find((l) => l.zip === activeZip) ?? locations[0] ?? null

  // Gate on both loaded flags — prevents double-fetch race condition (per RESEARCH.md Pitfall 3)
  const { weather, hourly, loading, isRefreshing, error, lastUpdatedAt, nextRefreshAt, refetch } = useWeather(
    settingsLoaded && locationsLoaded ? activeLocation : null,
    settings
  )

  const handleAdd = async (location: LocationInfo) => {
    await addLocation(location)
    // addLocation already performs optimistic state updates
  }

  const handleSelect = (index: number) => {
    const loc = locations[index]
    if (loc) setActiveZip(loc.zip)
  }

  // Brief loading state while locations load from IPC — render nothing to avoid flash
  if (!locationsLoaded) return <></>

  // True first launch: WelcomeScreen full-screen, no sidebar
  // hasLaunched remains false until the very first location is successfully saved
  if (!hasLaunched) {
    return (
      <AppFrame>
        <WelcomeScreen onLocationAdd={handleAdd} />
      </AppFrame>
    )
  }

  // All locations deleted: sidebar stays visible with empty state
  // Per locked decision: sidebar visible with "No locations saved" — NOT WelcomeScreen
  if (locations.length === 0) {
    return (
      <AppFrame>
        <Sidebar
          locations={[]}
          activeIndex={-1}
          onSelect={() => {}}
          onAdd={handleAdd}
          onDelete={deleteLocation}
        />
        <main className="flex-1 flex flex-col items-center justify-center">
          <p className="font-mono text-text-secondary text-base mb-2">No locations saved</p>
          <p className="font-mono text-text-dim text-sm">Add a zip code to get started</p>
        </main>
      </AppFrame>
    )
  }

  // Normal: sidebar + weather panel
  const activeIndex = locations.findIndex((l) => l.zip === activeZip)

  return (
    <AppFrame>
      <Sidebar
        locations={locations}
        activeIndex={activeIndex >= 0 ? activeIndex : 0}
        onSelect={handleSelect}
        onAdd={handleAdd}
        onDelete={deleteLocation}
      />
      <WeatherPanel
        loading={loading}
        weather={weather}
        hourly={hourly}
        isRefreshing={isRefreshing}
        lastUpdatedAt={lastUpdatedAt}
        nextRefreshAt={nextRefreshAt}
        error={error}
        locationName={activeLocation?.displayName ?? ''}
        activeZip={activeZip ?? ''}
        refetch={refetch}
        settings={settings}
        onSettingsChange={updateSetting}
      />
    </AppFrame>
  )
}

export default App
