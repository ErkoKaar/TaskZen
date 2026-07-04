<!-- refreshed: 2026-07-04 -->
# Architecture

**Analysis Date:** 2026-07-04

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                      Next.js App Router (src/app)                    │
├───────────────────┬───────────────────┬─────────────────────────────┤
│  FocusLoop (`/`)   │  Task Manager     │  Auth pages                 │
│  `src/app/page.tsx`│  `src/app/tasks/*`│ `src/app/login|register`   │
├───────────────────┴───────────────────┴─────────────────────────────┤
│  Route Handlers (API): `src/app/api/notify`,                        │
│  `src/app/api/schedule-notifications`                                │
└───────────────────────────────┬───────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Client hooks / "store" layer (`src/lib/tasks`,          │
│              `src/lib/focusloop`, `src/lib/notifications`)           │
│  "use client" hooks (useStore, useProjectsStore, FocusTimerProvider)  │
│  own local React state and sync it to Supabase directly              │
└───────────────────────────────┬───────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│           Supabase clients (`src/lib/supabase/*`)                    │
│  client.ts (browser), server.ts (RSC/actions), admin.ts (service     │
│  role), middleware.ts (session refresh, used by src/proxy.ts)        │
└───────────────────────────────┬───────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Supabase Postgres (`supabase/schema.sql`) — RLS-scoped per user,     │
│  Realtime publication for `focus_timer_state`                        │
│  + Supabase Edge Function `send-due-notifications` (pg_cron, Deno)   │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Root layout | Mounts fonts, PWA service-worker registration, global `FocusTimerProvider` | `src/app/layout.tsx` |
| `proxy.ts` | Next.js 16 "proxy" (replaces old `middleware.ts`) — refreshes Supabase session, redirects unauthenticated users | `src/proxy.ts` |
| `updateSession` | Reads/refreshes Supabase auth cookies, gates all non-public paths | `src/lib/supabase/middleware.ts` |
| FocusLoop page | Timer + Statistics tab switcher for the `/` app | `src/app/page.tsx` |
| `FocusTimerProvider` | App-wide singleton for the active focus/rest session; persists to `focus_timer_state`, subscribes to Realtime, drives chimes/notifications | `src/lib/focusloop/timer-store.tsx` |
| Task Manager pages | Tasks/Habits (daily, date-keyed) view | `src/app/tasks/page.tsx` |
| Habits page | Standalone habit management (add/archive/restore/delete) | `src/app/tasks/habits/page.tsx` |
| Projects page | Independent project/task-list model with criticality + auto-expiry | `src/app/tasks/projects/page.tsx` |
| Statistics page (tasks) | Aggregates tasks/habits/projects completion stats | `src/app/tasks/statistics/page.tsx` |
| `useStore` | Client hook: loads/mutates `tasks`, `habits`, `habit_logs` with optimistic UI + rollback | `src/lib/tasks/store.ts` |
| `useProjectsStore` | Client hook: loads/mutates `projects`, `project_tasks`, `project_completions`, periodic 24h sweep of completed rows | `src/lib/tasks/projects-store.ts` |
| `activities.ts` / `sessions.ts` / `data.ts` | FocusLoop domain helpers: activity CRUD + seeding, session recording/stats, formatting/draft-config persistence | `src/lib/focusloop/*.ts` |
| Notification actions | Server actions for push subscription CRUD | `src/lib/notifications/actions.ts` |
| Notification scheduling | Client-side schedule computation + POST to route handler | `src/lib/notifications/notify.ts` |
| `/api/notify` | Sends an immediate Web Push notification to all of a user's subscriptions | `src/app/api/notify/route.ts` |
| `/api/schedule-notifications` | Replaces a user's pending `scheduled_notifications` rows | `src/app/api/schedule-notifications/route.ts` |
| `send-due-notifications` | Supabase Edge Function (Deno, pg_cron-triggered) that sends due push notifications independent of any open client | `supabase/functions/send-due-notifications/index.ts` |
| Auth actions | Server actions for username-based sign in/up/out, using admin client to resolve username→email | `src/lib/auth/actions.ts` |
| DB schema | All tables, RLS policies, indexes, realtime publication | `supabase/schema.sql` |

## Pattern Overview

**Overall:** Next.js App Router monolith backed directly by Supabase (Postgres + Auth + Realtime + Storage-less). Two independent "apps" (FocusLoop and Task Manager/TaskZen) share one Next.js project, one Supabase project, and one auth session, switchable via `AppSwitcher`.

**Key Characteristics:**
- No custom backend server — Supabase is the entire backend (Postgres, Auth, Realtime, Edge Functions).
- No global client-side state library (Redux/Zustand/etc). Each domain has its own bespoke `"use client"` hook (`useStore`, `useProjectsStore`) that owns a local `useState` and manually syncs to Supabase with optimistic updates + manual rollback on error.
- Row-Level Security (RLS) is the authorization boundary, not application code — every table's policy is `auth.uid() = user_id`, and `user_id` defaults to `auth.uid()` server-side.
- The only cross-device/cross-tab sync mechanism is Supabase Realtime, and only one table (`focus_timer_state`) is wired to it — used to keep the FocusLoop timer session consistent across devices.
- Server Actions (`"use server"` files) are used for auth and push-subscription mutations; Route Handlers are used where a `fetch()` call is more natural (notification scheduling/sending) or where a third-party push protocol is involved.
- Next.js 16 naming: middleware is named `proxy.ts` at `src/proxy.ts` (not `middleware.ts`), per this Next major version's file convention.

## Layers

**Presentation (Pages & Components):**
- Purpose: Route-level composition, layout, and presentational/interactive components.
- Location: `src/app/**/page.tsx`, `src/components/**`
- Contains: Client components (`"use client"`) almost everywhere pages have interactivity; a couple of pure server components (`layout.tsx`, `manifest.ts`).
- Depends on: the store/hook layer (`src/lib/tasks`, `src/lib/focusloop`), shared UI primitives (`src/components/ui`), `cn()` util.
- Used by: Next.js router.

**Domain/Store Hooks:**
- Purpose: Encapsulate a domain's client-side state + Supabase read/write, with optimistic updates.
- Location: `src/lib/tasks/store.ts`, `src/lib/tasks/projects-store.ts`, `src/lib/focusloop/timer-store.tsx`, `src/lib/focusloop/activities.ts`, `src/lib/focusloop/sessions.ts`
- Contains: React hooks (`useStore`, `useProjectsStore`) and a Context provider (`FocusTimerProvider`) plus plain async functions for FocusLoop.
- Depends on: `src/lib/supabase/client.ts` (browser Supabase client).
- Used by: Pages and components that need domain data.

**Server Actions / Route Handlers (server-only):**
- Purpose: Operations that must run with cookie-based session context or need secrets (VAPID keys, service-role key).
- Location: `src/lib/auth/actions.ts`, `src/lib/notifications/actions.ts` (both `"use server"`), `src/app/api/notify/route.ts`, `src/app/api/schedule-notifications/route.ts`
- Contains: Server Actions and Route Handlers.
- Depends on: `src/lib/supabase/server.ts`, `src/lib/supabase/admin.ts`, `web-push`.
- Used by: Client components (`signIn`/`signOut` forms), `src/lib/notifications/notify.ts` (fetches the route handlers).

**Supabase Access Layer:**
- Purpose: Construct the right Supabase client for the current execution context.
- Location: `src/lib/supabase/client.ts` (browser), `server.ts` (RSC/Server Actions, cookie-based), `admin.ts` (service-role, bypasses RLS), `middleware.ts` (session refresh for the proxy).
- Depends on: `@supabase/ssr`, `@supabase/supabase-js`, `next/headers`.
- Used by: every domain hook, every server action, `src/proxy.ts`.

**Data Layer (Supabase Postgres):**
- Purpose: Durable storage, authorization (RLS), realtime change feed.
- Location: `supabase/schema.sql` (tables: `profiles`, `activities`, `focus_sessions`, `tasks`, `habits`, `habit_logs`, `push_subscriptions`, `scheduled_notifications`, `focus_timer_state`, `projects`, `project_tasks`, `project_completions`).
- Depends on: Supabase Auth (`auth.users`).
- Used by: every Supabase client above; the Edge Function via `ctx.supabaseAdmin`.

**Edge Function (independent runtime):**
- Purpose: Send push notifications on a schedule independent of any open client/tab.
- Location: `supabase/functions/send-due-notifications/index.ts` (Deno runtime, deployed to Supabase, triggered by pg_cron — not part of the Next.js build).
- Depends on: `web-push`, Supabase admin context (`withSupabase`).

## Data Flow

### Primary Request Path (authenticated page load)

1. Request hits `src/proxy.ts`, which delegates to `updateSession()` (`src/lib/supabase/middleware.ts:6`) — refreshes the Supabase session cookie and redirects to `/login` if unauthenticated and the path isn't public.
2. `src/app/layout.tsx` renders, mounting `RegisterServiceWorker` and `FocusTimerProvider` once for the whole app.
3. The target page (e.g. `src/app/tasks/page.tsx`) is a client component; on mount its domain hook (`useStore()` in `src/lib/tasks/store.ts:38`) creates a browser Supabase client and issues parallel `select` queries for `tasks`, `habits`, `habit_logs`.
4. User interactions (`addTask`, `toggleTask`, etc.) apply an optimistic local state update first, then fire the corresponding Supabase mutation; on error, the hook manually reverts the optimistic change (e.g. `src/lib/tasks/store.ts:126-132`).

### FocusLoop Timer Cross-Device Sync

1. `FocusTimerProvider` (`src/lib/focusloop/timer-store.tsx:94`) loads the current user's `focus_timer_state` row on mount and subscribes to a Realtime channel filtered by `user_id`.
2. A single 1-second `setInterval` (empty deps, lives for the app's lifetime) recomputes `secondsLeft` from `(phase_started_at, phase_seconds_left)` — never a ticked-down counter — so state is correct after any amount of time away (`liveSecondsLeft`, `timer-store.tsx:66`).
3. When a phase ends, `advancePhase()` performs a compare-and-swap UPDATE keyed on `(user_id, phase, current_round)`; if another device already advanced the same transition, the update affects zero rows and is a no-op — preventing duplicate `focus_sessions` records or notification schedules.
4. Every phase transition calls `rescheduleNotifications()` (`src/lib/notifications/notify.ts:5`), which POSTs to `/api/schedule-notifications` to replace the user's pending rows in `scheduled_notifications`.
5. Independently, the Supabase Edge Function `send-due-notifications` (pg_cron, every minute) sends any due, unsent rows via Web Push and marks them sent — working even with the client closed.

### Auth Flow

1. `signIn` (`src/lib/auth/actions.ts:9`) looks up `profiles.username` via the **admin** client (bypasses RLS, since the user isn't authenticated yet) to resolve the associated email, then calls `supabase.auth.signInWithPassword`.
2. `signUp` (`src/lib/auth/actions.ts:47`) creates the auth user, then inserts a `profiles` row via the admin client; if that insert fails (e.g. duplicate username), it deletes the just-created auth user to avoid an orphaned account — registration is all-or-nothing.

**State Management:**
- No app-wide store; state lives in one Context (`FocusTimerProvider`, global) and several page-scoped hooks (`useStore`, `useProjectsStore`) that re-fetch on mount. All persistence is via direct Supabase calls, not via a single API layer.

## Key Abstractions

**Domain Store Hook:**
- Purpose: Bundle a domain's state + CRUD actions with optimistic UI behind one hook call.
- Examples: `src/lib/tasks/store.ts` (`useStore`), `src/lib/tasks/projects-store.ts` (`useProjectsStore`).
- Pattern: `useState` + `useCallback` actions; every mutation updates local state immediately, then calls Supabase, then rolls back on error inside the `.then(({ error }) => ...)` callback.

**Supabase Client Factory (context-specific):**
- Purpose: Provide the correctly-scoped Supabase client for browser vs. server vs. privileged server code.
- Examples: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/admin.ts`.
- Pattern: Each exports a single `createClient`/`createAdminClient` factory function; never a shared singleton instance (called fresh per operation).

**Server Action Form Handler:**
- Purpose: Handle `<form action={...}>` submissions without a client-side fetch.
- Examples: `signIn`, `signUp`, `signOut` (`src/lib/auth/actions.ts`), `subscribeUser`/`unsubscribeUser` (`src/lib/notifications/actions.ts`).
- Pattern: `"use server"` file, reads `FormData`, calls `redirect()` on success/failure paths.

## Entry Points

**Root Layout:**
- Location: `src/app/layout.tsx`
- Triggers: Every route render.
- Responsibilities: Loads fonts, sets metadata/viewport, mounts `RegisterServiceWorker` and the app-wide `FocusTimerProvider`.

**`src/proxy.ts` (Next.js 16 middleware equivalent):**
- Triggers: Every request matching the `config.matcher` (excludes static assets, `favicon.ico`, `manifest.webmanifest`, `sw.js`, images).
- Responsibilities: Session refresh + auth gate (redirect to `/login` unless path is `/login` or `/register`).

**FocusLoop root (`/`):**
- Location: `src/app/page.tsx`
- Responsibilities: Timer/Statistics tab switch for the FocusLoop app.

**Task Manager root (`/tasks`, `/tasks/habits`, `/tasks/projects`, `/tasks/statistics`):**
- Location: `src/app/tasks/page.tsx` and siblings.
- Responsibilities: Daily task/habit view (week/month), standalone habits management, projects board, aggregate statistics.

**API Route Handlers:**
- Location: `src/app/api/notify/route.ts`, `src/app/api/schedule-notifications/route.ts`
- Triggers: `fetch()` calls from `src/lib/notifications/notify.ts` and any direct caller wanting to send an immediate push.
- Responsibilities: Send an immediate Web Push notification; replace a user's pending scheduled notifications.

**Supabase Edge Function:**
- Location: `supabase/functions/send-due-notifications/index.ts`
- Triggers: pg_cron schedule (every minute), outside the Next.js process entirely.
- Responsibilities: Send due, unsent `scheduled_notifications` via Web Push; clean up dead push subscriptions (404/410).

## Architectural Constraints

- **Threading:** Single-threaded per request (standard Next.js server); the FocusLoop timer's "background" behavior is simulated client-side via a `setInterval` plus a server-side cron Edge Function for when no client is open — there is no server-side timer process within the Next.js app itself.
- **Global state:** `FocusTimerProvider`'s Context (`src/lib/focusloop/timer-store.tsx`) is the only intentional app-wide state; everything else is re-fetched per page mount. `localStorage` is used for one non-critical draft (`DRAFT_KEY` in `src/lib/focusloop/data.ts:27`).
- **Circular imports:** None observed.
- **RLS as sole authorization layer:** Almost every query relies on Postgres RLS policies (`auth.uid() = user_id`) rather than application-level checks; a missing/misconfigured policy would be a silent, hard-to-detect security gap since the client code itself does not re-validate ownership.
- **No shared "API client" abstraction:** Every domain hook creates its own `createClient()` and writes raw `.from(table)` queries directly in the hook — there is no repository/service layer wrapping Supabase table access.

## Anti-Patterns

### Manual optimistic-update rollback duplicated per mutation

**What happens:** Nearly every mutation in `src/lib/tasks/store.ts` and `src/lib/tasks/projects-store.ts` repeats the same three-step shape: apply optimistic state, fire the Supabase call, and manually rewrite `setState` inside the error callback to undo it (e.g. `toggleTask`, `deleteTask`, `archiveHabit`, `setProjectCriticality`, `toggleProjectDone` all hand-roll this).
**Why it's wrong:** The rollback logic is copy-pasted with slight variations across ~10 functions in two files; a bug fixed in one rollback (e.g. `deleteHabit`'s log-restoring rollback) is not automatically fixed in the others.
**Do this instead:** Extract a small helper (e.g. `withOptimisticUpdate(apply, revert, mutate)`) used by every action, or adopt a data-fetching library (e.g. TanStack Query) that handles optimistic updates/rollback generically.

### Direct Supabase table access inline in hooks (no data-access layer)

**What happens:** Table names and column-selection strings (`"id, title, date, done, created_at"`) are written directly inside `useStore`/`useProjectsStore`/`activities.ts`/`sessions.ts`, with no shared query builders.
**Why it's wrong:** A schema change (e.g. renaming a column) requires grepping across multiple unrelated files; there's no single place to see "the shape of a Task" as fetched from the DB versus as used in the UI.
**Do this instead:** Introduce a thin per-table data-access module (e.g. `src/lib/tasks/api.ts`) that owns the select strings and row→domain-type mapping, consumed by the hooks.

## Error Handling

**Strategy:** Best-effort client-side handling: log to `console.error` and, where state was optimistically changed, revert it. No centralized error boundary or toast/notification system for failures — errors are silent to the end user in most mutation paths (e.g. a failed `deleteTask` only logs and restores the row; the user sees no message).

**Patterns:**
- Supabase call result destructured as `{ data, error }`; `if (error) console.error(...)` followed by manual state revert.
- Bulk loads (`Promise.all` in `useStore`/`useProjectsStore`) `throw` on any query error, caught by a single `.catch(err => console.error(...))` at the call site — a failure in any one of the parallel queries aborts the whole initial load.
- Server Actions (`src/lib/auth/actions.ts`) use `redirect()` with an `?error=` query param to communicate failure back to the login/register pages instead of throwing.

## Cross-Cutting Concerns

**Logging:** `console.error` only, scattered at each Supabase call site with a short human-readable prefix (e.g. `"Failed to update task"`). No structured logging or external error tracking service.
**Validation:** Minimal — mostly relies on Postgres constraints (`not null`, `check (criticality in (...))`, `unique`) and RLS policies rather than application-level input validation.
**Authentication:** Supabase Auth (email/password) with a custom username layer (`profiles.username`) resolved to email at login via the service-role client (`src/lib/supabase/admin.ts`). Session cookies refreshed by `src/proxy.ts` on every matched request.

---

*Architecture analysis: 2026-07-04*
