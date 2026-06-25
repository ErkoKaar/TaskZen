"use server"

import { createClient } from "@/lib/supabase/server"

type PushSubscriptionJSON = {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export async function subscribeUser(sub: PushSubscriptionJSON) {
  const supabase = await createClient()
  const { data: userRes } = await supabase.auth.getUser()
  if (!userRes.user) return { success: false }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userRes.user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    { onConflict: "endpoint" },
  )
  if (error) {
    console.error("Failed to store push subscription", error)
    return { success: false }
  }
  return { success: true }
}

export async function unsubscribeUser(endpoint: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
  if (error) console.error("Failed to remove push subscription", error)
  return { success: !error }
}
