---
phase: 04-hourly-forecast-auto-refresh
plan: 02
subsystem: ui
tags: [react, hooks, typescript, auto-refresh, hourly-forecast, visibility]

# Dependency graph
requires:
  - phase: 04-hourly-forecast-auto-refresh
    plan: 01
    provides: HourlySlice/HourlyData types, WeatherData.hourly optional field, onWindowVisibility IPC bridge
provides:
  - useInterval hook with ref-based callback (no stale closures), null-delay pause support
  - useWeather hook with hourly slicing (12 entries from current hour), auto-refresh, isRefreshing, lastUpdatedAt, nextRefreshAt
  - Per-location WeatherData cache (Map<zip, CacheEntry>) with immediate cached display on location switch
  - Visibility-aware auto-refresh pause (delay=null when hidden, immediate refresh on resume if elapsed)
  - Silent background refresh (isRefreshing, not loading) with 30s retry on failure
affects:
  - 04-03
  - 04-04

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dan Abramov useInterval pattern: savedCallback ref stays fresh, interval effect only re-runs on delay change"
    - "null-delay pause: useInterval(cb, null) = paused, no interval created, no cleanup needed"
    - "isRefreshing vs loading: loading only on first fetch (skeleton), isRefreshing on background (no skeleton)"
    - "Per-location cache: Map<zip, { data, lastUpdatedAt }> in useRef survives re-renders"
    - "retryDelayRef: temporarily override interval delay to 30s after failed refresh, restore on success"

key-files:
  created:
    - src/renderer/src/hooks/useInterval.ts
  modified:
    - src/renderer/src/hooks/useWeather.ts

key-decisions:
  - "autoRefreshCallback uses refs (locationRef, settingsRef) not state — stable closure, always calls latest values without re-creating interval"
  - "retryDelayRef overrides intervalMs for the next useInterval tick — simpler than managing separate retry state"
  - "performFetch uses fetchWithRetry for initial loads; autoRefreshCallback single-attempts and fails fast — different retry strategies for different contexts"
  - "location switch effect depends on [location?.zip, settings.temperatureUnit, settings.windSpeedUnit] — unit changes trigger refetch (same as before), zip change triggers cache lookup"

patterns-established:
  - "useInterval(cb, null): pause interval by passing null delay — reactive, re-activates when delay becomes non-null"
  - "Ref-based callback in auto-refresh: prevents stale closure without restarting the interval"

requirements-completed:
  - HOUR-02
  - HOUR-03
  - REFR-01
  - REFR-02
  - REFR-03

# Metrics
duration: 1min
completed: 2026-03-05
---

# Phase 4 Plan 2: useInterval Hook and useWeather Auto-Refresh Refactor Summary

**useInterval (ref-based null-pause pattern) and useWeather fully refactored with hourly slicing, visibility-aware auto-refresh, per-location cache, and silent background updates via isRefreshing.**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-05T12:55:18Z
- **Completed:** 2026-03-05T12:56:36Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 refactored)

## Accomplishments
- Created `useInterval.ts` implementing the Dan Abramov declarative interval pattern — savedCallback ref ensures callback is always fresh, delay=null pauses without clearing/re-creating the interval
- Refactored `useWeather` to return 8-field result: weather, hourly[], loading, isRefreshing, error, lastUpdatedAt, nextRefreshAt, refetch
- Auto-refresh fires via `useInterval` at `settings.refreshInterval` minutes; passes `delay=null` when window hidden or no location, immediately resumes (and triggers catch-up refresh) on visibility restore
- Per-location cache (`Map<zip, CacheEntry>` in useRef) shows stale cached data on location switch while background refresh runs silently
- Failed auto-refresh retries in 30 seconds via `retryDelayRef` override; full interval restored on next success

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useInterval hook** - `2d9cd22` (feat)
2. **Task 2: Refactor useWeather for hourly, auto-refresh, and per-location cache** - `dd9e368` (feat)

## Files Created/Modified
- `src/renderer/src/hooks/useInterval.ts` - New declarative setInterval hook, 21 lines, exports `useInterval(callback, delay | null)`
- `src/renderer/src/hooks/useWeather.ts` - Major refactor: accepts full AppSettings, returns expanded UseWeatherResult, implements all six phase requirements

## Decisions Made
- `autoRefreshCallback` uses `locationRef`/`settingsRef` (not state) to form a stable closure — avoids re-creating the interval while still calling latest values on each tick
- `retryDelayRef` temporarily overrides `intervalMs` for the `useInterval` delay after a failed refresh — simpler than managing separate retry state machine
- `performFetch` (initial load) uses `fetchWithRetry` with 2x exponential backoff; `autoRefreshCallback` single-attempts and relies on the 30s retry interval — different retry strategies for different contexts
- Location switch effect depends on `[location?.zip, settings.temperatureUnit, settings.windSpeedUnit]` so unit changes still trigger refetch as before

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Hook layer complete: useWeather now returns all data needed by Plans 03 and 04 (hourly display UI and App.tsx wiring)
- Plan 03 can consume `hourly[]` directly from useWeather to render the 12-slot HourlyForecast component
- Plan 04 will update App.tsx call site to pass full `AppSettings` and wire `isRefreshing`/`lastUpdatedAt`/`nextRefreshAt` to UI

---
*Phase: 04-hourly-forecast-auto-refresh*
*Completed: 2026-03-05*

## Self-Check: PASSED

- src/renderer/src/hooks/useInterval.ts present on disk
- src/renderer/src/hooks/useWeather.ts present on disk
- SUMMARY.md created at .planning/phases/04-hourly-forecast-auto-refresh/04-02-SUMMARY.md
- Task 1 commit verified: 2d9cd22
- Task 2 commit verified: dd9e368
