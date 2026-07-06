"use client"

import Image from "next/image"
import { Flame, RotateCcw, Trash2 } from "lucide-react"
import { computeStreak, fmtDate, useStore } from "@/lib/tasks/store"
import { SiteHeader } from "@/components/site-header"
import { TasksNavTabs } from "@/components/tasks/nav-tabs"
import { CheckBox } from "@/components/tasks/check-box"
import { GhostInput } from "@/components/tasks/ghost-input"

const DELETE_BTN_CLASS =
  "text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-60 hover:text-destructive"

export default function HabitsPage() {
  const { state, addHabit, archiveHabit, restoreHabit, deleteHabit, toggleHabit } = useStore()

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

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-8 sm:py-16">
        <div className="flex items-center gap-3">
          <Image src="/icons/habits.svg" alt="" width={32} height={32} className="h-8 w-8" />
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">Habits</h1>
        </div>
        <p className="mt-2 text-lg text-muted-foreground">
          Daily habits show up automatically on every day in Tasks.
        </p>

        <div className="mt-14 lg:grid lg:grid-cols-2 lg:items-start lg:gap-20">
          <div className="divide-y divide-border">
            {activeHabits.length === 0 && (
              <p className="pb-1 pt-2 text-lg text-muted-foreground">
                No habits yet. Add one below and it will appear every day.
              </p>
            )}
            {activeHabits.map((h) => {
              const streak = computeStreak(h.id, state.habitLogs, h.createdAt)
              const doneToday = !!state.habitLogs[`${h.id}:${today}`]
              return (
                <div key={h.id} className="group flex items-center gap-4 py-5">
                  <CheckBox checked={doneToday} onClick={() => toggleHabit(h.id, today)} />
                  <span className={`flex-1 text-lg ${doneToday ? "text-muted-foreground line-through" : ""}`}>
                    {h.name}
                  </span>
                  <span className="flex items-center gap-1 text-sm tabular-nums text-muted-foreground">
                    <Flame className="h-4 w-4 text-[color:var(--chart-1)]" />
                    {streak} day{streak === 1 ? "" : "s"}
                  </span>
                  <button
                    onClick={() => archiveHabit(h.id)}
                    className={DELETE_BTN_CLASS}
                    aria-label="Delete habit"
                    title="Delete — moves to Old habits, history is kept"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              )
            })}
            <GhostInput placeholder="Add a habit…" onSubmit={(name) => addHabit({ name })} />
          </div>

          {archivedHabits.length > 0 && (
            <div className="mt-14 lg:mt-0">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/80">
                Old habits
              </h2>
              <p className="mt-2 text-base text-muted-foreground">
                Deleted habits land here. Their past completions still count in your statistics,
                but they no longer show up on new days.
              </p>
              <div className="mt-4 divide-y divide-border">
                {archivedHabits.map((h) => (
                  <div key={h.id} className="flex items-center gap-4 py-5">
                    <span className="flex-1 text-lg text-muted-foreground line-through">{h.name}</span>
                    <button
                      onClick={() => restoreHabit(h.id)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border px-3.5 py-2 text-base font-medium text-foreground hover:bg-secondary"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Restore
                    </button>
                    <button
                      onClick={() => deleteForever(h.id, h.name)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 px-3.5 py-2 text-base font-medium text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
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
