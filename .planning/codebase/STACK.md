# Technology Stack

**Analysis Date:** 2026-07-04

## Languages

**Primary:**
- TypeScript 5 (strict mode) - all application code under `src/`
- SQL (PostgreSQL) - `supabase/schema.sql`

**Secondary:**
- TypeScript (Deno runtime) - `supabase/functions/send-due-notifications/index.ts` (Supabase Edge Function, not part of the Next.js build; excluded in `tsconfig.json` via `"exclude": ["supabase/functions", ...]`)
- JavaScript (vanilla, no build step) - `public/sw.js` (custom PWA service worker)

## Runtime

**Environment:**
- Node.js (local dev observed: v24.14.1; no `.nvmrc` or `engines` field pins a version — treat as untracked/floating)
- Next.js 16.2.9 server runtime for SSR/route handlers/server actions
- Deno runtime for the Supabase Edge Function (`supabase/functions/send-due-notifications/`)

**Package Manager:**
- npm (lockfile: `package-lock.json` present, v2/v3 format)
- The Edge Function has its own `supabase/functions/send-due-notifications/.npmrc` and `deno.json` (separate dependency resolution from the main app — Deno's npm compat layer)

## Frameworks

**Core:**
- Next.js 16.2.9 - App Router, Turbopack, Server Components, Server Actions, Route Handlers
- React 19.2.4 / react-dom 19.2.4 - UI layer
- Tailwind CSS v4 (`^4`, via `@tailwindcss/postcss`) - styling, config-free v4 approach (no `tailwind.config.*` file present)
- shadcn (`shadcn@^4.11.0` CLI/registry package) + `class-variance-authority`, `clsx`, `tailwind-merge` - component variant styling (`src/components/ui/button.tsx`)
- `@base-ui/react` (^1.6.0) - unstyled primitive components underlying the shadcn-style UI
- `tw-animate-css` - Tailwind animation utility classes
- `recharts` (^3.9.0) - statistics charts (`src/components/focusloop/statistics-view.tsx`, `src/app/tasks/statistics/page.tsx`)
- `lucide-react` (^1.21.0) - icon set

**Testing:**
- Not detected. No test runner, test config, or `*.test.*`/`*.spec.*` files found in the repo.

**Build/Dev:**
- `next dev` / `next build` / `next start` (scripts in `package.json`)
- ESLint 9 (flat config) - `eslint.config.mjs`, extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- PostCSS - `postcss.config.mjs` (single plugin: `@tailwindcss/postcss`)

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` (^2.108.2) - Supabase JS client (used directly for the admin/service-role client)
- `@supabase/ssr` (^0.12.0) - SSR-aware Supabase clients for browser/server/middleware (cookie-based session handling)
- `web-push` - sends Web Push notifications; used in `src/app/api/notify/route.ts` and duplicated (Deno/npm-compat import) in the Edge Function. **Not listed in root `package.json` dependencies** despite being imported directly in `src/app/api/notify/route.ts:2` — present only in `node_modules/web-push` (likely a transitive dependency or an unpinned direct dependency that was removed from `package.json` by accident). Flag for verification.

**Infrastructure:**
- `@supabase/functions-js` (Deno import, edge-runtime types only) - used in the Edge Function via `"@supabase/functions-js/edge-runtime.d.ts"`
- `@supabase/server` (Deno import) - `withSupabase` helper used in the Edge Function for handling auth/service-role Supabase client injection

## Configuration

**Environment:**
- `.env.local` (gitignored, present locally) / `.env.local.example` (committed, documents required vars) drive all runtime config
- Required variables (from `.env.local.example`):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server-only, never exposed to client)
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
  - `VAPID_PRIVATE_KEY` (server-only)
- The Edge Function reads its own Deno env vars (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` — note: no `NEXT_PUBLIC_` prefix there, set separately via Supabase project secrets, not `.env.local`)

**Build:**
- `next.config.ts` - effectively empty (`NextConfig = {}`), no custom Next.js config in use
- `tsconfig.json` - strict mode, `moduleResolution: "bundler"`, path alias `@/*` → `./src/*`, excludes `supabase/functions`, `frontend`, `backend` (the latter two directories do not currently exist — leftover/defensive excludes)
- `postcss.config.mjs` - Tailwind v4 PostCSS plugin only

## Platform Requirements

**Development:**
- Node.js + npm
- A linked Supabase project (local `supabase/.temp/` shows a linked project ref) for auth/DB during development, or a local Supabase stack via `supabase/config.toml`

**Production:**
- Hosting: Vercel (per `README.md`) - frontend/Next.js app
- Database/Auth/Edge Functions: Supabase (Postgres + Auth + one Deno Edge Function `send-due-notifications`, invoked on a `pg_cron` schedule)
- No separate custom backend server; the client talks to Supabase directly plus a small number of Next.js Route Handlers/Server Actions requiring the service-role key

---

*Stack analysis: 2026-07-04*
