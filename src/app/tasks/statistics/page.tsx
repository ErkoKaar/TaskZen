"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import {
  applicableLeafHabits,
  childrenOf,
  fmtDate,
  fmtShort,
  getRange,
  parseDate,
  useStore,
} from "@/lib/tasks/store"
import { useProjectsStore } from "@/lib/tasks/projects-store"
import { SiteHeader } from "@/components/site-header"
import { TasksNavTabs } from "@/components/tasks/nav-tabs"
import { ViewTabs, type ViewKey } from "@/components/tasks/view-tabs"

export default function StatisticsPage() {
  const [view, setView] = useState<ViewKey>("week")
  const { state } = useStore()
  const { state: projectsState } = useProjectsStore()
  const range = useMemo(
    () => getRange(view, state, projectsState.completions.map((c) => c.completedAt)),
    [view, state, projectsState],
  )

  const inRange = (date: string) => {
    const d = parseDate(date)
    return d >= range.start && d <= range.end
  }

  const { dayData, completedTasks } = useMemo(() => {
    const days: { date: string; label: string; habits: number; tasks: number }[] = []
    const start = new Date(range.start)
    const end = new Date(range.end)
    const weekdayShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const date = fmtDate(d)
      // Only count leaf habits that existed (and weren't yet archived) on this
      // day — parents are grouping rows, their children carry the checks.
      const applicableHabits = applicableLeafHabits(state.habits, date)
      const habitsDone = applicableHabits.filter(
        (h) => !!state.habitLogs[`${h.id}:${date}`],
      ).length
      const tasksDone = state.tasks.filter((t) => t.date === date && t.done).length
      days.push({
        date,
        label:
          view === "year" || view === "all"
            ? fmtShort(new Date(d))
            : weekdayShort[d.getDay()],
        habits: Math.round((habitsDone / (applicableHabits.length || 1)) * 100),
        tasks: tasksDone,
      })
    }
    const completedTasks = state.tasks.filter((t) => {
      const d = parseDate(t.date)
      return t.done && d >= start && d <= end
    })
    return { dayData: days, completedTasks }
  }, [range, state, view])

  // Count only logs belonging to leaf habits — the same set `possible` counts.
  // A habit that has since become a parent keeps its old log rows in the DB,
  // but those no longer count as habit completions (the parent is a grouping;
  // its children carry the checks). Keeping numerator and denominator on the
  // same set stops completion % from being skewed after a habit is nested.
  const habitChecksInRange = useMemo(() => {
    const leafIds = new Set(
      state.habits.filter((h) => childrenOf(h.id, state.habits).length === 0).map((h) => h.id),
    )
    return Object.keys(state.habitLogs).filter((k) => {
      const [habitId, date] = k.split(":")
      return leafIds.has(habitId) && !!date && inRange(date)
    })
  }, [state.habitLogs, state.habits, range])

  // For each leaf habit (parents don't carry checks), only count the days
  // within range it was actually active for — a habit created on Wednesday
  // couldn't have been done on Monday/Tuesday, and an archived habit's history
  // stops counting toward future days.
  const leafHabits = state.habits.filter((h) => childrenOf(h.id, state.habits).length === 0)
  const possible = leafHabits.reduce((sum, h) => {
    const createdDate = parseDate(fmtDate(new Date(h.createdAt)))
    const effectiveStart = createdDate > range.start ? createdDate : range.start
    const archivedDate = h.archivedAt ? parseDate(fmtDate(new Date(h.archivedAt))) : null
    const effectiveEnd = archivedDate && archivedDate < range.end ? archivedDate : range.end
    if (effectiveStart > effectiveEnd) return sum
    const days =
      Math.round((effectiveEnd.getTime() - effectiveStart.getTime()) / 86400000) + 1
    return sum + days
  }, 0)
  const completion =
    possible > 0 ? Math.round((habitChecksInRange.length / possible) * 100) : 0

  // range.end is midnight of the last day (day-granularity, matching how
  // task/habit dates work); completedAt is a precise timestamp, so extend
  // the boundary to the end of that day or same-day completions would be
  // excluded (e.g. "All time" ends at *today* 00:00).
  const rangeEndMs = range.end.getTime() + 24 * 60 * 60 * 1000 - 1
  const projectsCompletedInRange = projectsState.completions.filter(
    (c) => c.completedAt >= range.start.getTime() && c.completedAt <= rangeEndMs,
  )

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader>
        <TasksNavTabs />
      </SiteHeader>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <div className="space-y-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <Image src="/icons/statistics.svg" alt="" width={30} height={30} className="h-[30px] w-[30px]" />
                <h1 className="text-[30px] font-semibold tracking-tight text-foreground">Statistics</h1>
              </div>
              <p className="mt-1.5 text-base text-muted-foreground">{range.label}</p>
            </div>
            <ViewTabs value={view} onChange={setView} />
          </div>

          <div className="grid grid-cols-2 gap-6 border-b border-border pb-8 lg:grid-cols-5">
            <KPI
              label="Habit completion"
              value={`${completion}%`}
              hint={`${habitChecksInRange.length} done`}
            />
            <KPI label="Tasks completed" value={`${completedTasks.length}`} />
            <KPI
              label="Active habits"
              value={`${state.habits.filter((h) => !h.archivedAt && !h.parentId).length}`}
              hint="tracked"
            />
            <KPI
              label="Habits completed"
              value={`${habitChecksInRange.length}`}
              hint={`of ${possible}`}
            />
            <KPI
              label="Projects completed"
              value={`${projectsCompletedInRange.length}`}
              hint={`${projectsState.completions.length} all-time`}
            />
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <ChartCard title="Habit completion %">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dayData}>
                  <defs>
                    <linearGradient id="habitTrendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.32} />
                      <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
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
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    domain={[0, 100]}
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
                    formatter={(value) => `${value}%`}
                  />
                  <Area
                    type="monotone"
                    dataKey="habits"
                    stroke="var(--chart-2)"
                    strokeWidth={2.5}
                    fill="url(#habitTrendFill)"
                    dot={{ r: 3, fill: "var(--chart-2)", strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Tasks completed per day">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dayData}>
                  <defs>
                    <linearGradient id="taskTrendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-4)" stopOpacity={0.32} />
                      <stop offset="100%" stopColor="var(--chart-4)" stopOpacity={0} />
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
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    allowDecimals={false}
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
                  />
                  <Area
                    type="monotone"
                    dataKey="tasks"
                    stroke="var(--chart-4)"
                    strokeWidth={2.5}
                    fill="url(#taskTrendFill)"
                    dot={{ r: 3, fill: "var(--chart-4)", strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div>
            <h2 className="font-nav text-[11px] uppercase tracking-wider text-muted-foreground/80">
              Tasks completed — {range.label.toLowerCase()}
            </h2>
            <div className="mt-1 divide-y divide-border">
              {completedTasks.length === 0 && (
                <p className="py-2 text-sm text-muted-foreground">No completed tasks in this range.</p>
              )}
              {completedTasks.map((t) => (
                <div key={t.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="w-24 text-xs tabular-nums text-muted-foreground">
                    {fmtShort(parseDate(t.date))}
                  </span>
                  <span className="flex-1">{t.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function KPI({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="font-nav text-[11px] uppercase tracking-wider text-muted-foreground/80">{label}</div>
      <div className="mt-2 truncate font-mono text-3xl font-bold tabular-nums text-foreground">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-4 font-nav text-[11px] uppercase tracking-wider text-muted-foreground/80">{title}</h2>
      <div className="h-56">{children}</div>
    </div>
  )
}
