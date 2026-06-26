# TaskZen

A Next.js + Supabase app combining two tools under one shell, switchable from the navbar:

- **FocusLoop** — circular Pomodoro-style focus timer with custom activities, statistics, sound
  effects, and server-scheduled push notifications (work even with a locked screen).
- **Task Manager** — daily tasks, habits (with streaks, archive/restore), and statistics.

Installable as a PWA. All data is scoped per-user via Supabase Auth (username-based login) and
Postgres Row Level Security.

## Features

- **Username-based auth** (Supabase Auth under the hood) — sign in with a username, not an email;
  the server resolves username → email via an admin client before authenticating.
- **FocusLoop** — custom focus/rest activities, a circular countdown timer, sound effects on phase
  change, and a statistics view of past sessions.
- **Task Manager** — daily tasks scoped by date, habits with streak tracking and archive/restore,
  and a statistics view.
- **Push notifications** — scheduled server-side (Supabase Edge Function on a `pg_cron` schedule)
  so reminders fire even with the app closed or the screen locked, rather than relying on a
  client-side timer.
- **PWA** — installable on phone or desktop, with a custom service worker.

## Tech stack

**Frontend** — Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4,
shadcn/ui, Recharts (statistics charts), lucide-react (icons).

**Backend** — [Supabase](https://supabase.com): Postgres (all tables behind Row Level Security —
every row scoped to the authenticated user), Supabase Auth, and one Deno Edge Function
(`supabase/functions/send-due-notifications`) invoked on a `pg_cron` schedule to deliver due push
notifications. There is no separate backend server — the client talks to Supabase directly (plus
a couple of Next.js Route Handlers / Server Actions for things that need the service-role key,
like username → email resolution and notification scheduling).

**Hosting** — [Vercel](https://vercel.com) (frontend), Supabase (database/auth/functions).

## Project structure

```
src/
  app/
    page.tsx                 FocusLoop (home route)
    tasks/                   Task Manager: tasks, habits, statistics
    login/, register/        Username-based auth pages
    api/schedule-notifications/  Route Handler: schedules push notifications server-side
    manifest.ts              PWA manifest
  components/
    focusloop/                FocusTimer, TimerRing, StatisticsView, notification toggle
    tasks/                    NavTabs, ViewTabs
    ui/                       shadcn/ui components
    app-switcher.tsx          Navbar switch between FocusLoop and Task Manager
    site-header.tsx, register-service-worker.tsx
  lib/
    supabase/                 client.ts, server.ts, admin.ts (service role), middleware.ts
    auth/actions.ts            signIn/signUp/signOut server actions (username → email resolution)
    focusloop/                 activities, session data, sound effects
    tasks/store.ts              Tasks/habits/habitLogs state, synced via Supabase
    notifications/              rescheduleNotifications() + phase-based reminder computation
  proxy.ts                    Refreshes the Supabase session on matching requests (Next.js 16
                               renamed `middleware.ts` to `proxy.ts`)
supabase/
  schema.sql                  Full DB schema: tables, RLS policies, scheduled_notifications,
                               pg_cron schedule — run manually in the Supabase SQL editor
  functions/
    send-due-notifications/   Edge Function that sends due push notifications via web-push
public/
  sw.js                       Custom service worker (PWA caching + push notification handling)
```

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in your Supabase project URL/anon key + VAPID keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables (`.env.local`)

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API (server-only, never expose to the client) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Generate with `npx web-push generate-vapid-keys` |

## Database setup

Run `supabase/schema.sql` in your Supabase project's **SQL Editor** before first use — it creates
every table, RLS policy, and the `scheduled_notifications` table/cron schedule the app needs.

## Push notifications setup

Real Web Push needs a deployed Edge Function, not just the SQL editor:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=...
npx supabase functions deploy send-due-notifications
```

The `pg_cron` schedule in `supabase/schema.sql` calls the function every minute; it only sends
notifications whose `send_at` has passed and are not yet marked `sent`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Next.js dev server (Turbopack) |
| `npm run build` | Build the app for production |
| `npm run start` | Serve the production build locally |
| `npm run lint` | Run ESLint |

## Deployment

Deployed on [Vercel](https://vercel.com). Set the environment variables above in the project
settings, then push to the connected branch.

## Notes on the architecture

- **No separate backend** — the client talks to Supabase directly (Postgres + RLS as the
  authorization model). The few operations that need elevated privileges (resolving a username to
  an email at login, scheduling push notifications) go through Next.js Server Actions / Route
  Handlers using the Supabase service-role key, never exposed to the client.
- **Username-based login** is a thin layer over Supabase Auth's email/password flow: a `profiles`
  table maps `username → user id`, and `signIn` looks up the email server-side via the admin
  client before calling `signInWithPassword`.
- **Push notifications are server-scheduled, not client-timed** — the client posts the desired
  schedule to `/api/schedule-notifications`, which writes rows into `scheduled_notifications`;
  delivery is handled entirely by the `send-due-notifications` Edge Function on its `pg_cron`
  schedule, so reminders still fire if the tab is closed or the screen is locked.
