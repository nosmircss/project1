// Preload script: exposes specific IPC methods to renderer via contextBridge.
// Per RESEARCH.md anti-pattern: do NOT expose the full ipcRenderer object —
// only expose specific named methods to prevent security footguns.
import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
// Custom APIs for renderer
contextBridge.exposeInMainWorld('electron', electronAPI)

contextBridge.exposeInMainWorld('electronAPI', {
  fetchWeather: (lat: number, lon: number, settings?: { temperatureUnit: string; windSpeedUnit: string }) =>
    ipcRenderer.invoke('weather:fetch', lat, lon, settings),
  getSetting: (key: string) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key: string, value: unknown) => ipcRenderer.invoke('settings:set', key, value)
})
