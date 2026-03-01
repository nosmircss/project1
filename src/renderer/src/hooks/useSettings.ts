import { useState, useEffect } from 'react'
import { Conf } from 'electron-conf/renderer'
import type { AppSettings } from '../lib/types'

const DEFAULTS: AppSettings = {
  temperatureUnit: 'fahrenheit',
  windSpeedUnit: 'mph',
  refreshInterval: 5
}

// One renderer-side Conf instance — name must match main process 'settings'
const conf = new Conf<AppSettings>({ name: 'settings' })

interface UseSettingsResult {
  settings: AppSettings
  loaded: boolean
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>
}

export function useSettings(): UseSettingsResult {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    // Load all settings in one batch on mount — renderer API is async (IPC under the hood)
    Promise.all([
      conf.get('temperatureUnit', DEFAULTS.temperatureUnit),
      conf.get('windSpeedUnit', DEFAULTS.windSpeedUnit),
      conf.get('refreshInterval', DEFAULTS.refreshInterval)
    ])
      .then(([temperatureUnit, windSpeedUnit, refreshInterval]) => {
        setSettings({ temperatureUnit, windSpeedUnit, refreshInterval })
        setLoaded(true)
      })
      .catch(() => {
        // If conf fails (e.g. IPC not ready), use defaults and proceed
        setLoaded(true)
      })
  }, [])

  const updateSetting = async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    await conf.set(key, value)
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  return { settings, loaded, updateSetting }
}
