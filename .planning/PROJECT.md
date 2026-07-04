# TaskZen — Task Manager Visual Redesign

## What This Is

A visual-only redesign of TaskZen's Task Manager module (Tasks, Habits, Statistics, Projects pages). The app already works — same CRUD, same data, same navigation — but the interface feels visually flat and "dead," especially on desktop where generous whitespace is paired with small, unremarkable type, leaving screens feeling mostly empty. This redesign makes the module feel dark, rich, and "alive" through animation, a more expressive color palette, and better-used space, without touching functionality.

## Core Value

Every existing capability (task/habit/project CRUD, statistics) must keep working exactly as it does today — the redesign only changes how it looks and feels, never what it does.

## Requirements

### Validated

- ✓ Task CRUD: create/edit/toggle/delete tasks, day/week/month views — existing (`src/app/tasks/page.tsx`, `src/lib/tasks/store.ts`)
- ✓ Habit management: add/archive/restore/delete habits, daily habit logs — existing (`src/app/tasks/habits/page.tsx`)
- ✓ Projects: project/task-list model with criticality levels and auto-expiry sweep — existing (`src/app/tasks/projects/`, `src/lib/tasks/projects-store.ts`)
- ✓ Statistics: aggregate completion stats across tasks/habits/projects — existing (`src/app/tasks/statistics/page.tsx`)
- ✓ Dark-by-default color scheme with a warm/teal token palette already in `globals.css` — existing, but visually flat and to be redone
- ✓ PWA install, zoom disabled, cross-device session — existing

### Active

- [ ] Dark, "alive" redesign of Tasks page (day/week/month views) — richer color, micro-interactions, smooth transitions
- [ ] Dark, "alive" redesign of Habits page
- [ ] Dark, "alive" redesign of Statistics page
- [ ] Dark, "alive" redesign of Projects page
- [ ] Micro-interactions on interactive elements (buttons, cards, checkboxes): hover/press feedback, 150–300ms transitions
- [ ] Smooth state/view transitions (task completion, expand/collapse, tab switches) — no instant snaps
- [ ] Subtle ambient/background effects that add depth without hurting readability or performance
- [ ] Richer, more expressive color palette anchored on the existing pulse-logo brand (teal-green → violet neon gradient), used for categories/priorities/accents
- [ ] Fixed desktop spacing and typography: larger, more confident type scale; layout density that fills the space usefully instead of leaving it empty (primary pain point, ≥1024px)
- [ ] Mobile/PWA layout remains fully usable (existing zoom-disabled, installed-app behavior preserved)
- [ ] 100% functional/CRUD parity with current behavior — no new features, no removed features

### Out of Scope

- FocusLoop module (`/`, timer/session tracking) — separate app, not part of this redesign pass
- Auth pages (login/register) — not part of this milestone
- Light mode / theme toggle — dark is the only mode; no light-theme design needed
- New features or new data fields — this is a visual redesign only, not a functionality change
- Backend/data model changes (Supabase schema, RLS, notifications logic) — UI/visual layer only
- Fixing pre-existing bugs found during codebase mapping (e.g. notification "sent" flag on transient push failure, missing explicit `user_id` filters on some sweep queries) — noted in `.planning/codebase/CONCERNS.md`, tracked separately, not blocking this redesign

## Context

- **Brand anchor**: `public/icon-192.png` (and sibling icon assets) show TaskZen's logo as a neon heartbeat/pulse line — teal-green fading into violet — glowing on a dark rounded square. This is the literal "alive" motif and should anchor the new palette/glow treatment rather than inventing an unrelated scheme.
- **Existing tokens**: `src/app/globals.css` already defines a dark-by-default `:root` (warm amber/orange primary ~oklch(0.72 0.17 48), teal accent ~oklch(0.74 0.11 195), plus gold/silver/bronze/warning/on-track semantic colors) using OKLCH. There's also a leftover grayscale `.dark` class block (shadcn default) that appears to be dead/unused since `:root` already sets dark values directly — worth confirming during implementation rather than assuming it's load-bearing.
- **Tech stack available for the "alive" feel**: Tailwind CSS v4 (OKLCH tokens), shadcn/ui components, `tw-animate-css` already a dependency — no new animation library should be needed.
- **This is NOT the Next.js you know**: project uses Next.js 16 / React 19 with breaking changes from training-data Next.js (e.g. `src/proxy.ts` replaces `middleware.ts`). Consult `node_modules/next/dist/docs/` before writing routing/middleware-adjacent code.
- **No test suite exists** in this repo (confirmed via codebase mapping) — changes must be verified by running the dev server and checking in-browser, not via automated tests.
- **Codebase map available**: `.planning/codebase/` (STACK, ARCHITECTURE, STRUCTURE, CONVENTIONS, TESTING, INTEGRATIONS, CONCERNS) — read before planning phases touching each area.

## Constraints

- **Functional parity**: Every visible piece of information and every CRUD action must remain identical in *capability* — only presentation changes. Treat any behavior change as a bug.
- **Dark-only**: No light theme to design or maintain for this module.
- **Brand alignment**: New palette must read as a natural extension of the existing pulse-logo gradient (teal-green → violet), not a disconnected new brand.
- **Stack**: Next.js 16 (App Router) + React 19, Tailwind v4, shadcn/ui, Supabase — no new state-management or animation libraries unless a real gap is found.
- **Next.js version drift**: Framework has breaking changes vs. training data — check `node_modules/next/dist/docs/` for anything routing/server/proxy-related.
- **No automated tests**: Verification is manual, in-browser, on both desktop (primary pain point) and mobile/PWA (must not regress).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Scope = Tasks + Habits + Statistics + Projects pages | User confirmed all four Task Manager views are in scope for this pass | — Pending |
| Dark-only, no light/dark toggle | User wants dark as the sole design target; avoids double design/maintenance burden | — Pending |
| "Alive" = micro-interactions + smooth transitions + ambient background effects + richer color | User selected all four when asked what "alive" means concretely | — Pending |
| Palette anchored on existing pulse-logo gradient (teal-green → violet) | User chose to follow existing brand over a free-form new palette; logo is a strong literal "alive" motif | — Pending |
| Desktop spacing/typography density is the primary complaint to fix | User explicitly called out empty-feeling desktop screens and small/boring fonts as the core problem | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-04 after initialization*
