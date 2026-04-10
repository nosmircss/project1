# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WeatherDeck is a desktop weather dashboard built with Electron + React + TypeScript. It fetches forecasts from the Open-Meteo API, supports multiple US locations (via zip code), and persists settings/locations with electron-conf.

## Commands

| Task | Command |
|------|---------|
| Dev (hot reload) | `npm run dev` |
| Build (typecheck + bundle) | `npm run build` |
| Typecheck only | `npm run typecheck` |
| Typecheck main/preload | `npm run typecheck:node` |
| Typecheck renderer | `npm run typecheck:web` |
| Run all tests | `npm run test` |
| Run tests (watch) | `npm run test:watch` |
| Run single test file | `npx vitest run src/renderer/src/lib/__tests__/windDirection.test.ts` |
| Lint | `npm run lint` |
| Format | `npm run format` |
| Build Windows installer | `npm run build:win` |

## Architecture

Three-process Electron architecture with strict context isolation:

```
MAIN PROCESS (src/main/)           PRELOAD (src/preload/)         RENDERER (src/renderer/src/)
  index.ts - app lifecycle,          index.ts - contextBridge        App.tsx - root component
    IPC handlers, window mgmt        exposes electronAPI             components/ - React UI
  weather.ts - Open-Meteo client     index.d.ts - type defs         hooks/ - useWeather, useSettings,
  settings.ts - electron-conf                                         useLocations, useInterval
  locations.ts - electron-conf                                      lib/ - types, utilities
```

**IPC channel convention:** `namespace:verb` (e.g., `weather:fetch`, `settings:get`, `locations:add`). All renderer→main calls use `ipcRenderer.invoke` (request/response). Window visibility is pushed from main→renderer via `window:visibility`.

**Security boundary:** The preload script exposes only explicit methods via `contextBridge.exposeInMainWorld('electronAPI', {...})`. The renderer accesses `window.electronAPI.*` — never raw `ipcRenderer`.

## Key Patterns

**Settings/Locations gate:** App.tsx blocks weather fetching until both `useSettings` and `useLocations` hooks report `loaded: true`, preventing stale-unit double-fetches and race conditions on startup.

**Three-state startup routing:** (1) First launch → WelcomeScreen, (2) All locations deleted → Sidebar + empty state, (3) Normal → Sidebar + WeatherPanel. Controlled by `hasLaunched` metadata flag.

**Per-location weather cache:** `useWeather` maintains a `Map<zip, { data, lastUpdatedAt }>`. Switching locations shows cached data instantly; background refresh fires if cache is stale.

**Auto-refresh with pause:** `useInterval` sets `delay=null` when window is not visible (via Electron BrowserWindow events), pausing the timer. On restore, if the interval has elapsed, it refreshes immediately. Failed auto-refresh retries in 30 seconds.

**Type-only cross-process imports:** Main process imports `LocationInfo` from renderer types using `import type` — erased at compile time, no circular dependency.

## Open-Meteo API Quirks

- `timezone` must be `'auto'` for correct `is_day` values (not UTC)
- `wind_speed_unit` must be `'kmh'` not `'km/h'` (API rejects the slash)
- `forecast_hours: 24` is independent of `forecast_days`
- API returns `"mp/h"` label — normalized to `"mph"` in code
- Hourly data starts at midnight local; `useWeather` slices from current hour to +12

## Build & Config

- **Bundler:** electron-vite (Vite for all three processes)
- **Path alias:** `@renderer` → `src/renderer/src` (tsconfig.web.json + electron.vite.config.ts)
- **Styling:** Tailwind CSS v4 with `@theme` tokens and custom `@utility` glow classes in `src/renderer/src/styles/main.css` — no separate tailwind.config, no PostCSS config
- **Tests:** Vitest with node environment; test files live in `src/renderer/src/lib/__tests__/`
- **Persistence:** electron-conf singletons (`settings.ts`, `locations.ts`) — one instance per config name

## Planning Documents

Project planning lives in `.planning/` — see `PROJECT.md` for requirements, `ROADMAP.md` for phase plan, and `STATE.md` for current progress.
