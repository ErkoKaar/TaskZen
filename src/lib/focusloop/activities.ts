"use client"

import { createClient } from "@/lib/supabase/client"

export type Activity = {
  id: string
  name: string
  color: string
}

export async function listActivities(): Promise<Activity[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("activities")
    .select("id, name, color")
    .order("created_at", { ascending: true })
  if (error) throw error
  return data ?? []
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
