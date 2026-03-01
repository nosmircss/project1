/// <reference types="vite/client" />

// ElectronAPI will be extended in later phases when IPC handlers are added
interface Window {
  electron: import('@electron-toolkit/preload').ElectronAPI
  api: Record<string, unknown>
}
