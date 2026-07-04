# Testing Patterns

**Analysis Date:** 2026-07-04

## Test Framework

**Runner:**
- **None.** No test runner is installed or configured. `package.json` has no `jest`, `vitest`, `mocha`, `@testing-library/*`, `playwright`, or `cypress` in `dependencies`/`devDependencies`.
- No `jest.config.*`, `vitest.config.*`, or `playwright.config.*` file exists anywhere in the repo.
- No `"test"` script exists in `package.json` (`scripts` only defines `dev`, `build`, `start`, `lint`).

**Assertion Library:**
- Not applicable — none installed.

**Run Commands:**
```bash
# No test command exists. Available scripts are:
npm run dev      # next dev
npm run build    # next build
npm run start    # next start
npm run lint      # eslint
```

## Test File Organization

- **No test files exist in the repository.** A repo-wide search for `*.test.*` and `*.spec.*` returned zero matches under `src/`, `supabase/`, or the project root.
- No `__tests__/` directories, no `tests/` directory, no `e2e/` directory.

## Test Structure

Not applicable — there is no existing test suite to follow as a pattern.

## Mocking

Not applicable — no mocking library (`jest.mock`, `vi.mock`, `msw`, etc.) is present.

## Fixtures and Factories

Not applicable — no fixture or factory files exist.

## Coverage

**Requirements:** None enforced. No coverage tooling (`nyc`, `c8`, `--coverage` flags) is configured.

## Test Types

**Unit Tests:** Not present. Pure, easily-unit-testable helper functions exist and are good candidates if a suite is introduced later — e.g. `fmtDate`, `parseDate`, `isHabitApplicable`, `startOfWeek`, `rangeDates`, `computeStreak`, `getRange` in `src/lib/tasks/store.ts`, and `liveSecondsLeft` in `src/lib/focusloop/timer-store.tsx`. These are deterministic, side-effect-free, and currently the only logic in the codebase that would be cheap to unit test without mocking Supabase.

**Integration Tests:** Not present.

**E2E Tests:** Not present. No Playwright/Cypress config or specs.

## Manual Verification (current substitute for automated testing)

Since there is no automated test suite, correctness is currently verified only by:
- `npm run lint` (ESLint via `eslint-config-next`, flat config in `eslint.config.mjs`)
- `tsc` implicitly via `next build` (TypeScript `strict: true` in `tsconfig.json`, `noEmit: true`)
- Manual exercising of the app in dev mode

## Recommendation for New Work

If a phase introduces tests, note the following before adding a framework:
- This is a Next.js 16 / React 19 project using the App Router, Server Actions, and Supabase (client + server + admin clients in `src/lib/supabase/`). A test setup will need to account for:
  - Server Components and Server Actions (`"use server"` files like `src/lib/auth/actions.ts`) which typically require Next.js-aware test tooling or careful isolation of pure logic from `next/navigation`/`next/headers` calls.
  - Supabase client calls scattered directly inside hooks (`createClient()` is called inline in nearly every store action rather than injected), which will require either mocking `@/lib/supabase/client` / `@/lib/supabase/server` at the module level, or refactoring toward dependency injection.
- No convention currently exists for where tests should live (co-located vs. `__tests__/`) — this will need to be decided when the first test is added.

---

*Testing analysis: 2026-07-04*
