# Feature Research

**Domain:** Windows desktop weather application — v1.1 milestone features
**Researched:** 2026-03-01
**Confidence:** HIGH (Open-Meteo API verified via official docs; Electron behavior from GitHub issues; UI patterns from confirmed community sources)

---

## Scope Note

This document focuses exclusively on the NEW features for v1.1. The v1.0 foundation is already shipped and working:
- Current conditions display (temp, feels-like, humidity, wind, UV, pressure, sunrise/sunset)
- Neon sci-fi UI theme with Tailwind v4 and glow classes
- Settings modal (temp/wind units, refresh interval)
- Zip code input with offline geocoding (zipcodes-us)
- Loading/error states with retry and skeleton loaders
- IPC architecture: contextIsolation:true, explicit namespace:verb handlers, electron-conf persistence

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that complete the current product gap. Missing any of these = v1.1 feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Auto-refresh on configurable interval | Settings modal already has refreshInterval; users see the option but it does nothing yet | MEDIUM | setInterval in renderer; reads `settings.refreshInterval`; fires `refetch()`; interval resets on settings change |
| Last-updated timestamp | Users must know if displayed data is stale after a refresh failure | LOW | Format as "Updated 3 min ago" using relative time; update on each successful fetch |
| Hourly forecast — next 12 hours | Core user need for daily planning; Open-Meteo already returns hourly fields | MEDIUM | Horizontally scrollable card strip; temp + condition icon + precipitation probability per hour |
| Precipitation probability per hour | Most actionable hourly metric; users plan around rain probability | LOW | Already available as `precipitation_probability` in Open-Meteo hourly response; just fetch and render |
| Multiple saved locations — persist across restart | Locations live in React state today; lost on restart | MEDIUM | Save array to electron-conf via IPC; load on startup; existing add/select/display wiring already done |
| Location delete | Users need to remove stale locations | LOW | Remove from electron-conf array; auto-select adjacent location |
| Windows .exe installer | End-users need a distributable they can run | MEDIUM | electron-builder NSIS target; one-click install; desktop shortcut; SmartScreen documentation required |

### Differentiators (Competitive Advantage)

Features that make WeatherDeck visually distinctive against MSN Weather and Lively Weather.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Animated weather particles | Dynamic visuals tied to current conditions; no Windows desktop weather app does this | HIGH | Canvas-based; requestAnimationFrame loop; rain (diagonal streaks), snow (drifting flakes), fog (scrolling opacity layers), clear (subtle star drift or ambient glow pulse); condition determined by WMO weatherCode from existing `weatherCodeMap.ts` |
| Smooth location-switch transition | Instantaneous switches feel abrupt; a fade-out/fade-in gives the UI weight and polish | LOW | CSS opacity transition (200-300ms fade-out, fetch, fade-in); transform + opacity only (GPU-composited); no layout-triggering properties |
| Refresh countdown indicator | Transparent about when next refresh fires; builds user trust in data freshness | LOW | Small text or thin progress bar showing "Refresh in 2m 30s" or progress filling left-to-right; updates every second |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| WebGL / Three.js for weather particles | Maximum visual fidelity; GPU shaders for rain | Overkill for 50-150 particles; adds 500KB+ to bundle; increases startup time; Canvas 2D achieves identical visual at this scale | Canvas 2D with requestAnimationFrame; react-snowfall pattern as reference |
| Real-time particle count (1000+) | More particles = more realistic | Performance degrades on low-end Windows hardware; battery impact on laptops; MDN recommends under 200 for Canvas 2D | Cap at 80-120 particles; pause when window is minimized (`document.visibilityState`) |
| Particle system that blocks weather content | Visually impressive | Particles obscuring temperature or conditions defeats the purpose of a weather app | Render particles on a full-screen Canvas behind the UI; UI sits on top via CSS z-index |
| Code-signed EV certificate for SmartScreen bypass | Completely eliminates SmartScreen warning | EV certificates cost $300-600/year and require hardware token; overkill for a personal/portfolio app | Document SmartScreen bypass steps ("More info" → "Run anyway"); distributable stays functional |
| Auto-location via OS geolocation | Convenient for new users | Requires Windows location permissions dialog; adds electron API complexity; zip code entry is already fast | Existing zip code entry; no change needed |
| Animated transitions via React Router or framer-motion | Polished cross-component animations | Introduces routing layer where none is needed; framer-motion adds 50KB; CSS transitions on opacity achieve same result | CSS `transition: opacity 200ms ease` on the WeatherPanel wrapper; zero dependencies |
| Per-location weather particle themes | Each location has different particle color/style | State management explosion; particle engine needs location awareness | Single particle engine responds to current weatherCode; location-specific customization is a distraction |

---

## Feature Dependencies

```
[Auto-Refresh Timer]
    └──reads──> [settings.refreshInterval] (already persisted in electron-conf)
    └──calls──> [refetch()] from useWeather.ts (already exists)
    └──updates──> [lastUpdated timestamp state]
    └──resets when──> [active location changes]

[Hourly Forecast Display]
    └──requires──> [Open-Meteo hourly API call] (new; extends existing weather.ts fetchWeather)
                       └──fields: temperature_2m, weather_code, precipitation_probability (hourly)
                       └──same lat/lon, timezone:auto, temperature_unit, wind_speed_unit params
    └──requires──> [HourlyForecastStrip component] (new)
    └──uses──> [weatherCodeMap.ts] (existing — maps WMO code to icon + label)
    └──enhances──> [WeatherPanel] (existing — hourly strip slots in below ConditionsGrid)

[Location Persistence]
    └──requires──> [IPC handler: locations:getAll] (new electron-conf array key)
    └──requires──> [IPC handler: locations:save] (new — replaces React useState)
    └──requires──> [IPC handler: locations:delete] (new)
    └──replaces──> [locations useState in App.tsx] (currently ephemeral)
    └──feeds──> [Sidebar] (existing — already renders location list)

[Location-Switch Transition]
    └──triggers on──> [activeIndex change in App.tsx]
    └──wraps──> [WeatherPanel] in opacity transition
    └──resets──> [Auto-Refresh Timer countdown]

[Weather Particles]
    └──reads──> [weather.weatherCode] (already in WeatherData)
    └──uses──> [weatherCodeMap.ts condition categories] (existing)
    └──renders──> [Canvas element, position:fixed, z-index behind UI]
    └──pauses when──> [document.visibilityState === 'hidden']
    └──independent of──> [location switching] (engine rerenders when weatherCode changes)

[Windows Installer]
    └──requires──> [electron-builder config] (package.json build section)
    └──independent of──> [all runtime features above]
    └──requires──> [app icon .ico file] in resources/
```

### Dependency Notes

- **Auto-refresh is almost free:** `refetch()` already exists in `useWeather.ts`. The timer needs a `useEffect` with `setInterval` reading `settings.refreshInterval`. The only new state is `lastUpdated: Date | null`.
- **Hourly forecast requires API extension:** `weather.ts` currently requests `current` and `daily` only. The hourly call adds `hourly=temperature_2m,weather_code,precipitation_probability` with `forecast_hours=12`. Can be added to the same API call or as a parallel fetch — same call preferred (one network request).
- **Location persistence is a state migration:** Locations currently live in `useState`. Moving to electron-conf requires adding 3 IPC handlers and updating App.tsx initialization to load from conf on mount. The existing Sidebar and add/select wiring does not change.
- **Particles are fully independent:** The particle Canvas can be added as a fixed-position overlay component that reads `weather.weatherCode` directly. No existing components need modification beyond App.tsx mounting the overlay.
- **Installer is buildtime-only:** No runtime code changes; requires `package.json` build configuration and an `.ico` icon file.

---

## MVP Definition for v1.1

### Ship in v1.1 (This Milestone)

- [x] Location persistence — save/load/delete locations via electron-conf IPC
- [x] Auto-refresh with configurable interval from settings + last-updated timestamp
- [x] Hourly forecast strip (12 hours) — temperature, condition icon, precipitation probability
- [x] Weather particle overlay — rain, snow, fog, clear (calm); canvas-based
- [x] Smooth location-switch fade transition
- [x] Windows NSIS installer via electron-builder + SmartScreen documentation

### Defer to v2

- [ ] Multi-day (3-7 day) forecast — Open-Meteo has daily fields but PROJECT.md explicitly defers
- [ ] Severe weather alert banners — not in Open-Meteo free tier
- [ ] System tray / widget mode — explicitly out of scope
- [ ] Wind gusts in hourly view — available in API but adds visual complexity; defer
- [ ] Animated radar overlay — requires separate tile source

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Location persistence (survive restart) | HIGH | MEDIUM | P1 — broken without it |
| Auto-refresh + last-updated | HIGH | LOW | P1 — settings already expose interval |
| Hourly forecast strip (12h) | HIGH | MEDIUM | P1 — core stated requirement |
| Precipitation probability in hourly | HIGH | LOW | P1 — same API call, minimal render work |
| Weather particle overlay | MEDIUM | HIGH | P1 — stated milestone requirement; differentiator |
| Smooth location-switch transition | MEDIUM | LOW | P1 — stated milestone requirement |
| Windows installer (.exe) | HIGH | MEDIUM | P1 — stated milestone requirement |
| Refresh countdown indicator | LOW | LOW | P2 — nice UX polish; not blocking |
| Wind gusts per hour | LOW | LOW | P3 — available in API; not needed for clarity |

**Priority key:**
- P1: Must have for v1.1 milestone
- P2: Add if time allows
- P3: Defer to v2

---

## Implementation Details Per Feature

### Auto-Refresh Timer

**Pattern:** `useEffect` with `setInterval` in a new `useAutoRefresh` hook or inline in App.tsx.

```typescript
// Pseudocode — reads refreshInterval from settings (minutes), calls refetch()
useEffect(() => {
  if (!activeLocation || settings.refreshInterval <= 0) return
  const ms = settings.refreshInterval * 60 * 1000
  const id = setInterval(refetch, ms)
  return () => clearInterval(id)
}, [activeLocation, settings.refreshInterval, refetch])
```

**Stale data on failure:** Already handled by `useWeather.ts` — keeps last successful data, shows "Could not refresh" warning. No new logic needed.

**Countdown display:** Separate `useEffect` with 1-second `setInterval` decrementing a display counter. Reset when `lastUpdated` changes. Format as "Refresh in Xm Ys".

**Electron throttling risk:** When app window is minimized or hidden, Chromium throttles `setInterval` in the renderer. Mitigation: move the timer to main process via `ipcMain` if throttling is observed; OR set `backgroundThrottling: false` in BrowserWindow webPreferences. For a 5-minute interval, throttling to 1-minute resolution is still acceptable — document this tradeoff.

### Hourly Forecast API Extension

**Add to existing `weather.ts` `fetchWeather` call:**

```typescript
hourly: 'temperature_2m,weather_code,precipitation_probability',
forecast_hours: '12',  // Open-Meteo supports this; returns next 12 hourly slots
```

**Response shape** — Open-Meteo returns parallel arrays:
```json
{
  "hourly": {
    "time": ["2026-03-01T14:00", "2026-03-01T15:00", ...],
    "temperature_2m": [45.2, 44.8, ...],
    "weather_code": [3, 3, ...],
    "precipitation_probability": [10, 15, ...]
  }
}
```

Zip these into an array of `HourlySlot` objects in the parser. Return as `hourly: HourlySlot[]` on the `WeatherData` type.

**UI:** Horizontal scroll container (`overflow-x: auto; display: flex; gap`). Each card: time label (12h format), condition icon (from `weatherCodeMap.ts`), temperature, precipitation probability as a percentage. Styled to match existing neon card aesthetic.

### Location Persistence

**New electron-conf keys:**
- `locations: LocationInfo[]` — array; default `[]`
- `activeLocationIndex: number` — default `0`

**New IPC handlers (main process):**
- `locations:getAll` → returns `LocationInfo[]`
- `locations:save` → accepts full array, writes to conf
- `locations:delete` → accepts zip string, filters array, writes

**App.tsx initialization change:**
```typescript
// On mount: load locations from IPC instead of useState([])
useEffect(() => {
  window.electronAPI.getLocations().then(setLocations)
}, [])
```

Location add/remove calls both update React state AND persist via IPC. No other component changes needed.

### Weather Particle Overlay

**Architecture:** Fixed-position `<canvas>` element rendered at app root level, full viewport, pointer-events: none, z-index below UI content.

**Condition mapping** (uses existing `weatherCode` from `WeatherData`):
- WMO codes 51-67, 80-82: Rain — diagonal streak particles, blue-cyan tint
- WMO codes 71-77, 85-86: Snow — circular drifting flakes, white with glow
- WMO codes 45, 48: Fog — slow horizontal opacity layers, grey
- WMO codes 0, 1: Clear — optional subtle star-field or ambient glow pulse (keep minimal)
- All others: No particles (overcast, thunderstorm can use ambient flicker instead)

**Particle loop structure:**
```typescript
// Each frame: clear canvas, update positions, draw
const animate = () => {
  if (document.visibilityState === 'hidden') return // pause when hidden
  ctx.clearRect(0, 0, W, H)
  particles.forEach(p => { p.update(); p.draw(ctx) })
  rafId = requestAnimationFrame(animate)
}
```

**Performance caps:** Rain: 80 particles max. Snow: 60 max. Fog: 5-8 layers. Clear: 30 stars max. All values tunable via constants.

**React integration:** `useEffect` sets up canvas dimensions, creates particles array for current condition, starts `requestAnimationFrame` loop. Cleans up on unmount or weatherCode category change.

### Location-Switch Transition

**Pattern:** CSS opacity transition on WeatherPanel wrapper.

```typescript
// In App.tsx: transition state
const [visible, setVisible] = useState(true)

const handleSelect = (index: number) => {
  setVisible(false) // fade out (~200ms)
  setTimeout(() => {
    setActiveIndex(index)
    setVisible(true) // fade in
  }, 200)
}
```

```css
.weather-panel-wrapper {
  transition: opacity 200ms ease-in-out;
  opacity: var(--panel-opacity, 1);
}
```

Animate only `opacity` and `transform` (GPU composited). Never animate width/height/margin/padding.

### Windows Installer

**electron-builder configuration** (in `package.json` build section):
```json
{
  "win": {
    "target": ["nsis"],
    "icon": "resources/icon.ico"
  },
  "nsis": {
    "oneClick": true,
    "perMachine": false,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "shortcutName": "WeatherDeck"
  }
}
```

**SmartScreen reality:** Unsigned apps trigger "Windows protected your PC" dialog. This is NOT a bug — it's expected for unsigned applications. Resolution: document clearly in README that user clicks "More info" then "Run anyway". This is standard practice for unsigned open-source software distributed directly.

**Code signing options** (for future reference):
- Azure Trusted Signing: eliminates SmartScreen; available to US/Canada developers; costs ~$10/month
- EV Certificate: $300-600/year; requires hardware token; eliminates SmartScreen
- For this milestone: unsigned NSIS + documentation is the correct choice

**Build artifact:** `dist/WeatherDeck-Setup-x.y.z.exe` — single file users download and run.

---

## Competitor Feature Analysis (v1.1 Scope)

| Feature | MSN Weather (Windows) | Lively Weather (open source) | WeatherDeck v1.1 |
|---------|----------------------|------------------------------|------------------|
| Hourly forecast | Yes (10-day hourly) | Yes | Yes (12 hours) |
| Multiple locations persistent | Yes | Yes | Yes (electron-conf) |
| Auto-refresh | Yes (fixed interval) | Yes | Yes (configurable) |
| Refresh countdown | No | No | Yes (P2 — differentiator) |
| Animated weather effects | No | No | Yes (particle canvas) |
| Dark/neon aesthetic | No | No | Yes — core identity |
| Windows installer | Yes | Yes | Yes (NSIS) |
| Open data, no tracking | No | Yes | Yes (Open-Meteo) |

---

## Sources

- [Open-Meteo API documentation](https://open-meteo.com/en/docs) — HIGH confidence (official; verified hourly fields including `precipitation_probability`, `forecast_hours` parameter)
- [electron-builder NSIS documentation](https://www.electron.build/nsis.html) — HIGH confidence (official; verified oneClick, perMachine, shortcut options)
- [Electron code signing documentation](https://www.electronjs.org/docs/latest/tutorial/code-signing) — HIGH confidence (official; confirmed SmartScreen behavior for unsigned apps)
- [electron-builder Windows target options](https://www.electron.build/win.html) — HIGH confidence (official; confirmed NSIS, portable targets)
- [react-snowfall — canvas-based React snowfall component](https://github.com/cahilfoley/react-snowfall) — MEDIUM confidence (reference for particle pattern; requestAnimationFrame + Canvas 2D)
- [react-weather-effects — rain/snow/fog on canvas](https://github.com/rauschermate/react-weather-effects) — MEDIUM confidence (confirms Canvas 2D approach for weather conditions)
- [Electron backgroundThrottling issue #9567](https://github.com/electron/electron/issues/9567) — MEDIUM confidence (confirms setInterval throttling in background; mitigation: backgroundThrottling: false)
- [MDN CSS Transitions](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Transitions/Using) — HIGH confidence (opacity + transform = GPU composited; avoid layout-triggering properties)
- [SmartScreen bypass for unsigned apps — Medium](https://medium.com/@techworldthink/how-to-bypass-the-windows-defender-smartscreen-prevented-an-unrecognized-app-from-starting-85ae0d717de4) — MEDIUM confidence (confirms "More info → Run anyway" flow; consistent with official Electron docs)

---
*Feature research for: WeatherDeck v1.1 — auto-refresh, hourly forecast, multi-location persistence, weather particles, Windows installer*
*Researched: 2026-03-01*
