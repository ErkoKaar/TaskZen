import { NextResponse } from "next/server"
import webpush from "web-push"
import { createClient } from "@/lib/supabase/server"

webpush.setVapidDetails(
  "mailto:hello@focusloop.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

export async function POST(request: Request) {
  const { title, body } = (await request.json()) as { title: string; body: string }

  const supabase = await createClient()
  const { data: userRes } = await supabase.auth.getUser()
  if (!userRes.user) {
    return NextResponse.json({ success: false }, { status: 401 })
  }

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userRes.user.id)

  await Promise.all(
    (subs ?? []).map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body, url: "/" }),
        )
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) {
          // Subscription no longer valid on the push service's end.
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint)
        } else {
          console.error("Failed to send push notification", err)
        }
      }
    }),
  )

  return NextResponse.json({ success: true })
}
