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
  active: boolean // false during location switch crossfade — pauses and clears particles per D-11
  windSpeed?: number
  windDirection?: number
  windUnit?: 'mph' | 'kmh'
}

/**
 * Canvas overlay component that renders weather-driven particle animations.
 *
 * Mounts as position:absolute over its parent (parent must have position:relative).
 * Drives a requestAnimationFrame loop — cleanup in useEffect return cancels the
 * loop to prevent CPU accumulation (per STATE.md concern and RESEARCH.md Pitfall 1).
 *
 * All animation state lives in useRefs — never triggers React re-renders.
 */
export function WeatherParticles({
  weatherCode,
  isDay,
  active,
  windSpeed = 0,
  windDirection = 0,
  windUnit = 'mph'
}: WeatherParticlesProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const particlesRef = useRef<Particle[]>([])
  const flashRef = useRef<number>(0) // lightning flash intensity for thunder effect (D-08)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Canvas sizing with HiDPI support (per RESEARCH.md Pitfall 2)
    const resize = (): void => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = canvas.offsetWidth * dpr
      canvas.height = canvas.offsetHeight * dpr
      ctx.scale(dpr, dpr)
    }

    const observer = new ResizeObserver(resize)
    resize()
    observer.observe(canvas)

    // When inactive (location switch crossfade) — clear canvas, do not start loop
    if (!active) {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)
      particlesRef.current = []
      return () => {
        observer.disconnect()
      }
    }

    // Derive effect configuration from current weather state
    const config = getEffectConfig(weatherCode, isDay)

    // Initialize particle pool — created once, mutated in-place each frame
    particlesRef.current = Array.from({ length: config.particleCount }, () =>
      createParticle(config.effect, canvas.offsetWidth, canvas.offsetHeight)
    )

    // Reset flash state when effect changes
    flashRef.current = 0

    const wind = computeWindFactor(windSpeed, windDirection, windUnit)

    const tick = (): void => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      const frame = frameRef.current++

      ctx.clearRect(0, 0, w, h)

      // Set glow once per batch (not per particle — per RESEARCH.md Pitfall 6)
      ctx.shadowColor = config.color
      ctx.shadowBlur = config.glowSize

      // Update and draw all particles
      for (const p of particlesRef.current) {
        updateParticle(p, config.effect, w, h, wind)
        drawParticle(ctx, p, config.effect, config, frame)
      }

      // Reset shadow and alpha after batch draw
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1.0

      // Lightning flash overlay for thunder effect (D-08)
      if (config.effect === 'thunder' && flashRef.current > 0) {
        ctx.save()
        ctx.fillStyle = `rgba(200, 255, 255, ${flashRef.current * 0.15})`
        ctx.fillRect(0, 0, w, h)
        ctx.restore()
        flashRef.current -= 0.08 // decay per frame (~12 frames / 0.2s at 60fps)
      }

      // Random lightning trigger — ~every 1.8s average at 60fps (0.0005 * 60 = ~1/33s... ~every 3s)
      if (config.effect === 'thunder' && Math.random() < 0.0005) {
        flashRef.current = 1.0
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    // Start animation loop
    rafRef.current = requestAnimationFrame(tick)

    // CRITICAL cleanup: cancel RAF to prevent CPU accumulation on unmount or prop change
    return () => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
      observer.disconnect()
    }
  }, [weatherCode, isDay, active, windSpeed, windDirection, windUnit])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.2, zIndex: 10 }}
    />
  )
}
