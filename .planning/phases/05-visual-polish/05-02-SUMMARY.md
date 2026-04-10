---
phase: 05-visual-polish
plan: 02
subsystem: renderer/particles
tags: [canvas, animation, particles, crossfade, transition, react]

requires:
  - phase: 05-01
    provides: [WeatherParticles-component, particleEffects-engine]
provides:
  - WeatherPanel-with-particle-overlay
  - WeatherPanel-crossfade-transition-on-location-switch
affects: []

tech-stack:
  added: []
  patterns:
    - useRef for zip tracking to detect location change across renders
    - fading state + setTimeout 250ms crossfade drives opacity-0/100 transition class
    - active={!fading} pauses canvas RAF loop during crossfade per D-11
    - position:relative on main creates canvas positioning context without affecting layout

key-files:
  created: []
  modified:
    - src/renderer/src/components/WeatherPanel.tsx

key-decisions:
  - "useEffect return undefined explicitly on no-change branch — TypeScript requires all code paths to return consistently (TS7030)"
  - "Crossfade wraps only the scrollable content below header — header stays visible so user always sees location name during transition"
  - "fading || loading drives opacity: fading handles cached-hit switches, loading handles first-visit switches (covers both paths)"

patterns-established:
  - "Pattern: prevZipRef.current !== activeZip pattern for detecting prop changes that don't trigger re-renders cleanly via deps"

requirements-completed: [VISL-01, VISL-02]

duration: ~5min
completed: 2026-04-10
---

# Phase 05 Plan 02: Particle Overlay and Crossfade Integration Summary

**WeatherPanel integrated with canvas particle overlay (VISL-01) and 250ms opacity crossfade on location switch (VISL-02) — header fixed, sidebar unaffected, particles pause during transition.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-10T08:43:00Z
- **Completed:** 2026-04-10T08:48:00Z
- **Tasks:** 1 of 2 (Task 2 is human-verify checkpoint)
- **Files modified:** 1

## Accomplishments
- `WeatherParticles` canvas overlay mounted inside the weather-data branch `<main>` with `position:relative` positioning context
- 250ms opacity crossfade triggered on every `activeZip` change (both fresh fetches and cached location switches)
- Particles paused (`active={!fading}`) during crossfade per D-11 — canvas clears itself and skips RAF during transition
- Header (location name, RefreshIndicator, gear icon) stays fixed outside the crossfade div per D-12
- `SettingsModal` stays outside crossfade wrapper — renders above all content unaffected
- All three `<main>` branches (loading, error, weather-data) get `position:relative` for layout consistency

## Task Commits

1. **Task 1: Add particle overlay and crossfade transition to WeatherPanel** - `73f25ed` (feat)

## Files Created/Modified
- `src/renderer/src/components/WeatherPanel.tsx` - Added WeatherParticles overlay, prevZipRef/fading crossfade state, crossfade wrapper div around scrollable content

## Decisions Made
- Explicit `return undefined` added to useEffect when zip hasn't changed — TypeScript (TS7030) requires all code paths to return consistently when some paths return a cleanup function
- Header stays fixed (not wrapped in crossfade div) so the location name remains visible during the ~250ms fade — cleaner UX than fading the whole panel
- `fading || loading` drives opacity-0 so both cached-hit switches (where `loading` stays false) and first-visit switches (where `loading` goes true) produce a fade

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added explicit `return undefined` to useEffect for TS7030**
- **Found during:** Task 1 (typecheck verification)
- **Issue:** TypeScript error TS7030 "Not all code paths return a value" — when `prevZipRef.current === activeZip`, the effect returned implicitly; when it differed, it returned a cleanup function
- **Fix:** Added `return undefined` after the if-block to satisfy TypeScript's requirement that all code paths return consistently
- **Files modified:** src/renderer/src/components/WeatherPanel.tsx
- **Verification:** `npm run typecheck:web` exits 0
- **Committed in:** 73f25ed (part of Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — TypeScript strictness)
**Impact on plan:** Minor correctness fix, no scope change.

## Issues Encountered
None beyond the TS7030 fix above.

## Known Stubs

None — particle effects are fully wired to `weather.weatherCode` and `weather.isDay`. Crossfade is fully wired to `activeZip` prop changes.

## Self-Check: PASSED

Files modified:
- FOUND: src/renderer/src/components/WeatherPanel.tsx

Commits:
- FOUND: 73f25ed

Tests: 58/58 passing. Typecheck: 0 errors.

## Next Phase Readiness
- VISL-01 and VISL-02 requirements satisfied pending human visual verification (Task 2 checkpoint)
- No outstanding blockers — Phase 05 visual polish complete after checkpoint approval
- Phase 06 (Windows installer) can proceed once checkpoint is approved

---
*Phase: 05-visual-polish*
*Completed: 2026-04-10*
