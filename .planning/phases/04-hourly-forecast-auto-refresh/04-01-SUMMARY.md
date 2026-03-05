---
phase: 04-hourly-forecast-auto-refresh
plan: 01
subsystem: api
tags: [open-meteo, ipc, electron, typescript, hourly-forecast]

# Dependency graph
requires:
  - phase: 03-location-persistence
    provides: LocationInfo types and location IPC bridge used in main/preload
provides:
  - Extended fetchWeather returning 24-hour hourly block (time[], temperature[], weatherCode[], precipProbability[])
  - HourlySlice and HourlyData types exported from types.ts
  - WeatherData extended with optional hourly?: HourlyData field
  - window:visibility IPC channel (main -> renderer)
  - onWindowVisibility(cb) preload bridge returning cleanup function
affects:
  - 04-02
  - 04-03
  - 04-04

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "IPC push channel: main sends window:visibility bool on BrowserWindow events (minimize/hide/blur/restore/show/focus)"
    - "Cleanup-returning IPC subscription: preload exposes callback-based listener returning () => void for useEffect cleanup"
    - "Parallel-array hourly data: API returns time[], temperature[], weatherCode[], precipProbability[] — sliced to HourlySlice[] in hook layer"

key-files:
  created: []
  modified:
    - src/main/weather.ts
    - src/renderer/src/lib/types.ts
    - src/main/index.ts
    - src/preload/index.ts
    - src/preload/index.d.ts

key-decisions:
  - "hourly is required on OpenMeteoResult (not optional) — main process always fetches it; optional only on WeatherData for backward compat"
  - "blur treated as not-visible for pause-eligible refresh — saves battery when window is behind other apps"
  - "forecast_hours=24 independent of forecast_days=1 — per Open-Meteo docs, forecast_hours overrides hourly range"

patterns-established:
  - "Visibility IPC: mainWindow events -> webContents.send('window:visibility', bool)"
  - "Preload cleanup return: onWindowVisibility returns () => void unsubscriber for useEffect"

requirements-completed:
  - HOUR-01
  - HOUR-02

# Metrics
duration: 1min
completed: 2026-03-05
---

# Phase 4 Plan 1: Hourly Data Layer and Visibility IPC Summary

**Open-Meteo client extended to fetch 24-hour hourly forecast alongside current conditions, HourlySlice/HourlyData types added, and window visibility IPC bridge wired from main process to renderer.**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-05T12:51:21Z
- **Completed:** 2026-03-05T12:52:51Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Extended fetchWeather to add `hourly` and `forecast_hours=24` URL params, maps API response (temperature_2m, weather_code, precipitation_probability) into structured hourly block
- Added HourlySlice (single-hour view model) and HourlyData (raw parallel arrays) interfaces; WeatherData.hourly is optional so all existing consumers compile unchanged
- Wired BrowserWindow minimize/hide/blur/restore/show/focus events to send window:visibility boolean to renderer via webContents.send
- Preload exposes onWindowVisibility(cb) returning cleanup function, ElectronBridgeAPI typed accordingly

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Open-Meteo API client and type system for hourly data** - `ccb96c7` (feat)
2. **Task 2: Wire window visibility events from main process to renderer via IPC** - `265a682` (feat)

## Files Created/Modified
- `src/main/weather.ts` - Added hourly block to OpenMeteoResult; added hourly/forecast_hours URL params; maps API response arrays
- `src/renderer/src/lib/types.ts` - Added HourlySlice and HourlyData interfaces; extended WeatherData with optional hourly? field
- `src/main/index.ts` - Added sendVisibility helper and 6 BrowserWindow event listeners in createWindow()
- `src/preload/index.ts` - Added onWindowVisibility(cb) to contextBridge exposing window:visibility with cleanup return
- `src/preload/index.d.ts` - Added onWindowVisibility declaration to ElectronBridgeAPI interface

## Decisions Made
- `hourly` is required (non-optional) on OpenMeteoResult because main process always fetches it; optional only on WeatherData renderer-side for backward compatibility with existing consumers
- blur events treated as pause-eligible (not-visible): saves battery when window is behind other apps, consistent with "pauses when not visible" requirement
- `forecast_hours=24` added alongside `forecast_days=1` — per Open-Meteo docs, forecast_hours independently overrides the hourly data range

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Data layer foundation complete: fetchWeather now returns hourly block, types exported, visibility IPC bridge active
- Plan 02 (useWeather hook auto-refresh) and Plan 03 (hourly display) can proceed — both depend on this plan's deliverables
- backgroundThrottling is NOT set to false (per RESEARCH.md recommendation — BrowserWindow events handle visibility reliably)

---
*Phase: 04-hourly-forecast-auto-refresh*
*Completed: 2026-03-05*

## Self-Check: PASSED

- All 5 modified files present on disk
- Both task commits verified: ccb96c7, 265a682
- SUMMARY.md created at .planning/phases/04-hourly-forecast-auto-refresh/04-01-SUMMARY.md
