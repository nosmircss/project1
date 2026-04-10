// Particle effects engine for weather-driven canvas animations.
// WMO code ranges mirror weatherCodeMap.ts range-comparison pattern exactly.
// Per RESEARCH.md: uses HTML Canvas 2D with requestAnimationFrame, zero new dependencies.

export type ParticleEffect =
  | 'rain-light'
  | 'rain-heavy'
  | 'drizzle'
  | 'snow-light'
  | 'snow-heavy'
  | 'fog'
  | 'thunder'
  | 'ambient-day'
  | 'ambient-night'

export interface EffectConfig {
  effect: ParticleEffect
  particleCount: number // 0-120 per D-04
  speed: number // px/frame baseline
  color: string // hex from neon theme tokens
  glowSize: number // ctx.shadowBlur value
}

export interface Particle {
  x: number
  y: number
  vx: number // horizontal velocity
  vy: number // vertical velocity
  size: number // radius or length
  opacity: number // 0-1
  life: number // remaining life for ambient particles (frames)
}

// Neon theme color tokens from src/renderer/src/styles/main.css
const NEON_CYAN = '#00f0ff' // --color-neon-cyan
const WARNING = '#ffaa00' // --color-warning (ambient day / golden motes)
const TEXT_PRIMARY = '#e0e0ff' // --color-text-primary (ambient night / snow light)
const SNOW_WHITE = '#ffffff' // heavy snow

/**
 * Maps a WMO weather code and day/night flag to a particle effect configuration.
 * Uses the same range-comparison pattern as weatherCodeMap.ts to safely handle
 * WMO gap codes (4-44, 58-60, 68-70, 78-79, 83-84, 87-94).
 */
export function getEffectConfig(weatherCode: number, isDay: boolean): EffectConfig {
  // 0: Clear sky
  if (weatherCode === 0) {
    return isDay
      ? { effect: 'ambient-day', particleCount: 20, speed: 0.3, color: WARNING, glowSize: 4 }
      : { effect: 'ambient-night', particleCount: 30, speed: 0.1, color: TEXT_PRIMARY, glowSize: 3 }
  }

  // 1-2: Mainly clear / partly cloudy
  if (weatherCode <= 2) {
    return isDay
      ? { effect: 'ambient-day', particleCount: 15, speed: 0.3, color: WARNING, glowSize: 4 }
      : { effect: 'ambient-night', particleCount: 25, speed: 0.1, color: TEXT_PRIMARY, glowSize: 3 }
  }

  // 3: Overcast — fewer ambient particles, dimmer glow
  if (weatherCode === 3) {
    return isDay
      ? { effect: 'ambient-day', particleCount: 10, speed: 0.2, color: WARNING, glowSize: 2 }
      : { effect: 'ambient-night', particleCount: 12, speed: 0.1, color: TEXT_PRIMARY, glowSize: 2 }
  }

  // 4-48: Fog (handles WMO gap codes 4-44 safely; 45 and 48 are actual fog codes)
  if (weatherCode <= 48) {
    return { effect: 'fog', particleCount: 10, speed: 0.2, color: NEON_CYAN, glowSize: 8 }
  }

  // 51-53: Drizzle light
  if (weatherCode <= 53) {
    return { effect: 'drizzle', particleCount: 30, speed: 2.0, color: NEON_CYAN, glowSize: 4 }
  }

  // 54-57: Drizzle heavy
  if (weatherCode <= 57) {
    return { effect: 'drizzle', particleCount: 60, speed: 3.0, color: NEON_CYAN, glowSize: 5 }
  }

  // 58-63: Rain light (handles gap codes 58-60; 61-63 are actual light rain codes)
  if (weatherCode <= 63) {
    return { effect: 'rain-light', particleCount: 50, speed: 4.0, color: NEON_CYAN, glowSize: 5 }
  }

  // 64-67: Rain heavy
  if (weatherCode <= 67) {
    return { effect: 'rain-heavy', particleCount: 100, speed: 6.0, color: NEON_CYAN, glowSize: 6 }
  }

  // 68-73: Snow light (handles gap codes 68-70; 71-73 are actual light snow codes)
  if (weatherCode <= 73) {
    return { effect: 'snow-light', particleCount: 40, speed: 0.8, color: TEXT_PRIMARY, glowSize: 4 }
  }

  // 74-77: Snow heavy
  if (weatherCode <= 77) {
    return { effect: 'snow-heavy', particleCount: 80, speed: 1.2, color: SNOW_WHITE, glowSize: 5 }
  }

  // 78-80: Showers light (handles gap codes 78-79; 80 is actual light shower)
  if (weatherCode <= 80) {
    return { effect: 'rain-light', particleCount: 60, speed: 4.0, color: NEON_CYAN, glowSize: 5 }
  }

  // 81-82: Showers heavy
  if (weatherCode <= 82) {
    return { effect: 'rain-heavy', particleCount: 90, speed: 6.0, color: NEON_CYAN, glowSize: 6 }
  }

  // 83-84: Snow showers light (gap codes 83-84 handled by range)
  if (weatherCode <= 84) {
    return { effect: 'snow-light', particleCount: 50, speed: 0.8, color: TEXT_PRIMARY, glowSize: 4 }
  }

  // 85-86: Snow showers heavy
  if (weatherCode <= 86) {
    return { effect: 'snow-heavy', particleCount: 70, speed: 1.2, color: SNOW_WHITE, glowSize: 5 }
  }

  // 87+: Thunderstorm (catches 95-99 and any unexpected high codes)
  return { effect: 'thunder', particleCount: 110, speed: 7.0, color: NEON_CYAN, glowSize: 8 }
}

/**
 * Creates a new particle for the given effect type.
 * Spawn position depends on effect: rain/drizzle/snow fall from top,
 * fog drifts from left edge, ambient particles start at random positions.
 */
export function createParticle(
  effect: ParticleEffect,
  canvasW: number,
  canvasH: number
): Particle {
  const rand = Math.random

  switch (effect) {
    case 'rain-light':
    case 'rain-heavy':
    case 'thunder': {
      const speed = effect === 'rain-heavy' || effect === 'thunder' ? 6 : 4
      return {
        x: rand() * canvasW,
        y: -10,
        vx: speed * 0.15,
        vy: speed,
        size: 1.5,
        opacity: 0.7 + rand() * 0.3,
        life: 0
      }
    }
    case 'drizzle': {
      return {
        x: rand() * canvasW,
        y: -10,
        vx: 2 * 0.1,
        vy: 2 + rand(),
        size: 1,
        opacity: 0.5 + rand() * 0.3,
        life: 0
      }
    }
    case 'snow-light':
    case 'snow-heavy': {
      const life = rand() * 1000
      return {
        x: rand() * canvasW,
        y: -10,
        vx: 0,
        vy: effect === 'snow-heavy' ? 1.2 : 0.8,
        size: effect === 'snow-heavy' ? 2 + rand() * 2 : 1.5 + rand() * 1.5,
        opacity: 0.6 + rand() * 0.4,
        life
      }
    }
    case 'fog': {
      return {
        x: -canvasW * 0.4,
        y: rand() * canvasH,
        vx: 0.2,
        vy: 0,
        size: 3,
        opacity: 0.06 + rand() * 0.02,
        life: 0
      }
    }
    case 'ambient-day':
    case 'ambient-night': {
      return {
        x: rand() * canvasW,
        y: rand() * canvasH,
        vx: (rand() - 0.5) * 0.3,
        vy: (rand() - 0.5) * 0.3,
        size: 1 + rand() * 1.5,
        opacity: 0.3 + rand() * 0.4,
        life: 60 + Math.floor(rand() * 120)
      }
    }
  }
}

/**
 * Updates particle position in-place for the next frame.
 * Wraps particles that leave the canvas back to their spawn position.
 */
export function updateParticle(
  p: Particle,
  effect: ParticleEffect,
  canvasW: number,
  canvasH: number
): void {
  switch (effect) {
    case 'rain-light':
    case 'rain-heavy':
    case 'thunder':
    case 'drizzle':
      p.x += p.vx
      p.y += p.vy
      // Wrap: respawn from top when it exits the bottom
      if (p.y > canvasH + 10) {
        p.y = -10
        p.x = Math.random() * canvasW
      }
      // Wrap horizontal edges
      if (p.x > canvasW + 10) p.x = -10
      break

    case 'snow-light':
    case 'snow-heavy':
      // Snow wobbles horizontally via sine wave on life counter
      p.life += 1
      p.x += Math.sin(p.life * 0.05) * 0.5
      p.y += p.vy
      if (p.y > canvasH + 10) {
        p.y = -10
        p.x = Math.random() * canvasW
        p.life = Math.random() * 1000
      }
      break

    case 'fog':
      p.x += p.vx
      // Wrap fog layers: once fully across, reset to left
      if (p.x > canvasW) {
        p.x = -canvasW * 0.4
        p.y = Math.random() * canvasH
      }
      break

    case 'ambient-day':
    case 'ambient-night':
      p.x += p.vx
      p.y += p.vy
      p.life -= 1
      // Fade out near end of life
      if (p.life < 30) {
        p.opacity = Math.max(0, p.opacity - 0.01)
      }
      // Respawn when life is exhausted or exits canvas
      if (
        p.life <= 0 ||
        p.x < 0 ||
        p.x > canvasW ||
        p.y < 0 ||
        p.y > canvasH
      ) {
        p.x = Math.random() * canvasW
        p.y = Math.random() * canvasH
        p.vx = (Math.random() - 0.5) * 0.3
        p.vy = (Math.random() - 0.5) * 0.3
        p.opacity = 0.3 + Math.random() * 0.4
        p.life = 60 + Math.floor(Math.random() * 120)
      }
      break
  }
}

/**
 * Draws a single particle onto the canvas context.
 * Each effect uses its own visual style:
 *   Rain/drizzle: thin diagonal streak with neon glow
 *   Snow: soft dot with bloom
 *   Fog: translucent horizontal rectangle
 *   Ambient: small glowing mote
 */
export function drawParticle(
  ctx: CanvasRenderingContext2D,
  p: Particle,
  effect: ParticleEffect,
  config: EffectConfig
): void {
  ctx.save()

  switch (effect) {
    case 'rain-light':
    case 'rain-heavy':
    case 'thunder':
    case 'drizzle':
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(p.x + p.vx * 3, p.y + p.vy * 3)
      ctx.strokeStyle = config.color
      ctx.lineWidth = effect === 'drizzle' ? 1 : 1.5
      ctx.globalAlpha = p.opacity
      ctx.shadowColor = config.color
      ctx.shadowBlur = config.glowSize
      ctx.stroke()
      break

    case 'snow-light':
    case 'snow-heavy':
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = config.color
      ctx.globalAlpha = p.opacity
      ctx.shadowColor = config.color
      ctx.shadowBlur = config.glowSize
      ctx.fill()
      break

    case 'fog': {
      const canvasEl = ctx.canvas
      ctx.fillStyle = config.color
      ctx.globalAlpha = p.opacity
      ctx.fillRect(p.x, p.y, canvasEl.offsetWidth * 0.4, p.size)
      break
    }

    case 'ambient-day':
    case 'ambient-night':
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = config.color
      ctx.globalAlpha = p.opacity * (effect === 'ambient-day' ? 0.4 : 0.3)
      ctx.shadowColor = config.color
      ctx.shadowBlur = config.glowSize
      ctx.fill()
      break
  }

  ctx.restore()
}
