# Architecture Research

**Domain:** Windows desktop weather application (Electron + React + TypeScript)
**Researched:** 2026-03-01
**Confidence:** MEDIUM-HIGH (Electron process model from official docs = HIGH; project-specific patterns from WebSearch = MEDIUM)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        RENDERER PROCESS                          │
│  (Chromium sandbox — web standards only, no Node.js access)      │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  UI Layer    │  │  State Layer │  │   Theme Layer        │   │
│  │  (React      │  │  (React      │  │   (CSS custom        │   │
│  │   components)│  │   useState/  │  │    properties,       │   │
│  │              │  │   context)   │  │    neon glow)        │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────────┘   │
│         │                 │                                       │
│  ┌──────▼─────────────────▼──────────────────────────────────┐   │
│  │              window.weatherAPI (contextBridge)             │   │
│  └──────────────────────────┬────────────────────────────────┘   │
└─────────────────────────────│───────────────────────────────────┘
                              │  IPC (ipcRenderer.invoke /
                              │       ipcMain.on webContents.send)
┌─────────────────────────────│───────────────────────────────────┐
│                      PRELOAD SCRIPT                              │
│  (Node.js access + contextBridge — secure boundary)             │
│                                                                   │
│  Exposes: getWeather(), getLocations(), saveSettings(),          │
│           onWeatherUpdate() listener                             │
└─────────────────────────────│───────────────────────────────────┘
                              │
┌─────────────────────────────│───────────────────────────────────┐
│                        MAIN PROCESS                              │
│  (Node.js — full system access, single instance)                 │
│                                                                   │
│  ┌──────────────┐  ┌─────────────────┐  ┌────────────────────┐  │
│  │  App Manager │  │  Weather Service │  │  Settings Service  │  │
│  │  (window     │  │  (fetch API,     │  │  (electron-store,  │  │
│  │   lifecycle) │  │   rate limiting) │  │   JSON file in     │  │
│  └──────────────┘  └────────┬────────┘  │   userData/)       │  │
│                              │           └────────────────────┘  │
│  ┌───────────────────────────▼─────────────────────────────┐    │
│  │                  Refresh Scheduler                        │    │
│  │  setInterval() → fetch API → webContents.send()          │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────│───────────────────────────────────┐
│                     EXTERNAL SERVICES                            │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  OpenWeatherMap API (free tier — HTTP over Node.js     │     │
│  │  fetch, NOT renderer fetch, to avoid CORS/key leakage) │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  Local filesystem (userData/settings.json via          │     │
│  │  electron-store or Electron app.getPath('userData'))   │     │
│  └────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| App Manager | Window creation, app lifecycle (ready, close, quit) | `src/main/index.ts` using Electron `app` + `BrowserWindow` |
| Weather Service | HTTP calls to weather API, response normalization, rate limit enforcement | `src/main/services/weather.ts` using Node.js `fetch` or `axios` |
| Refresh Scheduler | Fires weather fetches on a configurable interval; pushes results to renderer | `setInterval` in main process; `mainWindow.webContents.send('weather-update', data)` |
| Settings Service | Persist/load user preferences (locations, interval) from disk | `src/main/services/settings.ts` using `electron-store` (type-safe JSON wrapper) |
| IPC Handlers | Expose typed API surface from main to renderer via preload | `src/main/ipc/` handlers registered with `ipcMain.handle()` |
| Preload Bridge | Security boundary — exposes only allowed methods to renderer via `contextBridge` | `src/preload/index.ts` exposing typed `window.weatherAPI` object |
| UI Components | React components rendering weather data, location switcher, settings panel | `src/renderer/components/` (CurrentConditions, HourlyForecast, LocationSwitcher, SettingsPanel) |
| State Layer | React state for current data, active location, loading/error states | `useState` + `useContext` (no external state library needed at this scale) |
| Theme Layer | CSS custom properties defining dark neon palette; box-shadow/text-shadow for glow | `src/renderer/styles/theme.css` with semantic variable names |

## Recommended Project Structure

```
src/
├── main/                      # Main process (Node.js environment)
│   ├── index.ts               # Entry point — creates window, wires app lifecycle
│   ├── ipc/
│   │   └── handlers.ts        # ipcMain.handle() registrations
│   └── services/
│       ├── weather.ts         # API fetch, normalization, caching
│       ├── scheduler.ts       # setInterval refresh loop, webContents.send()
│       └── settings.ts        # electron-store read/write wrapper
│
├── preload/
│   └── index.ts               # contextBridge.exposeInMainWorld('weatherAPI', {...})
│
├── renderer/                  # Renderer process (Chromium / React environment)
│   ├── index.html             # Shell HTML loaded by BrowserWindow
│   └── src/
│       ├── App.tsx            # Root component — layout, routing
│       ├── components/
│       │   ├── CurrentConditions.tsx   # Temp, humidity, wind, sky
│       │   ├── HourlyForecast.tsx      # Scrollable hourly strip
│       │   ├── LocationSwitcher.tsx    # Saved zip code tabs/list
│       │   └── SettingsPanel.tsx       # Interval config, add/remove locations
│       ├── hooks/
│       │   ├── useWeather.ts           # Subscribes to weather-update IPC events
│       │   └── useSettings.ts          # Reads/writes settings via weatherAPI bridge
│       └── styles/
│           ├── theme.css               # CSS custom properties (dark neon palette)
│           └── global.css              # Reset, base typography
│
└── shared/
    └── types.ts               # Shared TypeScript interfaces (WeatherData, Location, Settings)

electron.vite.config.ts        # electron-vite configuration
package.json
tsconfig.json
```

### Structure Rationale

- **main/services/:** Keeps Node.js-only concerns (network, filesystem) isolated from Electron plumbing; testable in isolation
- **preload/:** Single file as security boundary; minimal surface area — only expose named functions, never raw ipcRenderer
- **renderer/hooks/:** IPC subscription logic lives in hooks, keeping components declarative; `useWeather` listens for push updates from main
- **shared/types.ts:** Single source of truth for data shapes crossing the IPC boundary — prevents desync between main serialization and renderer consumption

## Architectural Patterns

### Pattern 1: Main-Process-Owns-Network

**What:** All HTTP calls to the weather API happen in the main process (Node.js), not in the renderer.
**When to use:** Always, for this app.
**Trade-offs:** Slightly more IPC overhead, but the API key never touches the renderer (no devtools exposure), CORS is irrelevant, and the refresh timer is decoupled from UI lifecycle.

**Example:**
```typescript
// src/main/services/weather.ts
export async function fetchWeather(zipCode: string): Promise<WeatherData> {
  const url = `https://api.openweathermap.org/data/2.5/weather?zip=${zipCode},us&appid=${process.env.OWM_KEY}&units=imperial`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
  return normalizeCurrentWeather(await res.json());
}
```

### Pattern 2: Push-Based Refresh via webContents.send

**What:** The main process owns a `setInterval` scheduler. On each tick it fetches weather for the active location and pushes the result to the renderer via `webContents.send`. The renderer is purely reactive.
**When to use:** Whenever the main process needs to push unsolicited updates (timers, OS events).
**Trade-offs:** Renderer cannot control timing directly (intentional), but can trigger a manual refresh via `ipcRenderer.invoke('refresh-now')`.

**Example:**
```typescript
// src/main/services/scheduler.ts
export function startScheduler(win: BrowserWindow, intervalMs: number) {
  return setInterval(async () => {
    try {
      const data = await fetchWeather(getActiveLocation());
      win.webContents.send('weather-update', data);
    } catch (err) {
      win.webContents.send('weather-error', String(err));
    }
  }, intervalMs);
}
```

```typescript
// src/renderer/hooks/useWeather.ts
export function useWeather() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = window.weatherAPI.onWeatherUpdate((d) => setData(d));
    const unsubErr = window.weatherAPI.onWeatherError((e) => setError(e));
    return () => { unsub(); unsubErr(); };
  }, []);

  return { data, error };
}
```

### Pattern 3: contextBridge Whitelist (Security Boundary)

**What:** The preload script exposes a named, typed object (`window.weatherAPI`) through `contextBridge.exposeInMainWorld`. Only explicitly listed functions are callable from the renderer.
**When to use:** Mandatory in all modern Electron apps. Context isolation is on by default since Electron 12.
**Trade-offs:** Slightly more boilerplate, but required for any production app and prevents renderer code from calling arbitrary Node.js APIs.

**Example:**
```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('weatherAPI', {
  getWeather: (zip: string) => ipcRenderer.invoke('get-weather', zip),
  getSettings: ()           => ipcRenderer.invoke('get-settings'),
  saveSettings: (s: Settings) => ipcRenderer.invoke('save-settings', s),
  refreshNow: ()            => ipcRenderer.invoke('refresh-now'),
  onWeatherUpdate: (cb: (d: WeatherData) => void) => {
    ipcRenderer.on('weather-update', (_e, d) => cb(d));
    return () => ipcRenderer.removeAllListeners('weather-update');
  },
  onWeatherError: (cb: (msg: string) => void) => {
    ipcRenderer.on('weather-error', (_e, m) => cb(m));
    return () => ipcRenderer.removeAllListeners('weather-error');
  },
});
```

## Data Flow

### Auto-Refresh Flow (Primary)

```
[setInterval fires in main process]
    |
    v
WeatherService.fetchWeather(activeZip)
    |  (HTTP — Node.js fetch to OpenWeatherMap)
    v
Normalized WeatherData object
    |
    v
mainWindow.webContents.send('weather-update', data)
    |  (IPC push — serialized as JSON)
    v
ipcRenderer.on('weather-update') in preload listener
    |
    v
window.weatherAPI.onWeatherUpdate callback fires
    |
    v
useWeather() hook calls setData(data)
    |
    v
React re-renders CurrentConditions + HourlyForecast
```

### User-Initiated Flows

```
[User adds zip code]
    -> LocationSwitcher calls window.weatherAPI.saveSettings(updated)
    -> ipcMain.handle('save-settings') persists via electron-store
    -> Scheduler switches active location, triggers immediate fetch
    -> weather-update pushed to renderer

[User changes refresh interval]
    -> SettingsPanel calls window.weatherAPI.saveSettings({interval: N})
    -> ipcMain.handle clears old setInterval, starts new one
    -> Confirmation acknowledged via invoke return value

[User clicks "Refresh Now"]
    -> window.weatherAPI.refreshNow()
    -> ipcMain.handle('refresh-now') fetches immediately
    -> Result pushed via weather-update channel
```

### State Management

```
Main Process (source of truth for data)
    |
    | push via IPC
    v
useWeather() hook (local React state per component tree)
    |
    | props / context
    v
CurrentConditions, HourlyForecast, LocationSwitcher
```

State lives in React `useState` in the renderer. No Redux or external state library is needed — the volume of state is small (one WeatherData object, one Settings object). If the app grows to multi-window, elevate to a shared IPC-based state manager.

## Scaling Considerations

This is a single-user desktop app. "Scaling" here means feature growth, not user load.

| Scale | Architecture Adjustments |
|-------|--------------------------|
| MVP (current) | Single window, `useState` in hooks, flat component tree, electron-store for settings |
| v2 (system tray, multi-window) | Introduce shared state store in main process; renderer queries on demand; tray icon as separate BrowserWindow |
| v2 (multi-day forecast) | Add new IPC channel `get-forecast`; extend WeatherData type; add ForecastPanel component |
| v3 (alerts, notifications) | Main process polls alerts endpoint; uses Electron `Notification` API — no renderer changes needed |

### Scaling Priorities

1. **First constraint:** Free-tier API rate limits (OpenWeatherMap free = 60 calls/minute, 1000/day). Enforce minimum 60-second refresh floor in scheduler; cache last response so location switches don't double-count.
2. **Second constraint:** Window lifecycle — the scheduler must clear `setInterval` on window close to avoid orphaned timers. Wire cleanup in `app.on('before-quit')` and `win.on('closed')`.

## Anti-Patterns

### Anti-Pattern 1: API Calls in the Renderer

**What people do:** Use `fetch()` directly in a React component or hook to call the weather API.
**Why it's wrong:** The API key is visible in renderer DevTools (F12). CORS errors possible. Refresh logic scattered across component lifecycle. Timer tied to component mount/unmount rather than app lifetime.
**Do this instead:** All network calls in `src/main/services/weather.ts`. Renderer only receives normalized data via IPC.

### Anti-Pattern 2: Exposing ipcRenderer Directly via contextBridge

**What people do:** `contextBridge.exposeInMainWorld('ipc', ipcRenderer)` — exposes the whole module.
**Why it's wrong:** Renderer can send arbitrary IPC messages to any channel, bypassing all access controls. Violates least-privilege. Security audits will flag this.
**Do this instead:** Expose only named functions (see Pattern 3 above). Renderer can only call what's explicitly whitelisted.

### Anti-Pattern 3: Storing API Keys in renderer-accessible Config

**What people do:** Put `OWM_KEY=...` in a `.env` file loaded by Vite and accessed via `import.meta.env.VITE_OWM_KEY` in renderer code.
**Why it's wrong:** Vite inlines env variables into the JS bundle. Anyone with the app binary can extract the key with a text editor.
**Do this instead:** Load the key only in the main process (`process.env` or a local config file in userData). Never send the key over IPC.

### Anti-Pattern 4: Timer in the Renderer

**What people do:** `useEffect(() => { const id = setInterval(fetchWeather, 300000); return () => clearInterval(id); }, [])` — refresh driven by a React effect.
**Why it's wrong:** Timer stops if the component unmounts. User navigating the settings panel could interrupt the refresh cycle. Timer is not centrally controllable.
**Do this instead:** Timer in main process scheduler. Renderer is purely reactive.

### Anti-Pattern 5: Monolithic Single-File Main Process

**What people do:** All app logic (window creation, IPC handlers, API calls, scheduler) in one `main.ts` file.
**Why it's wrong:** Becomes unmaintainable quickly; IPC handlers and business logic interleaved; nothing is testable in isolation.
**Do this instead:** Separate files for services (`weather.ts`, `scheduler.ts`, `settings.ts`) and IPC handlers (`ipc/handlers.ts`). `index.ts` is the wiring layer only.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| OpenWeatherMap (current weather) | `GET /data/2.5/weather?zip={zip},us&appid={key}&units=imperial` — called from main process Node.js `fetch` | Returns JSON with `main.temp`, `weather[0].description`, `wind.speed`, `main.humidity`. Normalize before sending over IPC. |
| OpenWeatherMap (hourly forecast) | `GET /data/2.5/forecast?zip={zip},us&appid={key}&units=imperial&cnt=24` — same pattern | Returns `list[]` with 3-hour intervals; filter/interpolate for hourly display. Free tier includes 5-day/3-hour forecast. True hourly requires paid plan — verify during implementation. |
| electron-store | Wraps `app.getPath('userData')/config.json`; called from `settings.ts` | Type-safe JSON persistence; handles schema defaults and migration. Install: `npm install electron-store`. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Main process <-> Renderer | IPC only (ipcMain.handle / ipcRenderer.invoke for request/response; webContents.send / ipcRenderer.on for push) | Never share memory; all data serialized as JSON |
| Preload <-> Main | ipcRenderer calls forwarded as-is; preload has no business logic | Keep preload thin — routing layer only |
| Preload <-> Renderer | `window.weatherAPI` typed API surface | Renderer TypeScript should declare `interface Window { weatherAPI: WeatherAPI }` in a `.d.ts` file |
| Weather Service <-> Scheduler | Scheduler calls `WeatherService.fetchWeather()`; owns the timer | Scheduler is the only caller; Weather Service is stateless |
| Settings Service <-> Scheduler | Scheduler reads interval from Settings on init; Settings change event triggers scheduler restart | Use an EventEmitter or direct function call from IPC handler |

## Build Order Implications

Build in dependency order — lower layers before upper layers:

1. **shared/types.ts** — Define `WeatherData`, `Location`, `Settings` interfaces first. Everything else imports from here.
2. **main/services/settings.ts** — Foundation: no other dependencies. Needed before scheduler or IPC.
3. **main/services/weather.ts** — Standalone HTTP service. Testable in isolation (mock fetch).
4. **main/services/scheduler.ts** — Depends on weather service + settings. Build after both.
5. **main/ipc/handlers.ts** — Wires IPC channels to services. Depends on all services.
6. **main/index.ts** — Assembles window + IPC + scheduler. Entry point last.
7. **preload/index.ts** — Must match IPC channel names defined in handlers.ts. Build after IPC handlers are finalized.
8. **renderer/styles/theme.css** — CSS custom properties and neon tokens. No JS dependencies.
9. **renderer/hooks/** — Depends on preload API surface (`window.weatherAPI` types).
10. **renderer/components/** — Depend on hooks and types. Build top-down: CurrentConditions, HourlyForecast, LocationSwitcher, SettingsPanel.
11. **renderer/App.tsx** — Assembles components. Last renderer piece.

## Sources

- Electron Process Model (official docs, HIGH confidence): https://www.electronjs.org/docs/latest/tutorial/process-model
- Electron IPC (official docs, HIGH confidence): https://www.electronjs.org/docs/latest/tutorial/ipc
- Electron Preload Scripts (official docs, HIGH confidence): https://www.electronjs.org/docs/latest/tutorial/tutorial-preload
- Advanced Electron.js Architecture — LogRocket (MEDIUM confidence): https://blog.logrocket.com/advanced-electron-js-architecture/
- electron-vite project structure (MEDIUM confidence): https://electron-vite.org/guide/dev
- MVVM patterns for Windows desktop — Microsoft Learn (HIGH confidence): https://learn.microsoft.com/en-us/windows/apps/develop/data-binding/data-binding-and-mvvm
- Electron React folder structure conventions (MEDIUM confidence — multiple sources agree): https://hassanagmir.com/blogs/electronjs-files-structure-and-best-practices
- Neon UI CSS techniques (MEDIUM confidence): https://www.codista.com/de/blog/neon-mode-building-new-dark-ui/
- IPC push pattern (setInterval + webContents.send) — multiple community sources (MEDIUM confidence): https://codex.so/electron-ipc

---
*Architecture research for: Windows desktop weather application (WeatherDeck)*
*Researched: 2026-03-01*
