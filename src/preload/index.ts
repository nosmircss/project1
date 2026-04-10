// Preload script: exposes specific IPC methods to renderer via contextBridge.
// Per RESEARCH.md anti-pattern: do NOT expose the full ipcRenderer object —
// only expose specific named methods to prevent security footguns.
import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
// Custom APIs for renderer
contextBridge.exposeInMainWorld('electron', electronAPI)

contextBridge.exposeInMainWorld('electronAPI', {
  fetchWeather: (
    lat: number,
    lon: number,
    settings?: { temperatureUnit: string; windSpeedUnit: string }
  ) => ipcRenderer.invoke('weather:fetch', lat, lon, settings),
  getSetting: (key: string) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key: string, value: unknown) => ipcRenderer.invoke('settings:set', key, value),
  getLocations: () => ipcRenderer.invoke('locations:get-all'),
  getLocationsMeta: () => ipcRenderer.invoke('locations:get-meta'),
  addLocation: (location: {
    zip: string
    city: string
    stateCode: string
    lat: number
    lon: number
    displayName: string
  }) => ipcRenderer.invoke('locations:add', location),
  deleteLocation: (zip: string) => ipcRenderer.invoke('locations:delete', zip),
  setActiveLocation: (zip: string | null) => ipcRenderer.invoke('locations:set-active', zip),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  toggleMaximizeWindow: () => ipcRenderer.send('window:toggle-maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  onWindowVisibility: (cb: (visible: boolean) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, visible: boolean): void => cb(visible)
    ipcRenderer.on('window:visibility', listener)
    return (): void => {
      ipcRenderer.removeListener('window:visibility', listener)
    }
  }
})
