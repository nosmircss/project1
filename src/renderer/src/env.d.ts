/// <reference types="vite/client" />

interface Window {
  electron: import('@electron-toolkit/preload').ElectronAPI
  electronAPI: {
    fetchWeather: (lat: number, lon: number, settings?: { temperatureUnit: string; windSpeedUnit: string }) => Promise<import('./lib/types').WeatherData>
    getSetting: (key: string) => Promise<unknown>
    setSetting: (key: string, value: unknown) => Promise<void>
  }
}
