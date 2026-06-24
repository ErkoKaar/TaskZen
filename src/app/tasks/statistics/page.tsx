"use client"

import { useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { fmtDate, fmtShort, getRange, parseDate, useStore } from "@/lib/tasks/store"
import { SiteHeader } from "@/components/site-header"
import { TasksNavTabs } from "@/components/tasks/nav-tabs"
import { ViewTabs, type ViewKey } from "@/components/tasks/view-tabs"

export default function StatisticsPage() {
  const [view, setView] = useState<ViewKey>("week")
  const { state } = useStore()
  const range = useMemo(() => getRange(view, state), [view, state])

  const inRange = (date: string) => {
    const d = parseDate(date)
    return d >= range.start && d <= range.end
  }

  const { dayData, completedTasks } = useMemo(() => {
    const days: { date: string; label: string; habits: number; tasks: number }[] = []
    const start = new Date(range.start)
    const end = new Date(range.end)
    const totalHabits = state.habits.length || 1
    const weekdayShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const date = fmtDate(d)
      const habitsDone = state.habits.filter(
        (h) => !!state.habitLogs[`${h.id}:${date}`],
      ).length
      const tasksDone = state.tasks.filter((t) => t.date === date && t.done).length
      days.push({
        date,
        label:
          view === "year" || view === "all"
            ? fmtShort(new Date(d))
            : weekdayShort[d.getDay()],
        habits: Math.round((habitsDone / totalHabits) * 100),
        tasks: tasksDone,
      })
    }
    const completedTasks = state.tasks.filter((t) => {
      const d = parseDate(t.date)
      return t.done && d >= start && d <= end
    })
    return { dayData: days, completedTasks }
  }, [range, state, view])

  const habitChecksInRange = useMemo(
    () =>
      Object.keys(state.habitLogs).filter((k) => {
        const date = k.split(":")[1]
        return date ? inRange(date) : false
      }),
    [state.habitLogs, range],
  )

  const tasksInRange = state.tasks.filter((t) => inRange(t.date))

  const possible =
    state.habits.length *
    (Math.round((range.end.getTime() - range.start.getTime()) / 86400000) + 1)
  const completion =
    possible > 0 ? Math.round((habitChecksInRange.length / possible) * 100) : 0

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `taskmanager-${fmtDate(new Date())}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader>
        <TasksNavTabs />
      </SiteHeader>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Statistics</h1>
              <p className="mt-1 text-sm text-muted-foreground">{range.label}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportJson}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                Export JSON
              </button>
              <ViewTabs value={view} onChange={setView} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <KPI
              label="Habit completion"
              value={`${completion}%`}
              hint={`${habitChecksInRange.length} done`}
            />
            <KPI
              label="Tasks completed"
              value={`${completedTasks.length}`}
              hint={`of ${tasksInRange.length}`}
            />
            <KPI label="Active habits" value={`${state.habits.length}`} hint="tracked" />
            <KPI
              label="Habits completed"
              value={`${habitChecksInRange.length}`}
              hint={`of ${possible}`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Habit completion %">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dayData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "var(--foreground)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="habits"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "var(--chart-1)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Tasks completed per day">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "var(--foreground)",
                    }}
                  />
                  <Bar dataKey="tasks" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-medium text-foreground">
              Tasks completed — {range.label.toLowerCase()}
            </h2>
            <div className="mt-3 space-y-1">
              {completedTasks.length === 0 && (
                <p className="text-sm text-muted-foreground">No completed tasks in this range.</p>
              )}
              {completedTasks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-accent/40"
                >
                  <span className="text-muted-foreground tabular-nums text-xs w-24">
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
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-semibold tabular-nums text-foreground">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-medium text-foreground">{title}</h2>
      <div className="mt-4 h-56">{children}</div>
    </div>
  )
}
