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
  length: number // streak length (rain/drizzle)
  width: number // stroke width (rain/drizzle)
  pulsePhase: number // phase offset for glow oscillation (snow/ambient)
  wobbleAmp: number // wobble amplitude (snow heavy)
  twinkleSpeed: number // twinkle oscillation speed (ambient night)
  splashX: number // x position of last splash (rain heavy)
  splashLife: number // remaining splash animation frames (rain heavy)
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

/**
 * Updates particle position in-place for the next frame.
 * Wraps particles that leave the canvas back to their spawn position.
 */
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
      if (p.splashLife > 0) p.splashLife -= 0.15
      p.x += p.vx + wind.dx * 0.8
      p.y += p.vy
      if (p.y > canvasH - 4) {
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

/**
 * Draws a single particle onto the canvas context.
 * Each effect uses its own visual style:
 *   Rain/drizzle: thin diagonal streak with neon glow
 *   Snow: soft dot with bloom
 *   Fog: translucent radial gradient blob
 *   Ambient: small glowing mote
 */
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
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(p.x + windVx * 2, p.y + p.length)
      ctx.strokeStyle = config.color
      ctx.lineWidth = p.width
      ctx.globalAlpha = p.opacity
      ctx.shadowColor = config.color
      ctx.shadowBlur = 5
      ctx.stroke()
      if (p.splashLife > 0) {
        const canvasH = ctx.canvas.height / (window.devicePixelRatio || 1)
        const progress = 1 - p.splashLife / 6
        ctx.globalAlpha = (1 - progress) * 0.6
        ctx.shadowBlur = 3
        ctx.fillStyle = config.color
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
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.5)
      grad.addColorStop(0, config.color)
      grad.addColorStop(1, 'transparent')
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.globalAlpha = p.opacity * pulse * 0.4
      ctx.fill()
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = config.color
      ctx.globalAlpha = p.opacity * pulse
      ctx.fill()
      break
    }

    case 'snow-heavy': {
      const pulse = 0.8 + Math.sin(p.life * 0.04 + p.pulsePhase) * 0.2
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3)
      grad.addColorStop(0, 'rgba(255,255,255,0.8)')
      grad.addColorStop(0.4, 'rgba(224,224,255,0.3)')
      grad.addColorStop(1, 'transparent')
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.globalAlpha = p.opacity * pulse * 0.5
      ctx.fill()
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
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3)
      grad.addColorStop(0, config.color)
      grad.addColorStop(1, 'transparent')
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.globalAlpha = p.opacity * pulse * 0.3
      ctx.fill()
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
      const twinkle = 0.3 + Math.pow(Math.sin(frame * p.twinkleSpeed + p.pulsePhase), 2) * 0.7
      let alpha = p.opacity * twinkle
      if (p.life < 30) alpha *= p.life / 30
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3)
      grad.addColorStop(0, config.color)
      grad.addColorStop(1, 'transparent')
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.globalAlpha = alpha * 0.3
      ctx.fill()
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = config.color
      ctx.globalAlpha = alpha
      ctx.fill()
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
  const radians = (windDirection * Math.PI) / 180
  const dx = Math.sin(radians) * normalized * 1.5
  return { dx }
}
