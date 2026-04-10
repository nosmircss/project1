# Phase 05: Visual Polish - Research

**Researched:** 2026-04-10
**Domain:** HTML Canvas 2D animation, React component lifecycle, CSS opacity transitions
**Confidence:** HIGH

## Summary

This phase adds two visual features to the existing Electron + React + TypeScript app: animated weather particle effects rendered on an HTML Canvas 2D overlay inside WeatherPanel, and an opacity crossfade when switching locations. All implementation decisions are locked by CONTEXT.md — the research focus is on execution patterns, React lifecycle correctness, performance constraints, and pitfalls specific to RAF loops inside React.

The particle system uses HTML Canvas 2D with `requestAnimationFrame` — zero new dependencies. The canvas component is a self-contained React component that mounts as an `position: absolute` overlay inside `<main>` in WeatherPanel, covering only the right-side panel. The crossfade uses a CSS opacity transition on the WeatherPanel content, triggered by the `loading` state from `useWeather` when a location switch occurs (loading=true means no cached data for the new location; cached-hit switches use the existing data immediately).

**Primary recommendation:** Build a single `WeatherParticles` React component with a `useRef` canvas + `useEffect` RAF loop. Drive it from `weather.weatherCode` and `weather.isDay` props. For crossfade, wrap the WeatherPanel content in a div with `transition-opacity` and toggle opacity based on `loading` prop. Both features are straightforward to implement correctly if RAF cleanup is not missed.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Stylized neon aesthetic — particles match the existing sci-fi design system, not realistic weather
- **D-02:** Rain = thin cyan streaks with glow; Snow = soft white dots with subtle bloom; Fog = drifting translucent cyan layers
- **D-03:** Particle intensity scales with WMO weather severity — light drizzle = sparse, heavy rain = dense fast streaks; WMO codes distinguish light/moderate/heavy for rain, drizzle, snow
- **D-04:** HTML Canvas 2D with requestAnimationFrame loop — zero dependencies, ~80-120 particles max
- **D-05:** Canvas covers WeatherPanel area only (right side) — sidebar stays clean and unobstructed
- **D-06:** Particles render in front of content at low opacity (~15-25%) with `pointer-events: none`
- **D-07:** Clear sky / partly cloudy: ambient particles — day: warm golden motes, night: slow-drifting star-like specks; canvas is always alive, never empty
- **D-08:** Thunderstorms: heavy rain particles + periodic full-canvas lightning flash (brief white/cyan opacity pulse)
- **D-09:** Fog effect: Claude's discretion (drifting horizontal layers or floating wisps)
- **D-10:** Opacity crossfade 200-300ms when switching locations — content fades out, new data loads, fades back in
- **D-11:** Particle effect transitions with a brief pause/restart during location switch
- **D-12:** Sidebar always fixed during crossfade; header behavior flexible (Claude's discretion)

### Claude's Discretion
- Exact particle opacity values and glow intensities
- Fog effect implementation (layers vs wisps)
- Header behavior during crossfade (fixed or transitions with content)
- Lightning flash frequency and duration
- Particle spawn/despawn patterns on weather code changes
- Canvas resize handling on window resize
- Exact crossfade easing curve and duration tuning
- Performance optimization details (particle pooling, off-screen culling)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VISL-01 | App displays animated weather particle effects (raindrops, snowflakes, fog, etc.) that match the current weather condition for the active location | WMO code → effect mapping via existing `getWeatherDisplay` code ranges; HTML Canvas 2D RAF loop in `WeatherParticles` component; effect type derived from `weather.weatherCode` + `weather.isDay` |
| VISL-02 | Switching between saved locations produces a smooth visual transition — no abrupt content flash or layout jump | CSS opacity transition on WeatherPanel content wrapper; `loading` prop from `useWeather` triggers fade-out while new data loads; cached-hit location switches (instant data) still get a brief fade via a `transitioning` state toggle |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| HTML Canvas 2D | Browser built-in | Particle rendering | Zero dependency, GPU-composited in Chromium/Electron, fine for 80-120 particles |
| requestAnimationFrame | Browser built-in | Animation loop | Correct browser-native animation timing; auto-pauses in hidden tabs |
| React useRef | react ^19.2.1 (installed) | Canvas DOM reference + mutable animation state | Correct pattern for imperative canvas access without re-renders |
| React useEffect | react ^19.2.1 (installed) | RAF lifecycle management | Setup and teardown of animation loop tied to component mount/unmount |
| CSS transition-opacity | Built-in | Location crossfade | GPU-composited, no JS animation library needed |
| Tailwind CSS v4 | ^4.2.1 (installed) | Crossfade utility classes | `transition-opacity duration-200 ease-in-out` |

### No New Dependencies Required
All implementation uses browser-native APIs and React hooks already in the project. `npm install` of any new package is NOT required for this phase.

**Version verification:** All packages are already installed. No version check needed.

## Architecture Patterns

### Recommended Project Structure

New files:
```
src/renderer/src/
├── components/
│   └── WeatherParticles.tsx   # Canvas overlay component (new)
├── lib/
│   └── particleEffects.ts     # Particle system logic — effect configs, particle update math (new)
```

Modified files:
```
src/renderer/src/
├── components/
│   └── WeatherPanel.tsx       # Add WeatherParticles overlay + crossfade wrapper
```

### Pattern 1: Canvas Overlay Component with RAF Loop

**What:** A React component that holds a `<canvas>` ref, runs a RAF loop in `useEffect`, and renders particle effects based on props.

**When to use:** Any imperative animation that needs to bypass React's render cycle for 60fps performance.

**Example:**
```typescript
// WeatherParticles.tsx
import { useRef, useEffect } from 'react'

interface WeatherParticlesProps {
  weatherCode: number
  isDay: boolean
  active: boolean  // false during location switch — pauses/clears particles
}

export function WeatherParticles({ weatherCode, isDay, active }: WeatherParticlesProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Resize canvas to match parent
    const resize = (): void => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    // Build effect config from weatherCode + isDay
    // ... particle spawn/update logic from particleEffects.ts ...

    const tick = (): void => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      // ... update and draw particles ...
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      // CRITICAL: cancel RAF on cleanup to prevent CPU accumulation
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      observer.disconnect()
    }
  }, [weatherCode, isDay, active]) // re-initialize when effect type changes

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.2, zIndex: 10 }}
    />
  )
}
```

**Key correctness points:**
- The `useEffect` cleanup MUST call `cancelAnimationFrame` — omitting this causes the loop to accumulate across React strict-mode double-mounts and hot-reloads
- Canvas `width`/`height` attributes must be set explicitly (not CSS width/height) — CSS sizing alone causes blurry/stretched rendering
- `ResizeObserver` on the canvas element handles window resize correctly
- Effect dependencies `[weatherCode, isDay, active]` ensure the loop restarts when the weather condition changes

### Pattern 2: Particle Effect Config Object

**What:** Separate the "what effect?" decision (weatherCode → config) from the "how to draw?" logic (canvas operations). A pure function maps weather state to an effect config object.

**Why:** Keeps `WeatherParticles.tsx` free of giant switch statements. Easy to test in isolation with existing Vitest setup.

```typescript
// particleEffects.ts
export type ParticleEffect = 'rain-light' | 'rain-heavy' | 'drizzle' | 'snow-light' |
  'snow-heavy' | 'fog' | 'thunder' | 'ambient-day' | 'ambient-night'

export interface EffectConfig {
  effect: ParticleEffect
  particleCount: number      // 0-120 per D-04
  speed: number              // px/frame baseline
  color: string              // hex, from neon theme tokens
}

export function getEffectConfig(weatherCode: number, isDay: boolean): EffectConfig {
  // Mirror the range logic from weatherCodeMap.ts
  if (weatherCode === 0 || weatherCode <= 2) {
    return isDay
      ? { effect: 'ambient-day', particleCount: 20, speed: 0.3, color: '#ffaa00' }
      : { effect: 'ambient-night', particleCount: 30, speed: 0.1, color: '#e0e0ff' }
  }
  // ... (remaining ranges mirroring weatherCodeMap.ts)
}
```

### Pattern 3: Crossfade via CSS Opacity Transition

**What:** Wrap the WeatherPanel main content in a div with Tailwind `transition-opacity`. Toggle opacity to 0 on `loading=true`, back to 1 when `loading=false`.

**When to use:** D-10 requires 200-300ms opacity fade. CSS transitions are GPU-composited — no JS animation needed.

**The nuance — cached location switches:** When switching to a cached location, `useWeather` sets the new weather immediately (loading=false from the start). The crossfade still needs to trigger. Solution: in WeatherPanel (or a wrapper), use a local `transitioning` state that flips to `true` on `activeZip` change, then sets back to `false` after the fade duration via `setTimeout`. This produces a brief fade even when data is instant.

```typescript
// In WeatherPanel.tsx
const [transitioning, setTransitioning] = useState(false)
const prevZipRef = useRef(activeZip)

useEffect(() => {
  if (prevZipRef.current !== activeZip) {
    prevZipRef.current = activeZip
    setTransitioning(true)
    const id = setTimeout(() => setTransitioning(false), 250)
    return () => clearTimeout(id)
  }
}, [activeZip])

// In JSX — wrap scrollable content (not the header):
<div className={`flex-1 flex flex-col transition-opacity duration-200 ${transitioning || loading ? 'opacity-0' : 'opacity-100'}`}>
  {/* ... content ... */}
</div>
```

### Pattern 4: WMO Code → Particle Effect Mapping

Using the exact same range logic as `weatherCodeMap.ts`:

| WMO Range | Effect | Particle Count | Color |
|-----------|--------|---------------|-------|
| 0 (clear) | ambient-day / ambient-night | 20-30 | #ffaa00 day / #e0e0ff night |
| 1-2 (partly cloudy) | ambient-day / ambient-night | 15-25 | same as clear |
| 3 (overcast) | ambient-day / ambient-night | 10-15 | dim — fewer moats, dimmer |
| 4-48 (fog) | fog | 8-15 layers | #00f0ff at ~8% opacity |
| 51-53 (drizzle light) | drizzle | 30 | #00f0ff |
| 55-57 (drizzle heavy) | drizzle | 60 | #00f0ff |
| 61-63 (rain light) | rain-light | 50 | #00f0ff |
| 65-67 (rain heavy) | rain-heavy | 100 | #00f0ff |
| 71-73 (snow light) | snow-light | 40 | #e0e0ff |
| 75-77 (snow heavy) | snow-heavy | 80 | #ffffff |
| 78-82 (showers) | rain-light / rain-heavy | 60-90 | #00f0ff |
| 83-86 (snow showers) | snow-light / snow-heavy | 50-70 | #e0e0ff |
| 87+ (thunderstorm) | thunder | 110 + lightning flash | #00f0ff + #ffffff pulse |

**Severity within ranges:** WMO codes follow light=odd, moderate=middle, heavy=even within ranges (e.g., 61=light rain, 63=moderate, 65=heavy). Use code mod patterns to detect intensity.

### Anti-Patterns to Avoid

- **Missing RAF cancellation:** Not calling `cancelAnimationFrame` in the `useEffect` return causes the loop to keep running after unmount, accumulating CPU cost monotonically. This is already flagged in STATE.md as a known concern.
- **CSS-only canvas sizing:** Setting `width: 100%` in CSS without setting `canvas.width = canvas.offsetWidth` in JS causes blurry/2x-scaled rendering on HiDPI displays.
- **Re-creating particle array on every frame:** Allocating new objects in the RAF loop creates GC pressure. Use object pooling or mutate in place.
- **Triggering React re-renders from inside the RAF loop:** Never call `setState` inside the tick function — causes React to re-render every frame. All animation state must live in `useRef`.
- **Listening to `loading` for crossfade only:** Cached location switches don't trigger `loading=true`, so relying solely on `loading` produces no fade for the common case. Use `activeZip` change detection as primary trigger.
- **`zIndex` conflicts:** The canvas overlay uses `position: absolute inset-0` — the WeatherPanel `<main>` element needs `position: relative` for this to work correctly. Verify it has that or add it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSS opacity transition | JS-animated fade with `requestAnimationFrame` | CSS `transition-opacity` | GPU composited, simpler, matches Tailwind utilities |
| Canvas resize tracking | `window.resize` event listener | `ResizeObserver` on canvas element | More accurate, fires only for the observed element, modern standard |
| Particle glow effect | Custom shadow blur per-frame | `ctx.shadowBlur` + `ctx.shadowColor` on canvas context | Native Canvas 2D API, correct approach |
| Timer for lightning flash | External timer library | `setTimeout` + `useRef` for flash state | Simple, no dependency, handles cleanup cleanly |

**Key insight:** The Canvas 2D API has `shadowBlur`/`shadowColor` for glow effects — this is exactly the right tool for neon particle glow and avoids trying to approximate it with multiple overlapping draws.

## Common Pitfalls

### Pitfall 1: RAF Loop Accumulation (CRITICAL — flagged in STATE.md)
**What goes wrong:** The RAF loop continues running after the component unmounts or after `useEffect` re-runs due to prop change, creating multiple concurrent loops that consume CPU proportional to how many times the weather code changed.
**Why it happens:** `useEffect` cleanup runs before the next effect fires; if `cancelAnimationFrame` is not called, the old loop keeps ticking.
**How to avoid:** Always store the RAF handle in a `useRef`, always cancel in the `useEffect` cleanup return function.
**Warning signs:** CPU usage climbing over time as user switches locations; browser DevTools profiler shows multiple concurrent paint calls.

### Pitfall 2: Canvas Dimensions Not Set Correctly
**What goes wrong:** Canvas renders at 300x150px (HTML default) or looks blurry/stretched on Retina/HiDPI displays.
**Why it happens:** CSS sizing and canvas buffer sizing are independent. CSS `width: 100%` stretches the 300px buffer; `devicePixelRatio` scaling is needed for HiDPI.
**How to avoid:** In the resize handler, set `canvas.width = canvas.offsetWidth * devicePixelRatio`, `canvas.height = canvas.offsetHeight * devicePixelRatio`, then `ctx.scale(devicePixelRatio, devicePixelRatio)`. For Electron on Windows/WSL2, `devicePixelRatio` is typically 1.0 or 1.25 — handle it defensively.
**Warning signs:** Blurry or clipped particles; canvas visually smaller than the panel.

### Pitfall 3: Crossfade Missing for Cached Location Switches
**What goes wrong:** Switching to a previously visited location (cached) shows no fade because `loading` is never true — data arrives synchronously from cache.
**Why it happens:** `useWeather` serves cached data immediately, never setting `loading=true` for cached hits.
**How to avoid:** Detect `activeZip` change in WeatherPanel (or a wrapping component), set a `transitioning` state to true, and clear it after fade duration.
**Warning signs:** Smooth fade only on first visit to each location, abrupt swap on return visits.

### Pitfall 4: `position: relative` Missing from Canvas Parent
**What goes wrong:** Canvas with `position: absolute inset-0` escapes its intended parent and covers unintended UI elements (sidebar, titlebar).
**Why it happens:** Absolute positioning climbs the DOM until it finds a positioned ancestor. WeatherPanel's `<main>` element must have `position: relative`.
**How to avoid:** Check WeatherPanel.tsx `<main>` element — it currently has `flex-1 flex flex-col bg-bg-panel overflow-y-auto` but no `relative`. Add `relative` to the className.
**Warning signs:** Canvas covering the sidebar or TitleBar in addition to the weather content area.

### Pitfall 5: Electron Strict Mode Double-Mount
**What goes wrong:** In React development mode (Vite dev server), `useEffect` fires twice — RAF loop runs twice, particles double up.
**Why it happens:** React 18+ Strict Mode intentionally mounts, unmounts, and remounts components in development to surface cleanup bugs.
**How to avoid:** Correct RAF cleanup (Pitfall 1 solution) handles this automatically — the first mount's loop is cancelled before the second mount fires.
**Warning signs:** Appears only in `npm run dev`, not in production build. Double particle density in development.

### Pitfall 6: `ctx.shadowBlur` Performance Regression
**What goes wrong:** Setting `shadowBlur` on every particle draw causes significant CPU overhead because the browser must compute Gaussian blur for each draw call.
**Why it happens:** Shadow blur is not GPU-accelerated on all canvas paths — especially for many small shapes.
**How to avoid:** Batch all particles of the same type/color, set `shadowBlur` once per batch (not per particle), or use a two-canvas composite (particles drawn on offscreen canvas, composited with blur). For 80-120 particles at low complexity, benchmark first — likely acceptable on Electron's Chromium.
**Warning signs:** CPU > 5% at idle with window visible; DevTools profiler shows excessive paint time.

## Code Examples

Verified patterns from the existing codebase and browser standards:

### Canvas resize with ResizeObserver
```typescript
// Correct canvas sizing pattern
const resize = (): void => {
  const dpr = window.devicePixelRatio || 1
  canvas.width = canvas.offsetWidth * dpr
  canvas.height = canvas.offsetHeight * dpr
  ctx.scale(dpr, dpr)
}
const observer = new ResizeObserver(resize)
observer.observe(canvas)
// Cleanup: observer.disconnect()
```

### RAF loop with proper cleanup
```typescript
useEffect(() => {
  const rafHandle = { current: 0 }
  const tick = (): void => {
    // ... draw ...
    rafHandle.current = requestAnimationFrame(tick)
  }
  rafHandle.current = requestAnimationFrame(tick)
  return () => {
    cancelAnimationFrame(rafHandle.current)
  }
}, [weatherCode, isDay])
```

### Neon glow on canvas
```typescript
// Using design system colors from main.css @theme
ctx.shadowColor = '#00f0ff'   // --color-neon-cyan
ctx.shadowBlur = 6
ctx.strokeStyle = '#00f0ff'
ctx.globalAlpha = 0.85
// ... draw rain streak ...
ctx.shadowBlur = 0            // reset after batch
ctx.globalAlpha = 1.0
```

### Rain streak draw (thin diagonal line)
```typescript
// Thin cyan streak, angled ~75deg from vertical (slight wind)
ctx.beginPath()
ctx.moveTo(particle.x, particle.y)
ctx.lineTo(particle.x + particle.vx * 3, particle.y + particle.vy * 3)
ctx.stroke()
```

### Crossfade activeZip detection in WeatherPanel
```typescript
const prevZipRef = useRef(activeZip)
const [fading, setFading] = useState(false)

useEffect(() => {
  if (prevZipRef.current !== activeZip) {
    prevZipRef.current = activeZip
    setFading(true)
    const id = setTimeout(() => setFading(false), 250)
    return () => clearTimeout(id)
  }
}, [activeZip])

// JSX:
// <div className={`transition-opacity duration-[250ms] ease-in-out ${fading || loading ? 'opacity-0' : 'opacity-100'}`}>
```

### Lightning flash implementation
```typescript
// In tick(), check flash state from ref (not React state)
if (flashRef.current > 0) {
  ctx.save()
  ctx.fillStyle = `rgba(200, 255, 255, ${flashRef.current * 0.15})`
  ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)
  ctx.restore()
  flashRef.current -= 0.08  // decay per frame
}

// Trigger flash (from a setInterval or random check in tick):
if (Math.random() < 0.0005) {  // ~1.8s average at 60fps
  flashRef.current = 1.0
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Third-party particle libraries (particles.js, tsParticles) | HTML Canvas 2D + RAF — zero dep | Ecosystem trend ~2022+ | No bundle bloat, full control, no API churn |
| `window.resize` event listener | `ResizeObserver` | Chrome 64+ / Electron stable | More accurate, element-specific, no debouncing needed |
| CSS `transition` on component re-renders | CSS `transition-opacity` + opacity toggle | Always correct pattern | GPU-composited, no React-driven animation overhead |

**Deprecated/outdated:**
- `webkitRequestAnimationFrame`: not needed — standard `requestAnimationFrame` available in Electron's Chromium

## Open Questions

1. **`position: relative` on WeatherPanel `<main>`**
   - What we know: WeatherPanel's `<main>` currently has `flex-1 flex flex-col bg-bg-panel overflow-y-auto` — no `relative` class
   - What's unclear: Whether `flex-1` or the parent flex container implicitly creates a positioning context (it does NOT — flex does not establish a containing block for absolute children)
   - Recommendation: The implementation plan MUST add `relative` to WeatherPanel's `<main>` element as a prerequisite step before mounting the canvas overlay

2. **`overflow-y-auto` + absolute canvas overlap**
   - What we know: WeatherPanel `<main>` has `overflow-y-auto` — when content is short, it clips to the panel height; when long, it scrolls
   - What's unclear: Whether absolute-positioned canvas inside a scrolling container scrolls with content or stays fixed over the panel
   - Recommendation: Canvas should be fixed relative to the panel viewport, not scroll with content. Use a separate wrapper: a `position: relative` container that is NOT the scrolling `<main>`, but a sibling overlay positioned over it. Or: keep canvas as sibling to `<main>` inside the flex container, not child of `<main>`.

3. **Fog effect: layers vs wisps**
   - What we know: Claude's discretion (D-09)
   - Recommendation: Horizontal gradient-fill rectangles drifting left-to-right at 0.2px/frame at ~5-8% opacity — simpler to implement than wisps, more visually distinct from rain/snow

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — all implementation uses browser-native Canvas API and installed React/Tailwind. No new npm packages required.)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `/home/chris/claude/project1/vitest.config.ts` |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

Note: `vitest.config.ts` sets `environment: 'node'` — this means DOM APIs (`document`, `canvas`, `requestAnimationFrame`) are not available in the test environment. WeatherParticles and crossfade are visual/imperative and require a DOM environment to test meaningfully. The existing test pattern tests pure utility functions only.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VISL-01 (particle effects) | `getEffectConfig(code, isDay)` returns correct effect type for each WMO code range | unit | `npx vitest run src/renderer/src/lib/__tests__/particleEffects.test.ts` | ❌ Wave 0 |
| VISL-01 (particle effects) | RAF loop + canvas rendering | manual-only | Visual inspection in `npm run dev` | — |
| VISL-02 (crossfade) | CSS opacity transition fires on zip change | manual-only | Visual inspection in `npm run dev` | — |

**Manual-only justification:** Canvas rendering and CSS transitions require a real browser/Electron window. Vitest runs in a Node environment without DOM. Testing the canvas rendering imperatively would require `jsdom` or `happy-dom` environment setup, which is outside this phase's scope and not the established project pattern.

### Sampling Rate
- **Per task commit:** `npx vitest run` (existing tests must remain green)
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green + visual smoke test in `npm run dev` before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/renderer/src/lib/__tests__/particleEffects.test.ts` — covers VISL-01 (pure function: `getEffectConfig` WMO code mapping). Tests pure logic only, no DOM required, fits existing test pattern.

## Sources

### Primary (HIGH confidence)
- MDN Canvas API (`CanvasRenderingContext2D`) — shadowBlur, shadowColor, globalAlpha behavior
- MDN ResizeObserver — standard API for element size tracking
- React 19 docs (react.dev) — useEffect cleanup semantics, useRef patterns
- Existing project source — `weatherCodeMap.ts` for WMO code ranges, `main.css` for neon theme tokens, `WeatherPanel.tsx` for integration target structure, `useWeather.ts` for loading/cached-hit behavior
- `vitest.config.ts` + existing tests — confirmed node environment, pure-function test pattern

### Secondary (MEDIUM confidence)
- Electron Chromium version (39.x) — `requestAnimationFrame` and `ResizeObserver` fully supported
- STATE.md note: "Canvas RAF loops must be cancelled in `useEffect` cleanup — CPU accumulates monotonically if skipped" — project team has already identified the key pitfall

### Tertiary (LOW confidence)
- `ctx.shadowBlur` performance characteristics — described as potentially heavy; recommend benchmarking at 80-120 particles before optimizing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — uses only browser-native APIs and installed packages
- Architecture patterns: HIGH — direct from React docs and existing project patterns
- WMO code mapping: HIGH — sourced from existing `weatherCodeMap.ts` in codebase
- Pitfalls: HIGH — RAF cleanup confirmed in STATE.md; canvas sizing from MDN; crossfade gap from `useWeather` source analysis
- Canvas performance: MEDIUM — shadowBlur cost is workload-dependent; needs runtime validation

**Research date:** 2026-04-10
**Valid until:** 2026-07-10 (stable APIs — Canvas 2D, React hooks, CSS transitions do not change rapidly)
