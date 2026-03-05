import { useState, useEffect, useCallback, useRef } from 'react'
import type { LocationInfo, WeatherData, AppSettings, HourlySlice, HourlyData } from '../lib/types'
import { useInterval } from './useInterval'

interface CacheEntry {
  data: WeatherData
  lastUpdatedAt: Date
}

interface UseWeatherResult {
  weather: WeatherData | null
  hourly: HourlySlice[]          // 12 entries from current hour (empty if no data)
  loading: boolean               // true only when weather === null (first fetch for location)
  isRefreshing: boolean          // true during background auto-refresh (no skeleton trigger)
  error: string | null
  lastUpdatedAt: Date | null     // timestamp of last successful fetch for active location
  nextRefreshAt: number | null   // Date.now() ms target for next refresh
  refetch: () => void
}

/**
 * Slice raw parallel-array hourly data into 12 HourlySlice entries starting from the current hour.
 * Per RESEARCH.md Pitfall 4: hourly time array starts at midnight local time.
 * findIndex(t => t >= currentHourISO) correctly finds the current hour slot.
 */
function sliceHourly(hourly: HourlyData | undefined): HourlySlice[] {
  if (!hourly) return []
  const now = new Date()
  const currentHourISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:00`
  const startIdx = hourly.time.findIndex((t) => t >= currentHourISO)
  if (startIdx === -1) return []
  return hourly.time.slice(startIdx, startIdx + 12).map((time, i) => ({
    time,
    temperature: hourly.temperature[startIdx + i],
    weatherCode: hourly.weatherCode[startIdx + i],
    precipProbability: hourly.precipProbability[startIdx + i]
  }))
}

/**
 * Initial fetch with retry and exponential backoff.
 * Only used for first fetch per location (not auto-refresh — auto-refresh fires once and waits).
 * Per user decision: auto-retry 2x before surfacing error.
 */
async function fetchWithRetry(
  lat: number,
  lon: number,
  settings: Pick<AppSettings, 'temperatureUnit' | 'windSpeedUnit'>,
  maxRetries = 2
): Promise<WeatherData> {
  let lastError: Error = new Error('Unknown error')
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await window.electronAPI.fetchWeather(lat, lon, settings)
    } catch (err) {
      lastError = err as Error
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1))) // exponential backoff
      }
    }
  }
  throw lastError
}

/**
 * Custom hook for weather data with hourly slicing, auto-refresh, visibility-aware pause,
 * per-location cache, and silent background updates.
 *
 * Key behaviors:
 * - loading=true only on first fetch for a location (shows skeleton)
 * - isRefreshing=true during background auto-refresh (numbers just change, no skeleton)
 * - Auto-refresh pauses when window is not visible (delay=null passed to useInterval)
 * - Visibility resume triggers immediate refresh if interval elapsed while hidden
 * - Per-location cache: switching locations shows cached data immediately with background refresh
 * - Failed auto-refresh retries in 30 seconds (not full interval)
 */
export function useWeather(location: LocationInfo | null, settings: AppSettings): UseWeatherResult {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [hourly, setHourly] = useState<HourlySlice[]>([])
  const [loading, setLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [nextRefreshAt, setNextRefreshAt] = useState<number | null>(null)
  const [isWindowVisible, setIsWindowVisible] = useState(true)

  // Refs for stable closures in callbacks and effects
  const nextRefreshAtRef = useRef<number | null>(null)
  const retryDelayRef = useRef<number | null>(null)
  const locationRef = useRef<LocationInfo | null>(location)
  const settingsRef = useRef<AppSettings>(settings)

  // Per-location cache: Map<zip, { data, lastUpdatedAt }>
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map())

  // Keep refs in sync with latest values
  locationRef.current = location
  settingsRef.current = settings

  const intervalMs = settings.refreshInterval * 60_000

  // --- Core fetch functions ---

  /**
   * Auto-refresh callback — fires silently, no skeleton, keeps stale on failure.
   * Does NOT use fetchWithRetry — fires once, fails fast, retries in 30s if needed.
   */
  const autoRefreshCallback = useCallback(async () => {
    const loc = locationRef.current
    const cfg = settingsRef.current
    if (!loc) return

    setIsRefreshing(true)
    try {
      const data = await window.electronAPI.fetchWeather(loc.lat, loc.lon, cfg)
      const now = new Date()
      const nextTarget = Date.now() + cfg.refreshInterval * 60_000

      setWeather(data)
      setHourly(sliceHourly(data.hourly))
      setLastUpdatedAt(now)
      setNextRefreshAt(nextTarget)
      nextRefreshAtRef.current = nextTarget
      retryDelayRef.current = null
      setError(null)

      // Update cache
      cacheRef.current.set(loc.zip, { data, lastUpdatedAt: now })
    } catch {
      // Keep stale data, show warning, retry in 30s
      retryDelayRef.current = 30_000
      const retryTarget = Date.now() + 30_000
      setNextRefreshAt(retryTarget)
      nextRefreshAtRef.current = retryTarget
      setError('Could not refresh weather. Data may be outdated.')
    } finally {
      setIsRefreshing(false)
    }
  }, []) // stable — uses refs

  /**
   * Initial fetch for a location — uses fetchWithRetry for robustness.
   * Sets loading=true (skeleton) unless cached data is already showing.
   */
  const performFetch = useCallback(
    async (loc: LocationInfo, showSkeleton: boolean) => {
      const cfg = settingsRef.current

      if (showSkeleton) {
        setLoading(true)
      } else {
        setIsRefreshing(true)
      }
      setError(null)

      try {
        const data = await fetchWithRetry(loc.lat, loc.lon, cfg)
        const now = new Date()
        const nextTarget = Date.now() + cfg.refreshInterval * 60_000

        setWeather(data)
        setHourly(sliceHourly(data.hourly))
        setLastUpdatedAt(now)
        setNextRefreshAt(nextTarget)
        nextRefreshAtRef.current = nextTarget
        retryDelayRef.current = null
        setError(null)

        // Update cache
        cacheRef.current.set(loc.zip, { data, lastUpdatedAt: now })
      } catch {
        setError('Unable to load weather data. Check your connection and try again.')
      } finally {
        setLoading(false)
        setIsRefreshing(false)
      }
    },
    [] // stable — uses refs for settings
  )

  // --- Location change effect ---
  useEffect(() => {
    if (!location) {
      setWeather(null)
      setHourly([])
      setError(null)
      setLoading(false)
      setIsRefreshing(false)
      setLastUpdatedAt(null)
      setNextRefreshAt(null)
      nextRefreshAtRef.current = null
      retryDelayRef.current = null
      return
    }

    // Check per-location cache
    const cached = cacheRef.current.get(location.zip)
    const cachedAgeMs = cached ? Date.now() - cached.lastUpdatedAt.getTime() : Infinity
    const isStale = cachedAgeMs >= intervalMs

    if (cached) {
      // Show cached data immediately
      setWeather(cached.data)
      setHourly(sliceHourly(cached.data.hourly))
      setLastUpdatedAt(cached.lastUpdatedAt)

      // Reset refresh timer
      setNextRefreshAt(null)
      nextRefreshAtRef.current = null
      retryDelayRef.current = null

      if (isStale) {
        // Background refresh — no skeleton
        performFetch(location, false)
      } else {
        // Data is fresh enough — set next refresh target
        const nextTarget = cached.lastUpdatedAt.getTime() + intervalMs
        setNextRefreshAt(nextTarget)
        nextRefreshAtRef.current = nextTarget
      }
    } else {
      // No cache — show skeleton
      setWeather(null)
      setHourly([])
      setLastUpdatedAt(null)
      setNextRefreshAt(null)
      nextRefreshAtRef.current = null
      retryDelayRef.current = null
      performFetch(location, true)
    }
  }, [location?.zip, settings.temperatureUnit, settings.windSpeedUnit]) // eslint-disable-line react-hooks/exhaustive-deps

  // --- Window visibility subscription ---
  useEffect(() => {
    const cleanup = window.electronAPI.onWindowVisibility((visible) => {
      setIsWindowVisible(visible)
      if (visible && locationRef.current) {
        // If the refresh interval elapsed while hidden, refresh immediately
        if (nextRefreshAtRef.current && Date.now() >= nextRefreshAtRef.current) {
          autoRefreshCallback()
        }
      }
    })
    return cleanup
  }, []) // stable — uses refs inside

  // --- Auto-refresh via useInterval ---
  // delay=null when no location or window hidden — pauses interval
  const activeDelay = location && isWindowVisible ? (retryDelayRef.current ?? intervalMs) : null
  useInterval(autoRefreshCallback, activeDelay)

  // --- Manual refetch ---
  const refetch = useCallback(() => {
    if (!location) return
    setError(null)
    performFetch(location, weather === null)
  }, [location, weather, performFetch])

  return {
    weather,
    hourly,
    loading,
    isRefreshing,
    error,
    lastUpdatedAt,
    nextRefreshAt,
    refetch
  }
}
