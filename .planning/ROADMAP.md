# Roadmap: WeatherDeck

## Overview

WeatherDeck is built in phases, each delivering a coherent, verifiable capability. v1.0 established the app scaffold, neon design system, weather data pipeline, full conditions display, and user settings. The remaining phases add auto-refresh, hourly forecast, multi-location management, visual polish, and a Windows installer.

## Milestones

- ✅ **v1.0 MVP** — Phases 1-2 (shipped 2026-03-01)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-2) — SHIPPED 2026-03-01</summary>

- [x] Phase 1: Foundation (3/3 plans) — completed 2026-03-01
- [x] Phase 2: Full Conditions + Settings (3/3 plans) — completed 2026-03-01

See: `.planning/milestones/v1.0-ROADMAP.md` for full details.

</details>

### Unassigned Phases (Next Milestone)

- [ ] **Phase 3: Auto-Refresh** - Main-process scheduler, configurable interval, last-updated display and countdown
- [ ] **Phase 4: Hourly Forecast + Multi-Location** - 12-24 hour forecast view, saved location management, one-click switching
- [ ] **Phase 5: Visual Polish + Distribution** - Animated weather particles, location-switch transitions, Windows installer

### Phase 3: Auto-Refresh
**Goal**: Weather data updates automatically on a configurable interval driven by the main process, with a visible last-updated timestamp and countdown so the user always knows how fresh the data is
**Depends on**: Phase 2
**Requirements**: REFR-01, REFR-02, REFR-03
**Success Criteria** (what must be TRUE):
  1. Weather data refreshes automatically at the configured interval (default 5 minutes) without any user action — the displayed data visibly updates when a refresh completes
  2. The app displays the time of the last successful data refresh and a countdown to the next refresh, both visible at all times
  3. After 30 minutes minimized, the app resumes auto-refresh correctly when restored — no zombie timers, no stale data without indication
**Plans**: TBD

### Phase 4: Hourly Forecast + Multi-Location
**Goal**: Users can scan the next 12-24 hours of weather and switch between multiple saved zip code locations with a single click
**Depends on**: Phase 3
**Requirements**: HOUR-01, HOUR-02, HOUR-03, LOC-02, LOC-03, LOC-04
**Success Criteria** (what must be TRUE):
  1. User can view a scrollable hourly forecast showing temperature, weather condition icon, and precipitation probability for each hour over the next 12-24 hours
  2. User can save multiple zip code locations — they persist across app restarts
  3. User can switch to any saved location with one click, and both current conditions and hourly forecast update immediately to reflect that location
  4. User can delete a saved location — it is removed from the list and no longer appears after app restart
**Plans**: TBD

### Phase 5: Visual Polish + Distribution
**Goal**: The app delivers an immersive sci-fi experience with animated weather particles and smooth location transitions, and ships as a distributable Windows installer
**Depends on**: Phase 4
**Requirements**: UI-05, UI-06
**Success Criteria** (what must be TRUE):
  1. The app displays animated weather particle effects (raindrops, snowflakes, etc.) that match the current weather condition for the active location
  2. When the user switches between saved locations, the transition is visually smooth — no abrupt content flash or layout jump
  3. A Windows `.exe` installer can be launched on a clean Windows 10/11 machine and successfully installs and runs WeatherDeck — install instructions document the SmartScreen bypass for unsigned builds
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 3/3 | Complete | 2026-03-01 |
| 2. Full Conditions + Settings | v1.0 | 3/3 | Complete | 2026-03-01 |
| 3. Auto-Refresh | — | 0/TBD | Not started | - |
| 4. Hourly Forecast + Multi-Location | — | 0/TBD | Not started | - |
| 5. Visual Polish + Distribution | — | 0/TBD | Not started | - |
