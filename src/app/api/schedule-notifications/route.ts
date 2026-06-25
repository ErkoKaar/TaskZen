import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type ScheduleItem = { offsetSeconds: number; title: string; body: string }

// Replaces the current user's pending (not-yet-sent) scheduled notifications
// with a fresh set. Pass an empty `items` array to just clear — used when the
// timer is paused or cancelled, so a locked phone doesn't get a stale alert.
export async function POST(request: Request) {
  const { items } = (await request.json()) as { items: ScheduleItem[] }

  const supabase = await createClient()
  const { data: userRes } = await supabase.auth.getUser()
  if (!userRes.user) {
    return NextResponse.json({ success: false }, { status: 401 })
  }

  await supabase
    .from("scheduled_notifications")
    .delete()
    .eq("user_id", userRes.user.id)
    .eq("sent", false)

  if (items.length > 0) {
    const now = Date.now()
    const rows = items.map((item) => ({
      user_id: userRes.user!.id,
      send_at: new Date(now + item.offsetSeconds * 1000).toISOString(),
      title: item.title,
      body: item.body,
    }))
    const { error } = await supabase.from("scheduled_notifications").insert(rows)
    if (error) {
      console.error("Failed to schedule notifications", error)
      return NextResponse.json({ success: false }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
