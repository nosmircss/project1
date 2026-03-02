# Stack Research

**Domain:** WeatherDeck v1.1 — auto-refresh, hourly forecast, multi-location, weather particles, Windows installer
**Researched:** 2026-03-01
**Confidence:** HIGH (all additions verified against official sources and npm; existing stack confirmed in package.json)

---

## Context: What Already Exists (DO NOT re-add)

The following are already installed and validated in v1.0. This file covers ONLY additions needed for v1.1.

| Already Present | Version | Notes |
|-----------------|---------|-------|
| Electron | 39.2.6 | Main process, contextBridge IPC |
| React | 19.2.1 | Renderer UI |
| TypeScript | 5.9.3 | Full type coverage |
| Tailwind CSS | 4.2.1 | @tailwindcss/vite plugin |
| electron-vite | 5.0.0 | Build system |
| electron-builder | 26.0.12 | Already in devDependencies — just needs config |
| electron-conf | 1.3.0 | Settings persistence via IPC |
| zipcodes-us | 1.1.2 | Offline zip → lat/lon resolution |
| Open-Meteo REST | v1 | Current-conditions endpoint already wired |
| Vitest | 4.0.18 | 31 passing tests |

---

## New Stack Additions for v1.1

### Feature 1: Auto-Refresh (Main-Process Timer)

**Verdict: No new library needed. Use Node.js `setInterval` in main process.**

The correct pattern for Electron auto-refresh is a `setInterval` in the main process that pushes a trigger to the renderer via `webContents.send`. This is the standard Electron IPC push pattern, keeps network calls in the renderer (where fetch is available), and respects contextIsolation.

**Pattern (confirmed from Electron IPC docs):**

```typescript
// main/index.ts
let refreshTimer: NodeJS.Timeout | null = null

function startRefreshTimer(intervalMs: number, win: BrowserWindow) {
  if (refreshTimer) clearInterval(refreshTimer)
  refreshTimer = setInterval(() => {
    if (!win.isDestroyed()) {
      win.webContents.send('weather:refresh-tick')
    }
  }, intervalMs)
}

// When user changes interval via settings:
ipcMain.handle('timer:set-interval', (_e, ms: number) => {
  startRefreshTimer(ms, mainWindow)
  return { ok: true }
})
```

```typescript
// renderer — listen in useEffect
window.api.onRefreshTick(() => refetch())
```

**Why main-process timer, not renderer `setInterval`:**
- Renderer `setInterval` throttles to 1 Hz when window is backgrounded (Chromium battery optimization — confirmed issue #4465 in electron/electron)
- Main-process Node.js timer is unaffected by window focus/visibility
- Consistent with existing IPC patterns in this codebase

**Why not TanStack Query `refetchInterval`:** TanStack Query would add ~12 KB and its `refetchInterval` pauses on window blur by default. The main-process push timer is simpler and more reliable for this use case. The project does not have complex caching needs that would justify TanStack Query's full API surface.

---

### Feature 2: Hourly Forecast (Open-Meteo Hourly Endpoint)

**Verdict: No new library needed. Extend existing fetch with `&hourly=` parameters.**

Open-Meteo's `/v1/forecast` endpoint already accepts an `hourly` parameter alongside `current`. Add hourly variables to the existing fetch call.

**Confirmed hourly variable names (from official Open-Meteo docs):**

| Variable | Parameter Name | Notes |
|----------|---------------|-------|
| Temperature | `temperature_2m` | 2m above ground, respects `temperature_unit` param |
| Apparent temperature | `apparent_temperature` | Feels-like, same units |
| Precipitation probability | `precipitation_probability` | 0-100% |
| Weather code | `weather_code` | WMO code — same map as current conditions |
| Wind speed | `wind_speed_10m` | Respects `wind_speed_unit` param |

**Extended URL pattern:**

```
https://api.open-meteo.com/v1/forecast
  ?latitude={lat}&longitude={lon}
  &current=temperature_2m,apparent_temperature,weather_code,...
  &hourly=temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m
  &forecast_days=1
  &timezone=auto
  &temperature_unit={celsius|fahrenheit}
  &wind_speed_unit={kmh|mph}
```

**`forecast_days=1` returns 24 hourly entries (0:00 to 23:00 today).** Use `forecast_days=2` for next-day overflow if showing 24 hours from now. The API returns time as ISO strings; parse with `new Date()` — no date library needed.

**API rate limit:** 10,000 calls/day. At 5-minute refresh with 5 locations, worst case is 288 calls/day — well within limits.

---

### Feature 3: Multi-Location Persistence

**Verdict: No new library needed. Extend existing electron-conf schema.**

The project already uses `electron-conf` for settings persistence via explicit IPC. Multi-location is a schema extension, not a new library.

**Extend electron-conf schema:**

```typescript
// Existing: { tempUnit, windUnit, refreshInterval }
// Add:
interface AppConfig {
  tempUnit: 'celsius' | 'fahrenheit'
  windUnit: 'kmh' | 'mph'
  refreshInterval: number  // ms
  locations: Location[]    // NEW
  activeLocationIndex: number  // NEW
}

interface Location {
  zip: string
  city: string    // resolved at save time
  state: string   // resolved at save time
  lat: number     // resolved at save time from zipcodes-us
  lon: number     // resolved at save time from zipcodes-us
}
```

**Resolve zip → coordinates at save time** using the existing `zipcodes-us` package (already installed). Never re-resolve on fetch.

**IPC handlers to add:**

```typescript
ipcMain.handle('locations:add', (_e, zip: string) => { ... })
ipcMain.handle('locations:remove', (_e, index: number) => { ... })
ipcMain.handle('locations:set-active', (_e, index: number) => { ... })
ipcMain.handle('locations:list', () => conf.get('locations'))
```

This follows the existing `namespace:verb` IPC pattern already established in v1.0.

---

### Feature 4: Weather Particle Animations

**Recommendation: Custom canvas component with `useRef` + `requestAnimationFrame`. No library.**

**Why no library:**
- `@tsparticles/react` v3.0.0 was last published 2 years ago (LOW confidence in active maintenance)
- tsParticles is not officially listed as Electron-compatible
- `react-snowfall` v2.4.0 (Dec 2025) is canvas-based but only handles snow
- A custom `useCanvas` hook is ~80 lines and gives full control over particle types: rain, snow, fog drift, clear sparkle, thunderstorm

**Custom pattern (HIGH confidence — standard React + Canvas):**

```typescript
// src/renderer/hooks/useWeatherCanvas.ts
export function useWeatherCanvas(
  canvasRef: RefObject<HTMLCanvasElement>,
  weatherCode: number,
  active: boolean
) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !active) return
    const ctx = canvas.getContext('2d')!
    const particles = initParticles(weatherCode) // rain | snow | fog | clear
    let animId: number

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => { update(p); draw(ctx, p) })
      animId = requestAnimationFrame(tick)
    }
    animId = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(animId)
  }, [weatherCode, active])
}
```

**Particle types by WMO weather code range:**

| Code Range | Condition | Particle Effect |
|------------|-----------|-----------------|
| 0 | Clear | Subtle shimmer/sparkle |
| 1–3 | Partly cloudy | Slow-drifting fog wisps |
| 45–48 | Fog | Dense fog drift particles |
| 51–67 | Drizzle / Rain | Angled rain streaks |
| 71–77 | Snow | Falling snowflakes |
| 80–82 | Rain showers | Heavy rain streaks |
| 95–99 | Thunderstorm | Rain + lightning flash |

**Electron compatibility:** Canvas 2D API is fully supported in Chromium (Electron's renderer). No issues.

**Performance target:** 60fps with ≤200 particles. Use `requestAnimationFrame`, avoid layout reads in tick loop.

---

### Feature 5: Smooth Location-Switch Transitions

**Recommendation: `motion` (formerly framer-motion) for cross-fade transitions.**

| Library | Version | Why |
|---------|---------|-----|
| `motion` | 12.x (12.34.3 as of 2026-03-01) | Official successor to `framer-motion`. React 19 compatible (requires React 18.2+). AnimatePresence + exit animations handle location switch cross-fades. ~25 KB gzipped. |

**Why `motion` over CSS transitions:**
- Location switch involves unmounting old weather data and mounting new — React's lifecycle makes this hard to animate with pure CSS
- `AnimatePresence` detects component removal and runs exit animations before unmount
- The library's `layout` prop handles smooth size changes when hourly forecast row count differs

**Minimal integration pattern:**

```tsx
import { AnimatePresence, motion } from 'motion/react'

<AnimatePresence mode="wait">
  <motion.div
    key={activeLocation.zip}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.25 }}
  >
    <WeatherPanel location={activeLocation} />
  </motion.div>
</AnimatePresence>
```

**Note:** `framer-motion` package name still works (same codebase, different package name). The canonical package is now `motion`. Import from `motion/react` for the React bindings.

---

### Feature 6: Windows Installer

**Verdict: electron-builder already in devDependencies at 26.0.12 (latest stable: 26.8.1). Just needs `build` config in package.json.**

`build:win` script already exists: `"build:win": "npm run build && electron-builder --win"`. Only configuration is missing.

**Recommended electron-builder config block in package.json:**

```json
"build": {
  "appId": "com.weatherdeck.app",
  "productName": "WeatherDeck",
  "directories": {
    "output": "release"
  },
  "files": [
    "out/**/*",
    "!out/**/*.map"
  ],
  "win": {
    "target": [
      {
        "target": "nsis",
        "arch": ["x64"]
      }
    ],
    "icon": "resources/icon.ico"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "installerIcon": "resources/installer-icon.ico",
    "deleteAppDataOnUninstall": false
  }
}
```

**SmartScreen situation (MEDIUM confidence — from official electron-builder docs + GitHub issues):**

- Without a code signing certificate, Windows Defender SmartScreen will show a warning on first run
- This is a UI warning ("Windows protected your PC"), not a hard block — user can click "More info → Run anyway"
- **Mitigation (no-cost approach):** Document the bypass steps in a README. This is acceptable for personal/internal tools
- **Paid mitigation:** Standard Authenticode Code Signing certificate (~$100-300/year) removes the warning for users. EV certificate (~$300-500/year) removes it immediately without needing reputation buildup
- **Microsoft Azure Trusted Signing** (as of Oct 2025): Available to US/Canada businesses with 3+ years history and individual developers in US/Canada — lower cost alternative to EV cert

**Icon requirement:** electron-builder needs a `.ico` file at the path specified in `win.icon`. Create `resources/icon.ico` (256x256 minimum, ICO format with multiple sizes embedded).

---

## Full Installation Delta for v1.1

```bash
# Transition animations (new)
npm install motion

# electron-builder already installed at ^26.0.12
# No other new runtime dependencies needed

# Icon conversion tool (dev only, one-time)
npm install -D png-to-ico
```

**Canvas particle system:** No install — implemented as a custom hook using browser APIs.

**Auto-refresh timer:** No install — Node.js `setInterval` in main process.

**Hourly forecast:** No install — extend existing Open-Meteo fetch call.

**Multi-location:** No install — extend existing electron-conf schema and IPC handlers.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Custom canvas hook (particles) | `@tsparticles/react` | If particle variety and configurability requirements grow significantly (15+ effect types). Current v3.0.0 has 2-year-old publish date — validate maintenance status before adopting. |
| Custom canvas hook (particles) | `react-snowfall` | Only viable if scope is limited to snow effects. Too narrow for rain/fog/thunderstorm requirements. |
| `motion` (animations) | CSS `transition` + `opacity` | Acceptable if location switch UX doesn't need exit animations — simpler, zero dependency. Test CSS approach first; add `motion` only if timing feels janky. |
| `motion` (animations) | `react-spring` | React Spring 10.0.1 is valid alternative with physics-based springs. `motion`'s AnimatePresence has better unmount-animation support which is the key requirement here. |
| Main-process `setInterval` (timer) | TanStack Query `refetchInterval` | Use TanStack Query if the project later needs caching, parallel queries, or deduplication across multiple components. Overkill for single-fetch, single-location pattern. |
| NSIS installer | Portable `.exe` (no installer) | Portable requires no install but has no Start Menu entry, no Add/Remove Programs entry. Use if distribution is informal (USB stick, email). |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `react-tsparticles` (old package) | Deprecated — replaced by `@tsparticles/react`. Even that is 2 years stale. | Custom canvas hook |
| `setInterval` in renderer process | Chromium throttles renderer timers to 1 Hz when window is backgrounded. Weather refresh would silently stop working when user switches apps. | `setInterval` in main process + `webContents.send` push |
| TanStack Query for this feature set | Adds ~12 KB for `refetchInterval` functionality that main-process timer provides with 10 lines of code. Complexity-to-benefit ratio is poor. | Node.js `setInterval` in main |
| `framer-motion` package name | Still works but officially replaced by `motion`. New projects should use `motion` package. | `npm install motion` |
| Multiple `.ico` files | NSIS expects one multi-size `.ico`. Use a single ICO with embedded sizes (16, 32, 48, 64, 128, 256). | Single ICO with embedded sizes |
| `electron-store` | Already resolved in v1.0 — `electron-conf` is the correct choice for this CJS electron-vite build. `electron-store` is ESM-only and causes friction. | `electron-conf` (already installed) |

---

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| `motion` | 12.34.3 | React 18.2+, React 19 | Import from `motion/react` not `framer-motion` |
| `electron-builder` | 26.0.12 (installed) / 26.8.1 (latest) | Electron 39.x | Already installed; update optional before release |
| Open-Meteo hourly | API v1 | — | Same endpoint as current, add `&hourly=` param |
| Canvas 2D API | built-in | Chromium (Electron renderer) | No compatibility issues; standard web API |
| Node.js `setInterval` | built-in | Node.js 20+ (main process) | No compatibility issues |

---

## Integration Points Map

| Feature | Touch Points | Notes |
|---------|-------------|-------|
| Auto-refresh | main/index.ts (timer), preload (expose onRefreshTick), renderer hook | Follows existing IPC namespace:verb pattern |
| Hourly forecast | src/renderer/lib/weather.ts (extend fetch), new HourlyForecast component | Add `hourly` array to existing WeatherData type |
| Multi-location | electron-conf schema, 4 new IPC handlers, LocationManager component | Reuse existing settings IPC pattern |
| Particle canvas | New WeatherCanvas component + useWeatherCanvas hook | Canvas overlaid on weather panel, z-index managed |
| Location transitions | Wrap WeatherPanel in AnimatePresence + motion.div | Key prop = active zip code |
| Windows installer | package.json `build` block, `resources/icon.ico` | `build:win` script already exists |

---

## Sources

- [Open-Meteo official docs](https://open-meteo.com/en/docs) — confirmed hourly endpoint, variable names (`temperature_2m`, `precipitation_probability`, `weather_code`, `wind_speed_10m`, `apparent_temperature`), `forecast_days` param — HIGH confidence
- [electron/electron issue #4465](https://github.com/electron/electron/issues/4465) — confirmed renderer `setInterval` throttling in background — HIGH confidence
- [Electron IPC Tutorial](https://www.electronjs.org/docs/latest/tutorial/ipc) — confirmed `webContents.send` push pattern — HIGH confidence
- [electron-builder npm](https://www.npmjs.com/package/electron-builder) — confirmed version 26.8.1 latest (published ~12 days ago as of 2026-03-01) — HIGH confidence
- [electron-builder NSIS docs](https://www.electron.build/nsis.html) — confirmed `oneClick`, `allowToChangeInstallationDirectory`, NSIS options — HIGH confidence
- [electron-builder Windows code signing](https://www.electron.build/code-signing-win.html) — confirmed SmartScreen behavior, Azure Trusted Signing availability — MEDIUM confidence
- [electron-builder/electron-vite integration](https://electron-vite.github.io/build/electron-builder.html) — confirmed `build:win` script pattern, `dist`/`dist-electron` files config — HIGH confidence
- [motion npm / framer-motion](https://www.npmjs.com/package/framer-motion) — confirmed version 12.34.3, React 19 compatibility, package rename to `motion` — HIGH confidence
- [motion upgrade guide](https://motion.dev/docs/react-upgrade-guide) — confirmed `motion/react` import path — HIGH confidence
- [react-snowfall GitHub](https://github.com/cahilfoley/react-snowfall) — confirmed v2.4.0 (Dec 2025), canvas-based, TypeScript — MEDIUM confidence (too narrow for all weather types)
- [tsparticles/react GitHub](https://github.com/tsparticles/react) — confirmed v3.0.0, last published ~2 years ago — MEDIUM confidence (stale, not Electron-listed)
- [Electron performance docs](https://www.electronjs.org/docs/latest/tutorial/performance) — confirmed `requestAnimationFrame` canvas pattern for renderer animations — HIGH confidence
- [electron-builder Windows SmartScreen issue #628](https://github.com/electron-userland/electron-builder/issues/628) — confirmed warning behavior without signing — MEDIUM confidence

---

*Stack research for: WeatherDeck v1.1 — new feature additions only*
*Researched: 2026-03-01*
