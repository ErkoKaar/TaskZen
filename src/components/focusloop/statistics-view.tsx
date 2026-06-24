"use client"

import { useEffect, useState } from "react"
import { Award, Clock, Flame, Medal, Trophy } from "lucide-react"
import { TIME_RANGES, type TimeRange, formatDuration } from "@/lib/focusloop/data"
import { getStats, type ActivityStat } from "@/lib/focusloop/sessions"
import { cn } from "@/lib/utils"

const MEDALS = [
  { icon: Trophy, color: "var(--gold)", label: "1st" },
  { icon: Medal, color: "var(--silver)", label: "2nd" },
  { icon: Award, color: "var(--bronze)", label: "3rd" },
]

export function StatisticsView() {
  const [range, setRange] = useState<TimeRange>("week")
  const [stats, setStats] = useState<ActivityStat[]>([])

  useEffect(() => {
    getStats(range)
      .then(setStats)
      .catch((err) => console.error("Failed to load statistics", err))
  }, [range])

  const total = stats.reduce((sum, s) => sum + s.minutes, 0)
  const max = Math.max(...stats.map((s) => s.minutes), 1)
  const top3 = stats.slice(0, 3)
  const rest = stats.slice(3)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      {/* Range filter */}
      <div className="flex flex-wrap gap-1 rounded-2xl border border-border bg-card p-1">
        {TIME_RANGES.map((r) => (
          <button
            key={r.id}
            onClick={() => setRange(r.id)}
            className={cn(
              "flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              range === r.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SummaryTile
          icon={Clock}
          label="Total focus"
          value={formatDuration(total)}
        />
        <SummaryTile
          icon={Flame}
          label="Activities"
          value={String(stats.length)}
        />
        <SummaryTile
          icon={Trophy}
          label="Top activity"
          value={top3[0]?.activity.name ?? "—"}
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {/* Top 3 podium */}
      <div className="grid gap-3 sm:grid-cols-3">
        {top3.map((s, i) => {
          const Icon = MEDALS[i].icon
          return (
            <div
              key={s.activity.id}
              className="relative overflow-hidden rounded-2xl border border-border bg-card p-4"
              style={{
                boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${MEDALS[i].color} 30%, transparent)`,
              }}
            >
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5" style={{ color: MEDALS[i].color }} />
                <span
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: MEDALS[i].color }}
                >
                  {MEDALS[i].label}
                </span>
              </div>
              <p className="mt-3 truncate text-lg font-semibold text-foreground">
                {s.activity.name}
              </p>
              <p className="font-mono text-sm tabular-nums text-muted-foreground">
                {formatDuration(s.minutes)}
              </p>
            </div>
          )
        })}
      </div>

      {/* Bar chart */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-medium text-muted-foreground">
          Focus time by activity
        </h3>
        <div className="flex flex-col gap-3">
          {stats.map((s) => (
            <div key={s.activity.id} className="flex items-center gap-3">
              <span className="w-28 shrink-0 truncate text-sm text-foreground">
                {s.activity.name}
              </span>
              <div className="h-7 flex-1 overflow-hidden rounded-lg bg-secondary">
                <div
                  className="flex h-full items-center justify-end rounded-lg px-2 transition-[width] duration-500"
                  style={{
                    width: `${Math.max((s.minutes / max) * 100, 6)}%`,
                    backgroundColor: s.activity.color,
                  }}
                >
                  <span className="font-mono text-xs font-medium tabular-nums text-background">
                    {formatDuration(s.minutes)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Remaining list */}
      {rest.length > 0 && (
        <div className="rounded-2xl border border-border bg-card">
          {rest.map((s, i) => (
            <div
              key={s.activity.id}
              className={cn(
                "flex items-center justify-between px-4 py-3",
                i !== rest.length - 1 && "border-b border-border",
              )}
            >
              <span className="flex items-center gap-3">
                <span className="w-6 text-center font-mono text-sm text-muted-foreground">
                  {i + 4}
                </span>
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: s.activity.color }}
                />
                <span className="text-sm font-medium text-foreground">
                  {s.activity.name}
                </span>
              </span>
              <span className="font-mono text-sm tabular-nums text-muted-foreground">
                {formatDuration(s.minutes)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ElementType
  label: string
  value: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-4",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="mt-2 truncate text-xl font-semibold text-foreground">
        {value}
      </p>
    </div>
  )
}
