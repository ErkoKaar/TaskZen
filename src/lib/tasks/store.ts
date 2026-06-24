"use client"

import { useEffect, useState, useCallback } from "react"

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

const STORAGE_KEY = "taskmgr.v1"

const initialState: StoreState = {
  tasks: [],
  habits: [],
  habitLogs: {},
}

type Listener = () => void
const listeners = new Set<Listener>()
let state: StoreState = initialState
let loaded = false

function load() {
  if (loaded || typeof window === "undefined") return
  loaded = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) state = { ...initialState, ...JSON.parse(raw) }
  } catch {}
}

function persist() {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
}

function setState(updater: (s: StoreState) => StoreState) {
  state = updater(state)
  persist()
  listeners.forEach((l) => l())
}

export function useStore() {
  load()
  const [, setTick] = useState(0)
  useEffect(() => {
    const l = () => setTick((t) => t + 1)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])

  const addTask = useCallback(
    (input: { title: string; date: string }) =>
      setState((s) => ({
        ...s,
        tasks: [
          ...s.tasks,
          {
            id: crypto.randomUUID(),
            title: input.title,
            date: input.date,
            done: false,
            createdAt: Date.now(),
          },
        ],
      })),
    [],
  )

  const toggleTask = useCallback(
    (id: string) =>
      setState((s) => ({
        ...s,
        tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
      })),
    [],
  )

  const deleteTask = useCallback(
    (id: string) =>
      setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) })),
    [],
  )

  const addHabit = useCallback(
    (input: { name: string }) =>
      setState((s) => ({
        ...s,
        habits: [
          ...s.habits,
          {
            id: crypto.randomUUID(),
            name: input.name,
            createdAt: Date.now(),
          },
        ],
      })),
    [],
  )

  const deleteHabit = useCallback(
    (id: string) =>
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
      }),
    [],
  )

  const toggleHabit = useCallback(
    (habitId: string, date: string) =>
      setState((s) => {
        const key = `${habitId}:${date}`
        const newLogs = { ...s.habitLogs }
        if (newLogs[key]) delete newLogs[key]
        else newLogs[key] = true
        return { ...s, habitLogs: newLogs }
      }),
    [],
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
