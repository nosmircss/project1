# Project Research Summary

**Project:** WeatherDeck
**Domain:** Windows desktop weather application (dark/neon sci-fi UI, multi-location, auto-refresh)
**Researched:** 2026-03-01
**Confidence:** MEDIUM-HIGH

## Executive Summary

WeatherDeck is a Windows desktop weather application with a distinctive dark/neon sci-fi aesthetic, multi-location support, and configurable auto-refresh. Experts build this class of app with Electron + React + TypeScript, using electron-vite 5.0 as the modern scaffold. The architecture is a strict three-process model: all network calls live in the Node.js main process, a typed preload bridge exposes a whitelist API to the renderer, and React components are purely reactive to IPC push events. The neon aesthetic must be established as a foundational design system from day one — retrofitting it later onto generic components is effectively a rewrite.

The recommended data source is Open-Meteo (no API key, no credit card, 10,000 calls/day free), which eliminates the single largest onboarding and billing risk of the alternative (OpenWeatherMap One Call 3.0, which requires a credit card and charges overages if the user forgets to cap their daily limit). Zip code resolution is handled via a local static lookup table (`us-zips` npm package), avoiding any geocoding API dependency entirely. Persistence uses `electron-store` (JSON file in `userData/`), which is sufficient for the app's small settings surface: a list of saved locations and a refresh interval.

The top risks are: (1) API key exposure — always keep keys in the main process, never Vite-bundled into the renderer; (2) refresh timer implementation — use TanStack Query's `refetchInterval` in the renderer or a main-process `setInterval` with IPC push, never a bare `useEffect` timer without cleanup; (3) neon glow CSS performance — animate only `opacity`/`transform` on GPU-promoted pseudoelements, never animate `box-shadow` directly, as this triggers full repaints on integrated graphics. A Windows SmartScreen warning on distribution is expected for unsigned builds and should be communicated to users via install instructions.

## Key Findings

### Recommended Stack

The recommended stack is Electron 40.x + React 18 + TypeScript 5 + Tailwind CSS 4 + electron-vite 5.0, with Open-Meteo as the weather API. TanStack Query v5 handles data fetching and configurable polling. Zustand 5 manages ephemeral renderer state (active location, UI state). `electron-store` 10.x handles persistent settings. This combination is well-documented, has mature tooling, and maps cleanly to all stated requirements.

Notably, Open-Meteo is strongly preferred over OpenWeatherMap: it has no API key, no credit card requirement, and 10,000 free calls/day versus OWM's 1,000 (with credit card). The only tradeoff is that Open-Meteo does not natively accept zip codes — these must be resolved to lat/lon via the local `us-zips` package before calling the API.

See `.planning/research/STACK.md` for full details, version requirements, and alternatives considered.

**Core technologies:**
- Electron 40.x: desktop shell — Chromium renderer ensures pixel-perfect CSS neon/glow effects, first-class Windows packaging
- React 18 + TypeScript 5: UI framework — hooks model maps to reactive IPC state; type-safety across IPC boundary catches entire class of silent bugs
- electron-vite 5.0: build tooling — modern standard, replaces webpack, HMR in renderer, proper main/preload/renderer separation
- Tailwind CSS 4: styling — no config file, CSS variables native, arbitrary values make neon glow trivial (`shadow-[0_0_20px_#00f0ff]`)
- Open-Meteo REST API: weather data — no key, no card, 10k calls/day, hourly forecast included
- TanStack Query v5: data fetching and polling — `refetchInterval` for auto-refresh, built-in caching, stale-while-revalidate
- electron-store 10.x: persistence — JSON file in `userData/`, type-safe, zero native deps (requires Electron 30+)
- us-zips: zip code resolution — static local lookup, zero API calls, works offline

### Expected Features

The feature research identifies a clear MVP boundary and a set of v1.x additions that can follow once core is stable.

**Must have (table stakes):**
- Current conditions: temp, feels like, sky conditions, wind speed/direction, humidity — the primary glance value
- Hourly forecast (12-24 hours): temp + condition icon per hour — core user need for day planning
- Multiple saved locations by zip code with one-click switching — standard since ~2015
- Auto-refresh with configurable interval (default 5 min) — explicitly required; must respect API rate limits
- Dark neon sci-fi aesthetic with full design system — not optional; the aesthetic is the product identity; must be foundational
- Error and loading states — without these the app feels broken on any API hiccup
- Temperature unit toggle (F/C) — table stakes; missing feels incomplete
- Geocoding (zip to city name + lat/lon) — required dependency for all API calls; build first

**Should have (competitive):**
- UV Index, atmospheric pressure, sunrise/sunset — low-complexity data enrichment available in Open-Meteo response
- Air Quality Index (AQI) — growing user demand; Open-Meteo has an air quality endpoint
- Precipitation probability in hourly cards — most actionable forecast metric; already in API response
- Animated weather particle effects — elevates static sci-fi theme to dynamic; medium complexity

**Defer (v2+):**
- Multi-day (7-14 day) forecast — accuracy degrades past 3-5 days; undermines user trust
- Severe weather alerts — OWM free tier excludes alert data; needs paid tier or alternate source
- System tray / widget / always-on-top mode — explicit out-of-scope per PROJECT.md
- Animated radar map — requires separate tile data source; significant scope increase

See `.planning/research/FEATURES.md` for full competitor analysis and prioritization matrix.

### Architecture Approach

The architecture follows Electron's strict three-process model: a Node.js main process that owns all network calls, filesystem access, and the refresh timer; a preload script that acts as a typed security boundary via `contextBridge`; and a React renderer that is purely reactive to IPC push events. The main process runs a `setInterval` scheduler that fetches weather on each tick and pushes normalized data to the renderer via `webContents.send`. The renderer subscribes via a `useWeather` hook and re-renders components declaratively. All API keys and network calls stay in the main process — never in the renderer, never Vite-bundled into the JS output.

See `.planning/research/ARCHITECTURE.md` for project structure, data flow diagrams, code examples, and anti-patterns.

**Major components:**
1. Settings Service (`main/services/settings.ts`) — `electron-store` read/write wrapper; foundation for all other services
2. Weather Service (`main/services/weather.ts`) — HTTP calls to Open-Meteo, response normalization, stateless
3. Refresh Scheduler (`main/services/scheduler.ts`) — owns `setInterval`, fetches weather, pushes via `webContents.send`
4. IPC Handlers (`main/ipc/handlers.ts`) — typed `ipcMain.handle` registrations wiring services to the preload API
5. Preload Bridge (`preload/index.ts`) — `contextBridge.exposeInMainWorld('weatherAPI', {...})`; minimal surface area
6. Theme Layer (`renderer/styles/theme.css`) — CSS custom properties defining neon palette; pseudoelement glow pattern
7. UI Components (`renderer/components/`) — CurrentConditions, HourlyForecast, LocationSwitcher, SettingsPanel
8. Custom Hooks (`renderer/hooks/`) — `useWeather` (IPC subscription), `useSettings` (read/write settings)
9. Shared Types (`shared/types.ts`) — single source of truth for `WeatherData`, `Location`, `Settings` interfaces

### Critical Pitfalls

Research identified six critical pitfalls; the top five with the highest implementation impact are:

1. **API key exposed in renderer bundle** — Never use `VITE_OWM_KEY` or similar in renderer code; Vite inlines env vars into the JS bundle and anyone with the binary can extract them. Keep all keys in `process.env` in the main process only. With Open-Meteo as primary API (no key required), this risk is reduced but remains relevant if OWM is used as a fallback.

2. **Auto-refresh timer in React renderer without cleanup** — A bare `setInterval` inside `useEffect` without a `clearInterval` cleanup creates zombie timers on hot-reload and fails after window minimize (WebView2 throttles JS timers in minimized windows). Use TanStack Query's `refetchInterval` in the renderer, or drive refresh from a main-process `setInterval` with IPC push. Always test after 30 minutes minimized.

3. **No cache layer on weather fetches** — Fetching live on every startup, location switch, and timer tick can exhaust free-tier quotas even for a single user (5 locations × 5 min interval = ~1,440 calls/day). Implement TTL-based caching from day one: serve cached data immediately on startup, refresh in background. Never block startup on a network call.

4. **Neon glow CSS causing high CPU on integrated graphics** — Animating `box-shadow` or `text-shadow` directly triggers full browser repaints on every animation frame (cannot be GPU-composited). On Windows machines with integrated graphics, this results in 30-60% idle CPU. Use `filter: blur()` on a `will-change: opacity, transform` pseudoelement for glow; animate only `opacity`/`transform`; never animate `box-shadow` directly. Test on integrated graphics hardware, not a developer workstation.

5. **Windows SmartScreen warning blocks installation** — Unsigned `.exe` installers trigger a "Windows protected your PC" dialog that stops non-technical users from installing. Plan for code signing from the start; provide explicit "More info → Run anyway" instructions for initial releases. For personal use, document the right-click → Properties → Unblock workaround.

6. **Zip code input not validated before API call** — Raw user input passed directly to an API URL can cause unexpected 404s or query errors. Validate 5-digit numeric format before any lookup; handle invalid zip gracefully with a user-facing message, not an API error bleed-through.

## Implications for Roadmap

Based on the dependency graph from FEATURES.md and the build order from ARCHITECTURE.md, a four-phase structure is recommended.

### Phase 1: Project Foundation and Data Pipeline

**Rationale:** The geocoding layer (zip → lat/lon) is the foundational dependency for every subsequent feature. Without it, no weather data can be fetched. The dark neon design system must also be established here — it cannot be added later without a full component rewrite. These two concerns, data pipeline and visual identity, are the load-bearing walls of the application.

**Delivers:** A working Electron app that resolves a zip code, fetches current weather from Open-Meteo, and displays it in a dark neon UI. Settings persist across restarts.

**Addresses (from FEATURES.md):**
- Location management (add/switch/delete zip codes)
- Geocoding (zip → city name + lat/lon via `us-zips`)
- Basic current conditions display
- Dark neon sci-fi design system (CSS custom properties, glow tokens, typography)
- Error and loading states

**Avoids (from PITFALLS.md):**
- API key in renderer bundle (no API key needed; main-process-only fetch pattern established)
- Missing error states (build them alongside the data pipeline)

**Stack used:** electron-vite scaffold, `shared/types.ts`, `electron-store`, `us-zips`, Open-Meteo API, Tailwind CSS 4 neon theme

### Phase 2: Auto-Refresh and Full Current Conditions

**Rationale:** Once the data pipeline exists, the refresh scheduler and complete current conditions display are the next natural increment. These are tightly coupled: auto-refresh requires a working fetch layer, and the configurable interval requires a working settings service (built in Phase 1). This phase completes the core loop: fetch → display → refresh automatically.

**Delivers:** Auto-refreshing current conditions with the full data set (temp, feels like, conditions, wind, humidity), temperature unit toggle (F/C), and a configurable refresh interval stored persistently.

**Addresses (from FEATURES.md):**
- Auto-refresh with configurable interval (default 5 min)
- Complete current conditions: feels like, sky conditions, wind speed/direction, humidity
- Temperature unit toggle (F/C)

**Avoids (from PITFALLS.md):**
- Auto-refresh timer leak (use main-process scheduler + IPC push; verify after 30-min minimize)
- No cache layer (implement TTL check alongside scheduler; serve cached data on startup)
- Stale data with no timestamp (display "last updated" timestamp from day one)
- Zip code input validation gaps (validate before any API call)

**Architecture built:** `main/services/scheduler.ts`, `useWeather` hook, full IPC push flow

### Phase 3: Hourly Forecast and Multi-Location Management

**Rationale:** With the core refresh loop proven stable, the hourly forecast and multi-location management are the next increment. The hourly forecast depends on the same data pipeline (different Open-Meteo endpoint). Multi-location adds complexity to the scheduler (which location is active?) and to the UI (location switcher tabs). These two concerns belong together because the location switcher directly drives which location is displayed in both the current conditions and hourly forecast.

**Delivers:** Scrollable hourly forecast for the next 12-24 hours with temp + condition icons; location switcher UI with up to 5 saved zip codes; immediate fetch on location switch.

**Addresses (from FEATURES.md):**
- Hourly forecast (12-24 hours): temp + condition icon
- Multiple saved locations with one-click switching

**Avoids (from PITFALLS.md):**
- No debounce on rapid location switching (add 300ms debounce; cancel in-flight fetch on new selection)
- Auto-refresh resets scroll position (update data in-place; do not unmount/remount forecast list)
- No active location indicator (highlight active tab; show city name from API, not raw zip)

**Architecture built:** `HourlyForecast.tsx`, `LocationSwitcher.tsx`, Open-Meteo hourly forecast endpoint integration

### Phase 4: Packaging and Distribution

**Rationale:** Packaging is last because it depends on all features being complete. Windows-specific concerns (SmartScreen, WebView2 runtime, NSIS installer, code signing) only surface when running a production build on a clean machine. These must be validated before any external release.

**Delivers:** A distributable Windows `.exe` installer built with electron-builder; verified on a clean Windows 11 machine; documented install instructions for SmartScreen bypass; verified that no API keys are baked into the bundle.

**Avoids (from PITFALLS.md):**
- SmartScreen blocking distribution (provide "More info → Run anyway" documentation; consider OV cert for public release)
- Missing WebView2 on end-user machines (electron-builder can bundle or require WebView2; verify bundling strategy)

**Stack used:** electron-builder, NSIS target, `nsis` configuration

### Phase Ordering Rationale

- Phase 1 before everything: geocoding and design system are foundational dependencies — nothing else can be built without them
- Phase 2 before Phase 3: auto-refresh scheduler must exist before multi-location can switch which location is refreshed
- Phase 3 completes the MVP feature set before packaging is attempted — packaging a partial app wastes distribution testing effort
- Phase 4 last: distribution concerns (SmartScreen, signing, installer format) are only testable with a complete build on a clean machine

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 3:** Open-Meteo hourly forecast endpoint response shape for 3-hourly vs. true hourly data; filtering/interpolation approach for 12-24 hour display. The ARCHITECTURE.md notes that "true hourly requires paid plan" for OWM — verify whether Open-Meteo provides true hourly (it does, via the `hourly` parameter) and confirm the exact field names and array structure before implementation.
- **Phase 4:** Code signing certificate options (OV vs EV), electron-builder NSIS bundling of WebView2 runtime, and Windows Defender/SmartScreen reputation timeline for new apps.

Phases with standard patterns (skip additional research):

- **Phase 1:** electron-vite scaffold, `electron-store`, Tailwind CSS 4 dark theme — all well-documented with official guides
- **Phase 2:** Main-process scheduler + IPC push is a canonical Electron pattern with code examples in ARCHITECTURE.md; TanStack Query `refetchInterval` is documented with official examples

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core stack (Electron, React, TypeScript, electron-vite) verified against official releases and docs. Open-Meteo verified against official API docs — no key, 10k/day confirmed. electron-store Electron 30+ requirement confirmed from GitHub. |
| Features | MEDIUM | Competitor analysis based on third-party review sites and forum posts (MEDIUM confidence). OWM free-tier capabilities verified from official docs. Feature prioritization based on published UX research and academic usage studies. |
| Architecture | MEDIUM-HIGH | Electron process model and IPC patterns from official Electron docs (HIGH). Project-specific structure (component breakdown, service layout) from community sources and blog posts (MEDIUM). All anti-patterns verified against documented Electron security guidance. |
| Pitfalls | MEDIUM | OWM billing/credit-card pitfall verified from official OWM FAQ. Neon CSS paint performance from Smashing Magazine (older but CSS fundamentals unchanged). WebView2 timer throttling verified from Tauri GitHub issues — applicable to Electron's WebView2 usage on Windows as well. SmartScreen behavior from Advanced Installer guide (MEDIUM confidence). |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Open-Meteo hourly data structure:** ARCHITECTURE.md was written with OWM in mind (3-hour intervals with cnt=24). Open-Meteo's hourly forecast returns true hourly data via the `hourly` parameter — but the exact response field names and how to filter to 12-24 hours should be confirmed before implementation. This is a minor gap, not a blocker.
- **WeatherAPI.com free tier status:** Research notes the free tier may have been restricted. This is moot since Open-Meteo is the selected API — no validation needed.
- **Tailwind CSS 4 and electron-vite integration:** Tailwind v4 eliminates `tailwind.config.js` and uses a CSS-first config. The integration path with electron-vite's Vite setup (`@tailwindcss/vite` plugin) is documented but less battle-tested than v3. Flag this during Phase 1 setup — if integration friction is high, v3 is a valid fallback.
- **electron-store ESM requirement:** electron-store 10.x is ESM-only. electron-vite 5.0 supports ESM main process, but this must be verified during Phase 1 setup by confirming `"type": "module"` in package.json or equivalent ESM configuration is compatible with the full scaffold.

## Sources

### Primary (HIGH confidence)
- Electron official docs (process model, IPC, preload scripts): https://www.electronjs.org/docs/latest/
- Open-Meteo official docs: https://open-meteo.com/en/docs
- Open-Meteo Geocoding API: https://open-meteo.com/en/docs/geocoding-api
- electron-vite Getting Started + v5.0 blog: https://electron-vite.org/guide/
- TanStack Query auto-refetching: https://tanstack.com/query/v5/docs/framework/react/examples/auto-refetching
- electron-store GitHub (Electron 30+ requirement, ESM-only): https://github.com/sindresorhus/electron-store
- OpenWeatherMap One Call API 3.0 (credit card, billing): https://openweathermap.org/api/one-call-3
- Tailwind CSS v4 dark mode: https://tailwindcss.com/docs/dark-mode

### Secondary (MEDIUM confidence)
- Advanced Electron.js Architecture (LogRocket): https://blog.logrocket.com/advanced-electron-js-architecture/
- electron-vite project structure conventions: https://electron-vite.org/guide/dev
- Smashing Magazine — GPU Animation performance: https://www.smashingmagazine.com/2016/12/gpu-animation-doing-it-right/
- Tauri GitHub Issues — WebView2 timer throttling: https://github.com/tauri-apps/tauri/issues/5147
- Tauri GitHub Issues — High CPU on Windows: https://github.com/tauri-apps/tauri/issues/10373
- Advanced Installer SmartScreen guide: https://www.advancedinstaller.com/prevent-smartscreen-from-appearing.html
- MakeUseOf Best Weather Apps for Windows (competitor analysis): https://www.makeuseof.com/best-weather-apps-windows/
- Weather app UX best practices: https://design4users.com/weather-in-ui-design-come-rain-or-shine/

### Tertiary (LOW confidence)
- Clustox Weather App Development Guide 2026 (feature tiering concepts): https://www.clustox.com/blog/weather-app-development-guide/
- WeatherAPI.com free tier status (unverified): https://github.com/monicahq/monica/issues/6288

---
*Research completed: 2026-03-01*
*Ready for roadmap: yes*
