# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-01
**Phases:** 2 | **Plans:** 6 | **Sessions:** 1

### What Was Built
- Electron + React + TypeScript desktop app with neon sci-fi design system (Tailwind CSS v4)
- Weather data pipeline: zip lookup (zipcodes-us), Open-Meteo API, IPC bridge, WMO code mapping
- Full current conditions UI: temperature hero, 6 condition cards, weather icons with glow effects
- Settings persistence: temperature/wind unit toggles, refresh interval, electron-conf storage
- Loading skeletons, error cards with retry, stale data handling

### What Worked
- Research-first approach: identifying pitfalls before coding (electron-conf over electron-store, Tailwind v4 renderer-only scoping, drop-shadow vs box-shadow) prevented rework
- Atomic plan execution: each plan had clear inputs/outputs, enabling fast sequential execution
- TDD for data layer: 31 tests caught edge cases early (WMO code gaps, zip validation, compass boundaries)
- Plan-level human verification checkpoints caught the settings IPC channel mismatch that automated tests couldn't detect
- Settings gate pattern (null-guard until settingsLoaded) eliminated the stale-unit double-fetch race condition by design

### What Was Inefficient
- Plan 02-03 took 45 min (3x average) due to electron-conf renderer bridge failure requiring architectural pivot to explicit IPC handlers mid-execution
- Plan 01-02 RESEARCH.md suggested `lookupZip` as the zipcodes-us import name, but the actual package uses a default export with `.find()` — research should verify package APIs against actual README/types

### Patterns Established
- IPC channel convention: `namespace:verb` (weather:fetch, settings:get, settings:set)
- Neon design system: @theme CSS tokens + @utility glow classes — all components use these, never inline colors
- App.tsx as single stateful component — children receive props only
- Conditional rendering: skeleton (loading && !weather), error (error && !weather), data (weather), stale warning (error && weather)
- Settings loaded via Promise.all batch, gated before weather fetch

### Key Lessons
1. electron-conf's renderer bridge (`useConf`/`exposeConf`) silently fails when IPC channels aren't properly registered — prefer explicit `ipcMain.handle` channels that follow the same pattern as other IPC communication
2. Open-Meteo returns wind speed label as `'mp/h'` and expects `'kmh'` (not `'km/h'`) as the unit param — always normalize at the fetch boundary
3. Sunrise/sunset from Open-Meteo are in local time without `Z` suffix — appending Z shifts by UTC offset; parse as-is

### Cost Observations
- Model mix: ~70% sonnet (executor, verifier, planner), ~30% opus (orchestrator)
- Sessions: 1 (entire milestone in single session)
- Notable: 6 plans executed in ~75 min total (avg 12.5 min including planning overhead)

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | 1 | 2 | Initial process — research, plan, execute, verify |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | 31 | Core libs | 0 (all deps justified) |

### Top Lessons (Verified Across Milestones)

1. Research-first eliminates rework — every pitfall caught in research saved 10-30 min of debugging
2. Explicit IPC channels over framework-magic bridges — transparent, debuggable, consistent
