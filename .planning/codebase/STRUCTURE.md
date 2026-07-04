# Codebase Structure

**Analysis Date:** 2026-07-04

## Directory Layout

```
TaskZen/
├── public/                     # Static assets served as-is (icons, PWA files)
│   ├── sw.js                   # Hand-written service worker (push notifications)
│   ├── icon*.png, apple-icon.png, icon.svg  # App/PWA icons
│   └── taskzen_pulse_v3_*.png  # Logo assets
├── src/
│   ├── app/                    # Next.js App Router — routes, layouts, route handlers
│   │   ├── layout.tsx           # Root layout: fonts, SW registration, FocusTimerProvider
│   │   ├── page.tsx              # FocusLoop app root ("/")
│   │   ├── manifest.ts           # PWA web manifest
│   │   ├── globals.css           # Tailwind v4 theme + global styles
│   │   ├── favicon.ico
│   │   ├── login/page.tsx        # Login page (username + password form)
│   │   ├── register/page.tsx     # Registration page
│   │   ├── tasks/                # Task Manager ("TaskZen") app
│   │   │   ├── page.tsx           # Tasks/Habits daily view (week/month)
│   │   │   ├── habits/page.tsx    # Standalone habit management
│   │   │   ├── projects/page.tsx  # Projects board (criticality, auto-expiry)
│   │   │   └── statistics/page.tsx # Aggregate stats across tasks/habits/projects
│   │   └── api/                  # Route Handlers (server endpoints)
│   │       ├── notify/route.ts               # Send immediate Web Push
│   │       └── schedule-notifications/route.ts # Replace pending scheduled notifications
│   ├── components/
│   │   ├── ui/                   # Low-level shared UI primitives (shadcn-style)
│   │   │   └── button.tsx
│   │   ├── focusloop/             # FocusLoop-specific components
│   │   │   ├── focus-timer.tsx    # Main timer UI (config + running state)
│   │   │   ├── timer-ring.tsx     # SVG countdown ring
│   │   │   ├── statistics-view.tsx # Per-activity time stats chart
│   │   │   └── notification-toggle.tsx # Push subscription opt-in/out toggle
│   │   ├── tasks/                 # Task Manager-specific components
│   │   │   ├── check-box.tsx      # Custom checkbox control
│   │   │   ├── criticality-picker.tsx # Critical/Warning/On-track selector
│   │   │   ├── ghost-input.tsx    # Inline "add item" placeholder input
│   │   │   ├── nav-tabs.tsx       # Tasks/Projects/Habits/Statistics nav
│   │   │   └── view-tabs.tsx      # Generic week/month (or similar) view switch
│   │   ├── app-switcher.tsx        # FocusLoop <-> Task Manager switcher + sign out
│   │   ├── site-header.tsx         # Shared sticky header shell
│   │   └── register-service-worker.tsx # Registers public/sw.js on mount
│   └── lib/
│       ├── supabase/               # Supabase client factories (per execution context)
│       │   ├── client.ts           # Browser client ("use client" code)
│       │   ├── server.ts           # Server client (RSC/Server Actions, cookie-based)
│       │   ├── admin.ts            # Service-role client (bypasses RLS, server-only)
│       │   └── middleware.ts       # Session-refresh logic used by src/proxy.ts
│       ├── auth/actions.ts          # Server Actions: signIn, signUp, signOut
│       ├── notifications/
│       │   ├── actions.ts          # Server Actions: push subscribe/unsubscribe
│       │   └── notify.ts           # Client: compute + POST notification schedule
│       ├── tasks/
│       │   ├── store.ts            # useStore(): tasks/habits/habit_logs hook + date helpers
│       │   └── projects-store.ts   # useProjectsStore(): projects/project_tasks hook + sweep
│       ├── focusloop/
│       │   ├── activities.ts       # Activity CRUD + default-activity seeding
│       │   ├── sessions.ts         # Record focus sessions, compute activity stats
│       │   ├── data.ts             # Formatting helpers + draft-config localStorage
│       │   ├── sound.ts            # Web Audio chime playback
│       │   └── timer-store.tsx     # FocusTimerProvider: global timer session Context
│       └── utils.ts                 # `cn()` class-merge helper (clsx + tailwind-merge)
│   └── proxy.ts                    # Next.js 16 "proxy" (replaces middleware.ts) — auth gate
├── supabase/
│   ├── config.toml                 # Supabase CLI project config
│   ├── schema.sql                  # Full DB schema: tables, RLS policies, indexes, realtime pub
│   └── functions/
│       └── send-due-notifications/ # Deno Edge Function, pg_cron-triggered push sender
│           ├── index.ts
│           └── deno.json
├── tsconfig.json                   # `@/*` -> `src/*` path alias
├── next.config.ts                  # Default Next.js config (no custom overrides)
├── eslint.config.mjs               # eslint-config-next (core-web-vitals + typescript)
└── package.json
```

## Directory Purposes

**`src/app`:**
- Purpose: Route definitions using the Next.js App Router file conventions.
- Contains: `page.tsx` (route UI, almost always `"use client"`), `route.ts` (API handlers), `layout.tsx`, `manifest.ts`.
- Key files: `src/app/layout.tsx` (only server-rendered shell in the app), `src/app/tasks/page.tsx` (largest page, week/month task+habit view).

**`src/components`:**
- Purpose: Reusable UI, split by app (`focusloop/`, `tasks/`) plus shared cross-app pieces at the top level and generic primitives in `ui/`.
- Contains: Presentational and lightly-stateful client components. No test files.
- Key files: `src/components/site-header.tsx` (shared header shell used by both apps' pages).

**`src/lib`:**
- Purpose: All non-UI logic — Supabase access, domain state hooks, server actions, formatting helpers.
- Contains: One subdirectory per concern (`supabase`, `auth`, `notifications`, `tasks`, `focusloop`) plus a flat `utils.ts`.
- Key files: `src/lib/supabase/client.ts`/`server.ts`/`admin.ts` (the three client factories — pick based on execution context).

**`supabase`:**
- Purpose: Everything owned by the Supabase project but not by the Next.js app: DB schema and Edge Functions.
- Contains: `schema.sql` (hand-maintained, no migration files/framework — this file is the single source of truth and is expected to be idempotent, using `create table if not exists` / guarded `do $$ ... $$` blocks), `functions/send-due-notifications` (separate Deno runtime, excluded from the main `tsconfig.json` via `exclude`).
- Generated: `supabase/.temp/` (git-ignored, Supabase CLI local state).

**`public`:**
- Purpose: Static files served verbatim at the site root.
- Contains: PWA icons/manifest assets and `sw.js` — the actual service worker script (not generated by a bundler; hand-written and registered by `src/components/register-service-worker.tsx`).

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root layout for every route.
- `src/proxy.ts`: Auth/session gate for every non-static request (Next.js 16 renamed `middleware.ts` → `proxy.ts`; see `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`).
- `src/app/page.tsx`: FocusLoop app root (`/`).
- `src/app/tasks/page.tsx`: Task Manager app root (`/tasks`).

**Configuration:**
- `tsconfig.json`: `@/*` path alias → `src/*`; excludes `supabase/functions` (separate Deno project).
- `next.config.ts`: Default, unmodified.
- `eslint.config.mjs`: `eslint-config-next` core-web-vitals + typescript rule sets.
- `.env.local` / `.env.local.example`: Environment variables (never read/committed — see `.env.local.example` for the expected keys).
- `supabase/config.toml`: Supabase CLI project settings.

**Core Logic:**
- `src/lib/tasks/store.ts`: Tasks/Habits domain hook + date-range/streak helper functions used across Task Manager pages.
- `src/lib/tasks/projects-store.ts`: Projects domain hook, including the 24h client-side auto-delete sweep.
- `src/lib/focusloop/timer-store.tsx`: The single most complex file in the app — cross-device timer session state machine.
- `supabase/schema.sql`: Canonical definition of every table and RLS policy; read this before adding any new persisted field.

**Testing:**
- None present. No test runner, config, or `*.test.*`/`*.spec.*` files exist anywhere in the repo.

## Naming Conventions

**Files:**
- Components: kebab-case `.tsx` (e.g. `focus-timer.tsx`, `check-box.tsx`, `ghost-input.tsx`), one primary export per file matching the file's purpose (not always PascalCase-matching the filename, e.g. `app-switcher.tsx` exports `AppSwitcher`).
- Lib modules: kebab-case `.ts`/`.tsx` grouped by domain folder (`src/lib/<domain>/<concern>.ts`), e.g. `src/lib/tasks/projects-store.ts`, `src/lib/focusloop/timer-store.tsx`.
- Route files: fixed Next.js names (`page.tsx`, `layout.tsx`, `route.ts`, `manifest.ts`) — never renamed.

**Directories:**
- App Router segments are lowercase, matching the URL path exactly (`tasks/habits`, `tasks/projects`, `tasks/statistics`).
- `src/lib` and `src/components` both split by domain (`tasks/`, `focusloop/`) rather than by technical layer.

**Code identifiers:**
- React components: PascalCase (`FocusTimer`, `TasksNavTabs`, `AppSwitcher`).
- Hooks: `use` prefix, camelCase (`useStore`, `useProjectsStore`, `useFocusTimer`).
- Supabase row types vs. domain types: DB rows use snake_case fields (matching Postgres columns, e.g. `created_at`, `habit_id`); everything past the initial `.select()`/mapping step is converted to camelCase domain types (`Task`, `Habit`, `Project`) — see the `fromRow`-style mapping blocks in `store.ts`, `projects-store.ts`, `timer-store.tsx`.
- Server Actions: verbs matching the form action (`signIn`, `signUp`, `signOut`, `subscribeUser`, `unsubscribeUser`).

## Where to Add New Code

**New Feature within Task Manager (e.g. a new tab):**
- Route: `src/app/tasks/<feature>/page.tsx`
- Nav entry: add to `NAV_ITEMS` in `src/components/tasks/nav-tabs.tsx`
- State/data access: new hook in `src/lib/tasks/<feature>-store.ts` following the `useStore`/`useProjectsStore` pattern (local `useState`, Supabase calls inline, optimistic update + manual rollback)
- Schema: add tables/policies to `supabase/schema.sql` (RLS policy `auth.uid() = user_id` is the established convention for every table)

**New Feature within FocusLoop:**
- Domain logic: `src/lib/focusloop/<concern>.ts`
- UI: `src/components/focusloop/<component>.tsx`
- If it needs to persist across navigation/devices like the timer does, follow the `focus_timer_state` pattern: a single-row-per-user table + Realtime publication + `FocusTimerProvider`-style Context, not a page-local hook.

**New shared UI primitive:**
- `src/components/ui/<name>.tsx` (currently only `button.tsx` exists here; this is the shadcn-style primitives folder).

**New cross-app component:**
- Top level of `src/components/` (alongside `site-header.tsx`, `app-switcher.tsx`).

**New Supabase-backed data:**
- Add the table + RLS policy to `supabase/schema.sql` first.
- Add a client factory call via the existing `src/lib/supabase/client.ts` (browser) or `server.ts` (Server Component/Action) — never construct a Supabase client ad hoc.
- If the mutation needs to bypass RLS (e.g. resolving data before the user is authenticated), use `src/lib/supabase/admin.ts` and keep it strictly server-only (never imported from a `"use client"` file — see the comment at the top of `admin.ts`).

**New server-side push/notification logic:**
- Route Handlers: `src/app/api/<name>/route.ts` (pattern: read session via `createClient()` from `server.ts`, return 401 if unauthenticated).
- Cron/independent-of-client logic: `supabase/functions/<name>/index.ts` (separate Deno project, excluded from the main TS project — see `tsconfig.json` `exclude`).

## Special Directories

**`.next/`:**
- Purpose: Next.js build output.
- Generated: Yes.
- Committed: No (git-ignored).

**`supabase/.temp/`:**
- Purpose: Supabase CLI local state.
- Generated: Yes.
- Committed: No (git-ignored).

**`.planning/`:**
- Purpose: GSD planning/codebase-mapping artifacts (this document's own home).
- Generated: Yes (by GSD tooling).
- Committed: Project-dependent; not part of the application runtime.

**`supabase/functions/send-due-notifications/`:**
- Purpose: Deno-runtime Supabase Edge Function, deployed independently of the Next.js build.
- Generated: No (hand-written).
- Committed: Yes; explicitly excluded from `tsconfig.json`'s TypeScript project since it uses Deno-specific imports (`@supabase/functions-js/edge-runtime.d.ts`, `@supabase/server`).

---

*Structure analysis: 2026-07-04*
