"use client"

import { createClient } from "@/lib/supabase/client"
import type { Activity } from "@/lib/focusloop/activities"
import type { TimeRange } from "@/lib/focusloop/data"

export type ActivityStat = {
  activity: Activity
  minutes: number
}

export async function recordSession(input: {
  activityId: string
  focusedSeconds: number
  rounds: number
  startedAt: Date
}): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from("focus_sessions").insert({
    activity_id: input.activityId,
    focused_seconds: input.focusedSeconds,
    rounds: input.rounds,
    started_at: input.startedAt.toISOString(),
  })
  if (error) throw error
}

function rangeStartDate(range: TimeRange): Date | null {
  const now = new Date()
  if (range === "all") return null
  if (range === "day") {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    return d
  }
  if (range === "week") {
    const d = new Date(now)
    const day = (d.getDay() + 6) % 7 // Monday=0
    d.setDate(d.getDate() - day)
    d.setHours(0, 0, 0, 0)
    return d
  }
  if (range === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1)
  }
  // year
  return new Date(now.getFullYear(), 0, 1)
}

type SessionRow = {
  focused_seconds: number
  activities: Activity | null
}

export async function getStats(range: TimeRange): Promise<ActivityStat[]> {
  const supabase = createClient()
  const start = rangeStartDate(range)

  let query = supabase
    .from("focus_sessions")
    .select("focused_seconds, activities ( id, name, color )")

  if (start) query = query.gte("completed_at", start.toISOString())

  const { data, error } = await query
  if (error) throw error

  const totals = new Map<string, { activity: Activity; seconds: number }>()
  for (const row of (data ?? []) as unknown as SessionRow[]) {
    const activity = row.activities
    if (!activity) continue
    const entry = totals.get(activity.id)
    if (entry) entry.seconds += row.focused_seconds
    else totals.set(activity.id, { activity, seconds: row.focused_seconds })
  }

  return [...totals.values()]
    .map(({ activity, seconds }) => ({ activity, minutes: Math.round(seconds / 60) }))
    .sort((a, b) => b.minutes - a.minutes)
}

export type DailyTotal = { date: string; minutes: number }
export type DailyStats = { days: DailyTotal[]; sessionCount: number }

export async function getDailyStats(range: TimeRange): Promise<DailyStats> {
  const supabase = createClient()
  const start = rangeStartDate(range)

  let query = supabase.from("focus_sessions").select("focused_seconds, completed_at")
  if (start) query = query.gte("completed_at", start.toISOString())

  const { data, error } = await query
  if (error) throw error

  const rows = (data ?? []) as { focused_seconds: number; completed_at: string }[]
  const secondsByDate = new Map<string, number>()
  for (const row of rows) {
    const date = row.completed_at.slice(0, 10)
    secondsByDate.set(date, (secondsByDate.get(date) ?? 0) + row.focused_seconds)
  }

  if (!start) {
    // "All time" — just the days that actually have sessions, oldest first.
    const days = [...secondsByDate.entries()]
      .map(([date, seconds]) => ({ date, minutes: Math.round(seconds / 60) }))
      .sort((a, b) => a.date.localeCompare(b.date))
    return { days, sessionCount: rows.length }
  }

  // Zero-fill every day in range so the trend line has a continuous shape,
  // not just sparse points on days that happened to have a session.
  const days: DailyTotal[] = []
  const cursor = new Date(start)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  while (cursor <= today) {
    const key = cursor.toISOString().slice(0, 10)
    days.push({ date: key, minutes: Math.round((secondsByDate.get(key) ?? 0) / 60) })
    cursor.setDate(cursor.getDate() + 1)
  }
  return { days, sessionCount: rows.length }
}
