"use client"

import type { Criticality } from "@/lib/tasks/projects-store"

export const CRITICALITY_COLORS: Record<Criticality, string> = {
  critical: "#ef4444",
  warning: "#fbbf24",
  on_track: "#10b981",
}

const OPTIONS: { value: Criticality; label: string; hex: string; glow: string }[] = [
  { value: "critical", label: "Critical", hex: CRITICALITY_COLORS.critical, glow: "rgba(239,68,68,0.5)" },
  { value: "warning",  label: "Warning",  hex: CRITICALITY_COLORS.warning, glow: "rgba(251,191,36,0.5)" },
  { value: "on_track", label: "On track", hex: CRITICALITY_COLORS.on_track, glow: "rgba(16,185,129,0.5)" },
]

export function CriticalityPicker({
  value,
  onChange,
}: {
  value: Criticality
  onChange: (value: Criticality) => void
}) {
  return (
    <div className="flex items-center gap-2" role="radiogroup" aria-label="Criticality">
      {OPTIONS.map((opt) => {
        const selected = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={opt.label}
            title={opt.label}
            onClick={() => onChange(opt.value)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition-transform hover:scale-110"
          >
            <span
              className="rounded-full transition-all"
              style={
                selected
                  ? {
                      width: 19,
                      height: 19,
                      backgroundColor: opt.hex,
                      boxShadow: `0 0 7px 1px ${opt.glow}`,
                    }
                  : {
                      width: 17,
                      height: 17,
                      backgroundColor: `${opt.hex}33`,
                      border: `2px solid ${opt.hex}`,
                    }
              }
            />
          </button>
        )
      })}
    </div>
  )
}
