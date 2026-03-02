# Architecture Research

**Domain:** WeatherDeck v1.1 — Electron + React feature integration
**Researched:** 2026-03-01
**Confidence:** HIGH (existing codebase read directly; new patterns verified against official docs and Open-Meteo API reference)

---

## Context: Existing Architecture Baseline

This is a subsequent milestone document. The existing v1.0 architecture is stable and must not be broken. New features integrate into, not alongside, established patterns.

**Current IPC contract (namespace:verb pattern):**
- `weather:fetch(lat, lon, settings)` — main fetches Open-Meteo, returns `OpenMeteoResult`
- `settings:get(key)` / `settings:set(key, value)` — reads/writes electron-conf singleton

**Current renderer patterns:**
- `useWeather(location, settings)` — fetches on location/unit change, exposes `refetch()`
- `useSettings()` — loads all settings on mount, sets `loaded: true` on completion
- `App.tsx` — owns `locations[]` and `activeIndex` in component state (lost on restart — gap to fix)
- Settings gate: weather fetch blocked until `settingsLoaded === true`

**Critical gap identified in v1.0:** `locations[]` lives only in React state. It is erased on app restart. v1.1 must persist locations via IPC + electron-conf, following the existing settings pattern.

---

## System Overview (v1.1 Target State)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        RENDERER PROCESS                              │
├────────────────────────────────────┬────────────────────────────────┤
│           UI LAYER                 │         CANVAS LAYER           │
│  ┌────────┐  ┌────────────────┐    │  ┌────────────────────────┐    │
│  │Sidebar │  │WeatherPanel    │    │  │WeatherParticles        │    │
│  │        │  │  ┌───────────┐ │    │  │position:absolute       │    │
│  │+delete │  │  │LastUpdated│ │    │  │inset:0                 │    │
│  │button  │  │  │+countdown │ │    │  │pointer-events:none     │    │
│  │        │  │  └───────────┘ │    │  │z-index: 0 (behind UI)  │    │
│  │        │  │  (existing UI) │    │  └────────────────────────┘    │
│  │        │  │  ┌───────────┐ │    │                                │
│  │        │  │  │HourlyFore-│ │    │                                │
│  │        │  │  │cast strip │ │    │                                │
│  │        │  │  └───────────┘ │    │                                │
│  └────────┘  └────────────────┘    │                                │
├────────────────────────────────────┴────────────────────────────────┤
│                      HOOKS / STATE LAYER                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐ │
│  │useWeather        │  │useSettings       │  │useAutoRefresh      │ │
│  │(+returns hourly[]│  │(unchanged)       │  │(NEW — timer +      │ │
│  │alongside weather)│  │                  │  │ countdown state)   │ │
│  └──────────────────┘  └──────────────────┘  └────────────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│                      PRELOAD / IPC BRIDGE                            │
│  electronAPI.fetchWeather(lat, lon, settings)  [extended response]   │
│  electronAPI.getSetting(key)                   [unchanged]           │
│  electronAPI.setSetting(key, value)            [unchanged]           │
│  electronAPI.getLocations()                    [NEW]                 │
│  electronAPI.saveLocations(locs)               [NEW]                 │
└──────────────────────┬──────────────────────────────────────────────┘
                       │  contextBridge (contextIsolation: true)
┌──────────────────────┴──────────────────────────────────────────────┐
│                        MAIN PROCESS                                  │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  ipcMain.handle('weather:fetch')  <- extended to return        │  │
│  │    current + hourly[] in one response                          │  │
│  │  ipcMain.handle('settings:get')   [unchanged]                  │  │
│  │  ipcMain.handle('settings:set')   [unchanged]                  │  │
│  │  ipcMain.handle('locations:get')  [NEW]                        │  │
│  │  ipcMain.handle('locations:set')  [NEW]                        │  │
│  └────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  conf (electron-conf singleton)                                │  │
│  │    temperatureUnit, windSpeedUnit, refreshInterval  [existing] │  │
│  │    locations: LocationInfo[]                        [NEW KEY]  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                           |                                           │
│                  Open-Meteo API (free, no key)                        │
│              https://api.open-meteo.com/v1/forecast                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

### New Components (v1.1 additions)

| Component | Responsibility | Placement |
|-----------|----------------|-----------|
| `HourlyForecast` | Scrollable 12-hour strip: time, icon, temp, precip% | Below ConditionsGrid inside WeatherPanel |
| `WeatherParticles` | Canvas particle overlay keyed to weatherCode/isDay | `position: absolute; inset: 0` first child of WeatherPanel `<main>` |
| `LastUpdated` | Renders "Updated X min ago / refresh in Ys" | Header row of WeatherPanel |

### Modified Components (v1.1 changes)

| Component | What Changes | What Is Unchanged |
|-----------|--------------|-------------------|
| `App.tsx` | Load locations from IPC on mount; persist on add/delete; delete handler; location-switch transition state; second loading gate (`locationsLoaded`) | Settings gate pattern, activeIndex logic, Sidebar/WeatherPanel composition |
| `Sidebar` | Add delete button (X) per location item | Zip input form, add/select flow, styling |
| `WeatherPanel` | Compose `HourlyForecast`, `WeatherParticles`, `LastUpdated`; add `relative` positioning context | Skeleton, error card, settings modal, ConditionsGrid, TemperatureHero |
| `useWeather` | Return `hourly: HourlyPoint[]` alongside existing `weather` | Retry logic, stale data behavior, settings dependency |

### New Hooks (v1.1)

| Hook | Responsibility |
|------|----------------|
| `useAutoRefresh` | Manages periodic `refetch()` calls based on `refreshInterval`; exposes `secondsUntilRefresh` and `lastUpdatedAt` for display |

---

## Data Flow Changes

### 1. Hourly Forecast Data Flow

Open-Meteo accepts `hourly` parameters in the same request as `current`. No new API call is required — extend the existing `weather:fetch` handler to include hourly data.

**Verified Open-Meteo hourly parameters (HIGH confidence, official docs):**
- `hourly=temperature_2m,weather_code,precipitation_probability`
- `forecast_hours=12` — restricts response to next 12 hours (supported; default is full 7-day hourly)

**Extension to `weather.ts` (main process):**
```typescript
// Add to URLSearchParams:
hourly: 'temperature_2m,weather_code,precipitation_probability',
forecast_hours: '12',

// Add to return value:
hourly: (json.hourly.time as string[]).map((t, i) => ({
  time: t,
  temperature: json.hourly.temperature_2m[i],
  weatherCode: json.hourly.weather_code[i],
  precipProbability: json.hourly.precipitation_probability[i]
}))
```

**New type additions to `types.ts`:**
```typescript
export interface HourlyPoint {
  time: string              // ISO 8601 local, e.g. "2026-03-01T14:00"
  temperature: number
  weatherCode: number
  precipProbability: number // 0-100
}

// Extend WeatherData:
export interface WeatherData {
  // ...all existing fields unchanged...
  hourly: HourlyPoint[]
}
```

**Full data flow:**
```
useWeather calls: electronAPI.fetchWeather(lat, lon, settings)
    |
    v (IPC → main process)
fetchWeather() adds hourly params to Open-Meteo request
    |
    v (one HTTP call returns both current + hourly)
main returns: { ...currentFields, hourly: HourlyPoint[] }
    |
    v (IPC response → renderer)
useWeather sets: weather (WeatherData with hourly included)
    |
    v (props)
WeatherPanel renders: <HourlyForecast data={weather.hourly} />
```

### 2. Location Persistence Data Flow

```
App mounts
  -> electronAPI.getLocations() [IPC to main]
  -> conf.get('locations') ?? []
  -> setLocations(loaded)
  -> setLocationsLoaded(true)
  Gate: only render main layout when settingsLoaded && locationsLoaded

User adds location:
  -> resolveZip(zip) -> LocationInfo  [no change — offline lookup]
  -> newLocs = [...prev, newLoc]
  -> setLocations(newLocs)            [React state — immediate UI update]
  -> electronAPI.saveLocations(newLocs)  [IPC → conf.set]

User deletes location:
  -> filtered = locations.filter((_, i) => i !== targetIndex)
  -> setLocations(filtered)
  -> setActiveIndex(clamp(activeIndex, 0, filtered.length - 1))
  -> electronAPI.saveLocations(filtered)

App restarts:
  -> locations loaded from conf — locations survive restart
```

**New IPC handlers to add to `main/index.ts`:**
```typescript
ipcMain.handle('locations:get', () =>
  (conf.get('locations') as LocationInfo[]) ?? []
)
ipcMain.handle('locations:set', (_event, locations: LocationInfo[]) => {
  conf.set('locations' as never, locations as never)
})
```

**New preload bridge methods in `preload/index.ts`:**
```typescript
getLocations: (): Promise<LocationInfo[]> =>
  ipcRenderer.invoke('locations:get'),
saveLocations: (locations: LocationInfo[]): Promise<void> =>
  ipcRenderer.invoke('locations:set', locations),
```

**Settings type extension** — add `locations` to both `settings.ts` (main) and `types.ts` (renderer). electron-conf stores any JSON-serializable value including arrays of objects (HIGH confidence, verified against electron-conf GitHub — uses JSON Schema).

```typescript
// In AppSettings (both settings.ts and types.ts):
locations?: LocationInfo[]  // optional — electron-conf handles missing key via defaults
```

Note: The project comment in `settings.ts` says `AppSettings` must match between both files — follow this existing discipline when extending.

### 3. Auto-Refresh Data Flow

The refresh timer belongs in the renderer, not the main process. The main-process-timer approach (push via `webContents.send`) requires bidirectional IPC, complicating the preload bridge and adding a channel that bypasses the existing request/response pattern. The renderer already controls the fetch lifecycle through `refetch()`.

```
useAutoRefresh(refetch, refreshInterval, enabled):
  useEffect [on intervalMinutes change]:
    -> setInterval(refetch, intervalMinutes * 60 * 1000)
    -> return () => clearInterval(id)  // cleanup prevents leaked timers on setting change

  Parallel 1-second countdown ticker:
    -> setInterval(() => setSecondsLeft(prev => prev - 1), 1000)
    -> reset to intervalMinutes * 60 on each refetch completion
    -> return cleanup on unmount

  Returns: { secondsUntilRefresh, lastUpdatedAt }

App.tsx:
  const { refetch } = useWeather(...)
  const { secondsUntilRefresh, lastUpdatedAt } = useAutoRefresh(
    refetch,
    settings.refreshInterval,
    settingsLoaded && !!activeLocation
  )
  -> Pass secondsUntilRefresh + lastUpdatedAt to WeatherPanel -> LastUpdated
```

**Hook signature:**
```typescript
export function useAutoRefresh(
  refetch: () => void,
  intervalMinutes: number,
  enabled: boolean
): { secondsUntilRefresh: number; lastUpdatedAt: Date | null }
```

The `enabled` parameter gates the timer until settings and location are both ready, mirroring the existing settings gate pattern.

**Timer throttling note:** Electron's Chromium may throttle `setInterval` when the window is minimized. For a weather display app this is acceptable — users who minimize the window do not need live updates. On restore, the next scheduled tick fires normally. This is not a problem worth solving.

### 4. Canvas Particle Animation Data Flow

```
WeatherPanel renders:
  <main className="flex-1 flex flex-col bg-bg-panel overflow-y-auto relative">
    <WeatherParticles weatherCode={weather.weatherCode} isDay={weather.isDay} />
    {/* existing header, hero, conditions grid, hourly strip */}
  </main>

WeatherParticles:
  canvasRef = useRef<HTMLCanvasElement>
  frameRef  = useRef<number>(0)

  Derives particleType from weatherCode (see table below)

  useEffect [on particleType change]:
    if (particleType === 'none') return
    canvas = canvasRef.current
    ctx = canvas.getContext('2d')
    particles = initParticles(particleType, canvas.width, canvas.height)
    animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      updateParticles(particles, ...)
      drawParticles(ctx, particles, particleType)
      frameRef.current = requestAnimationFrame(animate)
    }
    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)  // critical cleanup
```

**Particle type mapping (keyed to existing weatherCodeMap.ts ranges):**

| Weather Codes | Particle Effect | Notes |
|---------------|-----------------|-------|
| 0, 1 (clear, mainly clear) | none | Clear sky should stay clean |
| 2, 3 (partly cloudy, overcast) | none | Subtle is better than noisy for cloud conditions |
| 45, 48 (fog) | fog — slow drifting low-opacity white wisps | ~20-30 particles |
| 51-57 (drizzle) | drizzle — fine thin diagonal lines, low density | ~50-70 lines |
| 61-67 (rain) | rain — diagonal lines, medium density | ~80-120 lines |
| 71-77 (snow) | snow — circular drifting flakes | ~40-60 flakes |
| 80-82 (showers) | rain — heavier density than 61-67 | ~120-150 lines |
| 85-86 (snow showers) | snow — medium density | ~50-70 flakes |
| 95-99 (thunderstorm) | rain heavy + occasional flash (white opacity burst) | ~150 lines |

**Canvas implementation pattern (HIGH confidence — standard requestAnimationFrame + React cleanup):**
```typescript
useEffect(() => {
  const canvas = canvasRef.current
  if (!canvas || particleType === 'none') return
  const ctx = canvas.getContext('2d')!
  const particles = initParticles(particleType, canvas.width, canvas.height)

  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    updateAndDraw(ctx, particles, particleType, canvas)
    frameRef.current = requestAnimationFrame(animate)
  }
  frameRef.current = requestAnimationFrame(animate)

  return () => cancelAnimationFrame(frameRef.current)  // prevents frame leak on weatherCode change
}, [particleType])
```

**Canvas sizing:** Use `position: absolute; inset: 0` on the `<canvas>` element inside the WeatherPanel `<main>`. Set `width={parentWidth}` and `height={parentHeight}` on mount via a ResizeObserver, or size once to the window's known min dimensions (600×700). The simple approach (size to 100% via CSS, use `canvas.offsetWidth/Height` on init) is sufficient for a single-window desktop app.

---

## Smooth Location-Switch Transitions

Use CSS transitions rather than adding Framer Motion. The project has no existing animation library. Adding Framer Motion (87KB gzipped) for a single fade is not justified.

**Pattern: opacity fade on WeatherPanel content, triggered by activeIndex change.**

```typescript
// In App.tsx — manage transition visibility alongside activeIndex
const [panelVisible, setPanelVisible] = useState(true)
const prevActiveIndex = useRef(activeIndex)

useEffect(() => {
  if (activeIndex !== prevActiveIndex.current) {
    setPanelVisible(false)
    const t = setTimeout(() => {
      prevActiveIndex.current = activeIndex
      setPanelVisible(true)
    }, 150)
    return () => clearTimeout(t)
  }
}, [activeIndex])

// WeatherPanel receives: visible={panelVisible}
// Applies: className={`transition-opacity duration-150 ${visible ? 'opacity-100' : 'opacity-0'}`}
```

This is one effect in `App.tsx` and one class addition to `WeatherPanel` — no new component, no new dependency.

---

## Recommended File Changes

```
src/
├── main/
│   ├── index.ts          MODIFIED — add locations:get, locations:set handlers
│   ├── settings.ts       MODIFIED — add locations?: LocationInfo[] to AppSettings
│   └── weather.ts        MODIFIED — add hourly params, return hourly[] in result
├── preload/
│   ├── index.ts          MODIFIED — add getLocations, saveLocations to contextBridge
│   └── index.d.ts        MODIFIED — add type declarations for new bridge methods
└── renderer/src/
    ├── App.tsx            MODIFIED — location persistence, delete, transition, locationsLoaded gate
    ├── components/
    │   ├── HourlyForecast.tsx       NEW — scrollable hourly strip
    │   ├── WeatherParticles.tsx     NEW — canvas particle overlay
    │   ├── LastUpdated.tsx          NEW — timestamp + countdown
    │   ├── Sidebar.tsx              MODIFIED — delete button per location
    │   └── WeatherPanel.tsx         MODIFIED — compose new components; add relative positioning
    ├── hooks/
    │   ├── useAutoRefresh.ts        NEW — interval timer + countdown state
    │   └── useWeather.ts            MODIFIED — return hourly: HourlyPoint[]
    └── lib/
        └── types.ts                 MODIFIED — HourlyPoint type; extend WeatherData, AppSettings
```

**Installer:**
```
electron-builder.yml                 MODIFIED — fix appId, productName, executableName; add nsis options
```

---

## IPC Contract (v1.1 Complete)

| Channel | Direction | Args | Returns | Status |
|---------|-----------|------|---------|--------|
| `weather:fetch` | renderer->main | lat, lon, settings | `OpenMeteoResult` + `hourly: HourlyPoint[]` | EXTENDED |
| `settings:get` | renderer->main | key: string | value | UNCHANGED |
| `settings:set` | renderer->main | key: string, value: unknown | void | UNCHANGED |
| `locations:get` | renderer->main | — | `LocationInfo[]` | NEW |
| `locations:set` | renderer->main | `LocationInfo[]` | void | NEW |

No push channels (`webContents.send`) are introduced. All IPC remains request/response.

---

## Build Order (Dependency-Respecting)

```
Phase 1 — Data foundation  [no UI dependencies — build first]
  1a. types.ts — add HourlyPoint; extend WeatherData (+ hourly[]) and AppSettings (+ locations?)
  1b. weather.ts (main) — add hourly params to URLSearchParams; return hourly[] in result
  1c. settings.ts (main) — add locations? to AppSettings interface and DEFAULTS
  1d. index.ts (main) — add locations:get, locations:set ipcMain.handle registrations
  1e. preload/index.ts + index.d.ts — add getLocations, saveLocations to contextBridge

Phase 2 — Location persistence  [depends on 1c/1d/1e]
  2a. App.tsx — load locations on mount (IPC), persist on add/delete, delete handler,
               locationsLoaded gate (mirrors existing settingsLoaded gate)
  2b. Sidebar — add delete button (X) per location item
  GATE: verify locations survive app restart before proceeding

Phase 3 — Hourly forecast  [depends on 1a/1b]
  3a. HourlyForecast component — pure display, accepts HourlyPoint[]; no state
  3b. useWeather — expose hourly[] from hook return
  3c. WeatherPanel — compose <HourlyForecast data={weather.hourly} />
  GATE: verify forecast renders correctly with real API data

Phase 4 — Auto-refresh  [depends on Phase 2 — locations must be stable]
  4a. useAutoRefresh hook — interval + 1s countdown ticker
  4b. LastUpdated component — formats secondsUntilRefresh + lastUpdatedAt
  4c. Wire into App.tsx / WeatherPanel
  GATE: verify no double-fetch on startup; verify timer clears on location switch

Phase 5 — Particles  [independent of Phases 2-4; depends only on 1a]
  5a. WeatherParticles component with canvas animation loop + cleanup
  5b. WeatherPanel — add relative positioning context; render <WeatherParticles />
  5c. Tune particle counts for 60fps at 600x700 minimum window size
  GATE: verify cancelAnimationFrame on weatherCode change; verify pointer-events not blocked

Phase 6 — Smooth transitions  [depends on Phase 2 — needs stable activeIndex]
  6a. Add panelVisible state + opacity transition to App.tsx / WeatherPanel
  No new component required — single useEffect + className change

Phase 7 — Windows installer  [independent of all above — can run in parallel with Phase 5]
  7a. electron-builder.yml — fix appId (com.weatherdeck.app), productName (WeatherDeck),
                             executableName (WeatherDeck)
  7b. Add nsis: oneClick: false, allowToChangeInstallationDirectory: true
  7c. Run npm run build:win, test installer on Windows
  7d. Write SmartScreen documentation for users
```

Phases 5 and 7 have no inter-dependencies and can be parallelized.

---

## Architectural Patterns

### Pattern 1: Extend Existing IPC Response (Don't Add Channels)

**What:** Hourly data is added to the existing `weather:fetch` response rather than creating a new `weather:fetchHourly` channel.
**When to use:** When new data comes from the same API call and is always needed alongside existing data.
**Trade-offs:** Slightly larger payload; eliminates a second sequential IPC round-trip that would block UI render.

### Pattern 2: Settings Gate Applied to Location Load

**What:** Gate the full app render on `settingsLoaded && locationsLoaded` before showing weather UI.
**When to use:** Any data loaded async from main process on mount that must be stable before dependent renders.
**Trade-offs:** One additional boolean to track; prevents location flicker, stale-unit fetch, and double-fetch race conditions.

```typescript
// App.tsx — load in parallel, gate on both
const { settings, loaded: settingsLoaded } = useSettings()
const [locations, setLocations] = useState<LocationInfo[]>([])
const [locationsLoaded, setLocationsLoaded] = useState(false)

useEffect(() => {
  window.electronAPI.getLocations().then((locs) => {
    setLocations(locs)
    setLocationsLoaded(true)
  })
}, [])

// Gate: settingsLoaded && locationsLoaded before passing activeLocation to useWeather
```

### Pattern 3: Renderer-Owned Timer

**What:** `useAutoRefresh` timer lives in renderer, calls existing `refetch()`.
**When to use:** When the timer's only job is to call a renderer-side function on a schedule.
**Trade-offs:** Timer may throttle on window minimize (acceptable for weather display). Avoids bidirectional IPC, keeps refresh lifecycle close to fetch lifecycle.

### Pattern 4: Canvas as Passive Overlay

**What:** `<canvas>` positioned `absolute; inset: 0; pointer-events: none; z-index: 0` as first child of WeatherPanel `<main>`.
**When to use:** Visual effects that span a container without blocking interaction on sibling elements.
**Trade-offs:** Canvas must be sized to container dimensions. Simple approach: read `canvas.offsetWidth` / `canvas.offsetHeight` after mount. No ResizeObserver needed at this scale.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Main-Process Auto-Refresh Timer

**What people do:** `setInterval` in main + `mainWindow.webContents.send('weather:updated', data)` to push to renderer.
**Why it's wrong:** Requires a push IPC channel (bidirectional), preload must expose an `onWeatherUpdate` listener, adds event-listener cleanup complexity in renderer hooks. The renderer already owns fetch lifecycle through `refetch()`.
**Do this instead:** Timer in `useAutoRefresh`, calls `refetch()` — zero new IPC patterns.

### Anti-Pattern 2: Per-Location useWeather Instances

**What people do:** Create one `useWeather` instance per saved location so all locations pre-load weather.
**Why it's wrong:** N locations = N concurrent timers + N API calls per tick. Open-Meteo has no hard rate limit for personal use but three locations at 5-minute intervals = 864 calls/day per user — workable, but multiple instances firing independently risk cascade refreshes.
**Do this instead:** One `useWeather` for the active location. Other locations fetch only when selected. Matches v1.0 behavior exactly.

### Anti-Pattern 3: Two Sources of Truth for Locations

**What people do:** Keep locations in React state AND separately write to conf, with sync logic between them.
**Why it's wrong:** Sources diverge on partial failure. Complex sync code. Possible race on rapid add/delete.
**Do this instead:** React state is the live source. conf is write-through persistence. On mount: conf → state (once). On mutation: update state + call saveLocations() together (one operation).

### Anti-Pattern 4: requestAnimationFrame Without Cleanup

**What people do:** Start animation loop in `useEffect` without returning a cleanup function.
**Why it's wrong:** On weatherCode change or component unmount, the old loop keeps running — drawing on a detached canvas, accumulating frame callbacks, causing memory leaks and visual jitter as two loops run simultaneously.
**Do this instead:** Always `return () => cancelAnimationFrame(frameRef.current)` from the effect that starts the loop.

### Anti-Pattern 5: Canvas Inside a Child Component (TemperatureHero or WeatherIcon)

**What people do:** Mount the particle canvas inside the hero or icon component, scoped to that element.
**Why it's wrong:** Particles must fill the entire WeatherPanel area as a background layer — not just the hero section.
**Do this instead:** Canvas is a direct child of WeatherPanel's outermost `<main>` with `position: absolute; inset: 0`.

---

## Windows Installer Configuration

The existing `electron-builder.yml` uses placeholder values that must be replaced before shipping.

**Required changes:**
```yaml
appId: com.weatherdeck.app       # was: com.electron.app
productName: WeatherDeck         # was: weatherdeck-tmp
win:
  executableName: WeatherDeck    # was: weatherdeck-tmp
nsis:
  artifactName: ${productName}-Setup-${version}.${ext}
  shortcutName: ${productName}
  uninstallDisplayName: ${productName}
  createDesktopShortcut: always
  oneClick: false                # assisted installer with user choice
  allowToChangeInstallationDirectory: true
  # perMachine: false (default) — per-user install, no elevation required
```

**Build command:** `npm run build:win` → produces `dist/WeatherDeck-Setup-1.1.0.exe`

**SmartScreen reality:** Without a code signing certificate, Windows Defender SmartScreen shows a "Windows protected your PC" dialog on first run. This is a user education problem, not a code problem. The installer works correctly — user clicks "More info" then "Run anyway." Document this clearly in user-facing release notes. The app does not need a paid signing certificate for personal distribution.

---

## Integration Points Summary

### External Services (unchanged)

| Service | Integration | Notes |
|---------|-------------|-------|
| Open-Meteo API | `weather:fetch` IPC → main process `fetch()` | Extended to include hourly params; same base URL |
| electron-conf | Singleton `conf` in main process | Extended to store `locations: LocationInfo[]` |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Main <-> Renderer | IPC only — request/response via `ipcMain.handle` / `ipcRenderer.invoke` | No push channels added in v1.1 |
| Renderer state <-> conf | Write-through: state update + `saveLocations()` fire together | React state is live source; conf is persistence |
| WeatherParticles <-> WeatherPanel | Canvas as absolutely-positioned sibling; receives `weatherCode` + `isDay` as props | No shared state; purely visual |
| useAutoRefresh <-> useWeather | `refetch` function passed as argument | No direct coupling; refresh hook is agnostic to fetch implementation |

---

## Sources

- Open-Meteo API official docs — hourly parameters, `forecast_hours`, `precipitation_probability`: https://open-meteo.com/en/docs (HIGH confidence — verified via WebFetch)
- Electron IPC official docs — handle/invoke pattern: https://www.electronjs.org/docs/latest/tutorial/ipc (HIGH confidence)
- electron-conf GitHub — JSON Schema storage, arrays of objects: https://github.com/alex8088/electron-conf (HIGH confidence)
- electron-builder NSIS docs — `oneClick`, `allowToChangeInstallationDirectory`: https://www.electron.build/nsis.html (HIGH confidence — verified via WebFetch)
- requestAnimationFrame + React cleanup: https://css-tricks.com/using-requestanimationframe-with-react-hooks/ (MEDIUM confidence — standard pattern, widely documented)
- Canvas animation in React: https://dev.to/ptifur/animation-with-canvas-and-requestanimationframe-in-react-5ccj (MEDIUM confidence)
- Electron setInterval throttling issue (documented behavior): https://github.com/electron/electron/issues/4465 (HIGH confidence — known issue, acceptable tradeoff for weather app)

---

*Architecture research for: WeatherDeck v1.1 — Electron + React feature integration*
*Researched: 2026-03-01*
