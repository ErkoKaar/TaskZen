"use client"

import { formatClock } from "@/lib/focusloop/data"

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
  const size = 300
  const stroke = 14
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dash = circumference * progress

  const ringColor =
    phase === "rest" ? "var(--accent)" : "var(--primary)"

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[300px]">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-full w-full -rotate-90"
        role="img"
        aria-label={`${phase} timer, ${formatClock(secondsLeft)} remaining`}
      >
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
          stroke={ringColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          className="transition-[stroke-dasharray] duration-500 ease-linear"
          style={{ filter: "drop-shadow(0 0 8px color-mix(in oklch, " + ringColor + " 45%, transparent))" }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <span
          className="text-xs font-medium uppercase tracking-[0.2em]"
          style={{ color: ringColor }}
        >
          {phase === "idle"
            ? "Ready"
            : phase === "focus"
              ? "Focus"
              : "Rest"}
        </span>
        <span className="font-mono text-5xl font-semibold tabular-nums text-foreground sm:text-6xl">
          {formatClock(secondsLeft)}
        </span>
        <span className="text-sm text-muted-foreground">{roundLabel}</span>
      </div>
    </div>
  )
}
