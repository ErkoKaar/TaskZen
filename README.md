# TaskZen

Next.js 16 + Supabase app combining two tools under one shell, switchable from the navbar:

- **FocusLoop** — circular Pomodoro-style focus timer with custom activities, statistics, sound effects, and server-scheduled push notifications (work even with a locked screen).
- **Task Manager** — daily tasks, habits (with streaks, archive/restore), and statistics.

Installable as a PWA. All data is scoped per-user via Supabase Auth (username-based login) and Postgres Row Level Security.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API (server-only, never expose to the client) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Generate with `npx web-push generate-vapid-keys` |

Database schema and RLS policies live in `supabase/schema.sql` — run it against a fresh Supabase project before first use. The `send-due-notifications` Edge Function (`supabase/functions/`) needs to be deployed and scheduled with `pg_cron` for push notifications to fire while the app is closed.

## Tech stack

Next.js 16 (App Router, Turbopack), React, Tailwind v4, shadcn/ui, Supabase (Auth + Postgres + Edge Functions), Web Push API, recharts.

## Deploy

Deployed on [Vercel](https://vercel.com). Set the environment variables above in the project settings, then push to the connected branch.
