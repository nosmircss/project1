# Roadmap: WeatherDeck

## Overview

WeatherDeck is built in five phases, each delivering a coherent, verifiable capability. Phase 1 establishes the application scaffold, design system, and data pipeline — without these, nothing else runs. Phase 2 completes the current conditions display with all data fields and user-configurable settings. Phase 3 adds the auto-refresh loop that keeps data live without user action. Phase 4 delivers the hourly forecast and multi-location management that complete the MVP feature set. Phase 5 polishes the visual experience with animated weather effects and smooth transitions, then packages a distributable Windows installer. Every requirement maps to exactly one phase.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Electron scaffold, neon design system, geocoding, basic conditions display, error/loading states (in progress: 1/3 plans done)
- [ ] **Phase 2: Full Conditions + Settings** - Complete current conditions data, temperature/wind unit toggles, settings persistence
- [ ] **Phase 3: Auto-Refresh** - Main-process scheduler, configurable interval, last-updated display and countdown
- [ ] **Phase 4: Hourly Forecast + Multi-Location** - 12-24 hour forecast view, saved location management, one-click switching
- [ ] **Phase 5: Visual Polish + Distribution** - Animated weather particles, location-switch transitions, Windows installer

## Phase Details

### Phase 1: Foundation
**Goal**: A running Electron app that resolves a US zip code, fetches current temperature and sky conditions from Open-Meteo, and displays them in a dark neon sci-fi UI with loading and error states
**Depends on**: Nothing (first phase)
**Requirements**: COND-01, COND-02, LOC-01, LOC-05, UI-01, UI-02, UI-03, UI-04
**Success Criteria** (what must be TRUE):
  1. User can enter a US zip code and the app displays the city name and state (e.g., "Denver, CO"), current temperature, feels-like temperature, and a weather condition icon
  2. The app has a dark background with neon cyan/blue glow accents applied consistently across all visible elements — no unstyled components
  3. The app shows a loading indicator while weather data is being fetched, so the user is never left looking at a blank screen
  4. When the API is unreachable or the user enters an invalid zip code, the app displays a clear error message instead of crashing or showing raw error text
  5. The app window is resizable and maintains a professional, readable layout at different sizes
**Plans**: 3 plans
- [x] 01-01-PLAN.md -- Scaffold electron-vite project and establish neon design system with Tailwind CSS v4
- [ ] 01-02-PLAN.md -- Build data pipeline: zip lookup, Open-Meteo weather service, IPC bridge, shared types
- [ ] 01-03-PLAN.md -- Build all UI components, wire with state management, human-verify complete flow

### Phase 2: Full Conditions + Settings
**Goal**: Users can see the complete current conditions picture — wind, humidity, UV index, pressure, sunrise/sunset — and configure temperature and wind speed units that persist across restarts
**Depends on**: Phase 1
**Requirements**: COND-03, COND-04, COND-05, COND-06, SET-01, SET-02, SET-03
**Success Criteria** (what must be TRUE):
  1. User can view wind speed, wind direction, and humidity percentage for the active location alongside temperature
  2. User can view UV index, atmospheric pressure, and sunrise/sunset times for the active location
  3. User can toggle temperature display between Fahrenheit and Celsius — the change applies immediately and persists after the app is restarted
  4. User can toggle wind speed between mph and km/h — the change applies immediately and persists after restart
  5. User can open a settings panel and configure the auto-refresh interval — the saved value persists after restart
**Plans**: TBD

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

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 1/3 | In progress | - |
| 2. Full Conditions + Settings | 0/TBD | Not started | - |
| 3. Auto-Refresh | 0/TBD | Not started | - |
| 4. Hourly Forecast + Multi-Location | 0/TBD | Not started | - |
| 5. Visual Polish + Distribution | 0/TBD | Not started | - |
