# Project Research Summary

**Project:** WeatherDeck v1.1
**Domain:** Electron + React desktop weather app — feature increment on shipped v1.0
**Researched:** 2026-03-01
**Confidence:** HIGH

## Executive Summary

WeatherDeck v1.1 is a six-feature increment on a fully-working Electron 39 + React 19 + TypeScript desktop weather app. The v1.0 architecture is stable and well-established: contextIsolation enforced, all IPC via a strict `namespace:verb` contextBridge pattern, electron-conf for persistence, and Open-Meteo as the data source (already wired). Research confirms that every v1.1 feature can be implemented as an extension of existing patterns with a single new runtime dependency (`motion` for location-switch animations). No architectural overhaul is required.

The recommended approach is data-layer-first: extend the Open-Meteo fetch to include hourly data, add `locations:get`/`locations:set` IPC handlers for persistence, and introduce a `useAutoRefresh` hook — all before touching any UI components. This order eliminates the most dangerous class of mistakes (building UI on top of ephemeral state that disappears on restart). The particle animation system should use a custom canvas hook with `requestAnimationFrame`; third-party particle libraries are either unmaintained or not Electron-verified. The Windows installer only requires configuring the already-installed `electron-builder` — the `build:win` script exists and the primary risk is locking `appId` before distributing the first `.exe`.

Three risks dominate the research: (1) the locations array is currently held in React `useState` only and is lost on every restart — this must be addressed first in v1.1; (2) the Open-Meteo hourly array starts at local midnight and must be sliced from the current hour, not displayed from index 0; and (3) canvas `requestAnimationFrame` loops must be cancelled in `useEffect` cleanup or CPU usage accumulates monotonically across location switches. All three have clear, low-cost mitigations already documented.

## Key Findings

### Recommended Stack

The existing stack requires only one new runtime dependency for v1.1. All six features build on libraries already installed and validated. `motion` (the official successor to `framer-motion`, v12.34.3 as of 2026-03-01) is recommended for location-switch cross-fade animations because `AnimatePresence` handles the unmount-then-animate sequence that CSS transitions cannot cleanly produce. However, ARCHITECTURE.md documents a pure CSS opacity transition as a fully acceptable alternative — the recommendation is CSS-first, `motion` only if timing feels wrong in practice.

**Core technologies:**
- **Node.js `setInterval` in renderer via `useAutoRefresh` hook:** Auto-refresh timer — the renderer owns the fetch lifecycle through `refetch()`, keeping refresh co-located with fetch. `backgroundThrottling: false` should be set in BrowserWindow webPreferences to prevent Chromium from stalling the timer when the window is minimized.
- **Open-Meteo hourly endpoint:** Hourly forecast — same `/v1/forecast` URL, same fetch call; add `&hourly=temperature_2m,weather_code,precipitation_probability` and `&forecast_hours=12`. No new API key, no new library.
- **electron-conf schema extension:** Multi-location persistence — add `locations: LocationInfo[]` to the existing conf. Add `locations:get` and `locations:set` IPC handlers following the established `namespace:verb` pattern.
- **Custom `useWeatherCanvas` hook:** Particle animations — ~80 lines of standard React + Canvas 2D; no third-party library. `@tsparticles/react` v3.0.0 has a 2-year-old publish date and is not listed as Electron-compatible; avoid it.
- **`motion` v12.34.3:** Location-switch cross-fades — React 19 compatible; import from `motion/react`. Only new runtime install (`npm install motion`).
- **electron-builder 26.0.12 (already installed):** Windows NSIS installer — needs `build` config block in `electron-builder.yml` and a `resources/icon.ico` file. The `build:win` script already exists.

**Installation delta for v1.1:**
```bash
npm install motion          # only new runtime dependency
npm install -D png-to-ico  # dev-only, one-time, for icon conversion
```

### Expected Features

**Must have (P1) — table stakes for v1.1 to feel complete:**
- Location persistence across restarts — currently lost on every app close; the settings UI already shows the feature as if it works
- Auto-refresh with configurable interval from settings + last-updated timestamp — the settings modal already exposes `refreshInterval`; the timer is not yet wired
- Hourly forecast strip (12 hours) with temperature, condition icon, and precipitation probability — core stated requirement; data is already available in Open-Meteo
- Windows NSIS installer — end-users need a distributable `.exe`; `build:win` exists but the `build` config block is incomplete

**Should have (P1 per milestone scope) — differentiators:**
- Animated weather particles (canvas-based) — no competitor Windows weather app offers this; WMO code drives particle type (rain/snow/fog/clear)
- Smooth location-switch fade transition — low complexity; prevents the jarring snap between locations

**Defer to v2+:**
- Multi-day (3-7 day) forecast — Open-Meteo has daily fields; PROJECT.md explicitly defers this
- Severe weather alert banners — not available on Open-Meteo free tier
- System tray / widget mode — explicitly out of scope
- Refresh countdown indicator — P2 nice-to-have UX polish; add if time allows after P1 features are complete
- Auto-location via OS geolocation — zip code entry is already fast; Windows location permissions add complexity not worth the tradeoff

### Architecture Approach

The v1.1 architecture is an extension-not-replacement of v1.0. The existing two-gate render pattern (`settingsLoaded` before weather fetch) gains a second gate (`locationsLoaded`) using the same pattern. All IPC remains strictly request/response — no push channels (`webContents.send`) are introduced. The auto-refresh timer lives in the renderer as `useAutoRefresh`, calling the existing `refetch()` rather than introducing bidirectional IPC. The particle canvas is a passive overlay: `position: absolute; inset: 0; pointer-events: none; z-index: 0` as the first child of WeatherPanel's `<main>`, receiving only `weatherCode` and `isDay` as props with no shared state.

**New components:**
1. **`HourlyForecast` (new)** — pure display, accepts `HourlyPoint[]`; horizontally scrollable strip with time (12h AM/PM format), condition icon, temp, and precipitation probability; no state
2. **`WeatherParticles` (new)** — canvas element with RAF loop; particle type derived from WMO `weatherCode` ranges; RAF ID stored in `useRef` for proper cleanup on unmount or weatherCode change
3. **`LastUpdated` (new)** — renders "Updated X min ago" and optional countdown; receives `lastUpdatedAt` and `secondsUntilRefresh` as props
4. **`useAutoRefresh` hook (new)** — manages `setInterval` calling `refetch()`; exposes `secondsUntilRefresh` and `lastUpdatedAt`; gates on `settingsLoaded && !!activeLocation`

**Modified files:**
- `main/index.ts` — add `locations:get`, `locations:set` ipcMain handlers
- `main/weather.ts` — add hourly params to URLSearchParams; return `hourly: HourlyPoint[]` in result
- `main/settings.ts` — add `locations?: LocationInfo[]` to AppSettings interface
- `preload/index.ts` + `index.d.ts` — add `getLocations`, `saveLocations` to contextBridge
- `App.tsx` — load locations from IPC on mount; persist on add/delete; add delete handler; add `locationsLoaded` gate; add opacity transition state
- `Sidebar.tsx` — add delete button (X) per location item
- `WeatherPanel.tsx` — compose new components; add `relative` positioning context
- `useWeather.ts` — return `hourly: HourlyPoint[]`
- `lib/types.ts` — add `HourlyPoint` type; extend `WeatherData` and `AppSettings`
- `electron-builder.yml` — fix `appId`, `productName`, `executableName`; add NSIS options

**Dependency-respecting build order:**
Data layer (types → weather.ts → settings.ts → IPC handlers → preload) → Location persistence (App.tsx + Sidebar) → Hourly forecast UI → Auto-refresh → Particles → Transitions → Installer (can run in parallel with particles).

### Critical Pitfalls

1. **Auto-refresh fires while previous fetch is in-flight** — add `isLoadingRef = useRef(false)` guard in `useWeather.refetch`; skip if already loading. Without this, background-throttling release after minimize batches multiple ticks, triggering concurrent API calls and potential stale-overwrites-fresh ordering.

2. **Locations lost on restart** — `App.tsx` currently holds `locations` in `useState`. Every restart resets to the welcome screen. Must be the first thing built in v1.1 — all subsequent features assume a stable, persisted location list.

3. **Hourly array starts at midnight, not current hour** — Open-Meteo returns hourly data indexed from 00:00 local time. Find `currentHour = new Date(current.time).getHours()`, then slice: `hourly.time.slice(currentHour, currentHour + 12)`. Request `forecast_days=2` when `currentHour > 12` to handle the across-midnight edge case after 10pm.

4. **Canvas RAF loop not cancelled on unmount** — if `cancelAnimationFrame(rafRef.current)` is not returned from `useEffect`, each location switch accumulates an orphaned animation loop. Ten rapid switches = ten concurrent loops drawing on a detached canvas, CPU climbing monotonically. Store RAF ID in `useRef`; always `return () => cancelAnimationFrame(rafRef.current)`.

5. **`appId` must be locked before first installer distribution** — `appId` in `electron-builder.yml` derives the NSIS installer GUID and Windows registry uninstall key. Any change after distribution creates a ghost "Add or Remove Programs" entry that points to nothing. Lock to `com.weatherdeck.app` (matching the existing `setAppUserModelId` in `main/index.ts`) before building the first `.exe`.

## Implications for Roadmap

Based on the dependency graph from FEATURES.md and the build order from ARCHITECTURE.md:

### Phase 1: Data Foundation and Location Persistence

**Rationale:** Location persistence is the most critical gap in v1.0 — it is the stated blocker that makes multi-location useless across restarts. The `WeatherData` type change (adding `hourly: HourlyPoint[]`) cascades through every consumer component; resolving types and IPC contracts first prevents rework. These two concerns are data-layer work with no UI dependencies and can be verified by unit tests and IPC console logs before any component is touched.

**Delivers:** Locations survive app restart; IPC contract for v1.1 fully defined; `HourlyPoint[]` flows from API to renderer; `AppSettings` types extended and matched across main and renderer.

**Addresses:** Location persistence, location delete, multi-location switching, hourly data schema.

**Avoids:** Pitfall 3 (in-memory locations); Pitfall 5 (hourly array slicing — unit-test `sliceHourly()` here with inputs at 00:00, 12:00, 23:00 before building the UI).

**Research flag:** Standard patterns throughout. Skip research-phase.

---

### Phase 2: Hourly Forecast UI and Auto-Refresh

**Rationale:** With `HourlyPoint[]` flowing from the API and types stable, `HourlyForecast` is a pure display component with no state complexity. Auto-refresh wiring requires the location persistence from Phase 1 to be stable first — the timer gate (`settingsLoaded && locationsLoaded && !!activeLocation`) requires both loading gates to be in place before the interval is connected, or the timer may fire before locations are loaded and cause a fetch against a null location.

**Delivers:** Working 12-hour forecast strip (time, icon, temp, precip%); configurable auto-refresh with last-updated timestamp; no duplicate in-flight fetches.

**Uses:** `useAutoRefresh` hook, `HourlyForecast` component, `LastUpdated` component.

**Avoids:** Pitfall 1 (duplicate in-flight fetches — add `isLoadingRef` guard before wiring the interval); Pitfall 2 (background throttling — set `backgroundThrottling: false` in BrowserWindow webPreferences, or accept and document the tradeoff); Pitfall 5 (hourly midnight offset — verified by unit tests in Phase 1).

**Research flag:** Standard patterns. Skip research-phase.

---

### Phase 3: Weather Particle Animations

**Rationale:** Particles are architecturally independent — they read only `weather.weatherCode` and `isDay` from already-stable data. This independence makes them safe to build in isolation without blocking other features. Particle performance on integrated graphics (the actual target platform) must be benchmarked before declaring this phase done; allocating a separate phase allows CPU tuning without schedule pressure.

**Delivers:** Canvas-based particle overlay for rain (diagonal streaks), snow (drifting flakes), fog (slow wisps), and clear conditions; 60fps target with particle counts benchmarked on integrated graphics; `prefers-reduced-motion` bypass.

**Uses:** Custom `useWeatherCanvas` hook; Canvas 2D API; `requestAnimationFrame` with `useRef` cleanup.

**Avoids:** Pitfall 6 (RAF cleanup — store ID in `useRef`, always return `cancelAnimationFrame` from effect); Pitfall 7 (high CPU on integrated graphics — cap at 60-80 particles max, pre-create gradient objects outside the RAF loop, add `prefers-reduced-motion` check).

**Research flag:** Performance on integrated graphics is the one area requiring hands-on validation rather than research. Target: `<5% idle CPU` on Intel UHD 620 or equivalent (test by disabling Electron hardware acceleration in dev). No research-phase needed — patterns are standard.

---

### Phase 4: Location-Switch Transitions and UX Polish

**Rationale:** Transitions depend on a stable `activeIndex` (Phase 1) and stable weather data (Phase 2). This is the lowest-risk phase — a CSS opacity transition is sufficient and can be upgraded to `motion`/`AnimatePresence` only if the fade timing proves inadequate. UX hardening (delete-button guard when one location remains, scroll-position preservation on auto-refresh, stale data flash prevention) belongs here because it requires all prior features to be working before edge cases are visible.

**Delivers:** Fade cross-fade on location switch; delete button disabled/hidden when one location remains; hourly forecast scroll position preserved across auto-refresh cycles; stale data from previous location cleared before new fetch resolves.

**Uses:** CSS `transition: opacity 150ms ease` on WeatherPanel wrapper (or `motion`/`AnimatePresence` if CSS approach proves insufficient).

**Avoids:** Pitfall 4 (stale data flash — add `setWeather(null)` at top of location-change `useEffect` in `useWeather.ts` so the skeleton shows before new data arrives, not the previous city's temperature under the new city's name).

**Research flag:** Standard patterns. Skip research-phase.

---

### Phase 5: Windows Installer

**Rationale:** The installer is fully independent of all runtime features and can be parallelized with Phase 3 or 4 in execution. Treating it as a distinct phase ensures SmartScreen validation on a clean Windows 11 VM gets dedicated attention and is not skipped under schedule pressure.

**Delivers:** `WeatherDeck-Setup-1.1.0.exe` NSIS installer with desktop + Start Menu shortcuts; SmartScreen bypass documented in README; single consistent "Add or Remove Programs" entry.

**Uses:** electron-builder 26.0.12 (already installed); `build:win` script (already exists); `resources/icon.ico` (to create from existing PNG assets via `png-to-ico`).

**Avoids:** Pitfall 8 (lock `appId` to `com.weatherdeck.app` matching `setAppUserModelId` in `main/index.ts` before first build — do not change later); Pitfall 9 (unsigned SmartScreen — document "More info → Run anyway" for personal/internal use; evaluate Azure Trusted Signing at ~$10/month for public distribution).

**Research flag:** Standard NSIS target patterns. The one judgment call — unsigned vs. signed — is fully documented in PITFALLS.md. No additional research needed.

---

### Phase Ordering Rationale

- **Data before UI:** `WeatherData` and `AppSettings` type changes propagate through every consumer. Resolving them first prevents rework in every subsequent phase.
- **Location persistence before auto-refresh:** The timer gate requires `locationsLoaded === true`. Building the gate before the timer prevents firing a fetch against a null location.
- **Particles after data pipeline:** Canvas component reads `weatherCode` from stable `WeatherData`; building it last among runtime features means no mocks or stubs needed.
- **Transitions after all data features:** Smooth transitions require stable `activeIndex` and `weather` state; all edge cases (stale data flash, one-location delete guard) are only visible once the full feature set is working.
- **Installer parallel-safe:** No runtime dependencies; can be built and tested any time after the app builds cleanly. Phases 3 and 5 have no inter-dependencies.

### Research Flags

All phases use standard, well-documented patterns. No phases require `/gsd:research-phase` during planning. The existing research provides HIGH confidence coverage across all areas.

The one area to validate during implementation (not research): particle performance on integrated graphics in Phase 3. This is a benchmark task, not a research task — run with hardware acceleration disabled in Electron dev tools and check CPU% with particles active.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All additions verified against official npm, official Electron docs, and the existing package.json. Only one new runtime dependency (`motion`). electron-builder version and NSIS options confirmed via official docs. |
| Features | HIGH | Open-Meteo hourly API verified via official docs (field names, `forecast_hours` param, rate limits). Feature scope directly from PROJECT.md milestone definition. Competitor comparison documented in FEATURES.md. |
| Architecture | HIGH | Existing codebase read directly for baseline. New patterns (IPC extension, electron-conf schema, canvas animation, CSS transitions) verified against Electron official docs, electron-conf GitHub, and Open-Meteo docs. |
| Pitfalls | HIGH / MEDIUM | Electron timer throttling confirmed via GitHub issues #4465, #31016, #42378. SmartScreen behavior confirmed via official Electron code-signing docs. Canvas GPU performance on integrated graphics is MEDIUM — risk is documented and mitigated but not benchmarked on target hardware. |

**Overall confidence:** HIGH

### Gaps to Address

- **Particle performance on integrated graphics:** Research documents the risk and mitigations (particle count cap, pre-created gradients, `prefers-reduced-motion`), but actual performance must be benchmarked during Phase 3 on hardware with Intel UHD 620 or equivalent. Target: `<5% idle CPU`. If exceeded, reduce particle count before proceeding to polish.
- **`backgroundThrottling` tradeoff:** Two valid approaches are documented — set `backgroundThrottling: false` (one line, keeps timer consistent) vs. accept throttling (users who minimize don't need live updates for a weather display app). Decide at the start of Phase 2 before writing any interval code. ARCHITECTURE.md recommends accepting the tradeoff; PITFALLS.md recommends `backgroundThrottling: false`. Either is defensible.
- **`motion` vs. CSS transitions:** Both paths are fully documented. Decide at the start of Phase 4. CSS-first is the recommendation; `motion` only if the fade feels wrong in practice.
- **SmartScreen signing strategy:** Unsigned (document bypass) is correct for personal/internal use. If public distribution is intended, Azure Trusted Signing (~$10/month, no hardware dongle) can be wired into `electron-builder` signing config. Decide before Phase 5 begins so the build pipeline is configured correctly from the start.

## Sources

### Primary (HIGH confidence)
- [Open-Meteo official docs](https://open-meteo.com/en/docs) — hourly endpoint, variable names (`temperature_2m`, `precipitation_probability`, `weather_code`, `wind_speed_10m`, `apparent_temperature`), `forecast_hours` param, `forecast_days` param, `timezone=auto` behavior, rate limits (10,000 calls/day)
- [Electron IPC Tutorial](https://www.electronjs.org/docs/latest/tutorial/ipc) — `ipcMain.handle` / `ipcRenderer.invoke` request/response pattern; `contextBridge` usage
- [Electron BrowserWindow docs](https://www.electronjs.org/docs/latest/api/browser-window) — `backgroundThrottling` option
- [electron/electron GitHub issue #4465](https://github.com/electron/electron/issues/4465) — confirmed renderer `setInterval` throttling when window not foreground
- [electron-builder NSIS docs](https://www.electron.build/nsis.html) — `oneClick`, `allowToChangeInstallationDirectory`, `appId` GUID warning
- [electron-builder Windows target](https://www.electron.build/win.html) — NSIS target, executable naming
- [electron-conf GitHub](https://github.com/alex8088/electron-conf) — JSON Schema storage, array support, single-instance-per-file constraint
- [motion npm](https://www.npmjs.com/package/motion) — v12.34.3, React 19 compatibility, `motion/react` import path
- [Electron code signing tutorial](https://www.electronjs.org/docs/latest/tutorial/code-signing) — SmartScreen behavior for unsigned apps
- [Electron performance docs](https://www.electronjs.org/docs/latest/tutorial/performance) — `requestAnimationFrame` canvas pattern

### Secondary (MEDIUM confidence)
- [electron/electron GitHub issue #31016](https://github.com/electron/electron/issues/31016) — `backgroundThrottling: false` behavior on Windows hide/show
- [electron/electron GitHub issue #42378](https://github.com/electron/electron/issues/42378) — blank window after hidden with throttling
- [electron-builder code signing](https://www.electron.build/code-signing-win.html) — Azure Trusted Signing availability, EV cert costs
- [electron-builder GitHub issue #628](https://github.com/electron-userland/electron-builder/issues/628) — SmartScreen warning behavior without signing
- [react-snowfall GitHub](https://github.com/cahilfoley/react-snowfall) — canvas-based particle reference; too narrow for all weather types
- [tsparticles/react GitHub](https://github.com/tsparticles/react) — v3.0.0, 2-year-old publish date; avoid for Electron
- [MDN CSS Transitions](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Transitions/Using) — opacity + transform as GPU-composited properties
- [motion upgrade guide](https://motion.dev/docs/react-upgrade-guide) — `motion/react` import path confirmed

### Tertiary (pattern reference)
- [Pete Corey — Animating a Canvas with React Hooks](https://www.petecorey.com/blog/2019/08/19/animating-a-canvas-with-react-hooks/) — RAF ref cleanup pattern
- [Max Rozen — Race conditions with useEffect fetch](https://maxrozen.com/race-conditions-fetching-data-react-with-useeffect) — in-flight guard pattern
- [Konva.js memory leak avoidance](https://konvajs.org/docs/performance/Avoid_Memory_Leaks.html) — canvas RAF cleanup

---
*Research completed: 2026-03-01*
*Ready for roadmap: yes*
