# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# UI work
If the user's prompt contains the word "UI", invoke the `/ui-ux-pro-max` skill before doing anything else.
# userEmail
The user's email address is erko.kaar@gmail.com.
# currentDate
Today's date is 2026-07-04.

<!-- GSD:project-start source:PROJECT.md -->
## Project

**TaskZen — Task Manager Visual Redesign**

A visual-only redesign of TaskZen's Task Manager module (Tasks, Habits, Statistics, Projects pages). The app already works — same CRUD, same data, same navigation — but the interface feels visually flat and "dead," especially on desktop where generous whitespace is paired with small, unremarkable type, leaving screens feeling mostly empty. This redesign makes the module feel dark, rich, and "alive" through animation, a more expressive color palette, and better-used space, without touching functionality.

**Core Value:** Every existing capability (task/habit/project CRUD, statistics) must keep working exactly as it does today — the redesign only changes how it looks and feels, never what it does.

### Constraints

- **Functional parity**: Every visible piece of information and every CRUD action must remain identical in *capability* — only presentation changes. Treat any behavior change as a bug.
- **Dark-only**: No light theme to design or maintain for this module.
- **Brand alignment**: New palette must read as a natural extension of the existing pulse-logo gradient (teal-green → violet), not a disconnected new brand.
- **Stack**: Next.js 16 (App Router) + React 19, Tailwind v4, shadcn/ui, Supabase — no new state-management or animation libraries unless a real gap is found.
- **Next.js version drift**: Framework has breaking changes vs. training data — check `node_modules/next/dist/docs/` for anything routing/server/proxy-related.
- **No automated tests**: Verification is manual, in-browser, on both desktop (primary pain point) and mobile/PWA (must not regress).
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5 (strict mode) - all application code under `src/`
- SQL (PostgreSQL) - `supabase/schema.sql`
- TypeScript (Deno runtime) - `supabase/functions/send-due-notifications/index.ts` (Supabase Edge Function, not part of the Next.js build; excluded in `tsconfig.json` via `"exclude": ["supabase/functions", ...]`)
- JavaScript (vanilla, no build step) - `public/sw.js` (custom PWA service worker)
## Runtime
- Node.js (local dev observed: v24.14.1; no `.nvmrc` or `engines` field pins a version — treat as untracked/floating)
- Next.js 16.2.9 server runtime for SSR/route handlers/server actions
- Deno runtime for the Supabase Edge Function (`supabase/functions/send-due-notifications/`)
- npm (lockfile: `package-lock.json` present, v2/v3 format)
- The Edge Function has its own `supabase/functions/send-due-notifications/.npmrc` and `deno.json` (separate dependency resolution from the main app — Deno's npm compat layer)
## Frameworks
- Next.js 16.2.9 - App Router, Turbopack, Server Components, Server Actions, Route Handlers
- React 19.2.4 / react-dom 19.2.4 - UI layer
- Tailwind CSS v4 (`^4`, via `@tailwindcss/postcss`) - styling, config-free v4 approach (no `tailwind.config.*` file present)
- shadcn (`shadcn@^4.11.0` CLI/registry package) + `class-variance-authority`, `clsx`, `tailwind-merge` - component variant styling (`src/components/ui/button.tsx`)
- `@base-ui/react` (^1.6.0) - unstyled primitive components underlying the shadcn-style UI
- `tw-animate-css` - Tailwind animation utility classes
- `recharts` (^3.9.0) - statistics charts (`src/components/focusloop/statistics-view.tsx`, `src/app/tasks/statistics/page.tsx`)
- `lucide-react` (^1.21.0) - icon set
- Not detected. No test runner, test config, or `*.test.*`/`*.spec.*` files found in the repo.
- `next dev` / `next build` / `next start` (scripts in `package.json`)
- ESLint 9 (flat config) - `eslint.config.mjs`, extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- PostCSS - `postcss.config.mjs` (single plugin: `@tailwindcss/postcss`)
## Key Dependencies
- `@supabase/supabase-js` (^2.108.2) - Supabase JS client (used directly for the admin/service-role client)
- `@supabase/ssr` (^0.12.0) - SSR-aware Supabase clients for browser/server/middleware (cookie-based session handling)
- `web-push` - sends Web Push notifications; used in `src/app/api/notify/route.ts` and duplicated (Deno/npm-compat import) in the Edge Function. **Not listed in root `package.json` dependencies** despite being imported directly in `src/app/api/notify/route.ts:2` — present only in `node_modules/web-push` (likely a transitive dependency or an unpinned direct dependency that was removed from `package.json` by accident). Flag for verification.
- `@supabase/functions-js` (Deno import, edge-runtime types only) - used in the Edge Function via `"@supabase/functions-js/edge-runtime.d.ts"`
- `@supabase/server` (Deno import) - `withSupabase` helper used in the Edge Function for handling auth/service-role Supabase client injection
## Configuration
- `.env.local` (gitignored, present locally) / `.env.local.example` (committed, documents required vars) drive all runtime config
- Required variables (from `.env.local.example`):
- The Edge Function reads its own Deno env vars (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` — note: no `NEXT_PUBLIC_` prefix there, set separately via Supabase project secrets, not `.env.local`)
- `next.config.ts` - effectively empty (`NextConfig = {}`), no custom Next.js config in use
- `tsconfig.json` - strict mode, `moduleResolution: "bundler"`, path alias `@/*` → `./src/*`, excludes `supabase/functions`, `frontend`, `backend` (the latter two directories do not currently exist — leftover/defensive excludes)
- `postcss.config.mjs` - Tailwind v4 PostCSS plugin only
## Platform Requirements
- Node.js + npm
- A linked Supabase project (local `supabase/.temp/` shows a linked project ref) for auth/DB during development, or a local Supabase stack via `supabase/config.toml`
- Hosting: Vercel (per `README.md`) - frontend/Next.js app
- Database/Auth/Edge Functions: Supabase (Postgres + Auth + one Deno Edge Function `send-due-notifications`, invoked on a `pg_cron` schedule)
- No separate custom backend server; the client talks to Supabase directly plus a small number of Next.js Route Handlers/Server Actions requiring the service-role key
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- kebab-case for all files: `check-box.tsx`, `criticality-picker.tsx`, `ghost-input.tsx`, `nav-tabs.tsx`, `view-tabs.tsx`, `timer-store.tsx`, `projects-store.ts`
- One primary export per file, file name matches the main export in kebab-case (e.g. `CheckBox` → `check-box.tsx`, `useProjectsStore` → `projects-store.ts`)
- Route files follow Next.js App Router conventions: `page.tsx`, `route.ts`, `layout.tsx`, `manifest.ts`
- camelCase throughout: `fmtDate`, `parseDate`, `isHabitApplicable`, `computeStreak`, `getRange`
- Hooks prefixed `use`: `useStore` (`src/lib/tasks/store.ts`), `useProjectsStore` (`src/lib/tasks/projects-store.ts`), `useFocusTimer` (`src/lib/focusloop/timer-store.tsx`)
- CRUD-style action names on stores: `addTask`, `toggleTask`, `deleteTask`, `addHabit`, `archiveHabit`, `restoreHabit`, `deleteHabit`, `toggleHabit` — verb + noun, no `handle`/`on` prefixes inside store hooks
- Server actions use bare verb names: `signIn`, `signUp`, `signOut` (`src/lib/auth/actions.ts`)
- camelCase for locals and object fields in TypeScript-land: `createdAt`, `archivedAt`, `phaseSecondsLeft`
- Supabase/Postgres columns stay snake_case at the boundary and are mapped to camelCase immediately after fetch (see "Data Mapping" below): `created_at` → `createdAt`, `habit_id` → `habitId`
- Constants are SCREAMING_SNAKE_CASE at module scope: `SWEEP_INTERVAL_MS`, `RETENTION_MS`, `NAV_ITEMS`, `WEEKDAYS`, `MONTHS`, `PUBLIC_PATHS`, `CRITICALITY_COLORS`
- PascalCase for all types: `Task`, `Habit`, `HabitLog`, `Project`, `ProjectTask`, `Criticality`, `StoreState`, `ActiveSession`, `TimerPhase`
- `type` is used almost exclusively over `interface` (12 `type` declarations found, 0 `interface` declarations in `src/`) — **always use `type`, not `interface`**, for consistency
- Inline object-literal types for component props are common and preferred for simple components rather than named types (see `src/components/tasks/check-box.tsx`, `src/components/tasks/ghost-input.tsx`)
- A private "wire" `type Row = {...}` (snake_case fields matching the DB row) paired with a `from Row(row): Domain` mapper function is the standard shape for Supabase-backed stores (`src/lib/focusloop/timer-store.tsx:33-61`)
## Code Style
- No Prettier config present (no `.prettierrc*` file, no `prettier` in `package.json`). Formatting is enforced only by convention/eyeballing, not tooling.
- **No semicolons** in the vast majority of files. Only 3 files use semicolons: `src/app/layout.tsx`, `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts` — these three appear to be scaffold-generated (Supabase quickstart) and are the exception, not the rule. New code should omit semicolons.
- **Double quotes** for strings almost everywhere. The single exception is `src/components/ui/button.tsx`, which uses single quotes — this is an unmodified `shadcn`-generated primitive; do not treat it as the house style. New code should use double quotes.
- 2-space indentation throughout.
- Long Tailwind `className` strings are wrapped with template literals or `cn()` and broken across lines by responsibility (state-based variants) rather than by character count — see `src/components/tasks/check-box.tsx:9-13` and `src/components/tasks/nav-tabs.tsx:25-32`.
- ESLint via flat config `eslint.config.mjs`, extending `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`. No custom rules added — relies entirely on Next.js defaults.
- `npm run lint` invokes `eslint` with no extra flags.
- `tsconfig.json` has `"strict": true`. No `any` usage found anywhere in `src/` (`grep -rn ": any\|as any"` returns nothing) — **strict typing is enforced by convention; do not introduce `any`.**
## Import Organization
- `@/*` → `./src/*`, configured in `tsconfig.json` under `compilerOptions.paths`.
## Error Handling
- **Optimistic-update-then-reconcile** is the dominant pattern: state is updated in `setState` immediately, then the Supabase call runs, and on `error` the previous value is restored via a captured `previous`/`removed` variable. See `toggleTask`, `deleteTask`, `archiveHabit`, `restoreHabit`, `deleteHabit`, `toggleHabit` in `src/lib/tasks/store.ts`, and the mirrored pattern in `src/lib/tasks/projects-store.ts` (`setProjectCriticality`, `toggleProjectDone`, `deleteProject`).
- All async Supabase calls use the `.then(({ data, error }) => ...)` promise-chain form (not `await`) inside `useCallback` bodies that are not themselves `async` — this keeps the callback synchronous for the optimistic-update half while still handling the async result.
- Errors are never thrown to the UI layer from these mutators; they are logged via `console.error("Failed to <action>", error)` with a consistent `"Failed to <verb> <noun>"` message format, and the optimistic change is rolled back.
- The one-time `load()` effect is the exception: it uses `async/await` and *does* throw (`if (tasksRes.error) throw tasksRes.error`), caught by a trailing `.catch((err) => console.error("Failed to load <x> data", err))` — see `src/lib/tasks/store.ts:45-85` and `src/lib/tasks/projects-store.ts:102-158`.
- `src/lib/auth/actions.ts` funnels all failure branches through `redirect()` with a URL-encoded `error` query param and a single generic message (`INVALID_CREDENTIALS`) to avoid leaking which check failed (user-enumeration hygiene).
- `src/app/api/notify/route.ts` returns `NextResponse.json({ success: false }, { status: 401 })` for auth failures and `{ success: true }` on success; per-item failures inside a `Promise.all` map are caught individually and logged rather than failing the whole batch.
- Non-throwing style is preferred: check `error`/`data` from Supabase responses and branch, rather than wrapping in `try/catch`, except where a third-party SDK (e.g. `webpush.sendNotification`) can throw — those calls are wrapped in `try/catch` per-item (`src/app/api/notify/route.ts:27-40`).
## Data Mapping (DB boundary)
- Every Supabase-backed store keeps Postgres's snake_case columns (`created_at`, `habit_id`, `phase_started_at`) out of the rest of the app: the `.select(...)` call lists exact columns, and the result is mapped inline (or via a `fromRow` helper) into a camelCase domain type before being placed into state.
- Timestamps are stored as ISO strings in Postgres and as `number` (epoch ms via `Date.getTime()`) in local state; conversion happens exactly at the mapping boundary (`new Date(row.created_at).getTime()`), never deeper in the UI.
## Comments
- Comments explain *why*, not *what* — used to record non-obvious invariants, edge cases, and design decisions rather than restating code. Examples:
- Terse one-line comments mark structural sections in flatter files, e.g. `// helpers` in `src/lib/tasks/store.ts:321`.
- Two Supabase boilerplate files (`src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`) contain Estonian-language comments explaining client vs. server usage context — these are pre-existing scaffold comments; match the existing language if editing those specific files, otherwise write comments in English.
- Not used anywhere in `src/`. Types and inline comments carry documentation instead — do not introduce JSDoc blocks unless matching an existing pattern.
## Function Design
## Module Design
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## System Overview
```text
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
- No custom backend server — Supabase is the entire backend (Postgres, Auth, Realtime, Edge Functions).
- No global client-side state library (Redux/Zustand/etc). Each domain has its own bespoke `"use client"` hook (`useStore`, `useProjectsStore`) that owns a local `useState` and manually syncs to Supabase with optimistic updates + manual rollback on error.
- Row-Level Security (RLS) is the authorization boundary, not application code — every table's policy is `auth.uid() = user_id`, and `user_id` defaults to `auth.uid()` server-side.
- The only cross-device/cross-tab sync mechanism is Supabase Realtime, and only one table (`focus_timer_state`) is wired to it — used to keep the FocusLoop timer session consistent across devices.
- Server Actions (`"use server"` files) are used for auth and push-subscription mutations; Route Handlers are used where a `fetch()` call is more natural (notification scheduling/sending) or where a third-party push protocol is involved.
- Next.js 16 naming: middleware is named `proxy.ts` at `src/proxy.ts` (not `middleware.ts`), per this Next major version's file convention.
## Layers
- Purpose: Route-level composition, layout, and presentational/interactive components.
- Location: `src/app/**/page.tsx`, `src/components/**`
- Contains: Client components (`"use client"`) almost everywhere pages have interactivity; a couple of pure server components (`layout.tsx`, `manifest.ts`).
- Depends on: the store/hook layer (`src/lib/tasks`, `src/lib/focusloop`), shared UI primitives (`src/components/ui`), `cn()` util.
- Used by: Next.js router.
- Purpose: Encapsulate a domain's client-side state + Supabase read/write, with optimistic updates.
- Location: `src/lib/tasks/store.ts`, `src/lib/tasks/projects-store.ts`, `src/lib/focusloop/timer-store.tsx`, `src/lib/focusloop/activities.ts`, `src/lib/focusloop/sessions.ts`
- Contains: React hooks (`useStore`, `useProjectsStore`) and a Context provider (`FocusTimerProvider`) plus plain async functions for FocusLoop.
- Depends on: `src/lib/supabase/client.ts` (browser Supabase client).
- Used by: Pages and components that need domain data.
- Purpose: Operations that must run with cookie-based session context or need secrets (VAPID keys, service-role key).
- Location: `src/lib/auth/actions.ts`, `src/lib/notifications/actions.ts` (both `"use server"`), `src/app/api/notify/route.ts`, `src/app/api/schedule-notifications/route.ts`
- Contains: Server Actions and Route Handlers.
- Depends on: `src/lib/supabase/server.ts`, `src/lib/supabase/admin.ts`, `web-push`.
- Used by: Client components (`signIn`/`signOut` forms), `src/lib/notifications/notify.ts` (fetches the route handlers).
- Purpose: Construct the right Supabase client for the current execution context.
- Location: `src/lib/supabase/client.ts` (browser), `server.ts` (RSC/Server Actions, cookie-based), `admin.ts` (service-role, bypasses RLS), `middleware.ts` (session refresh for the proxy).
- Depends on: `@supabase/ssr`, `@supabase/supabase-js`, `next/headers`.
- Used by: every domain hook, every server action, `src/proxy.ts`.
- Purpose: Durable storage, authorization (RLS), realtime change feed.
- Location: `supabase/schema.sql` (tables: `profiles`, `activities`, `focus_sessions`, `tasks`, `habits`, `habit_logs`, `push_subscriptions`, `scheduled_notifications`, `focus_timer_state`, `projects`, `project_tasks`, `project_completions`).
- Depends on: Supabase Auth (`auth.users`).
- Used by: every Supabase client above; the Edge Function via `ctx.supabaseAdmin`.
- Purpose: Send push notifications on a schedule independent of any open client/tab.
- Location: `supabase/functions/send-due-notifications/index.ts` (Deno runtime, deployed to Supabase, triggered by pg_cron — not part of the Next.js build).
- Depends on: `web-push`, Supabase admin context (`withSupabase`).
## Data Flow
### Primary Request Path (authenticated page load)
### FocusLoop Timer Cross-Device Sync
### Auth Flow
- No app-wide store; state lives in one Context (`FocusTimerProvider`, global) and several page-scoped hooks (`useStore`, `useProjectsStore`) that re-fetch on mount. All persistence is via direct Supabase calls, not via a single API layer.
## Key Abstractions
- Purpose: Bundle a domain's state + CRUD actions with optimistic UI behind one hook call.
- Examples: `src/lib/tasks/store.ts` (`useStore`), `src/lib/tasks/projects-store.ts` (`useProjectsStore`).
- Pattern: `useState` + `useCallback` actions; every mutation updates local state immediately, then calls Supabase, then rolls back on error inside the `.then(({ error }) => ...)` callback.
- Purpose: Provide the correctly-scoped Supabase client for browser vs. server vs. privileged server code.
- Examples: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/admin.ts`.
- Pattern: Each exports a single `createClient`/`createAdminClient` factory function; never a shared singleton instance (called fresh per operation).
- Purpose: Handle `<form action={...}>` submissions without a client-side fetch.
- Examples: `signIn`, `signUp`, `signOut` (`src/lib/auth/actions.ts`), `subscribeUser`/`unsubscribeUser` (`src/lib/notifications/actions.ts`).
- Pattern: `"use server"` file, reads `FormData`, calls `redirect()` on success/failure paths.
## Entry Points
- Location: `src/app/layout.tsx`
- Triggers: Every route render.
- Responsibilities: Loads fonts, sets metadata/viewport, mounts `RegisterServiceWorker` and the app-wide `FocusTimerProvider`.
- Triggers: Every request matching the `config.matcher` (excludes static assets, `favicon.ico`, `manifest.webmanifest`, `sw.js`, images).
- Responsibilities: Session refresh + auth gate (redirect to `/login` unless path is `/login` or `/register`).
- Location: `src/app/page.tsx`
- Responsibilities: Timer/Statistics tab switch for the FocusLoop app.
- Location: `src/app/tasks/page.tsx` and siblings.
- Responsibilities: Daily task/habit view (week/month), standalone habits management, projects board, aggregate statistics.
- Location: `src/app/api/notify/route.ts`, `src/app/api/schedule-notifications/route.ts`
- Triggers: `fetch()` calls from `src/lib/notifications/notify.ts` and any direct caller wanting to send an immediate push.
- Responsibilities: Send an immediate Web Push notification; replace a user's pending scheduled notifications.
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
### Direct Supabase table access inline in hooks (no data-access layer)
## Error Handling
- Supabase call result destructured as `{ data, error }`; `if (error) console.error(...)` followed by manual state revert.
- Bulk loads (`Promise.all` in `useStore`/`useProjectsStore`) `throw` on any query error, caught by a single `.catch(err => console.error(...))` at the call site — a failure in any one of the parallel queries aborts the whole initial load.
- Server Actions (`src/lib/auth/actions.ts`) use `redirect()` with an `?error=` query param to communicate failure back to the login/register pages instead of throwing.
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
