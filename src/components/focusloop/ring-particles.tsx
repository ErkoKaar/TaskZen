"use client"

import { useEffect, useRef } from "react"

type Phase = "focus" | "rest" | "idle"

// Fraction of the ring container's width the stroke's circumference sits at
// (radius / size from timer-ring.tsx: (320 - 12) / 2 / 320).
const RING_RADIUS_FRACTION = 0.48125

// Dots can drift up to `band` px past the ring radius, plus their own glow
// radius (size * 5, up to ~12px) — without headroom the canvas clips that
// straight off at its own rectangular edge, most visible in the dense focus
// phase (band: 20). Pad the canvas well past the widest possible reach.
const CANVAS_PADDING = 48

const PHASE_CONFIG: Record<Phase, { count: number; band: number; rotationSpeed: number }> = {
  idle: { count: 420, band: 10, rotationSpeed: 0.02 },
  rest: { count: 220, band: 16, rotationSpeed: 0.05 },
  focus: { count: 700, band: 20, rotationSpeed: 0.09 },
}

type Dot = {
  angle: number
  radiusOffset: number
  size: number
  baseAlpha: number
  twinklePhase: number
  twinkleSpeed: number
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

// Canvas fillStyle can't resolve `var(--x)` itself, unlike a real CSS
// property, so read the custom property's actual value off the root.
function resolveColor(value: string): string {
  const match = value.match(/^var\((--[\w-]+)\)$/)
  if (!match) return value
  const resolved = getComputedStyle(document.documentElement).getPropertyValue(match[1]).trim()
  return resolved || value
}

function makeDot(band: number): Dot {
  return {
    angle: randomBetween(0, Math.PI * 2),
    // Averaging two randoms biases offsets toward the ring line (denser
    // core, sparser fringe) instead of a flat uniform band.
    radiusOffset: (randomBetween(-1, 1) + randomBetween(-1, 1)) * 0.5 * band,
    size: randomBetween(0.6, 2.4),
    baseAlpha: randomBetween(0.35, 1),
    twinklePhase: randomBetween(0, Math.PI * 2),
    twinkleSpeed: randomBetween(1.2, 3.2),
  }
}

export function RingParticles({ phase, color }: { phase: Phase; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = canvas?.parentElement
    if (!canvas || !container) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const config = PHASE_CONFIG[phase]
    const dots: Dot[] = Array.from({ length: config.count }, () => makeDot(config.band))
    const resolvedColor = resolveColor(color)

    let width = 0
    let height = 0
    let ringRadius = 0

    function resize() {
      const dpr = window.devicePixelRatio || 1
      width = container!.clientWidth
      height = container!.clientHeight
      ringRadius = width * RING_RADIUS_FRACTION
      const canvasWidth = width + CANVAS_PADDING * 2
      const canvasHeight = height + CANVAS_PADDING * 2
      canvas!.width = canvasWidth * dpr
      canvas!.height = canvasHeight * dpr
      canvas!.style.width = `${canvasWidth}px`
      canvas!.style.height = `${canvasHeight}px`
      canvas!.style.left = `${-CANVAS_PADDING}px`
      canvas!.style.top = `${-CANVAS_PADDING}px`
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener("resize", resize)

    let rafId: number
    let rotation = 0

    function draw(time: number) {
      const canvasWidth = width + CANVAS_PADDING * 2
      const canvasHeight = height + CANVAS_PADDING * 2
      ctx!.clearRect(0, 0, canvasWidth, canvasHeight)
      ctx!.globalCompositeOperation = "lighter"

      const cx = canvasWidth / 2
      const cy = canvasHeight / 2

      for (const dot of dots) {
        const r = ringRadius + dot.radiusOffset
        const angle = dot.angle + rotation
        const x = cx + Math.cos(angle) * r
        const y = cy + Math.sin(angle) * r
        const twinkle = reduceMotion
          ? 1
          : 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(time * 0.001 * dot.twinkleSpeed + dot.twinklePhase))
        const alpha = dot.baseAlpha * twinkle

        const glowRadius = dot.size * 5
        const gradient = ctx!.createRadialGradient(x, y, 0, x, y, glowRadius)
        gradient.addColorStop(0, resolvedColor)
        gradient.addColorStop(1, "transparent")
        ctx!.globalAlpha = alpha * 0.5
        ctx!.fillStyle = gradient
        ctx!.beginPath()
        ctx!.arc(x, y, glowRadius, 0, Math.PI * 2)
        ctx!.fill()

        ctx!.globalAlpha = alpha
        ctx!.fillStyle = resolvedColor
        ctx!.beginPath()
        ctx!.arc(x, y, dot.size, 0, Math.PI * 2)
        ctx!.fill()
      }

      ctx!.globalAlpha = 1

      if (!reduceMotion) {
        rotation += config.rotationSpeed * 0.016
        rafId = requestAnimationFrame(draw)
      }
    }
    rafId = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener("resize", resize)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [phase, color])

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <canvas ref={canvasRef} className="absolute" />
    </div>
  )
}
