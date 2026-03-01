import { Conf } from 'electron-conf/main'

// AppSettings must match the interface in src/renderer/src/lib/types.ts
// Duplicated here to avoid cross-process import at runtime (type-only cross-reference is fine for TSC)
export interface AppSettings {
  temperatureUnit: 'fahrenheit' | 'celsius'
  windSpeedUnit: 'mph' | 'kmh'
  refreshInterval: number
}

const DEFAULTS: AppSettings = {
  temperatureUnit: 'fahrenheit',
  windSpeedUnit: 'mph',
  refreshInterval: 5
}

// Singleton — one instance per README: "does not support multiple instances reading and writing the same config"
export const conf = new Conf<AppSettings>({ name: 'settings', defaults: DEFAULTS })
