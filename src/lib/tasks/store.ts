"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export type Task = {
  id: string
  title: string
  date: string // YYYY-MM-DD
  done: boolean
  createdAt: number
}

export type Habit = {
  id: string
  name: string
  createdAt: number
  archivedAt: number | null
  // null = top-level habit; set = this habit is a child (sub-habit) of the
  // habit with this id. One level of nesting only.
  parentId: string | null
}

export type HabitLog = {
  // key: `${habitId}:${YYYY-MM-DD}` => true
  [key: string]: boolean
}

export type StoreState = {
  tasks: Task[]
  habits: Habit[]
  habitLogs: HabitLog
}

const initialState: StoreState = {
  tasks: [],
  habits: [],
  habitLogs: {},
}

export function useStore() {
  const [state, setState] = useState<StoreState>(initialState)

  useEffect(() => {
    let active = true
    const supabase = createClient()

    async function load() {
      const [tasksRes, habitsRes, logsRes] = await Promise.all([
        supabase
          .from("tasks")
          .select("id, title, date, done, created_at")
          .order("created_at", { ascending: true }),
        supabase
          .from("habits")
          .select("id, name, created_at, archived_at, parent_id")
          .order("created_at", { ascending: true }),
        supabase.from("habit_logs").select("habit_id, date"),
      ])
      if (!active) return
      if (tasksRes.error) throw tasksRes.error
      if (habitsRes.error) throw habitsRes.error
      if (logsRes.error) throw logsRes.error

      const habitLogs: HabitLog = {}
      for (const row of logsRes.data ?? []) {
        habitLogs[`${row.habit_id}:${row.date}`] = true
      }

      setState({
        tasks: (tasksRes.data ?? []).map((t) => ({
          id: t.id,
          title: t.title,
          date: t.date,
          done: t.done,
          createdAt: new Date(t.created_at).getTime(),
        })),
        habits: (habitsRes.data ?? []).map((h) => ({
          id: h.id,
          name: h.name,
          createdAt: new Date(h.created_at).getTime(),
          archivedAt: h.archived_at ? new Date(h.archived_at).getTime() : null,
          parentId: h.parent_id ?? null,
        })),
        habitLogs,
      })
    }

    load().catch((err) => console.error("Failed to load task data", err))
    return () => {
      active = false
    }
  }, [])

  const addTask = useCallback((input: { title: string; date: string }) => {
    const supabase = createClient()
    supabase
      .from("tasks")
      .insert({ title: input.title, date: input.date })
      .select("id, title, date, done, created_at")
      .single()
      .then(({ data, error }) => {
        if (error || !data) return console.error("Failed to add task", error)
        setState((s) => ({
          ...s,
          tasks: [
            ...s.tasks,
            {
              id: data.id,
              title: data.title,
              date: data.date,
              done: data.done,
              createdAt: new Date(data.created_at).getTime(),
            },
          ],
        }))
      })
  }, [])

  const toggleTask = useCallback((id: string) => {
    const task = state.tasks.find((t) => t.id === id)
    if (!task) return
    const done = !task.done
    setState((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, done } : t)) }))
    const supabase = createClient()
    supabase
      .from("tasks")
      .update({ done })
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          console.error("Failed to update task", error)
          // Roll back the optimistic update — the server never applied it.
          setState((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !done } : t)) }))
        }
      })
  }, [state.tasks])

  const deleteTask = useCallback((id: string) => {
    const removed = state.tasks.find((t) => t.id === id)
    setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }))
    const supabase = createClient()
    supabase
      .from("tasks")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          console.error("Failed to delete task", error)
          if (removed) setState((s) => ({ ...s, tasks: [...s.tasks, removed] }))
        }
      })
  }, [state.tasks])

  const addHabit = useCallback((input: { name: string; parentId?: string }) => {
    const supabase = createClient()
    supabase
      .from("habits")
      .insert({ name: input.name, parent_id: input.parentId ?? null })
      .select("id, name, created_at, parent_id")
      .single()
      .then(({ data, error }) => {
        if (error || !data) return console.error("Failed to add habit", error)
        setState((s) => ({
          ...s,
          habits: [
            ...s.habits,
            {
              id: data.id,
              name: data.name,
              createdAt: new Date(data.created_at).getTime(),
              archivedAt: null,
              parentId: data.parent_id ?? null,
            },
          ],
        }))
      })
  }, [])

  // Soft delete: hides the habit from the active list and from future days,
  // but keeps its history (habit_logs, statistics) intact. Reversible.
  // Archiving a parent cascades to its (currently active) children, so they
  // stop counting toward stats too; already-archived children are untouched.
  const archiveHabit = useCallback(
    (id: string) => {
      const archivedAt = Date.now()
      // The habit itself plus, if it's a parent, its still-active children.
      const toArchive = state.habits
        .filter((h) => (h.id === id || h.parentId === id) && h.archivedAt === null)
        .map((h) => h.id)
      setState((s) => ({
        ...s,
        habits: s.habits.map((h) =>
          toArchive.includes(h.id) ? { ...h, archivedAt } : h,
        ),
      }))
      const supabase = createClient()
      supabase
        .from("habits")
        .update({ archived_at: new Date(archivedAt).toISOString() })
        .or(`id.eq.${id},parent_id.eq.${id}`)
        .is("archived_at", null)
        .then(({ error }) => {
          if (error) {
            console.error("Failed to archive habit", error)
            setState((s) => ({
              ...s,
              habits: s.habits.map((h) =>
                toArchive.includes(h.id) ? { ...h, archivedAt: null } : h,
              ),
            }))
          }
        })
    },
    [state.habits],
  )

  const restoreHabit = useCallback(
    (id: string) => {
      // Snapshot previous archived state for the habit + its children so a
      // failed restore can roll each row back to exactly where it was.
      const previous = new Map(
        state.habits
          .filter((h) => h.id === id || h.parentId === id)
          .map((h) => [h.id, h.archivedAt] as const),
      )
      setState((s) => ({
        ...s,
        habits: s.habits.map((h) =>
          previous.has(h.id) ? { ...h, archivedAt: null } : h,
        ),
      }))
      const supabase = createClient()
      supabase
        .from("habits")
        .update({ archived_at: null })
        .or(`id.eq.${id},parent_id.eq.${id}`)
        .then(({ error }) => {
          if (error) {
            console.error("Failed to restore habit", error)
            setState((s) => ({
              ...s,
              habits: s.habits.map((h) =>
                previous.has(h.id) ? { ...h, archivedAt: previous.get(h.id) ?? null } : h,
              ),
            }))
          }
        })
    },
    [state.habits],
  )

  // Permanent delete: removes the habit and all of its history everywhere
  // (habit_logs cascades). Deleting a parent also removes its children and
  // their logs (DB cascade). Cannot be undone — only call after confirming.
  const deleteHabit = useCallback((id: string) => {
    // The habit itself plus any children (sub-habits) it owns.
    const removedIds = state.habits
      .filter((h) => h.id === id || h.parentId === id)
      .map((h) => h.id)
    const removedHabits = state.habits.filter((h) => removedIds.includes(h.id))
    const removedLogs: HabitLog = {}
    Object.keys(state.habitLogs).forEach((k) => {
      if (removedIds.some((rid) => k.startsWith(`${rid}:`))) removedLogs[k] = true
    })
    setState((s) => {
      const newLogs = { ...s.habitLogs }
      Object.keys(newLogs).forEach((k) => {
        if (removedIds.some((rid) => k.startsWith(`${rid}:`))) delete newLogs[k]
      })
      return {
        ...s,
        habits: s.habits.filter((h) => !removedIds.includes(h.id)),
        habitLogs: newLogs,
      }
    })
    const supabase = createClient()
    supabase
      .from("habits")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          console.error("Failed to delete habit", error)
          setState((s) => ({
            ...s,
            habits: [...s.habits, ...removedHabits],
            habitLogs: { ...s.habitLogs, ...removedLogs },
          }))
        }
      })
  }, [state.habits, state.habitLogs])

  const toggleHabit = useCallback(
    (habitId: string, date: string) => {
      const key = `${habitId}:${date}`
      const wasSet = !!state.habitLogs[key]

      setState((s) => {
        const newLogs = { ...s.habitLogs }
        if (wasSet) delete newLogs[key]
        else newLogs[key] = true
        return { ...s, habitLogs: newLogs }
      })

      const revert = () => {
        setState((s) => {
          const newLogs = { ...s.habitLogs }
          if (wasSet) newLogs[key] = true
          else delete newLogs[key]
          return { ...s, habitLogs: newLogs }
        })
      }

      const supabase = createClient()
      if (wasSet) {
        supabase
          .from("habit_logs")
          .delete()
          .eq("habit_id", habitId)
          .eq("date", date)
          .then(({ error }) => {
            if (error) {
              console.error("Failed to unmark habit", error)
              revert()
            }
          })
      } else {
        supabase
          .from("habit_logs")
          .insert({ habit_id: habitId, date })
          .then(({ error }) => {
            if (error) {
              console.error("Failed to mark habit", error)
              revert()
            }
          })
      }
    },
    [state.habitLogs],
  )

  // Rename a habit. The name lives in one place (the habits row), so every
  // view that reads it by id — Tasks, Habits, stats — reflects the change.
  const renameHabit = useCallback(
    (id: string, rawName: string) => {
      const name = rawName.trim()
      const habit = state.habits.find((h) => h.id === id)
      if (!name || !habit || habit.name === name) return
      const previous = habit.name
      setState((s) => ({
        ...s,
        habits: s.habits.map((h) => (h.id === id ? { ...h, name } : h)),
      }))
      const supabase = createClient()
      supabase
        .from("habits")
        .update({ name })
        .eq("id", id)
        .then(({ error }) => {
          if (error) {
            console.error("Failed to rename habit", error)
            setState((s) => ({
              ...s,
              habits: s.habits.map((h) => (h.id === id ? { ...h, name: previous } : h)),
            }))
          }
        })
    },
    [state.habits],
  )

  // Re-parent a habit: nest it under another habit (parentId set) or promote
  // it back to top-level (parentId null). Only leaf habits move — a habit with
  // children can't itself become a child (one level of nesting), and the
  // target must be top-level so we never create a child-of-a-child.
  const setHabitParent = useCallback(
    (habitId: string, parentId: string | null) => {
      const habit = state.habits.find((h) => h.id === habitId)
      if (!habit || habit.parentId === parentId) return
      // The habit being moved must have no children of its own.
      if (state.habits.some((h) => h.parentId === habitId)) return
      if (parentId !== null) {
        if (parentId === habitId) return
        const target = state.habits.find((h) => h.id === parentId)
        if (!target || target.parentId !== null) return
      }

      const previous = habit.parentId
      setState((s) => ({
        ...s,
        habits: s.habits.map((h) => (h.id === habitId ? { ...h, parentId } : h)),
      }))
      const supabase = createClient()
      supabase
        .from("habits")
        .update({ parent_id: parentId })
        .eq("id", habitId)
        .then(({ error }) => {
          if (error) {
            console.error("Failed to move habit", error)
            setState((s) => ({
              ...s,
              habits: s.habits.map((h) =>
                h.id === habitId ? { ...h, parentId: previous } : h,
              ),
            }))
          }
        })
    },
    [state.habits],
  )

  return {
    state,
    addTask,
    toggleTask,
    deleteTask,
    addHabit,
    archiveHabit,
    restoreHabit,
    deleteHabit,
    toggleHabit,
    setHabitParent,
    renameHabit,
  }
}

// helpers
export function fmtDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number)
  return new Date(y, m - 1, d)
}

// A habit only shows up — and only counts toward stats — on days between
// when it was created and when it was archived (inclusive on both ends).
export function isHabitApplicable(habit: Habit, date: string): boolean {
  if (fmtDate(new Date(habit.createdAt)) > date) return false
  if (habit.archivedAt && fmtDate(new Date(habit.archivedAt)) < date) return false
  return true
}

export function startOfWeek(d: Date): Date {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7 // Monday=0
  x.setDate(x.getDate() - day)
  x.setHours(0, 0, 0, 0)
  return x
}

export function rangeDates(start: Date, days: number): Date[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export function fmtDayLabel(d: Date): string {
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`
}
export function fmtShort(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`
}
export function fmtMonthYear(d: Date): string {
  return `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`
}
export function monthName(i: number, long = true): string {
  return long ? MONTHS_LONG[i] : MONTHS[i]
}

// Active (non-archived) children of a habit. Empty for leaf habits.
export function childrenOf(habitId: string, habits: Habit[]): Habit[] {
  return habits.filter((h) => h.parentId === habitId && !h.archivedAt)
}

// The habits that count as slots on a given date: every applicable leaf
// (a habit with no active children) — childless habits and sub-habits alike.
// Parent habits are grouping rows, never counted directly, so their children
// aren't double-counted. Each returned habit is "done" when its own log exists.
export function applicableLeafHabits(habits: Habit[], date: string): Habit[] {
  return habits.filter(
    (h) => isHabitApplicable(h, date) && childrenOf(h.id, habits).length === 0,
  )
}

// Whether a habit counts as done on a given date. A leaf habit (no active
// children) uses its own log row; a parent habit is done only when every one
// of its active children is logged that day.
export function isHabitDoneOn(
  habit: Habit,
  habits: Habit[],
  logs: HabitLog,
  date: string,
): boolean {
  const kids = childrenOf(habit.id, habits)
  if (kids.length === 0) return !!logs[`${habit.id}:${date}`]
  return kids.every((c) => !!logs[`${c.id}:${date}`])
}

// Streak for any habit, honoring the parent/child rules via isHabitDoneOn.
// Mirrors computeStreak's "today may be unticked without breaking the streak".
// A parent's streak may reach back before the parent itself was created —
// down to its earliest child's creation — so grouping habits you've already
// kept up doesn't reset the visible streak to zero. (It still breaks on the
// first day not every child was done, e.g. before a later child existed.)
export function computeHabitStreak(
  habit: Habit,
  habits: Habit[],
  logs: HabitLog,
): number {
  const kids = childrenOf(habit.id, habits)
  const earliestCreatedAt =
    kids.length > 0 ? Math.min(habit.createdAt, ...kids.map((k) => k.createdAt)) : habit.createdAt
  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const cur = new Date(today)
  while (cur.getTime() >= new Date(earliestCreatedAt).setHours(0, 0, 0, 0)) {
    if (isHabitDoneOn(habit, habits, logs, fmtDate(cur))) {
      streak++
      cur.setDate(cur.getDate() - 1)
    } else {
      if (fmtDate(cur) === fmtDate(today)) {
        cur.setDate(cur.getDate() - 1)
        continue
      }
      break
    }
  }
  return streak
}

export function computeStreak(
  habitId: string,
  logs: HabitLog,
  createdAt: number,
): number {
  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const cur = new Date(today)
  while (cur.getTime() >= new Date(createdAt).setHours(0, 0, 0, 0)) {
    if (logs[`${habitId}:${fmtDate(cur)}`]) {
      streak++
      cur.setDate(cur.getDate() - 1)
    } else {
      // allow today to be unticked without breaking streak
      if (fmtDate(cur) === fmtDate(today)) {
        cur.setDate(cur.getDate() - 1)
        continue
      }
      break
    }
  }
  return streak
}

export function getRange(
  view: "week" | "month" | "year" | "all",
  state: StoreState,
  extraEarliest: number[] = [],
): { start: Date; end: Date; label: string } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (view === "week") {
    const s = startOfWeek(today)
    const e = new Date(s)
    e.setDate(s.getDate() + 6)
    return { start: s, end: e, label: "This week" }
  }
  if (view === "month") {
    const s = new Date(today.getFullYear(), today.getMonth(), 1)
    const e = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    return { start: s, end: e, label: fmtMonthYear(today) }
  }
  if (view === "year") {
    const s = new Date(today.getFullYear(), 0, 1)
    const e = new Date(today.getFullYear(), 11, 31)
    return { start: s, end: e, label: `${today.getFullYear()}` }
  }
  // all
  const earliestTask = Math.min(
    ...state.tasks.map((t) => parseDate(t.date).getTime()),
    ...state.habits.map((h) => h.createdAt),
    ...extraEarliest,
    today.getTime(),
  )
  return { start: new Date(earliestTask), end: today, label: "All time" }
}
