---
phase: 05-visual-polish
plan: 01
subsystem: renderer/particles
tags: [canvas, animation, particles, weather-effects, TDD]
dependency_graph:
  requires: []
  provides: [particleEffects-engine, WeatherParticles-component]
  affects: [WeatherPanel-integration-in-plan-02]
tech_stack:
  added: []
  patterns:
    - HTML Canvas 2D with requestAnimationFrame loop
    - ResizeObserver for HiDPI canvas sizing
    - useRef particle pool (mutable, no React re-renders)
    - TDD: failing tests first, then implementation
key_files:
  created:
    - src/renderer/src/lib/particleEffects.ts
    - src/renderer/src/lib/__tests__/particleEffects.test.ts
    - src/renderer/src/components/WeatherParticles.tsx
  modified: []
decisions:
  - "Particle pool initialized once and mutated in-place each frame — avoids GC pressure from allocating new objects in the RAF loop"
  - "getEffectConfig uses code <= N range comparisons (not strict equality) matching weatherCodeMap.ts pattern — safely handles WMO gap codes 4-44, 58-60, 68-70, 78-79, 83-84, 87-94"
  - "Snow showers (83-86) split at 84/85 boundary: 83-84=snow-light, 85-86=snow-heavy (mirrors light/heavy WMO sub-range convention)"
  - "Rain showers (78-82) split at 80/81 boundary: 78-80=rain-light, 81-82=rain-heavy"
  - "drawParticle uses ctx.save()/restore() per particle to prevent globalAlpha/shadowBlur leakage across different effect types"
  - "WeatherParticles active=false path clears canvas and skips RAF loop entirely for crossfade pause (D-11)"
metrics:
  duration: "~3 minutes"
  completed: "2026-04-10T13:44:32Z"
  tasks_completed: 2
  files_created: 3
  files_modified: 0
  tests_added: 27
  tests_total: 58
---

# Phase 05 Plan 01: Particle System Engine and Canvas Component Summary

**One-liner:** WMO-to-particle-effect mapping engine with RAF canvas overlay — rain streaks, snow dots, fog layers, thunder flash, and ambient motes using neon theme colors and zero new dependencies.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create particleEffects.ts with WMO-to-effect mapping and particle engine (TDD) | 6f7329d | particleEffects.ts, particleEffects.test.ts |
| 2 | Create WeatherParticles canvas overlay component with RAF loop | d48f352 | WeatherParticles.tsx |

## What Was Built

### particleEffects.ts

Pure-function particle system logic with no DOM dependency:

- `getEffectConfig(weatherCode, isDay): EffectConfig` — maps WMO codes to effect type, particle count, speed, color, and glow size using range comparisons that mirror `weatherCodeMap.ts` exactly
- `createParticle(effect, canvasW, canvasH): Particle` — spawns particles at appropriate positions per effect type (rain/snow from top, fog from left edge, ambient at random positions)
- `updateParticle(p, effect, canvasW, canvasH): void` — mutates particle position in-place; snow uses sine-wave wobble on life counter, fog wraps horizontally, ambient particles respawn on life exhaustion
- `drawParticle(ctx, p, effect, config): void` — per-effect draw routines: rain/drizzle as diagonal streak with `ctx.stroke()`, snow as filled arc with bloom, fog as translucent fillRect, ambient as small glowing mote

**Neon theme colors used:**
- `#00f0ff` (neon-cyan) — rain, drizzle, fog, thunder
- `#ffaa00` (warning/gold) — ambient-day motes
- `#e0e0ff` (text-primary) — ambient-night dots and snow-light
- `#ffffff` — snow-heavy (brighter white for contrast)

### particleEffects.test.ts

27 unit tests covering all WMO code range boundaries:
- Clear sky day/night (code 0)
- Partly cloudy day/night (codes 1-2)
- Overcast with reduced count (code 3)
- Fog including gap codes (codes 4-48: codes 10, 45, 48 tested)
- Drizzle light/heavy (codes 51-57)
- Rain light/heavy (codes 58-67)
- Snow light/heavy with correct colors (codes 68-77)
- Showers light/heavy split (codes 78-82: codes 78, 80, 82 tested)
- Snow showers light/heavy split (codes 83-86: codes 83, 85, 86 tested)
- Thunderstorm upper boundary (codes 95, 99)
- Color theme validation for all effect categories
- Required field presence (effect, particleCount, speed, color, glowSize)

### WeatherParticles.tsx

Self-contained React canvas overlay component:

- Props: `weatherCode`, `isDay`, `active` (false during location crossfade pauses RAF per D-11)
- `useRef<HTMLCanvasElement>` for canvas DOM access
- `useRef<number>` for RAF handle — cancellation in useEffect cleanup (STATE.md concern resolved)
- `useRef<Particle[]>` for particle pool — mutated in-place, never triggers re-renders
- `useRef<number>` for lightning flash intensity — decays 0.08/frame (~12 frames)
- `ResizeObserver` with `devicePixelRatio` scaling for HiDPI canvas sizing (RESEARCH.md Pitfall 2)
- Lightning flash overlay: `rgba(200, 255, 255, intensity * 0.15)` for thunder effect (D-08)
- Canvas element: `absolute inset-0 w-full h-full pointer-events-none`, `opacity: 0.2`, `zIndex: 10` (D-06)

## Deviations from Plan

None — plan executed exactly as written. TDD RED/GREEN cycle followed correctly (27 failing tests → implementation → all passing).

## Known Stubs

None — this plan creates a complete, self-contained particle engine. Integration into WeatherPanel (adding `relative` positioning and mounting `<WeatherParticles>`) is intentionally deferred to Plan 02 per the plan's objective statement.

## Self-Check: PASSED

Files created:
- FOUND: src/renderer/src/lib/particleEffects.ts
- FOUND: src/renderer/src/lib/__tests__/particleEffects.test.ts
- FOUND: src/renderer/src/components/WeatherParticles.tsx

Commits:
- FOUND: 6f7329d (feat(05-01): particleEffects.ts)
- FOUND: d48f352 (feat(05-01): WeatherParticles canvas component)

Tests: 58/58 passing. Typecheck: 0 errors.
