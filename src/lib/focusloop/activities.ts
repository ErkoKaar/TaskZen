"use client"

import { createClient } from "@/lib/supabase/client"

export type Activity = {
  id: string
  name: string
  color: string
}

const DEFAULT_ACTIVITIES = [
  { name: "Deep Work", color: "var(--chart-1)" },
  { name: "Reading", color: "var(--chart-2)" },
  { name: "Studying", color: "var(--chart-3)" },
  { name: "Writing", color: "var(--chart-4)" },
  { name: "Coding", color: "var(--chart-1)" },
  { name: "Design", color: "var(--chart-2)" },
  { name: "Music Practice", color: "var(--chart-3)" },
  { name: "Language Learning", color: "var(--chart-4)" },
]

export async function listActivities(): Promise<Activity[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("activities")
    .select("id, name, color")
    .order("created_at", { ascending: true })
  if (error) throw error
  if (data && data.length > 0) return data

  // First time for this user — seed the same defaults the prototype shipped with.
  // Upsert + ignoreDuplicates guards against a double-seed race (e.g. two tabs,
  // or React Strict Mode's double effect invocation in dev).
  const { error: seedError } = await supabase
    .from("activities")
    .upsert(DEFAULT_ACTIVITIES, { onConflict: "user_id,name", ignoreDuplicates: true })
  if (seedError) throw seedError

  const { data: seeded, error: refetchError } = await supabase
    .from("activities")
    .select("id, name, color")
    .order("created_at", { ascending: true })
  if (refetchError) throw refetchError
  return seeded ?? []
}

export async function createActivity(input: {
  name: string
  color: string
}): Promise<Activity> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("activities")
    .insert(input)
    .select("id, name, color")
    .single()
  if (error) throw error
  return data
}
