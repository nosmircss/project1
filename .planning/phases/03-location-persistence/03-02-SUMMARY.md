---
phase: 03-location-persistence
plan: 02
subsystem: ui
tags: [react, hooks, ipc, electron, locations, persistence, sidebar]

# Dependency graph
requires:
  - phase: 03-location-persistence
    plan: 01
    provides: IPC bridge for location CRUD (getLocations, addLocation, deleteLocation, setActiveLocation, getLocationsMeta)
provides:
  - useLocations hook with full location lifecycle (load, add, delete, switch, persist)
  - Three-state App.tsx routing (first-launch/WelcomeScreen, empty-sidebar, normal)
  - Sidebar with hover-reveal delete X button on all location rows
  - Duplicate zip rejection with 'Already saved' inline error
  - Active location derived from zip string (survives reorders)
affects:
  - 04-auto-refresh (will gate on locationsLoaded, use activeZip to drive refresh)
  - 05-animations (Sidebar row hover state now uses group pattern — animations can layer on)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useLocations hook mirrors useSettings pattern (mount useEffect, Promise.all IPC calls, optimistic updates)
    - Three-state startup routing via hasLaunched + locations.length (not just locations.length)
    - Active location by zip string derivation (not array index) for stability across mutations
    - Tailwind group/group-hover for hover-reveal delete button pattern
    - Dual-gate weather fetch: settingsLoaded AND locationsLoaded prevents race condition

key-files:
  created:
    - src/renderer/src/hooks/useLocations.ts
  modified:
    - src/renderer/src/App.tsx
    - src/renderer/src/components/Sidebar.tsx

key-decisions:
  - "Active location tracked by zip string not array index — zip survives any reorder/delete, index breaks after delete"
  - "Empty state (all locations deleted) shows sidebar with 'No locations saved' NOT WelcomeScreen — WelcomeScreen is first-launch only"
  - "Sidebar duplicate check at UI layer prevents unnecessary IPC round-trip, returns 'Already saved' immediately"
  - "Weather fetch gated on both settingsLoaded AND locationsLoaded — prevents stale-unit double-fetch race condition"

patterns-established:
  - "useLocations hook: mount useEffect with Promise.all([getLocations, getLocationsMeta]) -> set all state atomically"
  - "Optimistic update pattern: update local state first, then fire IPC persist calls (consistent with useSettings)"
  - "group/group-hover Tailwind pattern for hover-reveal delete button without JS state"
  - "Three-state routing guard sequence: !locationsLoaded -> !hasLaunched -> locations.length === 0 -> normal"

requirements-completed:
  - LOC-01
  - LOC-02
  - LOC-03
  - LOC-04

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 3 Plan 02: Location Persistence Frontend Summary

**useLocations hook wiring React to electron-conf IPC with three-state startup routing (WelcomeScreen/empty-sidebar/normal), hover-reveal delete button, and dual-gate weather fetch**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-02T23:30:27Z
- **Completed:** 2026-03-02T23:31:59Z
- **Tasks:** 2 code tasks + 1 human-verify checkpoint
- **Files modified:** 3 (1 created + 2 modified)

## Accomplishments
- Created `useLocations.ts` hook loading locations + meta from IPC on mount, with optimistic add/delete/setActive
- Rewired `App.tsx` to use `useLocations()` with three-state startup routing (first-launch, empty, normal)
- Updated `Sidebar.tsx` with hover-reveal delete X button (neon-red glow on hover) on all location rows
- Duplicate zip detection at both Sidebar and hook layers ('Already saved' error)
- Active location derived from zip string — survives delete/reorder correctly

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useLocations hook and update Sidebar with delete button** - `d5e5542` (feat)
2. **Task 2: Rewire App.tsx with useLocations and three-state startup routing** - `731126c` (feat)
3. **Task 3: Verify complete location persistence lifecycle** - Human-verified, all 10 lifecycle steps approved

**Plan metadata:** (docs commit follows after state update)

## Files Created/Modified
- `src/renderer/src/hooks/useLocations.ts` - useLocations hook with 7 return values: locations, activeZip, hasLaunched, loaded, addLocation, deleteLocation, setActiveZip
- `src/renderer/src/App.tsx` - Rewired with useLocations(), three-state routing, dual-gate useWeather
- `src/renderer/src/components/Sidebar.tsx` - Added onDelete prop, group-hover X button on all rows, duplicate check

## Decisions Made
- Active location tracked by zip string not array index — zip is stable across deletes, index shifts unpredictably
- Empty-all-locations state shows sidebar + "No locations saved" message (NOT WelcomeScreen) — per locked plan decision
- Sidebar duplicate check runs before calling onAdd, returns 'Already saved' immediately without IPC round-trip
- Weather fetch gated on both settingsLoaded AND locationsLoaded — prevents stale temperature-unit fetch race condition

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compiled cleanly on both tasks. All type signatures aligned with preload index.d.ts declarations from Plan 01.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Full location persistence lifecycle is wired end-to-end and user-verified: save, switch, delete, persist across restarts
- All LOC-01 through LOC-04 requirements met; phase 03-location-persistence is complete
- Phase 04 (auto-refresh) can use `activeZip` from useLocations and `locationsLoaded` gate same pattern
- Blocker to resolve before Phase 4: decide `backgroundThrottling: false` vs. accept throttling before writing any interval code

## Self-Check: PASSED

- FOUND: src/renderer/src/hooks/useLocations.ts
- FOUND: src/renderer/src/App.tsx (modified)
- FOUND: src/renderer/src/components/Sidebar.tsx (modified)
- FOUND: commit d5e5542 (Task 1)
- FOUND: commit 731126c (Task 2)
- TypeScript: PASS (zero errors, npx tsc --noEmit)

---
*Phase: 03-location-persistence*
*Completed: 2026-03-02*
