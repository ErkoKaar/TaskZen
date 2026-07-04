# Codebase Concerns

**Analysis Date:** 2026-07-04

## Tech Debt

**Duplicated optimistic-update + rollback boilerplate:**
- Issue: Every mutation (`addTask`, `toggleTask`, `deleteTask`, `archiveHabit`, `restoreHabit`, `deleteHabit`, `toggleHabit` in `src/lib/tasks/store.ts`; `addProject`, `setProjectCriticality`, `toggleProjectDone`, `toggleTaskDone`, `deleteProject`, `deleteProjectTask` in `src/lib/tasks/projects-store.ts`; `pause`, `resume`, `cancel` in `src/lib/focusloop/timer-store.tsx`) hand-writes the same three-step shape: snapshot previous value → optimistic `setState` → fire Supabase call → on error, manually replay the inverse `setState`. There is no shared helper.
- Files: `src/lib/tasks/store.ts`, `src/lib/tasks/projects-store.ts`, `src/lib/focusloop/timer-store.tsx`
- Impact: ~15 near-identical rollback blocks. Any future mutation added without carefully mirroring both halves will silently desync UI state from the database on failure.
- Fix approach: Extract a small `optimisticMutation({ apply, revert, request })` helper used by all three stores.

**No shared error surfacing to the user:**
- Issue: Every failed Supabase call (`console.error("Failed to ...", error)`) only logs to the console; the optimistic UI state is quietly rolled back with no toast/banner telling the user their action didn't save.
- Files: `src/lib/tasks/store.ts`, `src/lib/tasks/projects-store.ts`, `src/lib/focusloop/timer-store.tsx`, `src/lib/notifications/actions.ts`, `src/lib/notifications/notify.ts`
- Impact: On flaky network/RLS/auth failures, a user's checked box or new task can revert without any visible explanation — looks like a UI glitch rather than a save failure.
- Fix approach: Add a lightweight toast/notification surface and route caught errors there in addition to `console.error`.

**Authorization relies solely on RLS, with no defense-in-depth filters:**
- Issue: Several delete/sweep queries omit an explicit `user_id` (or equivalent) filter and depend entirely on the Postgres RLS policy (`auth.uid() = user_id`) to scope the operation to the caller's own rows.
- Files: `src/lib/tasks/projects-store.ts:86-99` (`sweep()` runs `.from("projects").delete().lt("completed_at", cutoffIso)` and the equivalent for `project_tasks`, with no `.eq("user_id", ...)`), `src/lib/notifications/actions.ts:32-37` (`unsubscribeUser` runs `.from("push_subscriptions").delete().eq("endpoint", endpoint)` with no user scoping)
- Impact: Correct today because every RLS policy in `supabase/schema.sql` enforces `auth.uid() = user_id`, but there is zero defense-in-depth — a single mistaken/missing/dropped policy (e.g. during a future migration) would silently turn these into cross-user deletes.
- Fix approach: Add explicit `.eq("user_id", uid)` filters alongside RLS on every delete/sweep query, so a policy regression fails closed instead of open.

**No request validation on API routes:**
- Issue: `src/app/api/notify/route.ts` and `src/app/api/schedule-notifications/route.ts` destructure `await request.json()` directly into typed variables with no runtime schema validation (no zod/yup) and no try/catch around the parse.
- Files: `src/app/api/notify/route.ts:12`, `src/app/api/schedule-notifications/route.ts:10`
- Impact: A malformed JSON body throws inside the route handler and surfaces as an unhandled 500 rather than a clean 400. `items` array length and `title`/`body` string length are also unbounded — a buggy client could insert unbounded rows into `scheduled_notifications` or send an oversized push payload.
- Fix approach: Validate body shape and cap `items.length` / string lengths before use.

**No column length constraints on user-supplied text:**
- Issue: `title`, `name`, `body` columns across `tasks`, `habits`, `projects`, `project_tasks`, `scheduled_notifications` are plain `text` with no `check (char_length(...) < n)` constraint.
- Files: `supabase/schema.sql`
- Impact: Combined with the missing client/API-side length caps (e.g. `src/components/tasks/ghost-input.tsx` has no `maxLength`), nothing currently stops arbitrarily long strings from being persisted.
- Fix approach: Add a reasonable `check` constraint per text column and a matching client-side `maxLength`.

## Known Bugs

**Failed push notifications are marked "sent" and never retried:**
- Symptoms: If `webpush.sendNotification` throws a transient error (network blip, push-service rate limit, anything other than 404/410), the code only `console.error`s it — the surrounding loop still reaches the unconditional `update({ sent: true })` for that notification afterward.
- Files: `supabase/functions/send-due-notifications/index.ts` (lines ~38-59)
- Trigger: Any non-4xx/410 failure from the push service during the per-minute cron run.
- Workaround: None — the user simply never receives that scheduled notification, with no visibility that it was dropped.

**Username-enumeration timing side-channel at login:**
- Symptoms: `signIn` returns the same generic "Invalid username or password" message whether the username doesn't exist or the password is wrong, but the code path length differs: an unknown username redirects immediately, whereas a known username performs an extra `admin.auth.admin.getUserById` call plus a full `signInWithPassword` attempt before failing.
- Files: `src/lib/auth/actions.ts:9-45`
- Trigger: Comparing response latency for a known vs. unknown username.
- Workaround: None currently; would need artificial delay padding on the fast path to close the gap.

## Security Considerations

**No rate limiting on auth or notification endpoints:**
- Risk: `signIn`/`signUp` (`src/lib/auth/actions.ts`) and `/api/notify`, `/api/schedule-notifications` (`src/app/api/`) have no application-level throttling. An authenticated user could hammer `/api/notify` to spam their own devices, or repeatedly hit login to brute-force a password (mitigated only by whatever Supabase Auth enforces server-side).
- Files: `src/lib/auth/actions.ts`, `src/app/api/notify/route.ts`, `src/app/api/schedule-notifications/route.ts`
- Current mitigation: Supabase Auth's own internal throttling (not verified in this repo), RLS scoping limits blast radius to the attacker's own data.
- Recommendations: Add basic rate limiting (e.g. per-IP/per-user) at the route level for login and notification endpoints.

**Service-role (RLS-bypassing) client used directly in user-facing server actions:**
- Risk: `createAdminClient()` (`src/lib/supabase/admin.ts`) bypasses RLS entirely and is invoked directly inside `signIn`/`signUp` (`src/lib/auth/actions.ts`) to resolve username → email and to insert the profile row. This is necessary (pre-auth lookup), but it means any future edit to these functions that reuses `admin` for an unrelated query would silently bypass all row-level security with no compiler-enforced guardrail.
- Files: `src/lib/supabase/admin.ts`, `src/lib/auth/actions.ts`
- Current mitigation: Comment in `admin.ts` documents "Server-only, never import from a 'use client' file" and usage is currently narrowly scoped to the two necessary lookups.
- Recommendations: Keep admin-client usage confined to `src/lib/auth/actions.ts`; consider wrapping the two specific queries (`getUserByUsername`, `createProfile`) in named functions in `admin.ts` itself so no other file needs to import the raw admin client.

**Push/notification payload content is fully client-controlled:**
- Risk: `/api/schedule-notifications` accepts arbitrary `title`/`body` strings per item with no server-side validation, and the client itself decides notification wording via `computeSchedule` (`src/lib/notifications/notify.ts`). Not currently exploitable beyond a user sending themselves arbitrary push text, but there is no server-side allowlist of expected notification templates.
- Files: `src/app/api/schedule-notifications/route.ts`, `src/lib/notifications/notify.ts`
- Current mitigation: RLS scopes all writes/reads to the authenticated user's own `scheduled_notifications` rows.
- Recommendations: Low priority given self-scoped impact; consider validating title/body against the known set of app-generated messages if this endpoint is ever exposed more broadly.

## Performance Bottlenecks

**Sequential push delivery in the notification cron function:**
- Problem: `supabase/functions/send-due-notifications/index.ts` processes due notifications with a `for..of` loop, sending each subscription's push sequentially (`await webpush.sendNotification(...)` inside the loop) and capping the batch at 200 rows (`.limit(200)`) per invocation.
- Files: `supabase/functions/send-due-notifications/index.ts`
- Cause: No batching/parallelism within a cron tick.
- Improvement path: Use `Promise.allSettled` per batch (mirroring the parallel approach already used in `src/app/api/notify/route.ts`) if per-minute backlog ever approaches the 200-row cap.

**Unbounded, uncached client-side data loading:**
- Problem: `useStore()` and `useProjectsStore()` fetch the user's entire `tasks`/`habits`/`habit_logs` and `projects`/`project_tasks`/`project_completions` tables in full on every mount, with no pagination, windowing, or cache reuse across route navigations.
- Files: `src/lib/tasks/store.ts` (`load()`), `src/lib/tasks/projects-store.ts` (`load()`)
- Cause: Simple full-table `select()` with no `limit`/range filtering — acceptable at current scale (personal task/habit lists) but will degrade linearly as history grows (habit_logs in particular grows one row per habit per day, forever).
- Improvement path: Add a date-range filter for `habit_logs`/`tasks` fetches once history grows large enough to matter; consider archiving very old `habit_logs`.

## Fragile Areas

**Cross-device focus-timer phase advancement:**
- Files: `src/lib/focusloop/timer-store.tsx` (`advancePhase`, `FocusTimerProvider`)
- Why fragile: Correctness depends on a compare-and-swap `.eq("phase", ...).eq("current_round", ...)` filter matching exactly the columns that determine "this specific transition." A future change that adds a new per-phase field (e.g. a per-round custom duration) must also be folded into every CAS filter in `advancePhase`, or two devices open at once could double-process the same transition (duplicate `focus_sessions` row, duplicate notification reschedule).
- Safe modification: Any new mutable field on `focus_timer_state` must be added to the `.eq(...)` chain of every `advancePhase` update, not just the `set` clause.
- Test coverage: None — no automated test exercises the CAS logic or the multi-tab race it guards against.

**Non-null assertions on required environment variables:**
- Files: `src/app/api/notify/route.ts:7-8` (`process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!`, `process.env.VAPID_PRIVATE_KEY!`), `src/lib/supabase/middleware.ts:9-10`, `src/lib/supabase/admin.ts`, `supabase/functions/send-due-notifications/index.ts:9-10`
- Why fragile: A missing/misnamed env var in any deployment environment doesn't fail with a clear startup error — it throws (or silently passes `undefined` to a third-party SDK) the first time the route/module runs, producing an opaque runtime failure.
- Safe modification: Any new required env var should follow the same pattern as the rest of the codebase (`!` assertion) for consistency, but consider adding a single startup-time env check if misconfiguration in production becomes a recurring issue.
- Test coverage: None.

**Client-side-only 24h retention sweep for projects:**
- Files: `src/lib/tasks/projects-store.ts` (`sweep()`, `SWEEP_INTERVAL_MS`, `RETENTION_MS`)
- Why fragile: Completed projects/tasks older than 24h are only deleted when a browser tab with the app open runs the `setInterval(sweep, 5 min)` loop or on next `load()`. A user who never reopens the app after completing a project keeps that row (and its "will delete in Xh" UI claim becomes stale/incorrect) indefinitely — there is no server-side cron equivalent (unlike `send-due-notifications`, which does run server-side).
- Safe modification: If this needs to be guaranteed rather than best-effort, add a Supabase Edge Function + pg_cron sweep mirroring `send-due-notifications`.
- Test coverage: None.

## Scaling Limits

**`habit_logs` grows unbounded, one row per habit per day, forever:**
- Current capacity: Fine for the current per-user scale (a handful of habits, single-digit years of history).
- Limit: `useStore()` (`src/lib/tasks/store.ts`) fetches the entire `habit_logs` table for the user on every load with no date filtering; a multi-year, multi-habit history will mean an ever-growing full-table fetch on every page mount.
- Scaling path: Filter `habit_logs`/`tasks` queries to a bounded recent window plus separately fetch older data on demand for statistics views.

## Dependencies at Risk

**Bleeding-edge Next.js / React versions:**
- Risk: `package.json` pins `next@16.2.9` and `react@19.2.4`/`react-dom@19.2.4` — versions newer than this assistant's training data, and the project's own `CLAUDE.md` explicitly warns "This is NOT the Next.js you know... Read the relevant guide in `node_modules/next/dist/docs/` before writing any code." This signals the API surface is actively diverging from widely-documented Next.js behavior.
- Impact: Any code change or new feature risks silently relying on outdated assumptions about Next.js/React conventions (routing, server actions, caching) unless the in-repo docs are checked first.
- Migration plan: Not applicable (staying current is the intent) — but every phase of work touching routing/server actions/data fetching should re-check `node_modules/next/dist/docs/` rather than assume prior-version behavior.

## Test Coverage Gaps

**No test framework or test files exist anywhere in the repository:**
- What's not tested: Everything. There is no `jest.config.*`, `vitest.config.*`, `playwright.config.*`, or any `*.test.*`/`*.spec.*` file in the repo.
- Files: Notably untested pure-logic functions with nontrivial date/time arithmetic: `computeStreak`, `getRange`, `startOfWeek`, `isHabitApplicable`, `rangeDates` (`src/lib/tasks/store.ts`); `computeSchedule` (`src/lib/notifications/notify.ts`); `liveSecondsLeft` and the CAS logic in `advancePhase` (`src/lib/focusloop/timer-store.tsx`); the 24h retention `sweep()` logic (`src/lib/tasks/projects-store.ts`).
- Risk: These functions are easy to silently regress (off-by-one on streak counts, wrong week/month boundaries, incorrect notification offsets, premature/late deletion) with no automated signal — issues would only surface as user-visible bugs in production.
- Priority: High for the pure date/schedule logic listed above (cheap to unit test, high regression risk); Medium for the Supabase-integrated store functions (would need integration/mocking setup first).

---

*Concerns audit: 2026-07-04*
