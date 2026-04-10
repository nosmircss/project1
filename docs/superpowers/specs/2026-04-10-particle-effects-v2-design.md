# Particle Effects V2 — Visual Overhaul + Wind Influence

## Goal

Make each particle effect visually distinct between light/heavy variants, improve fog and ambient effects, and add subtle wind influence from live weather data.

## Files Changed

| File | Change |
|------|--------|
| `src/renderer/src/lib/particleEffects.ts` | Particle struct, createParticle, updateParticle, drawParticle |
| `src/renderer/src/components/WeatherParticles.tsx` | Add windSpeed/windDirection props, pass frameCount + windFactor to engine |
| `src/renderer/src/components/WeatherPanel.tsx` | Pass wind data through to WeatherParticles |

No new files. No new dependencies.

## Particle Struct Changes

New fields added to the `Particle` interface:

| Field | Type | Default | Used By |
|-------|------|---------|---------|
| `length` | number | 0 | rain, drizzle — variable streak length per particle |
| `width` | number | 0 | rain, drizzle — variable stroke width per particle |
| `pulsePhase` | number | 0 | snow, ambient — phase offset for glow oscillation |
| `wobbleAmp` | number | 0 | snow heavy — per-particle wobble intensity |
| `twinkleSpeed` | number | 0 | ambient night — per-particle twinkle rate |
| `splashX` | number | 0 | rain heavy — x position where drop hit bottom |
| `splashLife` | number | 0 | rain heavy — remaining splash animation frames |

Fields default to 0 for effects that don't use them. No branching cost.

## Effect-by-Effect Design

### Rain Light

**Current:** Uniform diagonal streaks identical to heavy rain.
**Proposed:**
- Near-vertical streaks — reduce `vx` to `speed * 0.05` (was `0.15`)
- Variable streak `length`: 8-20px per particle (randomized at creation)
- Thin `width`: 0.8-1.3px
- Wider opacity spread: 0.4-0.8 (was 0.7-1.0)
- Drawing: `lineTo(x + vx * length_factor, y + length)` where length_factor keeps the streak nearly vertical

### Rain Heavy

**Current:** Same streaks as light, just faster and more numerous.
**Proposed:**
- Thicker `width`: 1.2-2.2px
- Longer `length`: 16-30px
- Wind sway: subtle sine modulation on `vx` per frame
- Splash on impact: when particle respawns (exits bottom), set `splashX = x` and `splashLife = 6`. In drawParticle, while `splashLife > 0`, draw two small dots arcing outward from `splashX` at canvas bottom. Decrement `splashLife` by 0.15/frame (~40 frames, 0.7s)
- Drawing: thicker stroke, `lineTo(x + vx_adjusted, y + length)`

### Drizzle

**Current:** Thin diagonal streak, nearly identical to rain-light.
**Proposed:**
- Short dashes: `length` 3-7px
- Near-vertical: minimal `vx`, slight random `drift` per particle (-0.3 to 0.3)
- Slower: `vy` 1.2-2.2 (was 2-3)
- Very thin: `width` 0.7
- Lower glow: `shadowBlur` 2
- Clearly distinct from rain — looks like fine mist falling

### Snow Light

**Current:** Plain filled circles.
**Proposed:**
- Radial gradient glow: `createRadialGradient` from center to `size * 2.5`, core white fading to transparent
- Core dot on top of glow halo
- Subtle pulse: opacity modulated by `sin(life * 0.04 + pulsePhase) * 0.2`
- Slower fall: `vy` 0.4-0.8 (was 0.8 fixed)
- Gentler wobble frequency: `sin(life * 0.03)` (was `0.05`)

### Snow Heavy

**Current:** Slightly larger plain circles.
**Proposed:**
- Larger radial bloom: gradient extends to `size * 3`, two-stop gradient (white core at 0, blue-white at 0.4, transparent at 1)
- Per-particle `wobbleAmp`: 0.5-1.5 (creates varied lateral movement)
- Faster fall: `vy` 0.8-1.6 (varied per particle)
- Core dot with `shadowBlur: 6` for bright center
- Dense count creates blizzard atmosphere

### Fog

**Current:** Flat translucent rectangles sliding left-to-right. Looks mechanical.
**Proposed:**
- Replace rectangles with radial gradient blobs: `createRadialGradient` with `radius` = `canvasW * 0.15` to `canvasW * 0.35`
- Gradient: solid cyan center fading to transparent at edge
- Vertical sine drift: `y += sin(time * 0.0005 + phase) * 0.15` — organic bobbing
- Varied speeds: 0.1-0.3 px/frame across layers
- Opacity: 0.03-0.06 per blob
- `y` positioned in middle 60% of canvas (not edges)
- Wrap: when blob center exits right, reset to left at `-radius`

### Ambient Day

**Current:** Small golden dots drifting randomly.
**Proposed:**
- Gentle upward float: `vy` = -0.1 to -0.25 (was random direction)
- Pulsing warm glow: radial gradient halo at `size * 3`, modulated by `sin(frame * 0.03 + pulsePhase)`
- Core dot with `shadowBlur: 4`
- Respawn in lower 70% of canvas (float upward and fade)

### Ambient Night

**Current:** Same dots as day but blue-white.
**Proposed:**
- Nearly stationary: `vx/vy` = tiny (0.08 range)
- Twinkle: opacity oscillates via `sin(frame * twinkleSpeed + twinklePhase)^2` — squared sine gives sharp peaks (star-like blink)
- Cross-flare: when twinkle value > 0.7, draw thin perpendicular lines through center (`lineWidth: 0.5`, length `size * 2.5`)
- Higher `baseOpacity` variance: 0.2-0.7 to create depth (some stars bright, some dim)

## Wind Influence

### Data Flow

```
WeatherPanel
  └─ weather.windSpeed (number, in user's unit)
  └─ weather.windDirection (degrees 0-360)
       │
       ▼
WeatherParticles (new props: windSpeed, windDirection)
       │
       ▼
  Compute windFactor: { dx: number, dy: number }
    - Normalize windSpeed to 0-1 range (cap at 30mph / 50kmh)
    - Convert direction to radians, extract horizontal component
    - Scale: max displacement = ~1.5 px/frame at full wind
       │
       ▼
  updateParticle(p, effect, w, h, windFactor)
    - Add windFactor.dx to particle's vx per frame
```

### Per-Effect Wind Behavior

| Effect | Wind Influence |
|--------|---------------|
| Rain light | Tilts streaks slightly — adds `windFactor.dx * 0.5` to `vx` |
| Rain heavy | Stronger tilt — adds `windFactor.dx * 0.8` to `vx` |
| Drizzle | Gentle drift bias — adds `windFactor.dx * 0.3` to drift |
| Snow light | Shifts wobble center — adds `windFactor.dx * 0.4` |
| Snow heavy | Same as light but `* 0.6` |
| Fog | Speeds/slows blob drift — modulates `vx` by `windFactor.dx * 0.3` |
| Ambient | No wind influence (too subtle to matter) |

### Wind Normalization

```ts
function computeWindFactor(
  windSpeed: number,
  windDirection: number,
  unit: 'mph' | 'kmh'
): { dx: number } {
  const maxSpeed = unit === 'mph' ? 30 : 50
  const normalized = Math.min(windSpeed / maxSpeed, 1)
  // Wind direction: meteorological convention (where wind comes FROM)
  // 270 = from west = pushes east (+x), 90 = from east = pushes west (-x)
  const radians = (windDirection * Math.PI) / 180
  const dx = Math.sin(radians) * normalized * 1.5
  return { dx }
}
```

Only horizontal component (`dx`) matters for the subtle effect. Vertical wind component would fight gravity for rain/snow and look wrong.

### Prop Changes

```tsx
// WeatherParticles.tsx
interface WeatherParticlesProps {
  weatherCode: number
  isDay: boolean
  active: boolean
  windSpeed: number           // new
  windDirection: number        // new
  windSpeedUnit: 'mph' | 'kmh' // new — needed for wind normalization
}
```

```tsx
// WeatherPanel.tsx — pass through
<WeatherParticles
  weatherCode={effectiveCode}
  isDay={effectiveIsDay}
  active={!fading}
  windSpeed={weather.windSpeed}
  windDirection={weather.windDirection}
  windSpeedUnit={settings.windSpeedUnit}
/>
```

## Frame Counter

`drawParticle` gains a `frame: number` parameter for time-based effects (pulse, twinkle). The RAF loop in `WeatherParticles.tsx` increments a `frameRef` each tick and passes it through. This avoids storing derived glow values on every particle each frame.

Updated signature:
```ts
drawParticle(ctx, p, effect, config, frame)
```

## Canvas Opacity

Currently hardcoded to `style={{ opacity: 0.2 }}`. Keeping this unchanged — the improved effects have their own per-particle opacity control and the 0.2 overlay keeps effects from overwhelming the UI.

## Performance

- No new `createRadialGradient` allocations per frame for rain/drizzle (same stroke rendering)
- Snow/fog/ambient do create gradients per particle per frame. At 30-80 particles this is well within budget. Radial gradients are GPU-composited in Canvas 2D.
- Splash system reuses existing particle slots (no pool growth)
- `frameCount` is a single integer increment per tick — negligible cost

## Test Impact

- Existing `particleEffects.test.ts` tests `getEffectConfig` only — no changes needed there
- `createParticle` return shape changes (new fields) but no tests assert on it currently
- No new test file needed — visual effects are best verified by running the app
