import { ElectronAPI } from '@electron-toolkit/preload'

interface LocationData {
  zip: string
  city: string
  stateCode: string
  lat: number
  lon: number
  displayName: string
}

interface ElectronBridgeAPI {
  fetchWeather: (
    lat: number,
    lon: number,
    settings?: { temperatureUnit: string; windSpeedUnit: string }
  ) => Promise<import('../renderer/src/lib/types').WeatherData>
  getSetting: (key: string) => Promise<unknown>
  setSetting: (key: string, value: unknown) => Promise<void>
  getLocations: () => Promise<LocationData[]>
  getLocationsMeta: () => Promise<{ lastActiveZip: string | null; hasLaunched: boolean }>
  addLocation: (location: LocationData) => Promise<{ ok?: boolean; error?: string }>
  deleteLocation: (zip: string) => Promise<void>
  setActiveLocation: (zip: string | null) => Promise<void>
  minimizeWindow: () => void
  toggleMaximizeWindow: () => void
  closeWindow: () => void
  onWindowVisibility: (cb: (visible: boolean) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    electronAPI: ElectronBridgeAPI
    api: unknown
  }
}
