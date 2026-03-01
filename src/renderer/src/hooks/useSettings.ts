import { useState, useEffect } from 'react'
import type { AppSettings } from '../lib/types'

const DEFAULTS: AppSettings = {
  temperatureUnit: 'fahrenheit',
  windSpeedUnit: 'mph',
  refreshInterval: 5
}

interface UseSettingsResult {
  settings: AppSettings
  loaded: boolean
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>
}

export function useSettings(): UseSettingsResult {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const api = window.electronAPI
    Promise.all([
      api.getSetting('temperatureUnit'),
      api.getSetting('windSpeedUnit'),
      api.getSetting('refreshInterval')
    ])
      .then(([temperatureUnit, windSpeedUnit, refreshInterval]) => {
        setSettings({
          temperatureUnit: (temperatureUnit as AppSettings['temperatureUnit']) ?? DEFAULTS.temperatureUnit,
          windSpeedUnit: (windSpeedUnit as AppSettings['windSpeedUnit']) ?? DEFAULTS.windSpeedUnit,
          refreshInterval: (refreshInterval as number) ?? DEFAULTS.refreshInterval
        })
        setLoaded(true)
      })
      .catch(() => {
        setLoaded(true)
      })
  }, [])

  const updateSetting = async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    await window.electronAPI.setSetting(key, value)
  }

  return { settings, loaded, updateSetting }
}
