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
