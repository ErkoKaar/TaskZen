"use client"

import { useState } from "react"
import { Flame, Plus, RotateCcw, Trash2 } from "lucide-react"
import { computeStreak, fmtDate, useStore } from "@/lib/tasks/store"
import { SiteHeader } from "@/components/site-header"
import { TasksNavTabs } from "@/components/tasks/nav-tabs"

export default function HabitsPage() {
  const { state, addHabit, archiveHabit, restoreHabit, deleteHabit, toggleHabit } = useStore()

  const [name, setName] = useState("")

  const today = fmtDate(new Date())
  const activeHabits = state.habits.filter((h) => !h.archivedAt)
  const archivedHabits = state.habits.filter((h) => h.archivedAt)

  function deleteForever(id: string, habitName: string) {
    const confirmed = window.confirm(
      `Delete "${habitName}" forever? This also removes its history from your statistics. This can't be undone.`,
    )
    if (confirmed) deleteHabit(id)
  }

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader>
        <TasksNavTabs />
      </SiteHeader>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <div className="space-y-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Habits</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Daily habits show up automatically on every day in Tasks.
            </p>
          </div>

          {/* Add habit */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-medium text-foreground">New habit</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!name.trim()) return
                addHabit({ name: name.trim() })
                setName("")
              }}
              className="mt-3 flex flex-wrap items-center gap-2"
            >
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Read 20 minutes"
                className="flex-1 min-w-[200px] rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                <Plus className="h-3.5 w-3.5" />
                Add habit
              </button>
            </form>
          </div>

          {/* Habit list */}
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-foreground">Your habits</h2>
            {activeHabits.length === 0 && (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No habits yet. Add one above and it will appear every day.
              </p>
            )}
            <div className="space-y-2">
              {activeHabits.map((h) => {
                const streak = computeStreak(h.id, state.habitLogs, h.createdAt)
                const doneToday = !!state.habitLogs[`${h.id}:${today}`]
                return (
                  <div
                    key={h.id}
                    className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
                  >
                    <button
                      onClick={() => toggleHabit(h.id, today)}
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${
                        doneToday
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border-strong bg-background hover:border-foreground"
                      }`}
                      aria-label="Toggle today"
                    >
                      {doneToday && "✓"}
                    </button>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">{h.name}</div>
                    </div>
                    <div className="inline-flex items-center gap-1.5 rounded-md bg-surface px-2.5 py-1 text-xs font-medium tabular-nums">
                      <Flame className="h-3.5 w-3.5 text-[color:var(--chart-1)]" />
                      {streak} day{streak === 1 ? "" : "s"}
                    </div>
                    <button
                      onClick={() => archiveHabit(h.id)}
                      className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                      aria-label="Delete habit"
                      title="Delete — moves to Old habits, history is kept"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Old (archived) habits */}
          {archivedHabits.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-foreground">Old habits</h2>
              <p className="text-xs text-muted-foreground">
                Deleted habits land here. Their past completions still count in your
                statistics, but they no longer show up on new days.
              </p>
              <div className="space-y-2">
                {archivedHabits.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-card/60 px-4 py-3"
                  >
                    <div className="flex-1 text-sm font-medium text-muted-foreground line-through">
                      {h.name}
                    </div>
                    <button
                      onClick={() => restoreHabit(h.id)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Restore
                    </button>
                    <button
                      onClick={() => deleteForever(h.id, h.name)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete forever
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
