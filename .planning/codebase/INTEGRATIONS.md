# External Integrations

**Analysis Date:** 2026-07-04

## APIs & External Services

**Push Notifications:**
- Web Push protocol via the `web-push` npm package
  - SDK/Client: `web-push` (`src/app/api/notify/route.ts`, `supabase/functions/send-due-notifications/index.ts`)
  - Auth: VAPID key pair — `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` (Next.js app env), `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` (Deno Edge Function env, set as Supabase project secrets)
  - Sender identity: `mailto:hello@focusloop.app` (hardcoded VAPID subject in both `src/app/api/notify/route.ts:6` and `supabase/functions/send-due-notifications/index.ts:8`)
  - Delivery targets: browser push endpoints stored in the `push_subscriptions` table, invalidated (row deleted) on `404`/`410` responses from the push service

## Data Storage

**Databases:**
- Supabase-hosted Postgres (single database for everything: auth, tasks/habits, FocusLoop, push notifications)
  - Connection: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (browser/server/middleware clients), `SUPABASE_SERVICE_ROLE_KEY` (admin/service-role client, bypasses RLS)
  - Client: `@supabase/supabase-js` (admin) and `@supabase/ssr` (browser/server/middleware, cookie-based sessions)
  - Schema source of truth: `supabase/schema.sql` (run manually in the Supabase SQL editor — no migration tool/CLI-managed migrations detected)
  - Row Level Security (RLS) enabled on every table, policies scoped to `auth.uid() = user_id`
  - Realtime: `focus_timer_state` table added to the `supabase_realtime` publication (`supabase/schema.sql:169-179`) for live cross-device sync of the active FocusLoop session
  - Scheduled jobs: `pg_cron` (referenced in `README.md` and Edge Function comments) triggers the `send-due-notifications` Edge Function every minute to flush due `scheduled_notifications` rows

**File Storage:**
- Not detected. No Supabase Storage bucket usage or other file/blob storage found. All PWA icons/assets are static files under `public/`.

**Caching:**
- Browser-side only: custom service worker (`public/sw.js`) caches immutable static assets (`/_next/static/*`, icons, `manifest.webmanifest`) via the Cache API. No server-side cache (Redis, CDN cache config, etc.) detected.

## Authentication & Identity

**Auth Provider:**
- Supabase Auth, wrapped in a custom username-based login flow (Supabase Auth itself is email/password-based)
  - Implementation: `src/lib/auth/actions.ts` — `signUp` creates a Supabase Auth user by email, then inserts a `profiles` row mapping `username → id`; `signIn` resolves `username → email` via the service-role admin client (`src/lib/supabase/admin.ts`) before calling `supabase.auth.signInWithPassword`, since the username lookup must happen pre-authentication
  - Session handling: cookie-based via `@supabase/ssr`, refreshed on every matching request in `src/proxy.ts` → `src/lib/supabase/middleware.ts` (`updateSession`). Note: Next.js 16 renamed `middleware.ts` to `proxy.ts` as the file-based hook name — this app follows that convention.
  - Public (unauthenticated) routes: `/login`, `/register` (`PUBLIC_PATHS` in `src/lib/supabase/middleware.ts:4`); all other routes redirect to `/login` if no session
  - Server-side route handlers (`src/app/api/notify/route.ts`, `src/app/api/schedule-notifications/route.ts`) independently check `supabase.auth.getUser()` and return 401 if unauthenticated

## Monitoring & Observability

**Error Tracking:**
- Not detected. No Sentry/Bugsnag/etc. integration found.

**Logs:**
- `console.error` calls scattered through server actions and route handlers for failure paths (e.g. `src/lib/notifications/actions.ts`, `src/app/api/notify/route.ts`, `src/app/api/schedule-notifications/route.ts`). No structured logging or log aggregation service.

## CI/CD & Deployment

**Hosting:**
- Vercel (frontend/Next.js app), per `README.md`. No `vercel.json` present in the repo (relies on Vercel's zero-config Next.js detection).

**CI Pipeline:**
- Not detected. No `.github/workflows/`, `.gitlab-ci.yml`, or other CI config found in the repo.

## Environment Configuration

**Required env vars (Next.js app, `.env.local`):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY` (server-only)

**Required env vars (Supabase Edge Function, project secrets — separate from `.env.local`):**
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

**Secrets location:**
- Local development: `.env.local` (gitignored; `.env.local.example` documents the shape, committed)
- Production: Vercel project environment variables (Next.js app) + Supabase project secrets (Edge Function) — not present as files in this repo

## Webhooks & Callbacks

**Incoming:**
- None. No inbound webhook endpoints detected (no Stripe/GitHub/etc. webhook handlers).

**Outgoing:**
- Browser → `POST /api/notify` (`src/app/api/notify/route.ts`) - triggers an immediate push notification to all of the current user's subscriptions
- Browser → `POST /api/schedule-notifications` (`src/app/api/schedule-notifications/route.ts`) - replaces the current user's pending `scheduled_notifications` rows (called from `src/lib/notifications/notify.ts` `rescheduleNotifications()`)
- Supabase Edge Function → Web Push service endpoints (browser push providers, e.g. FCM/Mozilla push) via `web-push`'s `sendNotification`, on a `pg_cron`-driven schedule

---

*Integration audit: 2026-07-04*
