# Project Research Summary

**Project:** TaskZen — Dark, "alive" visual/interaction redesign
**Domain:** Presentation-layer redesign of an existing Next.js 16 / React 19 / Tailwind v4 / shadcn/ui task-and-habit-management PWA (Tasks day/week/month, Habits, Projects, Statistics) — no new functionality, 100% CRUD/functional parity required
**Researched:** 2026-07-04
**Confidence:** HIGH

## Executive Summary

TaskZen's redesign is a pure rendering-layer overhaul of an already-working product: richer OKLCH color, a functional teal→violet accent gradient tied to the pulse-logo brand, ambient background depth, larger desktop typography/density, and motion (micro-interactions, view transitions, expand/collapse) across four pages. Every technology needed already exists in the codebase — Tailwind v4's CSS-first `@theme` engine, `tw-animate-css`, `@base-ui/react`'s `data-state` attributes, and (bundled free with Next.js 16.2.9's React 19.2 canary) the experimental `<ViewTransition>` API. No new animation library, state-management layer, or token system should be added; the correct move everywhere is CSS-first, JS-optional, extending the existing `globals.css` token file and a small new `src/lib/motion.ts` helper rather than forking a second design-system source.

The recommended approach is foundation-first: fix the design tokens and motion vocabulary once, in a shared layer, before touching any individual page — because color/contrast decisions and motion timing/easing are the two things every subsequent page-restyle phase inherits, and re-deriving them per page is the single biggest source of inconsistency and rework risk. A specific, concrete landmine must be resolved as part of that foundation: `globals.css` currently has a leftover shadcn `.dark { ... }` block that redeclares (and, per CSS cascade rules, likely wins over) most of the intended `:root` warm/teal palette tokens on this dark-only app — if unresolved, "richer palette" work on `:root` alone could silently do nothing.

The dominant risks are not technical-capability risks (the stack can do everything asked) but *discipline* risks: (1) visual restyling silently changing behavior in a codebase with zero test coverage and hand-written optimistic-update/rollback logic, (2) neon/glow aesthetics failing WCAG contrast or causing halation against near-black backgrounds — made stricter here because the app already disables pinch-zoom, removing users' usual escape hatch, (3) ambient/looping animation ignoring `prefers-reduced-motion` and draining mobile battery, (4) animating layout-triggering CSS properties (height/width/top) causing jank on list-heavy pages, and (5) "while we're in there" scope creep fixing unrelated known bugs during restyle work. All five are addressed by process gates (contrast validation, reduced-motion guard, transform/opacity-only animation, manual CRUD walkthroughs, and a hard "styling-only" diff discipline) rather than by any new tooling.

## Key Findings

### Recommended Stack

No new packages are needed or recommended for this milestone. The full 2025/2026 "alive UI on Tailwind v4" toolkit is already installed: `tw-animate-css` (`animate-in`/`animate-out`, accordion presets), `@base-ui/react` (`data-open`/`data-closed`/`data-state` attributes purpose-built for CSS-driven mount/unmount animation), native CSS (`@starting-style`, `grid-template-rows: 0fr→1fr` for expand/collapse, `@property` for animatable gradients, `prefers-reduced-motion`), and Recharts 3.9's built-in chart animation props for the Statistics page. The one genuinely new framework capability worth using is Next.js 16's experimental `<ViewTransition>` (bundled React 19.2 canary, no extra install) for route/tab crossfades — but it's an opt-in flag that should be spiked/validated early rather than assumed safe, with a plain `tw-animate-css` crossfade as the zero-risk fallback. Full detail: `.planning/research/STACK.md`.

**Core technologies:**
- Tailwind CSS v4 (`@theme inline`) — CSS-first design tokens (color/motion/type) that auto-generate matching utility classes; already how `globals.css` works, no config file needed
- `tw-animate-css` (already installed, v1.4.0) — zero-JS `animate-in`/`animate-out`/accordion utility classes for enter/exit and expand/collapse; do not `npm update` past `^1.4.0` without checking its v2.0.0 breaking-change notes
- `@base-ui/react` (already installed) — unstyled primitives emitting `data-state` attributes, the supported hook point for CSS transitions on Dialog/Popover/Collapsible/Checkbox-style components
- Next.js 16 `<ViewTransition>` (`experimental.viewTransition`, bundled canary) — declarative route/tab crossfades; validate via spike before relying on it, safe no-op fallback on unsupported browsers

### Expected Features

This is a design/interaction feature landscape, not a functional one — "features" means patterns users expect from any credible dark productivity tool (Linear/Things/Todoist-class), evaluated against the four existing pages. Full detail: `.planning/research/FEATURES.md`.

**Must have (table stakes):**
- Checkbox/task-completion and habit-toggle micro-interaction (scale/opacity, 150–300ms) — instant-snap completion reads as broken
- Hover/press feedback on every interactive element (buttons, cards, nav/view tabs)
- Tab/view-switch crossfade (day/week/month, nav tabs) and expand/collapse (Projects) via `tw-animate-css`
- Elevation-tier dark palette (3–4 lightness steps, not opacity overlays) + `prefers-reduced-motion` support wired in from the start
- Tabular-nums typography on all Statistics numeric displays

**Should have (competitive/brand differentiators):**
- Pulse/heartbeat glow accent reserved for specific live/active elements (today marker, streaks) — not everywhere
- Teal→violet gradient used functionally for criticality/category color-coding, not just decoratively
- Ambient, mostly-static background gradient layer fixing the "empty desktop screen" complaint
- Desktop type-scale increase + density rework (≥1024px) — the explicitly named primary pain point
- Statistics count-up number animation; staggered list-entry animation (polish layer, applied after base interactions land)

**Defer / exclude entirely:**
- Drag-and-drop reordering, particle/canvas/WebGL ambient backgrounds, sound/haptic feedback, pervasive `backdrop-filter` glassmorphism, and any IA/layout restructuring beyond spacing/density/typography — all explicitly out of scope per PROJECT.md's "no new features" constraint

### Architecture Approach

The redesign is strictly a rendering-layer addition on top of an unchanged data/state architecture: a token layer (`globals.css`, extended not replaced) feeds Tailwind-generated utility classes to presentational primitives (`src/components/ui/*`, growing from just `button.tsx` to include `Badge`/`Card`/shared `Tabs`), which domain-aware components (`src/components/tasks/*`) compose without ever touching Supabase or store hooks directly. A new tiny `src/lib/motion.ts` centralizes transition duration/easing class strings and a `prefersReducedMotion()` helper so all four pages share one motion vocabulary instead of hand-typing `duration-200` inconsistently. Full detail: `.planning/research/ARCHITECTURE.md`.

**Major components:**
1. Token layer (`globals.css` `:root` + `@theme inline`) — single source of truth for color/motion/type tokens; must resolve the `.dark` block cascade collision before any new token work lands
2. Motion helpers (`src/lib/motion.ts`, new) — shared duration/easing constants + reduced-motion hook, no state, no I/O
3. Presentational primitives (`src/components/ui/*`) — domain-agnostic Button/Badge/Card/Tabs, `cva()`-variant pattern already established by `button.tsx`
4. Domain-aware components (`src/components/tasks/*`) — restyled in place, prop signatures unchanged, compose primitives with task/habit/project semantics
5. Pages (`src/app/tasks/**/page.tsx`) — restyled in place, own only UI-local `useState`, unchanged store-hook calls

### Critical Pitfalls

Full detail (5 critical pitfalls with prevention/warning-signs/phase-mapping): `.planning/research/PITFALLS.md`.

1. **Visual refactor silently changes behavior** (no test suite; wrapping elements for animation drops handlers/keyboard access) — never change interactive element type, only restyle it; manual CRUD walkthrough per page before marking a phase done.
2. **Dark theme + brand gradient tanks contrast / causes halation** — validate every text/icon color against its real background (4.5:1/3:1 WCAG), use near-black not pure-black surfaces, reserve full-saturation neon for small accents only; stricter here because pinch-zoom is already disabled.
3. **Ambient animation ignores `prefers-reduced-motion` and drains mobile battery** — wrap every decorative/looping animation in the media query from the first one written, animate only `transform`/`opacity` for loops, pause on `visibilitychange`, cap simultaneous blur/glow effects (~3–5 per screen).
4. **Animating layout-triggering properties (height/width/top) causes jank** on list-heavy views (Tasks day/week/month, Projects) — use `grid-template-rows: 0fr→1fr` + `overflow:hidden` or transform-based FLIP, never raw `height`/`width` keyframes.
5. **"While we're in there" scope creep** breaks the functional-parity constraint — known CONCERNS.md bugs touched during restyle get noted as "observed, not fixed," never silently resolved.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Design-Token & Motion Foundation
**Rationale:** Color/contrast and motion-timing decisions are inherited by every later page phase; re-deriving them per page is the single largest consistency/rework risk identified across FEATURES.md, ARCHITECTURE.md, and PITFALLS.md. Must also resolve the `.dark` block cascade collision (ARCHITECTURE.md) before any palette work, or new tokens may silently have no effect.
**Delivers:** Extended `globals.css` tokens (elevation tiers, teal→violet functional gradient mapping, motion durations/easings registered under `@theme inline`), new `src/lib/motion.ts`, contrast-validated color pairs (4.5:1/3:1) for every semantic color including hover/active/disabled states, resolved `.dark`/`:root` collision, explicit high-contrast focus-ring token.
**Addresses:** Elevation-tier palette, desktop type-scale groundwork, `prefers-reduced-motion` guard pattern (FEATURES.md P1 items)
**Avoids:** Pitfall 2 (contrast/halation), Pitfall 3 (reduced-motion), UX pitfall (focus states lost in new dark styling)

### Phase 2: Shared Primitives & Motion Patterns
**Rationale:** ARCHITECTURE.md identifies `nav-tabs.tsx`/`view-tabs.tsx` already hand-roll near-duplicate tab logic — extracting shared `Badge`/`Card`/`Tabs` primitives now (not speculatively) removes this duplication once, before four pages each restyle it independently. Establishes the `tw-animate-css` + Base UI `data-state` pattern for enter/exit and expand/collapse as the reusable mechanism for every subsequent phase.
**Delivers:** New `src/components/ui/badge.tsx`, `card.tsx`, (optional) shared `tabs.tsx`; restyled `button.tsx`; validated `tw-animate-css`/`@base-ui/react` `data-state` transition pattern; `grid-template-rows` expand/collapse pattern proven on one component.
**Uses:** Tailwind v4 `@theme inline` tokens, `tw-animate-css`, `@base-ui/react` (STACK.md)
**Implements:** Presentational-primitive layer, motion-helper layer (ARCHITECTURE.md components 2–3)

### Phase 3: Tasks Page (Day/Week/Month)
**Rationale:** PROJECT.md names desktop density/typography as the primary pain point, and Tasks is the highest-frequency-use page; it also has the most list-heavy, jank-prone view-switch/reorder surface (Pitfall 4), making it the highest-value and highest-risk page to tackle right after foundations land.
**Delivers:** Checkbox/task-completion micro-interaction, day/week/month tab-switch transition (spike `<ViewTransition>` here first, with CSS crossfade fallback), desktop type-scale/density rework, hover/press feedback.
**Addresses:** Checkbox micro-interaction, tab/view transitions, desktop density fix (FEATURES.md P1)
**Avoids:** Pitfall 1 (behavior regression — manual CRUD walkthrough gate), Pitfall 4 (layout-property jank on multi-item view switches)

### Phase 4: Habits Page
**Rationale:** Shares the checkbox/toggle micro-interaction pattern established in Phase 3; smaller surface area, low risk, good sequencing to validate the shared primitives on a second page before Projects' more complex expand/collapse work.
**Delivers:** Habit-toggle micro-interaction reusing Phase 3's pattern, elevation/palette applied, hover/press feedback.
**Addresses:** Table-stakes micro-interaction and palette consistency (FEATURES.md)
**Avoids:** Pitfall 1 (behavior regression gate), Pitfall 5 (scope creep — Habits has known CONCERNS.md items to leave untouched)

### Phase 5: Projects Page
**Rationale:** The one page with genuine expand/collapse (accordion-style task lists) — sequenced after Phase 2 proves the `grid-template-rows`/`tw-animate-css` accordion pattern and after Phases 3–4 validate the shared toggle/micro-interaction primitives on simpler pages first.
**Delivers:** Expand/collapse transitions on project task lists via `tw-animate-css` accordion presets, hover-lift card treatment, palette/typography parity with other pages.
**Addresses:** Expand/collapse (FEATURES.md P1)
**Avoids:** Pitfall 4 (layout-jank — explicit on-device test with realistic 10+ item lists)

### Phase 6: Statistics Page
**Rationale:** Sequenced last because it depends on tabular-nums typography (established in Phase 1) and has an open architecture question (whether OKLCH `--chart-*` CSS variables pass directly to Recharts `fill`/`stroke` props, flagged in ARCHITECTURE.md as needing in-browser confirmation) that's cheaper to resolve once other token work has stabilized.
**Delivers:** Tabular-nums stat typography, count-up/tween number animation on load, Recharts animation props enabled, palette/elevation parity.
**Addresses:** Legible numeric typography, count-up animation (FEATURES.md)
**Avoids:** Pitfall 3 (this is flagged as the most visually dense page for ambient-effect performance testing)

### Phase 7: Brand Differentiators & Ambient Polish
**Rationale:** FEATURES.md explicitly sequences pulse-accent/ambient/staggered-list work as "add after validation" — polish layered on top of proven base interactions across all four pages, not built in parallel with them, to avoid the "everywhere, therefore meaningless" trap the research flags for the pulse motif.
**Delivers:** Ambient background gradient layer (all 4 pages), pulse/heartbeat accent on today-marker/streak elements only, staggered list-entry animation, final device-performance verification pass (reduced-motion, battery/frame-rate on real mid/low-tier mobile in installed PWA mode).
**Addresses:** Ambient depth, pulse accent, staggered entry (FEATURES.md P2)
**Avoids:** Pitfall 3 (ambient/battery — dedicated on-device verification phase), anti-feature (infinite everywhere-animation diluting the pulse motif)

### Phase Ordering Rationale

- Foundation-first ordering (Phases 1–2) directly follows PITFALLS.md's mapping of contrast and reduced-motion pitfalls to "foundational phase, before per-page work" and ARCHITECTURE.md's scaling note that shared primitives should be extracted once ≥2 pages need the same pattern, not speculatively.
- Page order (Tasks → Habits → Projects → Statistics) follows PROJECT.md's named primary pain point (Tasks/desktop density) plus increasing pattern complexity (simple toggle → simple toggle → expand/collapse → numeric/chart animation with an unresolved technical question).
- Differentiators (Phase 7) are deliberately last per FEATURES.md's own "Launch With" vs. "Add After Validation" split — this avoids building brand-flourish work on top of base interactions that haven't yet been manually verified for CRUD parity.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Tasks):** `<ViewTransition>`/`experimental.viewTransition` is an experimental Next.js 16 flag with only MEDIUM confidence on production-readiness (STACK.md) — recommend a small research/validation spike before committing to it as load-bearing for tab transitions.
- **Phase 6 (Statistics):** Whether OKLCH `--chart-*` CSS custom properties can be passed directly as Recharts `fill`/`stroke` values, or need JS-side resolution to hex/rgb, is flagged as unconfirmed in ARCHITECTURE.md and should be resolved in-browser early in this phase.
- **Phase 7 (Ambient/Differentiators):** On-device mobile PWA performance behavior (battery/frame-rate under multiple simultaneous ambient/glow effects) is a real-hardware verification question, not a documentation gap — flag for hands-on device testing rather than desk research.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Tokens):** Tailwind v4 `@theme inline` mechanics are officially documented and already verified against this repo's actual files (HIGH confidence, ARCHITECTURE.md).
- **Phase 2 (Primitives):** `tw-animate-css`/`@base-ui/react` `data-state` patterns are an established, already-installed convention (HIGH confidence, STACK.md/ARCHITECTURE.md).
- **Phase 4 (Habits), Phase 5 (Projects):** Reuse patterns proven in Phases 2–3; no new technical unknowns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified directly against installed package versions, official Next.js 16 docs bundled in `node_modules`, and Tailwind v4 official docs; no new dependencies proposed |
| Features | MEDIUM-HIGH | Interaction/timing patterns cross-verified across multiple sources, but "alive dark UI" has no single authoritative spec — some judgment calls flagged in FEATURES.md (e.g. specific percentage claims from marketing blogs explicitly excluded from decision-making) |
| Architecture | HIGH (mechanics) / MEDIUM (component boundaries) | Token/motion mechanics verified against this repo's actual files and official docs; the specific `ui/`-folder component-boundary recommendations follow established shadcn convention but are this researcher's design judgment, not an external standard |
| Pitfalls | HIGH | Accessibility/performance fundamentals verified via WCAG/MDN/web.dev/browser-engine bug tracker; project-specific risks (optimistic-update fragility, zoom-disabled contrast strictness) verified directly against this repo's own CONCERNS.md and PROJECT.md |

**Overall confidence:** HIGH

### Gaps to Address

- **`.dark`/`:root` cascade collision resolution:** ARCHITECTURE.md flags this as needing a browser-devtools confirmation (inspect computed `--primary` on `<html>`) before any Phase 1 token work begins — treat as a mandatory first step of Phase 1, not an assumption.
- **`<ViewTransition>` production-readiness:** MEDIUM confidence recommendation to enable an experimental flag in a production app; needs a validation spike in Phase 3 with a documented CSS-crossfade fallback path if it misbehaves.
- **Recharts + OKLCH CSS variables:** Whether `--chart-1..5` values work directly as `fill`/`stroke` props needs in-browser confirmation in Phase 6; not resolvable from documentation alone.
- **Real-device performance ceiling for ambient/glow effects:** No amount of research substitutes for testing on actual mid/low-tier mobile hardware in installed PWA mode (Phase 7) — flagged consistently across STACK.md, FEATURES.md, and PITFALLS.md as the one category where desktop-only verification is insufficient.

## Sources

### Primary (HIGH confidence)
- `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md`, `.../viewTransition.md`, `.../version-16.md` (official, bundled with installed Next.js 16.2.9)
- `node_modules/tw-animate-css/README.md`, `node_modules/tw-animate-css/dist/tw-animate.css`, `node_modules/shadcn/dist/tailwind.css` (installed packages)
- Tailwind CSS v4 official docs: tailwindcss.com/docs/theme, /docs/transition-duration, /docs/transition-timing-function
- This repository: `src/app/globals.css`, `src/app/layout.tsx`, `src/components/ui/button.tsx`, `src/components/tasks/*`, `package.json`
- W3C WAI C39, web.dev `prefers-reduced-motion`, MDN `prefers-reduced-motion`, Deque/accessibilitychecker.org zoom-disabled accessibility guidance, Mozilla Bugzilla #925025 (blur performance)
- `.planning/PROJECT.md`, `.planning/codebase/CONCERNS.md`, `.planning/codebase/STRUCTURE.md`, `.planning/codebase/ARCHITECTURE.md` (this project's own prior mapping)

### Secondary (MEDIUM confidence)
- base-ui.com/react/handbook/animation (not directly fetched against installed version, but consistent with observed conventions)
- Linear design writeup + third-party design-system analysis (competitor pattern reference)
- Smashing Magazine (YouTube ambient glow technique, dark-mode accessibility 2025, motion-preference guidance)
- F22 Labs / graffino.com (CSS property performance cost corroboration)

### Tertiary (LOW confidence)
- Marketing-blog percentage claims on micro-interaction impact (e.g. "37% increase in perceived responsiveness") — explicitly excluded from decision-making per FEATURES.md, noted here only as a source to avoid citing
- Single design-agency source on ambient light/eye-strain (silphiumdesign.com) — directional corroboration only

---
*Research completed: 2026-07-04*
*Ready for roadmap: yes*
