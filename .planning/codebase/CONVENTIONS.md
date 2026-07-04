# Coding Conventions

**Analysis Date:** 2026-07-04

## Naming Patterns

**Files:**
- kebab-case for all files: `check-box.tsx`, `criticality-picker.tsx`, `ghost-input.tsx`, `nav-tabs.tsx`, `view-tabs.tsx`, `timer-store.tsx`, `projects-store.ts`
- One primary export per file, file name matches the main export in kebab-case (e.g. `CheckBox` → `check-box.tsx`, `useProjectsStore` → `projects-store.ts`)
- Route files follow Next.js App Router conventions: `page.tsx`, `route.ts`, `layout.tsx`, `manifest.ts`

**Functions:**
- camelCase throughout: `fmtDate`, `parseDate`, `isHabitApplicable`, `computeStreak`, `getRange`
- Hooks prefixed `use`: `useStore` (`src/lib/tasks/store.ts`), `useProjectsStore` (`src/lib/tasks/projects-store.ts`), `useFocusTimer` (`src/lib/focusloop/timer-store.tsx`)
- CRUD-style action names on stores: `addTask`, `toggleTask`, `deleteTask`, `addHabit`, `archiveHabit`, `restoreHabit`, `deleteHabit`, `toggleHabit` — verb + noun, no `handle`/`on` prefixes inside store hooks
- Server actions use bare verb names: `signIn`, `signUp`, `signOut` (`src/lib/auth/actions.ts`)

**Variables:**
- camelCase for locals and object fields in TypeScript-land: `createdAt`, `archivedAt`, `phaseSecondsLeft`
- Supabase/Postgres columns stay snake_case at the boundary and are mapped to camelCase immediately after fetch (see "Data Mapping" below): `created_at` → `createdAt`, `habit_id` → `habitId`
- Constants are SCREAMING_SNAKE_CASE at module scope: `SWEEP_INTERVAL_MS`, `RETENTION_MS`, `NAV_ITEMS`, `WEEKDAYS`, `MONTHS`, `PUBLIC_PATHS`, `CRITICALITY_COLORS`

**Types:**
- PascalCase for all types: `Task`, `Habit`, `HabitLog`, `Project`, `ProjectTask`, `Criticality`, `StoreState`, `ActiveSession`, `TimerPhase`
- `type` is used almost exclusively over `interface` (12 `type` declarations found, 0 `interface` declarations in `src/`) — **always use `type`, not `interface`**, for consistency
- Inline object-literal types for component props are common and preferred for simple components rather than named types (see `src/components/tasks/check-box.tsx`, `src/components/tasks/ghost-input.tsx`)
- A private "wire" `type Row = {...}` (snake_case fields matching the DB row) paired with a `from Row(row): Domain` mapper function is the standard shape for Supabase-backed stores (`src/lib/focusloop/timer-store.tsx:33-61`)

## Code Style

**Formatting:**
- No Prettier config present (no `.prettierrc*` file, no `prettier` in `package.json`). Formatting is enforced only by convention/eyeballing, not tooling.
- **No semicolons** in the vast majority of files. Only 3 files use semicolons: `src/app/layout.tsx`, `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts` — these three appear to be scaffold-generated (Supabase quickstart) and are the exception, not the rule. New code should omit semicolons.
- **Double quotes** for strings almost everywhere. The single exception is `src/components/ui/button.tsx`, which uses single quotes — this is an unmodified `shadcn`-generated primitive; do not treat it as the house style. New code should use double quotes.
- 2-space indentation throughout.
- Long Tailwind `className` strings are wrapped with template literals or `cn()` and broken across lines by responsibility (state-based variants) rather than by character count — see `src/components/tasks/check-box.tsx:9-13` and `src/components/tasks/nav-tabs.tsx:25-32`.

**Linting:**
- ESLint via flat config `eslint.config.mjs`, extending `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`. No custom rules added — relies entirely on Next.js defaults.
- `npm run lint` invokes `eslint` with no extra flags.
- `tsconfig.json` has `"strict": true`. No `any` usage found anywhere in `src/` (`grep -rn ": any\|as any"` returns nothing) — **strict typing is enforced by convention; do not introduce `any`.**

## Import Organization

**Order (observed, not enforced by tooling):**
1. `"use client"` / `"use server"` directive first (when present), followed by a blank line
2. External packages (`react`, `next/*`, third-party libs like `lucide-react`, `web-push`, `clsx`, `class-variance-authority`)
3. Internal absolute imports via the `@/*` alias (`@/lib/...`, `@/components/...`)
4. No relative imports (`../`) observed in `src/` — **always import via the `@/*` alias, never relative paths**, even for same-directory siblings.

**Path Aliases:**
- `@/*` → `./src/*`, configured in `tsconfig.json` under `compilerOptions.paths`.

## Error Handling

**Client-side stores (Supabase mutations):**
- **Optimistic-update-then-reconcile** is the dominant pattern: state is updated in `setState` immediately, then the Supabase call runs, and on `error` the previous value is restored via a captured `previous`/`removed` variable. See `toggleTask`, `deleteTask`, `archiveHabit`, `restoreHabit`, `deleteHabit`, `toggleHabit` in `src/lib/tasks/store.ts`, and the mirrored pattern in `src/lib/tasks/projects-store.ts` (`setProjectCriticality`, `toggleProjectDone`, `deleteProject`).
- All async Supabase calls use the `.then(({ data, error }) => ...)` promise-chain form (not `await`) inside `useCallback` bodies that are not themselves `async` — this keeps the callback synchronous for the optimistic-update half while still handling the async result.
- Errors are never thrown to the UI layer from these mutators; they are logged via `console.error("Failed to <action>", error)` with a consistent `"Failed to <verb> <noun>"` message format, and the optimistic change is rolled back.
- The one-time `load()` effect is the exception: it uses `async/await` and *does* throw (`if (tasksRes.error) throw tasksRes.error`), caught by a trailing `.catch((err) => console.error("Failed to load <x> data", err))` — see `src/lib/tasks/store.ts:45-85` and `src/lib/tasks/projects-store.ts:102-158`.

**Server actions / API routes:**
- `src/lib/auth/actions.ts` funnels all failure branches through `redirect()` with a URL-encoded `error` query param and a single generic message (`INVALID_CREDENTIALS`) to avoid leaking which check failed (user-enumeration hygiene).
- `src/app/api/notify/route.ts` returns `NextResponse.json({ success: false }, { status: 401 })` for auth failures and `{ success: true }` on success; per-item failures inside a `Promise.all` map are caught individually and logged rather than failing the whole batch.
- Non-throwing style is preferred: check `error`/`data` from Supabase responses and branch, rather than wrapping in `try/catch`, except where a third-party SDK (e.g. `webpush.sendNotification`) can throw — those calls are wrapped in `try/catch` per-item (`src/app/api/notify/route.ts:27-40`).

## Data Mapping (DB boundary)

- Every Supabase-backed store keeps Postgres's snake_case columns (`created_at`, `habit_id`, `phase_started_at`) out of the rest of the app: the `.select(...)` call lists exact columns, and the result is mapped inline (or via a `fromRow` helper) into a camelCase domain type before being placed into state.
- Timestamps are stored as ISO strings in Postgres and as `number` (epoch ms via `Date.getTime()`) in local state; conversion happens exactly at the mapping boundary (`new Date(row.created_at).getTime()`), never deeper in the UI.

## Comments

**When to Comment:**
- Comments explain *why*, not *what* — used to record non-obvious invariants, edge cases, and design decisions rather than restating code. Examples:
  - `src/lib/tasks/store.ts:334-335` explains the applicability window for habits.
  - `src/lib/tasks/store.ts:129` explains why a rollback happens ("the server never applied it").
  - `src/lib/tasks/projects-store.ts:56-58` explains sweep-safety ("safe to call even when nothing is actually stale").
  - `src/lib/focusloop/timer-store.tsx:63-65,90-93,145-147,152-155,172-174,190-193` — every non-trivial `useEffect`/function in this file has a preceding block comment explaining the reasoning, not the mechanics. This is the house style for any tricky concurrency/sync logic.
- Terse one-line comments mark structural sections in flatter files, e.g. `// helpers` in `src/lib/tasks/store.ts:321`.
- Two Supabase boilerplate files (`src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`) contain Estonian-language comments explaining client vs. server usage context — these are pre-existing scaffold comments; match the existing language if editing those specific files, otherwise write comments in English.

**JSDoc/TSDoc:**
- Not used anywhere in `src/`. Types and inline comments carry documentation instead — do not introduce JSDoc blocks unless matching an existing pattern.

## Function Design

**Size:** Small, single-purpose functions are the norm for pure helpers (`fmtDate`, `parseDate`, `startOfWeek`, `rangeDates` in `src/lib/tasks/store.ts` are all under 10 lines). Store action callbacks run longer (up to ~30 lines) when they must do optimistic update + Supabase call + rollback, but each still does exactly one logical operation.

**Parameters:** Multi-field inputs are passed as a single inline-typed object, not positional args: `addTask(input: { title: string; date: string })`, `addProject(input: { title: string; criticality?: Criticality })`. Optional fields use `?` with a fallback applied at the call site (`input.criticality ?? "on_track"`).

**Return Values:** Store hooks (`useStore`, `useProjectsStore`, `useFocusTimer`) return a flat object literal of `{ state, ...actions }` — no classes, no nested namespaces. Pure helpers return primitives or plain objects (`{ start: Date; end: Date; label: string }` from `getRange`).

## Module Design

**Exports:** Named exports only — no default exports observed for components, hooks, or utilities (confirmed across `src/lib` and `src/components`; Next.js special files like `page.tsx`/`layout.tsx` use default export only because the framework requires it).

**Barrel Files:** Not used. Each module is imported directly by its specific path (e.g. `@/lib/tasks/store`, `@/lib/tasks/projects-store`) rather than through an `index.ts` re-export.

**"use client" / "use server":** Every client-side hook and interactive component starts with `"use client"` as the first line (`src/lib/tasks/store.ts`, `src/lib/tasks/projects-store.ts`, `src/lib/focusloop/timer-store.tsx`, all files in `src/components/tasks/`). Server Actions start with `"use server"` (`src/lib/auth/actions.ts`). Follow this directive placement exactly — first line, no blank line before it.

---

*Convention analysis: 2026-07-04*
