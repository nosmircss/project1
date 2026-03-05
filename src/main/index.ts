import { app, shell, BrowserWindow, ipcMain, Menu } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { fetchWeather } from './weather'
import { conf } from './settings'
import { locationsConf } from './locations'
import type { LocationInfo } from '../renderer/src/lib/types'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 600,
    height: 700,
    minWidth: 500,
    minHeight: 600,
    resizable: true,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0a0a12',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  // Remove the application menu bar
  Menu.setApplicationMenu(null)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Window visibility events → renderer (for auto-refresh pause/resume)
  // Per RESEARCH.md: do NOT use backgroundThrottling:false or document.visibilitychange
  // BrowserWindow events are reliable in Electron 27+
  const sendVisibility = (visible: boolean): void =>
    mainWindow.webContents.send('window:visibility', visible)

  mainWindow.on('minimize', () => sendVisibility(false))
  mainWindow.on('hide', () => sendVisibility(false))
  mainWindow.on('blur', () => sendVisibility(false))
  mainWindow.on('restore', () => sendVisibility(true))
  mainWindow.on('show', () => sendVisibility(true))
  mainWindow.on('focus', () => sendVisibility(true))

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.weatherdeck')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Updated weather:fetch — now accepts settings as 3rd arg
  ipcMain.handle('weather:fetch', async (_event, lat: number, lon: number, settings?: { temperatureUnit: string; windSpeedUnit: string }) =>
    fetchWeather(lat, lon, settings ?? { temperatureUnit: conf.get('temperatureUnit'), windSpeedUnit: conf.get('windSpeedUnit') })
  )

  // Settings IPC — uses main-process conf singleton directly
  ipcMain.handle('settings:get', (_event, key: string) => conf.get(key as keyof typeof conf.store))
  ipcMain.handle('settings:set', (_event, key: string, value: unknown) => {
    conf.set(key as keyof typeof conf.store, value as never)
  })

  // Locations IPC — uses locationsConf singleton
  ipcMain.handle('locations:get-all', () => locationsConf.get('locations'))

  ipcMain.handle('locations:add', (_event, location: LocationInfo) => {
    const current = locationsConf.get('locations')
    if (current.some((l) => l.zip === location.zip)) return { error: 'duplicate' }
    locationsConf.set('locations', [...current, location])
    locationsConf.set('hasLaunched', true)
    locationsConf.set('lastActiveZip', location.zip)
    return { ok: true }
  })

  ipcMain.handle('locations:delete', (_event, zip: string) => {
    const current = locationsConf.get('locations')
    locationsConf.set('locations', current.filter((l) => l.zip !== zip))
  })

  ipcMain.handle('locations:set-active', (_event, zip: string | null) => {
    locationsConf.set('lastActiveZip', zip)
  })

  ipcMain.handle('locations:get-meta', () => ({
    lastActiveZip: locationsConf.get('lastActiveZip'),
    hasLaunched: locationsConf.get('hasLaunched')
  }))

  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
