"use client"

import { formatClock } from "@/lib/focusloop/data"
import { RingParticles } from "@/components/focusloop/ring-particles"
import { cn } from "@/lib/utils"

type TimerRingProps = {
  progress: number // 0..1 remaining
  secondsLeft: number
  phase: "focus" | "rest" | "idle"
  roundLabel: string
}

export function TimerRing({
  progress,
  secondsLeft,
  phase,
  roundLabel,
}: TimerRingProps) {
  const size = 320
  const stroke = 12
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dash = circumference * progress

  const ringColor = phase === "rest" ? "var(--accent)" : "var(--primary)"
  const gradientId = `ring-gradient-${phase}`

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[320px] lg:max-w-[400px] xl:max-w-[460px]">
      {/* Ambient glow behind the ring, breathing gently while a session runs.
          A radial-gradient fade (not a blur() filter) — WebKit's rasterization
          of large blur filters combined with an animated transform on the
          same layer intermittently showed rectangular seams around the ring. */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-700",
          phase !== "idle" && "motion-safe:animate-[pulse-glow_4s_ease-in-out_infinite]",
        )}
        style={{
          background: `radial-gradient(circle, ${ringColor} 0%, transparent 65%)`,
          opacity: phase === "idle" ? 0.16 : 0.4,
        }}
      />

      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="relative h-full w-full -rotate-90"
        role="img"
        aria-label={`${phase} timer, ${formatClock(secondsLeft)} remaining`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={ringColor} stopOpacity="0.6" />
            <stop offset="100%" stopColor={ringColor} stopOpacity="1" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--secondary)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          className="transition-[stroke-dasharray] duration-500 ease-linear"
        />
      </svg>

      <RingParticles phase={phase} color={ringColor} />

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <span
          className="rounded-full px-4 py-1.5 text-base font-semibold uppercase tracking-[0.2em]"
          style={{
            color: ringColor,
            backgroundColor: `color-mix(in oklch, ${ringColor} 15%, transparent)`,
          }}
        >
          {phase === "idle" ? "Ready" : phase === "focus" ? "Focus" : "Rest"}
        </span>
        <span className="font-mono text-6xl font-bold tabular-nums text-foreground sm:text-7xl lg:text-7xl xl:text-8xl">
          {formatClock(secondsLeft)}
        </span>
        <span className="text-lg text-muted-foreground">{roundLabel}</span>
      </div>
    </div>
  )
}
