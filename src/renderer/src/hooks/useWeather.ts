import { useState, useEffect, useCallback } from 'react'
import type { LocationInfo, WeatherData } from '../lib/types'

interface UseWeatherResult {
  weather: WeatherData | null
  loading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Custom hook for weather data fetching with silent retry logic.
 * Per user decision: auto-retry 2x before surfacing error with exponential backoff.
 * Per user decision on stale data: keep last successful data if refresh fails, show warning.
 */
async function fetchWithRetry(lat: number, lon: number, maxRetries = 2): Promise<WeatherData> {
  let lastError: Error = new Error('Unknown error')
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await window.electronAPI.fetchWeather(lat, lon)
    } catch (err) {
      lastError = err as Error
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1))) // exponential backoff
      }
    }
  }
  throw lastError
}

export function useWeather(location: LocationInfo | null): UseWeatherResult {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!location) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchWithRetry(location.lat, location.lon)
      setWeather(data)
      setError(null)
    } catch {
      setError('Unable to load weather data. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [location?.lat, location?.lon]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (location) {
      fetch()
    } else {
      setWeather(null)
      setError(null)
      setLoading(false)
    }
  }, [location?.lat, location?.lon]) // eslint-disable-line react-hooks/exhaustive-deps

  const refetch = useCallback(() => {
    setError(null)
    setLoading(true)
    if (!location) return
    fetchWithRetry(location.lat, location.lon)
      .then((data) => {
        setWeather(data)
        setError(null)
      })
      .catch(() => {
        // If we have stale data, keep it and show a warning
        setError(
          weather
            ? 'Could not refresh weather. Data may be outdated.'
            : 'Unable to load weather data. Check your connection and try again.'
        )
      })
      .finally(() => {
        setLoading(false)
      })
  }, [location, weather])

  return { weather, loading, error, refetch }
}
