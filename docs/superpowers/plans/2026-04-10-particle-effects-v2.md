# Particle Effects V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Visually overhaul all weather particle effects with distinct light/heavy rendering, improved fog/ambient effects, and subtle wind influence from live weather data.

**Architecture:** Three files change — the particle engine (`particleEffects.ts`) gets new Particle fields, reworked create/update/draw functions; the canvas component (`WeatherParticles.tsx`) gains wind props and a frame counter; the panel (`WeatherPanel.tsx`) passes wind data through. No new files or dependencies.

**Tech Stack:** Canvas 2D, React, TypeScript

**Spec:** `docs/superpowers/specs/2026-04-10-particle-effects-v2-design.md`

---

### Task 1: Extend Particle Interface and Add Wind Helper

**Files:**
- Modify: `src/renderer/src/lib/particleEffects.ts:24-32` (Particle interface)
- Modify: `src/renderer/src/lib/particleEffects.ts` (add computeWindFactor export, bottom of file)

- [ ] **Step 1: Extend the Particle interface with new fields**

In `src/renderer/src/lib/particleEffects.ts`, replace the existing `Particle` interface:

```ts
export interface Particle {
  x: number
  y: number
  vx: number // horizontal velocity
  vy: number // vertical velocity
  size: number // radius or length
  opacity: number // 0-1
  life: number // remaining life for ambient particles (frames)
  length: number // streak length (rain/drizzle)
  width: number // stroke width (rain/drizzle)
  pulsePhase: number // phase offset for glow oscillation (snow/ambient)
  wobbleAmp: number // wobble amplitude (snow heavy)
  twinkleSpeed: number // twinkle oscillation speed (ambient night)
  splashX: number // x position of last splash (rain heavy)
  splashLife: number // remaining splash animation frames (rain heavy)
}
```

- [ ] **Step 2: Add the WindFactor type and computeWindFactor function**

Add at the bottom of `src/renderer/src/lib/particleEffects.ts`, after the `drawParticle` function:

```ts
export interface WindFactor {
  dx: number // horizontal displacement per frame
}

export function computeWindFactor(
  windSpeed: number,
  windDirection: number,
  unit: 'mph' | 'kmh'
): WindFactor {
  const maxSpeed = unit === 'mph' ? 30 : 50
  const normalized = Math.min(windSpeed / maxSpeed, 1)
  // Wind direction: meteorological convention (where wind comes FROM)
  // 270 = from west = pushes east (+x), 90 = from east = pushes west (-x)
  const radians = (windDirection * Math.PI) / 180
  const dx = Math.sin(radians) * normalized * 1.5
  return { dx }
}
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: FAIL — `createParticle` return values are missing the new fields. This is expected; we fix it in Task 2.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/lib/particleEffects.ts
git commit -m "feat(particles): extend Particle interface and add wind factor helper"
```

---

### Task 2: Rewrite createParticle for All Effects

**Files:**
- Modify: `src/renderer/src/lib/particleEffects.ts:131-201` (createParticle function)

Replace the entire `createParticle` function body. Every return value now includes all Particle fields. Effects that don't use a field set it to `0`.

- [ ] **Step 1: Replace createParticle**

Replace the full `createParticle` function (lines 131-201) with:

```ts
export function createParticle(
  effect: ParticleEffect,
  canvasW: number,
  canvasH: number
): Particle {
  const rand = Math.random

  switch (effect) {
    case 'rain-light': {
      return {
        x: rand() * canvasW,
        y: rand() * canvasH,
        vx: 0.2,
        vy: 3 + rand() * 2,
        size: 1,
        opacity: 0.4 + rand() * 0.4,
        life: 0,
        length: 8 + rand() * 12,
        width: 0.8 + rand() * 0.5,
        pulsePhase: 0,
        wobbleAmp: 0,
        twinkleSpeed: 0,
        splashX: 0,
        splashLife: 0
      }
    }
    case 'rain-heavy':
    case 'thunder': {
      return {
        x: rand() * canvasW,
        y: rand() * canvasH,
        vx: 1.2,
        vy: 6 + rand() * 3,
        size: 1.5,
        opacity: 0.5 + rand() * 0.5,
        life: 0,
        length: 16 + rand() * 14,
        width: 1.2 + rand() * 1,
        pulsePhase: 0,
        wobbleAmp: 0,
        twinkleSpeed: 0,
        splashX: 0,
        splashLife: 0
      }
    }
    case 'drizzle': {
      return {
        x: rand() * canvasW,
        y: rand() * canvasH,
        vx: (rand() - 0.5) * 0.3,
        vy: 1.2 + rand(),
        size: 1,
        opacity: 0.3 + rand() * 0.3,
        life: 0,
        length: 3 + rand() * 4,
        width: 0.7,
        pulsePhase: 0,
        wobbleAmp: 0,
        twinkleSpeed: 0,
        splashX: 0,
        splashLife: 0
      }
    }
    case 'snow-light': {
      return {
        x: rand() * canvasW,
        y: rand() * canvasH,
        vx: 0,
        vy: 0.4 + rand() * 0.4,
        size: 1 + rand() * 1.5,
        opacity: 0.4 + rand() * 0.3,
        life: rand() * 1000,
        length: 0,
        width: 0,
        pulsePhase: rand() * Math.PI * 2,
        wobbleAmp: 0,
        twinkleSpeed: 0,
        splashX: 0,
        splashLife: 0
      }
    }
    case 'snow-heavy': {
      return {
        x: rand() * canvasW,
        y: rand() * canvasH,
        vx: 0,
        vy: 0.8 + rand() * 0.8,
        size: 2 + rand() * 3,
        opacity: 0.5 + rand() * 0.4,
        life: rand() * 1000,
        length: 0,
        width: 0,
        pulsePhase: rand() * Math.PI * 2,
        wobbleAmp: 0.5 + rand() * 1,
        twinkleSpeed: 0,
        splashX: 0,
        splashLife: 0
      }
    }
    case 'fog': {
      return {
        x: rand() * canvasW * 1.5 - canvasW * 0.25,
        y: canvasH * 0.2 + rand() * canvasH * 0.6,
        vx: 0.1 + rand() * 0.2,
        vy: 0,
        size: canvasW * 0.15 + rand() * canvasW * 0.2,
        opacity: 0.03 + rand() * 0.03,
        life: rand() * Math.PI * 2,
        length: 0,
        width: 0,
        pulsePhase: rand() * Math.PI * 2,
        wobbleAmp: 0,
        twinkleSpeed: 0,
        splashX: 0,
        splashLife: 0
      }
    }
    case 'ambient-day': {
      return {
        x: rand() * canvasW,
        y: canvasH * 0.3 + rand() * canvasH * 0.7,
        vx: (rand() - 0.5) * 0.2,
        vy: -0.1 - rand() * 0.15,
        size: 1 + rand() * 1.5,
        opacity: 0.3 + rand() * 0.4,
        life: 80 + Math.floor(rand() * 160),
        length: 0,
        width: 0,
        pulsePhase: rand() * Math.PI * 2,
        wobbleAmp: 0,
        twinkleSpeed: 0,
        splashX: 0,
        splashLife: 0
      }
    }
    case 'ambient-night': {
      return {
        x: rand() * canvasW,
        y: rand() * canvasH,
        vx: (rand() - 0.5) * 0.08,
        vy: (rand() - 0.5) * 0.08,
        size: 0.8 + rand() * 1.2,
        opacity: 0.2 + rand() * 0.5,
        life: 100 + Math.floor(rand() * 200),
        length: 0,
        width: 0,
        pulsePhase: rand() * Math.PI * 2,
        wobbleAmp: 0,
        twinkleSpeed: 0.02 + rand() * 0.04,
        splashX: 0,
        splashLife: 0
      }
    }
  }
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS — all Particle return values now include every field.

- [ ] **Step 3: Run tests**

Run: `npm run test`
Expected: PASS — `getEffectConfig` tests are unchanged, and `createParticle` has no tests asserting its shape.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/lib/particleEffects.ts
git commit -m "feat(particles): rewrite createParticle with per-effect visual parameters"
```

---

### Task 3: Rewrite updateParticle with Wind Support

**Files:**
- Modify: `src/renderer/src/lib/particleEffects.ts:207-277` (updateParticle function)

The function gains a `wind` parameter. Each effect applies wind influence at different scales. Rain heavy gets splash spawning. Fog uses radial blob wrapping. Ambient day floats upward.

- [ ] **Step 1: Replace updateParticle**

Replace the full `updateParticle` function with:

```ts
export function updateParticle(
  p: Particle,
  effect: ParticleEffect,
  canvasW: number,
  canvasH: number,
  wind: WindFactor
): void {
  switch (effect) {
    case 'rain-light':
      p.x += p.vx + wind.dx * 0.5
      p.y += p.vy
      if (p.y > canvasH + 10) {
        p.y = -10
        p.x = Math.random() * canvasW
        p.length = 8 + Math.random() * 12
        p.opacity = 0.4 + Math.random() * 0.4
      }
      if (p.x > canvasW + 10) p.x = -10
      if (p.x < -10) p.x = canvasW + 10
      break

    case 'rain-heavy':
    case 'thunder':
      // Decrement active splash
      if (p.splashLife > 0) p.splashLife -= 0.15
      p.x += p.vx + wind.dx * 0.8
      p.y += p.vy
      if (p.y > canvasH - 4) {
        // Spawn splash at impact point
        p.splashX = p.x
        p.splashLife = 6
        p.y = -10
        p.x = Math.random() * canvasW
        p.length = 16 + Math.random() * 14
        p.opacity = 0.5 + Math.random() * 0.5
      }
      if (p.x > canvasW + 10) p.x = -10
      if (p.x < -10) p.x = canvasW + 10
      break

    case 'drizzle':
      p.x += p.vx + wind.dx * 0.3
      p.y += p.vy
      if (p.y > canvasH + 5) {
        p.y = -5
        p.x = Math.random() * canvasW
        p.vx = (Math.random() - 0.5) * 0.3
      }
      if (p.x > canvasW + 10) p.x = -10
      if (p.x < -10) p.x = canvasW + 10
      break

    case 'snow-light':
      p.life += 1
      p.x += Math.sin(p.life * 0.03) * 0.4 + wind.dx * 0.4
      p.y += p.vy
      if (p.y > canvasH + 10) {
        p.y = -10
        p.x = Math.random() * canvasW
        p.life = Math.random() * 1000
      }
      if (p.x > canvasW + 10) p.x = -10
      if (p.x < -10) p.x = canvasW + 10
      break

    case 'snow-heavy':
      p.life += 1
      p.x += Math.sin(p.life * 0.025) * p.wobbleAmp + wind.dx * 0.6
      p.y += p.vy
      if (p.y > canvasH + 10) {
        p.y = -10
        p.x = Math.random() * canvasW
        p.life = Math.random() * 1000
      }
      if (p.x > canvasW + 10) p.x = -10
      if (p.x < -10) p.x = canvasW + 10
      break

    case 'fog':
      p.x += p.vx + wind.dx * 0.3
      p.y += Math.sin(p.life + p.pulsePhase) * 0.15
      p.life += 0.005
      if (p.x - p.size > canvasW) {
        p.x = -p.size
        p.y = canvasH * 0.2 + Math.random() * canvasH * 0.6
      }
      if (p.x + p.size < -p.size) {
        p.x = canvasW + p.size
        p.y = canvasH * 0.2 + Math.random() * canvasH * 0.6
      }
      break

    case 'ambient-day':
      p.x += p.vx
      p.y += p.vy
      p.life -= 1
      if (p.life < 30) {
        p.opacity = Math.max(0, p.opacity - 0.012)
      }
      if (
        p.life <= 0 ||
        p.x < 0 ||
        p.x > canvasW ||
        p.y < 0 ||
        p.y > canvasH
      ) {
        p.x = Math.random() * canvasW
        p.y = canvasH * 0.3 + Math.random() * canvasH * 0.7
        p.vx = (Math.random() - 0.5) * 0.2
        p.vy = -0.1 - Math.random() * 0.15
        p.opacity = 0.3 + Math.random() * 0.4
        p.life = 80 + Math.floor(Math.random() * 160)
      }
      break

    case 'ambient-night':
      p.x += p.vx
      p.y += p.vy
      p.life -= 1
      if (p.life < 30) {
        p.opacity = Math.max(0, p.opacity - 0.012)
      }
      if (
        p.life <= 0 ||
        p.x < 0 ||
        p.x > canvasW ||
        p.y < 0 ||
        p.y > canvasH
      ) {
        p.x = Math.random() * canvasW
        p.y = Math.random() * canvasH
        p.vx = (Math.random() - 0.5) * 0.08
        p.vy = (Math.random() - 0.5) * 0.08
        p.opacity = 0.2 + Math.random() * 0.5
        p.life = 100 + Math.floor(Math.random() * 200)
      }
      break
  }
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: FAIL — `WeatherParticles.tsx` calls `updateParticle` without the `wind` argument. This is expected and fixed in Task 5.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/lib/particleEffects.ts
git commit -m "feat(particles): rewrite updateParticle with wind support and splash lifecycle"
```

---

### Task 4: Rewrite drawParticle with Per-Effect Rendering

**Files:**
- Modify: `src/renderer/src/lib/particleEffects.ts:287-343` (drawParticle function)

The function gains a `frame` parameter for time-based effects. Each effect now has its own distinct rendering: rain uses variable-length streaks, snow uses radial gradients, fog uses radial blobs, ambient has glow halos and twinkle.

- [ ] **Step 1: Replace drawParticle**

Replace the full `drawParticle` function with:

```ts
export function drawParticle(
  ctx: CanvasRenderingContext2D,
  p: Particle,
  effect: ParticleEffect,
  config: EffectConfig,
  frame: number
): void {
  ctx.save()

  switch (effect) {
    case 'rain-light': {
      const windVx = p.vx
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(p.x + windVx * 2, p.y + p.length)
      ctx.strokeStyle = config.color
      ctx.lineWidth = p.width
      ctx.globalAlpha = p.opacity
      ctx.shadowColor = config.color
      ctx.shadowBlur = 3
      ctx.stroke()
      break
    }

    case 'rain-heavy':
    case 'thunder': {
      const windVx = p.vx
      // Draw rain streak
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(p.x + windVx * 2, p.y + p.length)
      ctx.strokeStyle = config.color
      ctx.lineWidth = p.width
      ctx.globalAlpha = p.opacity
      ctx.shadowColor = config.color
      ctx.shadowBlur = 5
      ctx.stroke()
      // Draw splash if active
      if (p.splashLife > 0) {
        const canvasH = ctx.canvas.height / (window.devicePixelRatio || 1)
        const progress = 1 - p.splashLife / 6
        ctx.globalAlpha = (1 - progress) * 0.6
        ctx.shadowBlur = 3
        ctx.fillStyle = config.color
        // Two dots arcing outward
        const spread = 2 + Math.random() * 3
        ctx.beginPath()
        ctx.arc(p.splashX - spread * progress * 3, canvasH - 2 - progress * 4, 1, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(p.splashX + spread * progress * 3, canvasH - 2 - progress * 4, 1, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }

    case 'drizzle': {
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(p.x + p.vx * 2, p.y + p.length)
      ctx.strokeStyle = config.color
      ctx.lineWidth = p.width
      ctx.globalAlpha = p.opacity
      ctx.shadowColor = config.color
      ctx.shadowBlur = 2
      ctx.stroke()
      break
    }

    case 'snow-light': {
      const pulse = 0.8 + Math.sin(p.life * 0.04 + p.pulsePhase) * 0.2
      // Soft glow halo
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.5)
      grad.addColorStop(0, config.color)
      grad.addColorStop(1, 'transparent')
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.globalAlpha = p.opacity * pulse * 0.4
      ctx.fill()
      // Core dot
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = config.color
      ctx.globalAlpha = p.opacity * pulse
      ctx.fill()
      break
    }

    case 'snow-heavy': {
      const pulse = 0.8 + Math.sin(p.life * 0.04 + p.pulsePhase) * 0.2
      // Large radial bloom
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3)
      grad.addColorStop(0, 'rgba(255,255,255,0.8)')
      grad.addColorStop(0.4, 'rgba(224,224,255,0.3)')
      grad.addColorStop(1, 'transparent')
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.globalAlpha = p.opacity * pulse * 0.5
      ctx.fill()
      // Core
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = config.color
      ctx.globalAlpha = p.opacity * pulse
      ctx.shadowColor = config.color
      ctx.shadowBlur = 6
      ctx.fill()
      break
    }

    case 'fog': {
      // Radial gradient blob
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size)
      grad.addColorStop(0, config.color)
      grad.addColorStop(0.5, config.color)
      grad.addColorStop(1, 'transparent')
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.globalAlpha = p.opacity
      ctx.fill()
      break
    }

    case 'ambient-day': {
      const pulse = 0.7 + Math.sin(frame * 0.03 + p.pulsePhase) * 0.3
      // Warm glow halo
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3)
      grad.addColorStop(0, config.color)
      grad.addColorStop(1, 'transparent')
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.globalAlpha = p.opacity * pulse * 0.3
      ctx.fill()
      // Core
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = config.color
      ctx.globalAlpha = p.opacity * pulse * 0.5
      ctx.shadowColor = config.color
      ctx.shadowBlur = 4
      ctx.fill()
      break
    }

    case 'ambient-night': {
      // Twinkle: squared sine for sharp peaks
      const twinkle = 0.3 + Math.pow(Math.sin(frame * p.twinkleSpeed + p.pulsePhase), 2) * 0.7
      let alpha = p.opacity * twinkle
      if (p.life < 30) alpha *= p.life / 30
      // Soft glow
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3)
      grad.addColorStop(0, config.color)
      grad.addColorStop(1, 'transparent')
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.globalAlpha = alpha * 0.3
      ctx.fill()
      // Core
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = config.color
      ctx.globalAlpha = alpha
      ctx.fill()
      // Cross-flare at peak brightness
      if (twinkle > 0.7) {
        ctx.globalAlpha = (twinkle - 0.7) * alpha * 1.5
        ctx.strokeStyle = config.color
        ctx.lineWidth = 0.5
        ctx.beginPath()
        ctx.moveTo(p.x - p.size * 2.5, p.y)
        ctx.lineTo(p.x + p.size * 2.5, p.y)
        ctx.moveTo(p.x, p.y - p.size * 2.5)
        ctx.lineTo(p.x, p.y + p.size * 2.5)
        ctx.stroke()
      }
      break
    }
  }

  ctx.restore()
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: FAIL — `WeatherParticles.tsx` calls `drawParticle` without the `frame` argument. Expected; fixed in Task 5.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/lib/particleEffects.ts
git commit -m "feat(particles): rewrite drawParticle with per-effect visual rendering"
```

---

### Task 5: Update WeatherParticles Component with Wind Props and Frame Counter

**Files:**
- Modify: `src/renderer/src/components/WeatherParticles.tsx`

Add `windSpeed`, `windDirection`, `windSpeedUnit` props. Add a `frameRef` counter. Wire `computeWindFactor` into the tick loop. Pass `wind` to `updateParticle` and `frame` to `drawParticle`.

- [ ] **Step 1: Replace WeatherParticles.tsx**

Replace the entire file content of `src/renderer/src/components/WeatherParticles.tsx`:

```tsx
import { useRef, useEffect } from 'react'
import {
  getEffectConfig,
  createParticle,
  updateParticle,
  drawParticle,
  computeWindFactor
} from '../lib/particleEffects'
import type { Particle } from '../lib/particleEffects'

interface WeatherParticlesProps {
  weatherCode: number
  isDay: boolean
  active: boolean
  windSpeed: number
  windDirection: number
  windSpeedUnit: 'mph' | 'kmh'
}

export function WeatherParticles({
  weatherCode,
  isDay,
  active,
  windSpeed,
  windDirection,
  windSpeedUnit
}: WeatherParticlesProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const particlesRef = useRef<Particle[]>([])
  const flashRef = useRef<number>(0)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = (): void => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = canvas.offsetWidth * dpr
      canvas.height = canvas.offsetHeight * dpr
      ctx.scale(dpr, dpr)
    }

    const observer = new ResizeObserver(resize)
    resize()
    observer.observe(canvas)

    if (!active) {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)
      particlesRef.current = []
      return () => {
        observer.disconnect()
      }
    }

    const config = getEffectConfig(weatherCode, isDay)
    const wind = computeWindFactor(windSpeed, windDirection, windSpeedUnit)

    particlesRef.current = Array.from({ length: config.particleCount }, () =>
      createParticle(config.effect, canvas.offsetWidth, canvas.offsetHeight)
    )

    flashRef.current = 0
    frameRef.current = 0

    const tick = (): void => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight

      frameRef.current += 1

      ctx.clearRect(0, 0, w, h)

      for (const p of particlesRef.current) {
        updateParticle(p, config.effect, w, h, wind)
        drawParticle(ctx, p, config.effect, config, frameRef.current)
      }

      ctx.shadowBlur = 0
      ctx.globalAlpha = 1.0

      // Lightning flash overlay for thunder effect
      if (config.effect === 'thunder' && flashRef.current > 0) {
        ctx.save()
        ctx.fillStyle = `rgba(200, 255, 255, ${flashRef.current * 0.15})`
        ctx.fillRect(0, 0, w, h)
        ctx.restore()
        flashRef.current -= 0.08
      }

      if (config.effect === 'thunder' && Math.random() < 0.0005) {
        flashRef.current = 1.0
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
      observer.disconnect()
    }
  }, [weatherCode, isDay, active, windSpeed, windDirection, windSpeedUnit])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.2, zIndex: 10 }}
    />
  )
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: FAIL — `WeatherPanel.tsx` doesn't pass the new props yet. Fixed in Task 6.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/WeatherParticles.tsx
git commit -m "feat(particles): add wind props and frame counter to WeatherParticles"
```

---

### Task 6: Pass Wind Data from WeatherPanel

**Files:**
- Modify: `src/renderer/src/components/WeatherPanel.tsx:151-155`

Pass the three new props from weather data and settings.

- [ ] **Step 1: Update the WeatherParticles usage**

In `src/renderer/src/components/WeatherPanel.tsx`, find the `<WeatherParticles` JSX (around line 151-155) and replace:

```tsx
        <WeatherParticles
          weatherCode={effectiveCode}
          isDay={effectiveIsDay}
          active={!fading}
        />
```

with:

```tsx
        <WeatherParticles
          weatherCode={effectiveCode}
          isDay={effectiveIsDay}
          active={!fading}
          windSpeed={weather.windSpeed}
          windDirection={weather.windDirection}
          windSpeedUnit={settings.windSpeedUnit}
        />
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS — all three files now agree on types.

- [ ] **Step 3: Run tests**

Run: `npm run test`
Expected: PASS — all 58 tests pass.

- [ ] **Step 4: Run lint**

Run: `npm run lint`
Expected: PASS (or only pre-existing warnings).

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/components/WeatherPanel.tsx
git commit -m "feat(particles): pass wind data to WeatherParticles from WeatherPanel"
```

---

### Task 7: Visual Verification

**Files:** None (testing only)

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Test each effect via DEV toolbar**

Open the app. Use the DEV weather code override dropdown (bottom-right corner) to cycle through each effect and verify visually:

1. **Clear (day)** — golden motes with pulsing glow, floating upward
2. **Clear (night)** — twinkling blue-white stars with cross-flare
3. **Fog (WMO 45)** — soft radial gradient blobs drifting, not rectangles
4. **Drizzle light (WMO 51)** — short near-vertical dashes, clearly different from rain
5. **Rain light (WMO 61)** — thin varied-length streaks, near-vertical
6. **Rain heavy (WMO 65)** — thicker longer streaks, splash dots at bottom
7. **Snow light (WMO 71)** — soft glow dots with subtle pulse
8. **Snow heavy (WMO 75)** — larger bloom flakes, wider wobble
9. **Thunderstorm (WMO 95)** — heavy rain rendering + lightning flashes

Verify: light and heavy variants are visually distinct in every pair.

- [ ] **Step 3: Confirm wind subtlety**

With real weather data (not override), observe that particles have a slight directional bias matching the displayed wind direction. The effect should be noticeable but not dramatic.
