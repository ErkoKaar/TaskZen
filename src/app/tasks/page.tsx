"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, Flame, Trash2 } from "lucide-react"
import {
  computeStreak,
  fmtDate,
  fmtDayLabel,
  fmtMonthYear,
  isHabitApplicable,
  rangeDates,
  startOfWeek,
  useStore,
} from "@/lib/tasks/store"
import { SiteHeader } from "@/components/site-header"
import { TasksNavTabs } from "@/components/tasks/nav-tabs"
import { ViewTabs, type ViewKey } from "@/components/tasks/view-tabs"
import { CheckBox } from "@/components/tasks/check-box"
import { GhostInput } from "@/components/tasks/ghost-input"
import { cn } from "@/lib/utils"

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const DELETE_BTN_CLASS =
  "text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-60 hover:text-destructive"

export default function TasksPage() {
  const [view, setView] = useState<ViewKey>("week")
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [monthOffset, setMonthOffset] = useState(0)
  const { state, addTask, toggleTask, deleteTask, toggleHabit } = useStore()

  const days = useMemo(() => {
    if (view === "week") return rangeDates(startOfWeek(new Date()), 7)
    const today = new Date()
    const first = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
    const last = new Date(today.getFullYear(), today.getMonth() + monthOffset + 1, 0)
    return rangeDates(first, last.getDate())
  }, [view, monthOffset])
  const monthLabel = useMemo(() => (days.length > 0 ? fmtMonthYear(days[0]) : ""), [days])

  const today = fmtDate(new Date())
  const selected = fmtDate(selectedDate)
  const selectedTasks = state.tasks.filter((t) => t.date === selected)
  const selectedHabits = state.habits.filter((h) => isHabitApplicable(h, selected))
  const doneCount =
    selectedTasks.filter((t) => t.done).length +
    selectedHabits.filter((h) => !!state.habitLogs[`${h.id}:${selected}`]).length
  const totalCount = selectedTasks.length + selectedHabits.length
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader>
        <TasksNavTabs />
      </SiteHeader>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-8 sm:py-16">
        <div className="flex items-center gap-3">
          <Image src="/icons/tasks.svg" alt="" width={32} height={32} className="h-8 w-8" />
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">Tasks</h1>
        </div>
        <p className="mt-2 text-lg text-muted-foreground">Your day, one task at a time.</p>

        {view === "week" ? (
          <div className="mt-10 lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start lg:gap-20">
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-baseline gap-3">
                  <h2 className="text-[26px] font-semibold tracking-tight text-foreground">
                    {fmtDayLabel(selectedDate)}
                  </h2>
                  {selected === today && (
                    <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                      Today
                    </span>
                  )}
                </div>
                <ViewTabs value={view} onChange={setView} views={["week", "month"]} />
              </div>

              {/* Day switcher sits right under the heading it controls. */}
              <div className="mt-8">
                <WeekStrip days={days} state={state} selected={selectedDate} onSelect={setSelectedDate} />
              </div>

              <div className="mt-8 h-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-2.5 text-sm tabular-nums text-muted-foreground">
                {doneCount} / {totalCount} done
              </div>

              {selectedHabits.length > 0 && (
                <>
                  <SectionLabel>Habits</SectionLabel>
                  <div className="divide-y divide-border">
                    {selectedHabits.map((h) => {
                      const done = !!state.habitLogs[`${h.id}:${selected}`]
                      const streak = computeStreak(h.id, state.habitLogs, h.createdAt)
                      return (
                        <div key={h.id} className="flex items-center gap-4 py-5">
                          <CheckBox checked={done} onClick={() => toggleHabit(h.id, selected)} />
                          <span className={cn("flex-1 text-lg", done && "text-muted-foreground line-through")}>
                            {h.name}
                          </span>
                          <span className="flex items-center gap-1 text-sm tabular-nums text-muted-foreground">
                            <Flame className="h-4 w-4 text-[color:var(--chart-1)]" />
                            {streak}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              <SectionLabel>Tasks</SectionLabel>
              <div className="divide-y divide-border">
                {selectedTasks.map((t) => (
                  <TaskRow key={t.id} title={t.title} done={t.done} onToggle={() => toggleTask(t.id)} onDelete={() => deleteTask(t.id)} />
                ))}
                <GhostInput placeholder="Add a task…" onSubmit={(title) => addTask({ title, date: selected })} />
              </div>
            </div>

            <aside className="hidden lg:sticky lg:top-24 lg:block">
              <PeriodSummary label="This week" days={days} state={state} />
            </aside>
          </div>
        ) : (
          <div className="mt-10 lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start lg:gap-20">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-[26px] font-semibold tracking-tight text-foreground">{monthLabel}</h2>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setMonthOffset((m) => m - 1)}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMonthOffset(0)}
                      disabled={monthOffset === 0}
                      className="px-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setMonthOffset((m) => m + 1)}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      aria-label="Next month"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <ViewTabs value={view} onChange={setView} views={["week", "month"]} />
                </div>
              </div>

              <div className="mt-8">
                {days.map((day) => (
                  <DaySection
                    key={fmtDate(day)}
                    date={day}
                    state={state}
                    onAddTask={(title) => addTask({ title, date: fmtDate(day) })}
                    onToggleTask={toggleTask}
                    onDeleteTask={deleteTask}
                    onToggleHabit={(habitId) => toggleHabit(habitId, fmtDate(day))}
                  />
                ))}
              </div>
            </div>

            <aside className="lg:sticky lg:top-24">
              <PeriodSummary label="This month" days={days} state={state} />
            </aside>
          </div>
        )}
      </main>
    </div>
  )
}

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "mb-2 mt-14 font-nav text-[11px] uppercase tracking-wider text-muted-foreground/80",
        className,
      )}
    >
      {children}
    </div>
  )
}

function PeriodSummary({
  label,
  days,
  state,
}: {
  label: string
  days: Date[]
  state: ReturnType<typeof useStore>["state"]
}) {
  let tasksDone = 0
  let tasksTotal = 0
  let habitChecks = 0
  let habitSlots = 0
  for (const day of days) {
    const date = fmtDate(day)
    const dayTasks = state.tasks.filter((t) => t.date === date)
    tasksDone += dayTasks.filter((t) => t.done).length
    tasksTotal += dayTasks.length
    const dayHabits = state.habits.filter((h) => isHabitApplicable(h, date))
    habitSlots += dayHabits.length
    habitChecks += dayHabits.filter((h) => !!state.habitLogs[`${h.id}:${date}`]).length
  }
  const done = tasksDone + habitChecks
  const total = tasksTotal + habitSlots
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div>
      <SectionLabel className="mt-0">{label}</SectionLabel>
      <dl className="space-y-4 text-lg">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">Tasks done</dt>
          <dd className="font-medium tabular-nums">{tasksDone} / {tasksTotal}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">Habit checks</dt>
          <dd className="font-medium tabular-nums">{habitChecks} / {habitSlots}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">Completion</dt>
          <dd className="font-medium tabular-nums">{pct}%</dd>
        </div>
      </dl>
    </div>
  )
}

function TaskRow({
  title,
  done,
  onToggle,
  onDelete,
}: {
  title: string
  done: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <div className="group flex items-center gap-4 py-5">
      <CheckBox checked={done} onClick={onToggle} />
      <span className={cn("flex-1 text-lg", done && "text-muted-foreground line-through")}>{title}</span>
      <button onClick={onDelete} className={DELETE_BTN_CLASS} aria-label="Delete task">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

function WeekStrip({
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
  const today = fmtDate(new Date())
  return (
    <div className="flex items-end gap-2">
      {days.map((day) => {
        const date = fmtDate(day)
        const dayTasks = state.tasks.filter((t) => t.date === date)
        const dayHabits = state.habits.filter((h) => isHabitApplicable(h, date))
        const done =
          dayTasks.filter((t) => t.done).length +
          dayHabits.filter((h) => !!state.habitLogs[`${h.id}:${date}`]).length
        const total = dayTasks.length + dayHabits.length
        const pct = total > 0 ? Math.round((done / total) * 100) : 0
        const isSelected = date === fmtDate(selected)
        const isToday = date === today
        return (
          <button
            key={date}
            type="button"
            onClick={() => onSelect(day)}
            className="flex flex-1 flex-col items-center gap-2 rounded-lg py-1.5 transition-colors hover:bg-accent/40"
          >
            <div className="flex h-14 w-full max-w-10 items-end">
              <div
                className={cn(
                  "w-full rounded transition-all",
                  isSelected ? "bg-primary" : pct > 0 ? "bg-muted-foreground/40" : "bg-surface-2",
                )}
                style={{ height: `${total > 0 ? Math.max(pct, 8) : 8}%` }}
              />
            </div>
            <span
              className={cn(
                "flex items-center gap-1.5 text-sm font-medium",
                isSelected ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {WEEKDAY_SHORT[day.getDay()]}
              {isToday && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function DaySection({
  date,
  state,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onToggleHabit,
}: {
  date: Date
  state: ReturnType<typeof useStore>["state"]
  onAddTask: (title: string) => void
  onToggleTask: (id: string) => void
  onDeleteTask: (id: string) => void
  onToggleHabit: (habitId: string) => void
}) {
  const dateStr = fmtDate(date)
  const isToday = dateStr === fmtDate(new Date())
  const [open, setOpen] = useState(false)

  const tasks = state.tasks.filter((t) => t.date === dateStr)
  const habits = state.habits.filter((h) => isHabitApplicable(h, dateStr))
  const done =
    tasks.filter((t) => t.done).length +
    habits.filter((h) => !!state.habitLogs[`${h.id}:${dateStr}`]).length
  const total = tasks.length + habits.length

  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 py-5 text-left"
      >
        <span className="flex items-baseline gap-3">
          <span className={cn("text-lg font-medium", isToday ? "text-foreground" : "text-muted-foreground")}>
            {fmtDayLabel(date)}
          </span>
          {isToday && (
            <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
              Today
            </span>
          )}
        </span>
        <span className="text-sm tabular-nums text-muted-foreground">
          {done}/{total}
        </span>
      </button>

      {open && (
        <div className="pb-5 pl-1">
          {habits.length > 0 && (
            <div className="divide-y divide-border">
              {habits.map((h) => {
                const habitDone = !!state.habitLogs[`${h.id}:${dateStr}`]
                return (
                  <div key={h.id} className="flex items-center gap-4 py-5">
                    <CheckBox checked={habitDone} onClick={() => onToggleHabit(h.id)} />
                    <span className={cn("flex-1 text-lg", habitDone && "text-muted-foreground line-through")}>
                      {h.name}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
          <div className={cn("divide-y divide-border", habits.length > 0 && "border-t border-border")}>
            {tasks.map((t) => (
              <TaskRow key={t.id} title={t.title} done={t.done} onToggle={() => onToggleTask(t.id)} onDelete={() => onDeleteTask(t.id)} />
            ))}
            <GhostInput placeholder="Add a task…" onSubmit={onAddTask} />
          </div>
        </div>
      )}
    </div>
  )
}
