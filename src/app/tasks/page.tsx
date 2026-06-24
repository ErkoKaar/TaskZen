"use client"

import { useMemo, useState } from "react"
import { Check, Plus, Trash2 } from "lucide-react"
import {
  fmtDate,
  fmtDayLabel,
  rangeDates,
  startOfWeek,
  useStore,
  getRange,
} from "@/lib/tasks/store"
import { SiteHeader } from "@/components/site-header"
import { TasksNavTabs } from "@/components/tasks/nav-tabs"
import { ViewTabs, type ViewKey } from "@/components/tasks/view-tabs"

export default function TasksPage() {
  const [view, setView] = useState<ViewKey>("week")
  const { state, addTask, toggleTask, deleteTask, toggleHabit } = useStore()

  const range = useMemo(() => getRange(view, state), [view, state])
  const days = useMemo(() => {
    if (view === "week") return rangeDates(startOfWeek(new Date()), 7)
    // month
    const today = new Date()
    const first = new Date(today.getFullYear(), today.getMonth(), 1)
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    return rangeDates(first, last.getDate())
  }, [view])

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader>
        <TasksNavTabs />
      </SiteHeader>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tasks</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {range.label} · {state.tasks.length} tasks · {state.habits.length} habits
              </p>
            </div>
            <ViewTabs value={view} onChange={setView} views={["week", "month"]} />
          </div>

          <div className="space-y-3">
            {days.map((day) => (
              <DayCard
                key={fmtDate(day)}
                date={day}
                tasks={state.tasks.filter((t) => t.date === fmtDate(day))}
                habits={state.habits}
                isHabitDone={(habitId) => !!state.habitLogs[`${habitId}:${fmtDate(day)}`]}
                onAddTask={(input) => addTask({ ...input, date: fmtDate(day) })}
                onToggleTask={toggleTask}
                onDeleteTask={deleteTask}
                onToggleHabit={(habitId) => toggleHabit(habitId, fmtDate(day))}
                compact={view !== "week"}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

function DayCard({
  date,
  tasks,
  habits,
  isHabitDone,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onToggleHabit,
  compact,
}: {
  date: Date
  tasks: ReturnType<typeof useStore>["state"]["tasks"]
  habits: ReturnType<typeof useStore>["state"]["habits"]
  isHabitDone: (habitId: string) => boolean
  onAddTask: (input: { title: string }) => void
  onToggleTask: (id: string) => void
  onDeleteTask: (id: string) => void
  onToggleHabit: (id: string) => void
  compact?: boolean
}) {
  const today = fmtDate(new Date())
  const isToday = fmtDate(date) === today
  const [title, setTitle] = useState("")
  const [open, setOpen] = useState(!compact && isToday)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onAddTask({ title: title.trim() })
    setTitle("")
  }

  const dayLabel = fmtDayLabel(date)

  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
      >
        <div className="flex items-baseline gap-3">
          <span className={`text-sm font-medium ${isToday ? "text-foreground" : "text-muted-foreground"}`}>
            {dayLabel}
          </span>
          {isToday && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground">
              Today
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{tasks.filter((t) => t.done).length}/{tasks.length} tasks</span>
          <span>·</span>
          <span>
            {habits.filter((h) => isHabitDone(h.id)).length}/{habits.length} habits
          </span>
        </div>
      </button>

      {open && (
        <div className="border-t border-border px-5 py-4 space-y-4">
          {/* Habits */}
          {habits.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Habits
              </div>
              <div className="space-y-1">
                {habits.map((h) => {
                  const done = isHabitDone(h.id)
                  return (
                    <div
                      key={h.id}
                      className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-accent/40"
                    >
                      <CheckBox checked={done} onClick={() => onToggleHabit(h.id)} />
                      <span className={`flex-1 text-sm ${done ? "text-muted-foreground line-through" : ""}`}>
                        {h.name}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tasks */}
          <div className="space-y-2">
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Tasks
            </div>
            <div className="space-y-1">
              {tasks.length === 0 && (
                <p className="px-2 py-1 text-sm text-muted-foreground">No tasks yet.</p>
              )}
              {tasks.map((t) => (
                <div
                  key={t.id}
                  className="group flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-accent/40"
                >
                  <CheckBox checked={t.done} onClick={() => onToggleTask(t.id)} />
                  <span className={`flex-1 text-sm ${t.done ? "text-muted-foreground line-through" : ""}`}>
                    {t.title}
                  </span>
                  <button
                    onClick={() => onDeleteTask(t.id)}
                    className="opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    aria-label="Delete task"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={submit} className="flex items-center gap-2 pt-1">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Add a task…"
                className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function CheckBox({ checked, onClick }: { checked: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors ${
        checked
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border-strong bg-background hover:border-foreground"
      }`}
      aria-pressed={checked}
    >
      {checked && <Check className="h-3 w-3" strokeWidth={3} />}
    </button>
  )
}

