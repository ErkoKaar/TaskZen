// Runs on a pg_cron schedule (every minute). Sends any scheduled_notifications
// rows whose send_at has passed, via Web Push — independent of whether the
// client is open, so it works even with a locked screen / closed app.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:hello@focusloop.app",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

export default {
  fetch: withSupabase({ auth: ["secret"] }, async (_req, ctx) => {
    const { data: due, error } = await ctx.supabaseAdmin
      .from("scheduled_notifications")
      .select("id, user_id, title, body")
      .lte("send_at", new Date().toISOString())
      .eq("sent", false)
      .limit(200);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    for (const notif of due ?? []) {
      const { data: subs } = await ctx.supabaseAdmin
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", notif.user_id);

      for (const sub of subs ?? []) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({ title: notif.title, body: notif.body, url: "/" }),
          );
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            // Subscription no longer valid on the push service's end.
            await ctx.supabaseAdmin
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", sub.endpoint);
          } else {
            console.error("Failed to send push notification", err);
          }
        }
      }

      await ctx.supabaseAdmin
        .from("scheduled_notifications")
        .update({ sent: true })
        .eq("id", notif.id);
    }

    return Response.json({ processed: due?.length ?? 0 });
  }),
};
