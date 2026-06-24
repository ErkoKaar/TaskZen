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
          .select("id, name, created_at")
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
        if (error) console.error("Failed to update task", error)
      })
  }, [state.tasks])

  const deleteTask = useCallback((id: string) => {
    setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }))
    const supabase = createClient()
    supabase
      .from("tasks")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.error("Failed to delete task", error)
      })
  }, [])

  const addHabit = useCallback((input: { name: string }) => {
    const supabase = createClient()
    supabase
      .from("habits")
      .insert({ name: input.name })
      .select("id, name, created_at")
      .single()
      .then(({ data, error }) => {
        if (error || !data) return console.error("Failed to add habit", error)
        setState((s) => ({
          ...s,
          habits: [
            ...s.habits,
            { id: data.id, name: data.name, createdAt: new Date(data.created_at).getTime() },
          ],
        }))
      })
  }, [])

  const deleteHabit = useCallback((id: string) => {
    setState((s) => {
      const newLogs = { ...s.habitLogs }
      Object.keys(newLogs).forEach((k) => {
        if (k.startsWith(`${id}:`)) delete newLogs[k]
      })
      return {
        ...s,
        habits: s.habits.filter((h) => h.id !== id),
        habitLogs: newLogs,
      }
    })
    const supabase = createClient()
    supabase
      .from("habits")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.error("Failed to delete habit", error)
      })
  }, [])

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

      const supabase = createClient()
      if (wasSet) {
        supabase
          .from("habit_logs")
          .delete()
          .eq("habit_id", habitId)
          .eq("date", date)
          .then(({ error }) => {
            if (error) console.error("Failed to unmark habit", error)
          })
      } else {
        supabase
          .from("habit_logs")
          .insert({ habit_id: habitId, date })
          .then(({ error }) => {
            if (error) console.error("Failed to mark habit", error)
          })
      }
    },
    [state.habitLogs],
  )

  return {
    state,
    addTask,
    toggleTask,
    deleteTask,
    addHabit,
    deleteHabit,
    toggleHabit,
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
    today.getTime(),
  )
  return { start: new Date(earliestTask), end: today, label: "All time" }
}
