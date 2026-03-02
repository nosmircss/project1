# Roadmap: WeatherDeck

## Overview

WeatherDeck is built in phases, each delivering a coherent, verifiable capability. v1.0 established the app scaffold, neon design system, weather data pipeline, full conditions display, and user settings. v1.1 adds location persistence, hourly forecast, auto-refresh, animated weather particles, location-switch transitions, and a distributable Windows installer.

## Milestones

- ✅ **v1.0 MVP** — Phases 1-2 (shipped 2026-03-01)
- 🚧 **v1.1 Feature Complete** — Phases 3-6 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-2) — SHIPPED 2026-03-01</summary>

- [x] Phase 1: Foundation (3/3 plans) — completed 2026-03-01
- [x] Phase 2: Full Conditions + Settings (3/3 plans) — completed 2026-03-01

See: `.planning/milestones/v1.0-ROADMAP.md` for full details.

</details>

### 🚧 v1.1 Feature Complete (In Progress)

**Milestone Goal:** Add auto-refresh, hourly forecast, multi-location management, animated weather effects, and a distributable Windows installer.

- [x] **Phase 3: Location Persistence** - Saved locations survive app restarts; full add/switch/delete lifecycle backed by electron-conf IPC (completed 2026-03-02)
- [ ] **Phase 4: Hourly Forecast + Auto-Refresh** - 12-hour scrollable forecast strip and configurable auto-refresh with last-updated timestamp and countdown
- [ ] **Phase 5: Visual Polish** - Animated weather particle effects and smooth location-switch transitions
- [ ] **Phase 6: Windows Installer** - NSIS `.exe` installer with SmartScreen bypass documentation

## Phase Details

### Phase 3: Location Persistence
**Goal**: Users can save multiple zip code locations that survive app restarts, switch between them instantly, and delete any saved location — establishing the stable location data layer that all subsequent phases depend on
**Depends on**: Phase 2
**Requirements**: LOC-01, LOC-02, LOC-03, LOC-04
**Success Criteria** (what must be TRUE):
  1. User can save a zip code location and see it still listed after fully closing and reopening the app
  2. User can switch to any saved location with one click, and both current conditions and hourly forecast update immediately to reflect that location
  3. User can delete any saved location — it disappears from the list and is absent after app restart
  4. Deleting the currently active location automatically selects the next available location, or returns to the empty/welcome state if no locations remain
**Plans:** 2/2 plans complete
Plans:
- [x] 03-01-PLAN.md — Location persistence data layer (electron-conf store, IPC handlers, preload bridge)
- [x] 03-02-PLAN.md — Frontend integration (useLocations hook, App.tsx routing, Sidebar delete, empty state)

### Phase 4: Hourly Forecast + Auto-Refresh
**Goal**: Users can see the next 12 hours of weather at a glance, and the app keeps data current automatically without any manual action — with clear indicators of how fresh the data is
**Depends on**: Phase 3
**Requirements**: HOUR-01, HOUR-02, HOUR-03, REFR-01, REFR-02, REFR-03
**Success Criteria** (what must be TRUE):
  1. User can view a horizontally scrollable forecast strip showing temperature, weather condition icon, and precipitation probability for each of the next 12 hours, starting from the current hour (not from midnight)
  2. When the user switches to a different saved location, the hourly forecast updates immediately to reflect the new location's data
  3. Weather data refreshes automatically at the configured interval (default 5 minutes) without any user action — the displayed conditions visibly update when a refresh completes
  4. The app shows the time of the last successful data refresh and a live countdown to the next refresh, both visible at all times
**Plans**: TBD

### Phase 5: Visual Polish
**Goal**: The app delivers an immersive sci-fi experience — animated weather particles match current conditions, and switching locations produces a smooth visual transition rather than an abrupt content swap
**Depends on**: Phase 4
**Requirements**: VISL-01, VISL-02
**Success Criteria** (what must be TRUE):
  1. The app displays animated weather particle effects (raindrops, snowflakes, fog wisps, etc.) that match the current weather condition for the active location, with no measurable CPU impact at idle on integrated graphics
  2. Switching between saved locations produces a smooth fade transition — no abrupt content flash, layout jump, or momentary display of the previous location's data under the new location's name
**Plans**: TBD

### Phase 6: Windows Installer
**Goal**: WeatherDeck ships as a self-contained NSIS `.exe` that any Windows 10/11 user can install from a clean machine — with the SmartScreen bypass process clearly documented
**Depends on**: Phase 5
**Requirements**: DIST-01, DIST-02
**Success Criteria** (what must be TRUE):
  1. Running `WeatherDeck-Setup-1.1.0.exe` on a clean Windows 10/11 machine installs WeatherDeck, creates desktop and Start Menu shortcuts, and launches the app successfully
  2. The install documentation explains the SmartScreen "More info → Run anyway" bypass so a user encountering the warning can proceed without guesswork
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 3 → 4 → 5 → 6

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 3/3 | Complete | 2026-03-01 |
| 2. Full Conditions + Settings | v1.0 | 3/3 | Complete | 2026-03-01 |
| 3. Location Persistence | v1.1 | 2/2 | Complete | 2026-03-02 |
| 4. Hourly Forecast + Auto-Refresh | v1.1 | 0/TBD | Not started | - |
| 5. Visual Polish | v1.1 | 0/TBD | Not started | - |
| 6. Windows Installer | v1.1 | 0/TBD | Not started | - |
