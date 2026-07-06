"use client"

import { useEffect, useState } from "react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts"
import { Award, Medal, Trophy } from "lucide-react"
import { TIME_RANGES, type TimeRange, formatDayLabel, formatDuration } from "@/lib/focusloop/data"
import { getStats, getDailyStats, type ActivityStat, type DailyTotal } from "@/lib/focusloop/sessions"
import { cn } from "@/lib/utils"

const MEDALS = [
  { icon: Trophy, color: "var(--gold)" },
  { icon: Medal, color: "var(--silver)" },
  { icon: Award, color: "var(--bronze)" },
]

export function StatisticsView() {
  const [range, setRange] = useState<TimeRange>("week")
  const [stats, setStats] = useState<ActivityStat[]>([])
  const [days, setDays] = useState<DailyTotal[]>([])
  const [sessionCount, setSessionCount] = useState(0)

  useEffect(() => {
    getStats(range)
      .then(setStats)
      .catch((err) => console.error("Failed to load statistics", err))
    getDailyStats(range)
      .then(({ days, sessionCount }) => {
        setDays(days)
        setSessionCount(sessionCount)
      })
      .catch((err) => console.error("Failed to load daily statistics", err))
  }, [range])

  const total = stats.reduce((sum, s) => sum + s.minutes, 0)
  const max = Math.max(...stats.map((s) => s.minutes), 1)
  const chartData = days.map((d) => ({ ...d, label: formatDayLabel(d.date, range) }))

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap gap-2">
        {TIME_RANGES.map((r) => (
          <button
            key={r.id}
            onClick={() => setRange(r.id)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              range === r.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Hero readout — same Martian Mono treatment as the timer's own digits */}
      <div className="grid grid-cols-3 gap-6 border-b border-border pb-8">
        <HeroStat label="Total focus" value={formatDuration(total)} />
        <HeroStat label="Sessions" value={String(sessionCount)} />
        <HeroStat
          label="Top activity"
          value={stats[0]?.activity.name ?? "—"}
          swatch={stats[0]?.activity.color}
        />
      </div>

      <div className="lg:grid lg:grid-cols-[1.6fr_1fr] lg:items-start lg:gap-10">
        <div>
          <h3 className="mb-4 font-nav text-[11px] uppercase tracking-wider text-muted-foreground/80">
            Focus minutes per day
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="focusTrendStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--primary)" />
                    <stop offset="100%" stopColor="var(--accent)" />
                  </linearGradient>
                  <linearGradient id="focusTrendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--foreground)",
                  }}
                  formatter={(value) => formatDuration(Number(value))}
                />
                <Area
                  type="monotone"
                  dataKey="minutes"
                  stroke="url(#focusTrendStroke)"
                  strokeWidth={2.5}
                  fill="url(#focusTrendFill)"
                  dot={{ r: 3, fill: "var(--primary)", strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-12 lg:mt-0">
          <h3 className="mb-4 font-nav text-[11px] uppercase tracking-wider text-muted-foreground/80">
            Focus time by activity
          </h3>

          {stats.length === 0 ? (
            <p className="py-8 text-base text-muted-foreground">
              No focus sessions yet for this range.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {stats.map((s, i) => {
                const medal = MEDALS[i]
                return (
                  <div key={s.activity.id} className="flex items-center gap-3 py-3.5">
                    <span className="flex w-6 shrink-0 items-center justify-center">
                      {medal ? (
                        <medal.icon className="h-5 w-5" style={{ color: medal.color }} />
                      ) : (
                        <span className="font-mono text-sm text-muted-foreground">{i + 1}</span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1 break-words text-sm font-medium text-foreground">
                      {s.activity.name}
                    </span>
                    <span className="font-mono text-sm tabular-nums text-muted-foreground">
                      {formatDuration(s.minutes)}
                    </span>
                    <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full transition-[width] duration-500"
                        style={{
                          width: `${Math.max((s.minutes / max) * 100, 6)}%`,
                          backgroundColor: s.activity.color,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function HeroStat({
  label,
  value,
  swatch,
}: {
  label: string
  value: string
  swatch?: string
}) {
  return (
    <div>
      <div className="font-nav text-[11px] uppercase tracking-wider text-muted-foreground/80">
        {label}
      </div>
      <div className="mt-2 flex items-center gap-2.5">
        {swatch && <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: swatch }} />}
        <span className="min-w-0 break-words font-mono text-4xl font-bold tabular-nums text-foreground">
          {value}
        </span>
      </div>
    </div>
  )
}
