"use client"

import { useMemo, useState } from "react"
import { Check, Plus, Trash2 } from "lucide-react"
import {
  fmtDate,
  fmtDayLabel,
  isHabitApplicable,
  rangeDates,
  startOfWeek,
  useStore,
  getRange,
} from "@/lib/tasks/store"
import { SiteHeader } from "@/components/site-header"
import { TasksNavTabs } from "@/components/tasks/nav-tabs"
import { ViewTabs, type ViewKey } from "@/components/tasks/view-tabs"
import { cn } from "@/lib/utils"

export default function TasksPage() {
  const [view, setView] = useState<ViewKey>("week")
  const [selectedDate, setSelectedDate] = useState(() => new Date())
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

      <main
        className={cn(
          "mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12",
          view === "week" && "pb-28",
        )}
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tasks</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {range.label} · {state.tasks.length} tasks ·{" "}
              {state.habits.filter((h) => !h.archivedAt).length} habits
            </p>
          </div>
          <ViewTabs value={view} onChange={setView} views={["week", "month"]} />
        </div>

        {view === "week" ? (
          <div className="mt-6 flex flex-col items-center gap-6">
            <div className="w-full max-w-lg sm:max-w-2xl">
              <DayCard
                date={selectedDate}
                tasks={state.tasks.filter((t) => t.date === fmtDate(selectedDate))}
                habits={state.habits.filter((h) =>
                  isHabitApplicable(h, fmtDate(selectedDate)),
                )}
                isHabitDone={(habitId) =>
                  !!state.habitLogs[`${habitId}:${fmtDate(selectedDate)}`]
                }
                onAddTask={(input) => addTask({ ...input, date: fmtDate(selectedDate) })}
                onToggleTask={toggleTask}
                onDeleteTask={deleteTask}
                onToggleHabit={(habitId) => toggleHabit(habitId, fmtDate(selectedDate))}
                forceOpen
              />
            </div>
            <div className="w-full max-w-lg sm:max-w-2xl">
              <WeekOverview
                days={days}
                state={state}
                selected={selectedDate}
                onSelect={setSelectedDate}
              />
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {days.map((day) => (
              <DayCard
                key={fmtDate(day)}
                date={day}
                tasks={state.tasks.filter((t) => t.date === fmtDate(day))}
                habits={state.habits.filter((h) => isHabitApplicable(h, fmtDate(day)))}
                isHabitDone={(habitId) => !!state.habitLogs[`${habitId}:${fmtDate(day)}`]}
                onAddTask={(input) => addTask({ ...input, date: fmtDate(day) })}
                onToggleTask={toggleTask}
                onDeleteTask={deleteTask}
                onToggleHabit={(habitId) => toggleHabit(habitId, fmtDate(day))}
                compact
              />
            ))}
          </div>
        )}
      </main>

      {view === "week" && (
        <WeekDayFooter
          days={days}
          selected={selectedDate}
          onSelect={setSelectedDate}
        />
      )}
    </div>
  )
}

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function WeekOverview({
  days,
  state,
  selected,
  onSelect,
}: {
  days: Date[]
  state: ReturnType<typeof useStore>["state"]
  selected: Date
  onSelect: (date: Date) => void
}) {
  const stats = days.map((day) => {
    const date = fmtDate(day)
    const dayTasks = state.tasks.filter((t) => t.date === date)
    const dayHabits = state.habits.filter((h) => isHabitApplicable(h, date))
    const done =
      dayTasks.filter((t) => t.done).length +
      dayHabits.filter((h) => !!state.habitLogs[`${h.id}:${date}`]).length
    const total = dayTasks.length + dayHabits.length
    const pct = total > 0 ? Math.round((done / total) * 100) : 0
    return { day, date, done, total, pct }
  })

  return (
    <div className="w-full rounded-2xl border border-border bg-card p-5">
      <h3 className="mb-4 text-sm font-medium text-muted-foreground">This week</h3>
      <div className="flex items-end justify-between gap-2">
        {stats.map((s) => {
          const isSelected = s.date === fmtDate(selected)
          return (
            <button
              key={s.date}
              type="button"
              onClick={() => onSelect(s.day)}
              className="flex flex-1 flex-col items-center gap-2"
            >
              <div className="flex h-16 w-full items-end overflow-hidden rounded-lg bg-secondary">
                <div
                  className={cn(
                    "w-full rounded-lg transition-all",
                    isSelected ? "bg-primary" : "bg-border-strong",
                  )}
                  style={{ height: s.total > 0 ? `${Math.max(s.pct, 6)}%` : "0%" }}
                />
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  isSelected ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {WEEKDAY_SHORT[s.day.getDay()]}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function WeekDayFooter({
  days,
  selected,
  onSelect,
}: {
  days: Date[]
  selected: Date
  onSelect: (date: Date) => void
}) {
  const today = fmtDate(new Date())
  return (
    <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-center gap-1 px-4 py-3 sm:px-6">
        {days.map((day) => {
          const isSelected = fmtDate(day) === fmtDate(selected)
          const isToday = fmtDate(day) === today
          return (
            <button
              key={fmtDate(day)}
              type="button"
              onClick={() => onSelect(day)}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors sm:flex-initial sm:px-4",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <span>{WEEKDAY_SHORT[day.getDay()]}</span>
              <span className="flex items-center gap-1 text-[10px] tabular-nums">
                {day.getDate()}
                {isToday && (
                  <span
                    className={cn(
                      "h-1 w-1 rounded-full",
                      isSelected ? "bg-primary-foreground" : "bg-primary",
                    )}
                  />
                )}
              </span>
            </button>
          )
        })}
      </div>
    </footer>
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
  forceOpen,
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
  forceOpen?: boolean
}) {
  const today = fmtDate(new Date())
  const isToday = fmtDate(date) === today
  const [title, setTitle] = useState("")
  const [open, setOpen] = useState(!compact && isToday)
  const isOpen = forceOpen || open

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onAddTask({ title: title.trim() })
    setTitle("")
  }

  const dayLabel = fmtDayLabel(date)

  const header = (
    <>
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
    </>
  )

  return (
    <div className="rounded-xl border border-border bg-card">
      {forceOpen ? (
        <div className="flex w-full items-center justify-between px-5 py-3 text-left">
          {header}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between px-5 py-3 text-left"
        >
          {header}
        </button>
      )}

      {isOpen && (
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
