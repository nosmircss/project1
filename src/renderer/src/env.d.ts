/// <reference types="vite/client" />

interface Window {
  electron: import('@electron-toolkit/preload').ElectronAPI
  electronAPI: {
    fetchWeather: (lat: number, lon: number) => Promise<import('./lib/types').WeatherData>
  }
}
