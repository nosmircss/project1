import { useState, useEffect } from 'react'
import type { LocationInfo } from '../lib/types'

interface UseLocationsResult {
  locations: LocationInfo[]
  activeZip: string | null
  hasLaunched: boolean
  loaded: boolean
  addLocation: (location: LocationInfo) => Promise<{ error?: string }>
  deleteLocation: (zip: string) => Promise<void>
  setActiveZip: (zip: string | null) => Promise<void>
}

/**
 * Hook for managing persisted locations via IPC.
 * Mirrors the useSettings pattern: loads from electron-conf on mount,
 * optimistic updates, persists via window.electronAPI.
 *
 * Three-state gate: loaded = false until IPC resolves.
 * hasLaunched = false on true first launch (no location ever saved).
 */
export function useLocations(): UseLocationsResult {
  const [locations, setLocations] = useState<LocationInfo[]>([])
  const [activeZip, setActiveZipState] = useState<string | null>(null)
  const [hasLaunched, setHasLaunched] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const api = window.electronAPI
    Promise.all([api.getLocations(), api.getLocationsMeta()])
      .then(([locs, meta]) => {
        setLocations(locs)
        setActiveZipState(meta.lastActiveZip)
        setHasLaunched(meta.hasLaunched)
        setLoaded(true)
      })
      .catch(() => {
        setLoaded(true)
      })
  }, [])

  const addLocation = async (location: LocationInfo): Promise<{ error?: string }> => {
    // Duplicate check locally — no IPC round-trip needed
    if (locations.some((l) => l.zip === location.zip)) {
      return { error: 'Already saved' }
    }

    const result = await window.electronAPI.addLocation(location)
    if (result.error) {
      return { error: result.error }
    }

    // Optimistic update
    setLocations((prev) => [...prev, location])
    setActiveZipState(location.zip)
    setHasLaunched(true)
    return {}
  }

  const deleteLocation = async (zip: string): Promise<void> => {
    // Compute next active BEFORE mutating state
    const idx = locations.findIndex((l) => l.zip === zip)
    const newLocations = locations.filter((l) => l.zip !== zip)
    let nextActive: string | null = null
    if (newLocations.length > 0) {
      // Select next; if deleted was last item, select the one above
      const nextIdx = idx < newLocations.length ? idx : newLocations.length - 1
      nextActive = newLocations[nextIdx].zip
    }

    // Optimistic update
    setLocations(newLocations)
    setActiveZipState(nextActive)

    // Persist
    await window.electronAPI.deleteLocation(zip)
    await window.electronAPI.setActiveLocation(nextActive)
  }

  const setActiveZip = async (zip: string | null): Promise<void> => {
    setActiveZipState(zip)
    await window.electronAPI.setActiveLocation(zip)
  }

  return { locations, activeZip, hasLaunched, loaded, addLocation, deleteLocation, setActiveZip }
}
