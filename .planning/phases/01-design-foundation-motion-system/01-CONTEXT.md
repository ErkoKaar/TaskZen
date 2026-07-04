# Phase 1: Design Foundation & Motion System - Context

**Gathered:** 2026-07-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix the broken dark-palette cascade and stand up elevation tiers, the functional teal→violet gradient, desktop type/density, ambient background, and shared hover/tab-switch motion — instantly changing how the whole app looks, before any individual page (Tasks/Habits/Projects/Statistics) is rebuilt. Page-specific layout is out of scope here (Phases 2-3).

</domain>

<decisions>
## Implementation Decisions

### Palette Direction
- **D-01:** Keep the existing warm amber/orange primary (`oklch(0.72 0.17 48)`) and teal accent (`oklch(0.74 0.11 195)`) as the base action-color pair — do not replace them with the logo's teal→violet gradient
- **D-02:** Introduce the teal→violet gradient (from the pulse logo) as a functional accent layer: criticality/category/priority indicators, active-state borders/highlights, and the ambient background — not the primary button/action color
- **D-03:** Shift the neutral background base toward a warmer/more neutral black (less blue-tinted than the current `oklch(0.17 0.012 264)`) before layering the 3-4 elevation tiers on top

### Ambient Background
- **D-04:** Single-corner soft radial gradient (one glow, not two opposing corners) — restrained, Linear-style depth, not a full "ombre" wash across the page
- **D-05:** Fully static — no drift/breathing animation. Zero performance cost, identical for every user, no `prefers-reduced-motion` fallback needed for this element specifically

### Desktop Density
- **D-06:** Two levers at ≥1024px: (1) larger base/heading type-scale and line-height, AND (2) wider content max-width/container — not font-size alone
- **D-07:** Page-specific layout changes (multi-column grids, wider stat cards, secondary content lanes) are explicitly deferred to Phase 2/3 — Phase 1 ships only the shared tokens (type-scale, spacing-scale, container-width), not per-page layout decisions

### Claude's Discretion
- **Tab-switch transition ambition:** user did not select this area for discussion. Default to the safe path per research (STACK.md): ship Phase 1's tab/view-switch transitions using `tw-animate-css` `animate-in`/`animate-out` (CSS-only, proven, ships now). Treat Next.js 16's experimental `<ViewTransition>` as an optional stretch investigation only if time permits — never a blocking dependency for this phase's success criteria.
- Exact OKLCH values for the new elevation tiers and the warmer neutral base (numeric tuning within the direction set by D-01/D-03)
- Exact easing/duration constants in the new shared motion tokens file (150-300ms range per FOUND-06/MOTION-02/03 requirements)
- Whether the `.dark`/`:root` cascade fix (FOUND-01) is resolved by deleting the dead `.dark`/`prefers-color-scheme` blocks entirely or by another mechanism — implementation detail for research/planning to resolve, confirmed in-browser first

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project scope & requirements
- `.planning/PROJECT.md` — Core value, constraints (functional parity, dark-only, brand alignment), key decisions
- `.planning/REQUIREMENTS.md` — FOUND-01..06, MOTION-02, MOTION-03 (this phase's requirements), Out of Scope table

### Research (read before implementing — cite specific findings, don't re-research)
- `.planning/research/SUMMARY.md` — Executive summary, roadmap implications, confidence gaps
- `.planning/research/STACK.md` — Next.js 16 `<ViewTransition>` availability/risk, `@starting-style`/`interpolate-size` browser support, `tw-animate-css`/`@base-ui/react` capabilities, Next.js 16 training-data traps
- `.planning/research/ARCHITECTURE.md` — The `:root`/`.dark` cascade-collision finding (needs in-browser confirmation before extending tokens), `@theme inline` token mechanism, recommended `src/lib/motion.ts` addition
- `.planning/research/PITFALLS.md` — Contrast/halation risk (zoom is disabled, so contrast validation is stricter, not optional), `backdrop-filter`/blur performance cost, layout-property animation jank

### Existing codebase (current state to extend, not replace)
- `.planning/codebase/STACK.md` — Full dependency list, confirms `tw-animate-css` availability
- `.planning/codebase/ARCHITECTURE.md` — Component responsibility map
- `src/app/globals.css` — Current OKLCH tokens (`:root` block lines 54-96 has the intended warm/teal palette; `.dark` block lines 98-131 and `@media (prefers-color-scheme: dark)` block lines 133-168 are the likely-dead grayscale shadcn defaults colliding with `:root`)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tw-animate-css` (already a dependency) — ships `animate-in`/`animate-out` and `accordion-down`/`accordion-up` presets; use for tab-switch and future expand/collapse, no new library needed
- `@base-ui/react` (^1.6.0) — underlies shadcn-style primitives, exposes `data-state` attributes that `tw-animate-css` utilities key off of
- `src/app/globals.css` `@theme inline` block (lines 7-52) — the single CSS-first place to add new color/spacing/typography/motion tokens (Tailwind v4 convention, no `tailwind.config.*` file exists)

### Established Patterns
- OKLCH color tokens throughout, no raw hex in components
- `class-variance-authority` (CVA) pattern for component variants, e.g. `src/components/ui/button.tsx`
- `cn()` utility for conditional/merged Tailwind classes

### Integration Points
- `src/app/layout.tsx` sets `class="dark"` on `<html>` — the element where the `:root`/`.dark` cascade collision needs verification and fixing
- `src/components/tasks/nav-tabs.tsx` and `src/components/tasks/view-tabs.tsx` — the shared nav/view tab components that MOTION-03 (tab-switch transitions) applies to
- `src/components/tasks/criticality-picker.tsx` — where the teal→violet functional gradient mapping (FOUND-03) should surface first
- No `src/lib/motion.ts` exists yet — research recommends creating it for shared duration/easing constants (FOUND-06)

</code_context>

<specifics>
## Specific Ideas

- Ambient background should read as "restrained, Linear-style" depth — not decorative wallpaper. One soft corner glow, not a full-page wash.
- The teal→violet gradient must always carry functional meaning (criticality, category, active/live state) — never purely decorative, per the anti-feature guidance in FEATURES.md against "auto-playing everywhere" gradients.
- Desktop density fix is explicitly two-lever (type-scale + container width), not "just make fonts bigger."

</specifics>

<deferred>
## Deferred Ideas

- Page-specific layout changes (multi-column Statistics, wider Projects board) — explicitly deferred to Phase 2/3, not Phase 1
- Next.js `<ViewTransition>` adoption — optional stretch investigation only, not required for Phase 1 success criteria; `tw-animate-css` crossfade is the committed baseline

None — discussion stayed within phase scope otherwise.

</deferred>

---

*Phase: 01-design-foundation-motion-system*
*Context gathered: 2026-07-04*
