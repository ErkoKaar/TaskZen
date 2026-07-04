# Phase 1: Design Foundation & Motion System - Research

**Researched:** 2026-07-04
**Domain:** Tailwind v4 CSS-first design tokens + CSS-only motion on Next.js 16 / React 19 (dark-only PWA, no new libraries)
**Confidence:** HIGH (cascade collision, token mechanism, and file line numbers verified directly against installed source; exact OKLCH/motion numeric tuning is MEDIUM — reasoned from project research + WCAG constraints, not externally dictated)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Palette Direction**
- **D-01:** Keep the existing warm amber/orange primary (`oklch(0.72 0.17 48)`) and teal accent (`oklch(0.74 0.11 195)`) as the base action-color pair — do not replace them with the logo's teal→violet gradient
- **D-02:** Introduce the teal→violet gradient (from the pulse logo) as a functional accent layer: criticality/category/priority indicators, active-state borders/highlights, and the ambient background — not the primary button/action color
- **D-03:** Shift the neutral background base toward a warmer/more neutral black (less blue-tinted than the current `oklch(0.17 0.012 264)`) before layering the 3-4 elevation tiers on top

**Ambient Background**
- **D-04:** Single-corner soft radial gradient (one glow, not two opposing corners) — restrained, Linear-style depth, not a full "ombre" wash across the page
- **D-05:** Fully static — no drift/breathing animation. Zero performance cost, identical for every user, no `prefers-reduced-motion` fallback needed for this element specifically

**Desktop Density**
- **D-06:** Two levers at ≥1024px: (1) larger base/heading type-scale and line-height, AND (2) wider content max-width/container — not font-size alone
- **D-07:** Page-specific layout changes (multi-column grids, wider stat cards, secondary content lanes) are explicitly deferred to Phase 2/3 — Phase 1 ships only the shared tokens (type-scale, spacing-scale, container-width), not per-page layout decisions

### Claude's Discretion
- **Tab-switch transition ambition:** Default to the safe path: ship Phase 1's tab/view-switch transitions using `tw-animate-css` `animate-in`/`animate-out` (CSS-only, proven, ships now). Treat Next.js 16's experimental `<ViewTransition>` as an optional stretch investigation only if time permits — never a blocking dependency for this phase's success criteria.
- Exact OKLCH values for the new elevation tiers and the warmer neutral base (numeric tuning within the direction set by D-01/D-03)
- Exact easing/duration constants in the new shared motion tokens file (150-300ms range per FOUND-06/MOTION-02/03 requirements)
- Whether the `.dark`/`:root` cascade fix (FOUND-01) is resolved by deleting the dead `.dark`/`prefers-color-scheme` blocks entirely or by another mechanism — implementation detail for research/planning to resolve, confirmed in-browser first

### Deferred Ideas (OUT OF SCOPE)
- Page-specific layout changes (multi-column Statistics, wider Projects board) — explicitly deferred to Phase 2/3, not Phase 1
- Next.js `<ViewTransition>` adoption — optional stretch investigation only, not required for Phase 1 success criteria; `tw-animate-css` crossfade is the committed baseline
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| FOUND-01 | Resolve `:root`/`.dark` cascade collision | Confirmed by direct source read (see "Cascade Collision — Confirmed Root Cause" below): `.dark` wins today. Fix = delete `.dark {}` block (globals.css:98-131) and the `@media (prefers-color-scheme: dark)` block (globals.css:133-168) entirely. |
| FOUND-02 | 3-4 elevation-tier dark palette | `--background`/`--card`/`--surface`/`--surface-2`/`--popover` tokens already exist but `--card` and `--popover` are currently identical values (oklch(0.21 0.014 264) both) — needs differentiation. Concrete OKLCH steps proposed below. |
| FOUND-03 | Teal→violet gradient mapped to criticality/category/priority | `criticality-picker.tsx` currently hardcodes red/amber/green hex (`#ef4444`/`#fbbf24`/`#10b981`), fully bypassing the OKLCH token system. Needs a token-driven rewrite; also consumed in `src/app/tasks/projects/page.tsx:127`. |
| FOUND-04 | Desktop type-scale + density at ≥1024px | Tailwind v4's `lg:` breakpoint = 1024px exactly (verified in `node_modules/tailwindcss/theme.css:329`). Mechanism recommendation below (root `font-size` scaling + new `--container-*` token). |
| FOUND-05 | Ambient background gradient layer, static | D-04/D-05 lock this to one static radial-gradient layer; GPU-cheap by construction since it never animates. Pattern + code below. |
| FOUND-06 | Shared motion tokens + global reduced-motion fallback | No `src/lib/motion.ts` exists yet; components hand-roll bare `transition-colors`/`transition-all` with no explicit duration (relying on Tailwind's undocumented 150ms default). Concrete tokens + global CSS reduced-motion rule below. |
| MOTION-02 | Hover/press feedback on buttons, cards, nav tabs | `button.tsx` already has a press pattern (`active:...:translate-y-px`); `nav-tabs.tsx`/`view-tabs.tsx`/`criticality-picker.tsx` do not — gap identified with line refs below. |
| MOTION-03 | Smooth tab/view-switch transitions | `nav-tabs.tsx` (route links) and `view-tabs.tsx` (local state) both only restyle the tab control itself today — neither wraps the content panel in a crossfade. Concrete `tw-animate-css` pattern below. |
</phase_requirements>

## Summary

This phase is a pure CSS/token layer addition on top of an already-correct architecture — no new packages, no new state, no new component types are required by the phase requirements themselves. Three things must happen, in this order, because each is a prerequisite for the next: **(1)** delete the two dead shadcn-default color blocks in `globals.css` so `:root` becomes the single source of truth (FOUND-01 blocks everything downstream — new elevation/gradient tokens added to `:root` today are silently overridden by `.dark` and would appear to "not work"); **(2)** re-tune the now-unblocked `:root` tokens for a warmer neutral base and 3-4 distinct elevation lightness steps (FOUND-02/03); **(3)** add a small, purely-additive set of type-scale/container/motion tokens and wire the one genuinely new mechanism this phase needs — a global `prefers-reduced-motion` CSS rule, since none exists today.

The two components explicitly named in the phase (`criticality-picker.tsx`, `nav-tabs.tsx`/`view-tabs.tsx`) have a shared root problem: they were built before any token/motion system existed, so they hardcode raw hex colors (criticality) or rely on Tailwind's implicit 150ms default transition (tabs) instead of referencing shared tokens. Fixing them is a restyle, not a rework — none of their props/callbacks need to change, satisfying the parity constraint.

**Primary recommendation:** Fix the cascade collision first (delete, don't merge), then extend `:root` + `@theme inline` in `globals.css` with elevation/gradient/motion/container tokens, then restyle `criticality-picker.tsx`, `nav-tabs.tsx`, and `view-tabs.tsx` to consume those tokens instead of ad hoc values — in that dependency order.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Color/elevation/motion tokens | Frontend Server (SSR) — `globals.css`, compiled at build time | — | Tailwind v4's `@theme inline` mechanism is a build-time CSS transform, not a runtime concern; tokens ship as static CSS to every render |
| `:root`/`.dark` cascade fix | Frontend Server (SSR) — `globals.css` + `layout.tsx` | — | `<html class="dark">` is set server-side in `layout.tsx`; the collision is resolved entirely in CSS, no client JS involved |
| Ambient background layer | Browser / Client | Frontend Server (SSR) | Rendered as a fixed/absolute decorative element (likely in a shared layout or `SiteHeader`'s sibling), but it's a static background-image — no client JS state needed |
| Criticality/category gradient mapping | Browser / Client | — | `criticality-picker.tsx` is `"use client"`; purely a rendering concern reading token values via className/style, no new data flow |
| Tab/view-switch motion | Browser / Client | — | `nav-tabs.tsx` (routing) and `view-tabs.tsx` (local `useState`) both already run client-side; the crossfade is a CSS class toggle keyed to existing state, no new client logic beyond a `key` prop |
| `prefers-reduced-motion` handling | Browser / Client | — | Native CSS media query, evaluated by the browser; no JS `matchMedia` listener needed for this phase since all motion in scope is CSS-only |

## Cascade Collision — Confirmed Root Cause (FOUND-01)

Read directly from `src/app/globals.css` (this repo, not a hypothesis):

- `:root { ... }` — lines 54-96 — the intended warm/teal palette (`--background: oklch(0.17 0.012 264)`, `--primary: oklch(0.72 0.17 48)`, etc.)
- `.dark { ... }` — lines 98-131 — leftover shadcn-default **grayscale** values (`--background: oklch(0.145 0 0)`, `--primary: oklch(0.922 0 0)`, etc.) that redeclare nearly every token `:root` also declares
- `@media (prefers-color-scheme: dark) { :root:not(.light) { ... } }` — lines 133-168 — a third, identical copy of the same grayscale values

`src/app/layout.tsx:50` sets `<html className="dark ...">`. Because `:root` and `.dark` are both single-class-equivalent-specificity selectors matching the same `<html>` element, and `.dark` is declared **later in source order**, standard CSS cascade rules mean `.dark`'s values win for every custom property both blocks declare (`--background`, `--card`, `--primary`, `--accent`, `--border`, `--chart-1..5`, `--sidebar-*`, etc.). Tokens unique to `:root` (`--surface`, `--surface-2`, `--border-strong`, `--gold`, `--silver`, `--bronze`, `--warning`, `--on-track`) are unaffected since `.dark` never redeclares them — which is *why* the app doesn't look completely broken today, only flattened/grayscale on the shared tokens.

**Fix (confirmed safe):** Delete the `.dark { ... }` block (lines 98-131) and the entire `@media (prefers-color-scheme: dark) { ... }` block (lines 133-168). Verified this is safe by checking `node_modules/shadcn/dist/tailwind.css` — the shadcn import only defines `@custom-variant data-open`/`data-closed`/etc. helpers, **not** its own `.dark` color block, so nothing re-introduces the collision after deletion. The `@custom-variant dark (&:is(.dark *))` declaration (globals.css:5) and `dark:` utility variants used in `button.tsx` (e.g. `dark:border-input`) are a **separate, unrelated mechanism** — they still fire correctly because `.dark` remains a valid class on `<html>`, so no change needed there. This is a pure deletion, not a merge or rename.

**Before writing any new elevation/gradient token**, do this deletion first — otherwise new `:root` tokens with names that collide with the dead `.dark` block (e.g. adding a new `--card` step) would silently do nothing, exactly the trap PITFALLS.md's "Technical Debt Patterns" table flags.

**Verification step for the plan:** After deleting, inspect `<html class="dark">` in devtools → Computed → confirm `--background` resolves to the `:root` warm value (`oklch(...)` with hue ~264 today, or the new warmer hue after FOUND-03 tuning), not `oklch(0.145 0 0)`. This is success criterion #1's literal acceptance check.

## Standard Stack

### Core (already installed — no new packages this phase)

| Library | Version (verified) | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS | `4.3.1` [VERIFIED: package.json + node_modules/tailwindcss/package.json] | CSS-first theming via `@theme inline` | Already the project's only styling engine; no `tailwind.config.*` file exists |
| `tw-animate-css` | `1.4.0` [VERIFIED: package.json + node_modules/tw-animate-css/package.json] | `animate-in`/`animate-out`, `fade-in`/`fade-out` utilities for tab/view crossfades | Already imported at `globals.css:2`; default enter/exit duration is `150ms` (`--tw-duration` fallback), overridable via `duration-*` |
| `@base-ui/react` | `^1.6.0` [CITED: package.json] | Underlies `button.tsx`'s `Button` primitive; exposes `data-*` state attributes | Already the pattern `button.tsx` uses for its press/hover states |
| Next.js | `16.2.9` [CITED: package.json] | App framework | `lg:` breakpoint (1024px) matches the phase's ">=1024px" requirement exactly — no custom breakpoint token needed |

**No `npm install` required for this phase.** Confirmed against `.planning/research/STACK.md`'s executive take: every mechanism needed (tokens, CSS transitions, `tw-animate-css`, native `prefers-reduced-motion`) is already a dependency or a browser feature.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS-only crossfade for tab/view switches | Next.js 16 experimental `<ViewTransition>` | Per CONTEXT.md, explicitly optional/stretch only — do not make it load-bearing for this phase's success criteria. See `.planning/research/STACK.md` for the full spike plan if pursued. |
| `html`-level `font-size` scaling for desktop type-scale | Per-component `lg:text-lg` overrides on every text element | Per-component overrides touch every page (contradicts D-07 "shared tokens only, not per-page layout"); root scaling is one shared mechanism, zero component touches, and naturally increases *all* rem-based spacing too, which directly supports "denser, fuller layout" — but is coarser-grained (see Pitfalls below) |

## Package Legitimacy Audit

**Not applicable — this phase installs no new packages.** All mechanisms use already-installed dependencies (`tailwindcss@4.3.1`, `tw-animate-css@1.4.0`, `@base-ui/react@^1.6.0`) or native browser CSS features (`prefers-reduced-motion`, `@theme inline`, `oklch()`). `slopcheck` was not run because there is nothing to audit; if a later phase in this milestone introduces a package, run the Package Legitimacy Gate then.

## Architecture Patterns

### Recommended Token Additions to `globals.css`

**1. Fix the collision first (delete lines 98-168):**
```css
/* DELETE globals.css:98-131 (.dark block) */
/* DELETE globals.css:133-168 (@media prefers-color-scheme block) */
/* KEEP globals.css:5 (@custom-variant dark ...) — unrelated, still needed for dark: utilities */
```

**2. Re-tune `:root` for a warmer neutral base + 4 elevation tiers (FOUND-02/FOUND-03's palette side):**

Current tokens use hue `264` (blue-violet family) at very low chroma — this is *why* the background reads blue-tinted despite low saturation. Shifting hue toward a warm-neutral value (~75, the amber family's neutral complement) while keeping chroma very low (0.004-0.008) reads as "warm charcoal" rather than "cool slate," per D-03, without becoming a visibly colored/tinted background.

```css
:root {
  color-scheme: dark;
  /* --- Elevation tiers: page → card → raised/modal → popover, warm-neutral hue 75 --- */
  --background: oklch(0.16 0.006 75);   /* tier 0: page background */
  --surface:    oklch(0.19 0.007 75);   /* tier 0.5: recessed surfaces (view-tabs track, progress bars) */
  --card:       oklch(0.22 0.008 75);   /* tier 1: cards */
  --surface-2:  oklch(0.25 0.009 75);   /* tier 2: raised card / modal */
  --popover:    oklch(0.29 0.010 75);   /* tier 3: popover/dropdown/tooltip — topmost, most separated */
  --foreground: oklch(0.96 0.004 75);
  --card-foreground: var(--foreground);
  --popover-foreground: var(--foreground);

  /* --- Existing action colors: UNCHANGED per D-01 --- */
  --primary: oklch(0.72 0.17 48);
  --primary-foreground: oklch(0.18 0.02 48);
  --accent: oklch(0.74 0.11 195);      /* also gradient's teal endpoint, see below */
  --accent-foreground: oklch(0.18 0.02 195);

  /* --- Teal→violet functional gradient (D-02): NEW tokens, non-text use only --- */
  --gradient-teal:   oklch(0.74 0.11 195);  /* alias of --accent — reuse, don't duplicate meaning */
  --gradient-violet: oklch(0.66 0.19 322);
  --gradient-brand: linear-gradient(135deg, var(--gradient-teal), var(--gradient-violet));

  /* borders/secondary/muted/destructive/chart/sidebar/gold/silver/bronze/warning/on-track:
     keep existing values — they're alpha-white overlays or unrelated hues, not part of the
     background-hue shift; re-validate contrast against the new --background/--card values
     (see Pitfalls) but no value change is prescribed here without a contrast-checker pass. */
}
```

**3. Register new tokens in `@theme inline` (Tailwind v4 requires both blocks in sync):**
```css
@theme inline {
  /* ...existing entries... */
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-gradient-teal: var(--gradient-teal);
  --color-gradient-violet: var(--gradient-violet);

  /* Motion tokens (FOUND-06) */
  --duration-micro: 150ms;
  --duration-base: 200ms;
  --duration-slow: 300ms;
  --ease-out-soft: cubic-bezier(0.16, 1, 0.3, 1);

  /* Desktop container (FOUND-04, lever 2) */
  --container-app: 88rem; /* generates a `max-w-app` utility per Tailwind v4's --container-* namespace */
}
```
`--duration-*` and `--ease-*` are documented Tailwind v4 theme namespaces (tailwindcss.com/docs/theme) that generate matching `duration-*`/`ease-*` utility classes — verified this project already relies on the same mechanism for `--radius-*` (globals.css:45-51). `--container-*` is confirmed in `node_modules/tailwindcss/theme.css:333-345` as the exact namespace that already produces the `max-w-5xl` utility currently used by all 4 pages + `site-header.tsx`; adding `--container-app` produces a new `max-w-app` utility the same way, no new mechanism needed. [VERIFIED: node_modules/tailwindcss/theme.css]

**4. Desktop type-scale + density (FOUND-04, lever 1 — root scaling, not per-component):**
```css
html {
  font-size: 100%;
}
@media (min-width: 1024px) {
  html {
    font-size: 112.5%; /* 1rem = 18px instead of 16px at ≥1024px — scales ALL rem-based utilities */
  }
}
```
This is the one mechanism in this research that is **not** externally documented for this exact use case — it's a well-known, decades-old CSS technique ("rem scaling") but its application here is this researcher's synthesis, not a cited pattern. [ASSUMED — flagged in Assumptions Log]. It satisfies D-06 "not font-size alone" because it also scales padding/gap/radius utilities that use `rem` (most of this codebase's spacing, e.g. `px-4`, `py-8`, `gap-16` in `tasks/page.tsx`), producing the "denser, fuller" rhythm as a side effect — but that breadth is also its risk (see Pitfalls: verify no overflow/clipping at the new scale, since it is coarser than a hand-tuned type-scale-only change).

**5. Global `prefers-reduced-motion` fallback (FOUND-06 — the one genuinely new mechanism this phase adds):**
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```
This is the canonical W3C-technique-aligned "nuke all motion" rule (WCAG C39, cited in `.planning/research/PITFALLS.md`'s sources) — a single global rule in `globals.css`, not a per-component guard. It automatically covers every `transition-*`/`animate-*` utility added by this phase (hover/press feedback, tab crossfade) without needing a React-side `useReducedMotion()` hook, since all motion in this phase's scope is pure CSS. [CITED: W3C WAI C39 technique — https://www.w3.org/WAI/WCAG22/Techniques/css/C39]. Per D-05, the ambient background needs no entry here since it never animates.

### `src/lib/motion.ts` (new, per FOUND-06)

Not strictly required by the CSS mechanism above (the reduced-motion rule works without it), but recommended as the single place components reference instead of re-typing `"transition-colors duration-base ease-out-soft"` per file:

```ts
// src/lib/motion.ts
export const transitionMicro = "transition-colors duration-micro ease-out"
export const transitionBase = "transition-all duration-base ease-out-soft"
export const pressFeedback = "active:translate-y-px"
```

### Component-Level Fixes

**`src/components/tasks/criticality-picker.tsx` (FOUND-03):**

Current state (lines 5-15): `CRITICALITY_COLORS` is a hardcoded hex map (`#ef4444`/`#fbbf24`/`#10b981` — red/amber/green traffic-light convention), consumed here AND in `src/app/tasks/projects/page.tsx:127` (`style={{ borderColor: CRITICALITY_COLORS[project.criticality] }}`). Both call sites must change together.

Recommended: replace the hex map with OKLCH points along the new gradient tokens, referenced as CSS custom properties so both files stay in sync through the token layer:
```ts
export const CRITICALITY_COLORS: Record<Criticality, string> = {
  on_track: "var(--gradient-teal)",                  // oklch(0.74 0.11 195) — cool end
  warning:  "oklch(0.70 0.14 258)",                   // midpoint along the gradient path
  critical: "var(--gradient-violet)",                 // oklch(0.66 0.19 322) — hot end, highest chroma
}
```
The existing `glow` rgba values (line 13-15) should be replaced with `color-mix(in oklch, var(--gradient-teal) 50%, transparent)`-style expressions or simply lower-alpha OKLCH strings, since they currently hardcode rgba tied to the old hex — otherwise the glow color would visually mismatch the new dot color.

**`src/app/tasks/projects/page.tsx:127`** — no logic change needed; it already reads from `CRITICALITY_COLORS`, so fixing the map fixes both call sites simultaneously (this is the token-propagation benefit `.planning/research/ARCHITECTURE.md` describes).

**`src/components/tasks/view-tabs.tsx` (MOTION-02/03):**

Current (lines 25-36): buttons use bare `transition-colors` (implicit 150ms default), no press state, no explicit token reference, and switching `value` re-renders the day/week/month content instantly with no crossfade.
```tsx
className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors duration-micro active:translate-y-px ${
  value === v.key
    ? "bg-background text-foreground shadow-sm"
    : "text-muted-foreground hover:text-foreground"
}`}
```
For MOTION-03 (the actual "smooth tab switch"), the fix belongs on the **content panel** the tabs control (in `tasks/page.tsx`/`statistics/page.tsx`, not in `view-tabs.tsx` itself, since `view-tabs.tsx` has no children/content prop): wrap the switched content region in a keyed element so React remounts it on `view` change and `tw-animate-css` fires:
```tsx
<div key={view} className="animate-in fade-in duration-base">
  {/* existing day/week/month content, unchanged */}
</div>
```

**`src/components/tasks/nav-tabs.tsx` (MOTION-02):**

Current (line 28): `"relative -my-3 px-2.5 py-4 text-base font-medium transition-colors sm:px-4"` — no explicit duration token, no press state (acceptable for a `<Link>`, since press-translate on a route link can feel odd, but hover is already present via `hover:text-foreground`). Minimal fix: add `duration-micro` explicitly so it's token-driven rather than relying on Tailwind's implicit default:
```tsx
"relative -my-3 px-2.5 py-4 text-base font-medium transition-colors duration-micro sm:px-4"
```
The route-level crossfade (Tasks↔Habits↔Projects↔Statistics) is out of scope for a CSS-only fix within a single component — that's exactly the `<ViewTransition>` stretch case per CONTEXT.md; do not build a custom route-crossfade mechanism for this phase.

### Ambient Background (FOUND-05, D-04/D-05)

Single static radial glow, one corner, GPU-cheap by construction since it never animates:
```css
/* globals.css, new rule — apply to a fixed decorative element behind page content,
   e.g. a sibling div in a shared tasks-area wrapper, aria-hidden, pointer-events-none */
.ambient-glow {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background: radial-gradient(
    ellipse 60% 50% at 100% 0%,
    color-mix(in oklch, var(--gradient-teal) 14%, transparent),
    transparent 70%
  );
}
```
Because D-05 makes this fully static, it needs **no** `prefers-reduced-motion` guard, no `will-change`, and no JS — it is simply a background paint that happens once. Per PITFALLS.md's blur-performance findings, this uses a `radial-gradient` directly (no `filter: blur()`), which is cheaper than a blurred pseudo-element and avoids stacking with `site-header.tsx`'s existing `backdrop-blur-md` (already 1 blur element in the header — do not add a second blur layer for the ambient glow itself).

### Container Width Rollout (FOUND-04, lever 2)

`max-w-5xl` (64rem) is duplicated identically in 5 places: `site-header.tsx:6`, `tasks/page.tsx:58`, `habits/page.tsx:33`, `statistics/page.tsx:124`, `projects/page.tsx:60`. This is a shared-token change, not per-page layout (permitted under D-07 since it's the same mechanical edit repeated, not divergent per-page decisions):
```
max-w-5xl lg:max-w-app
```
Applied identically to all 5 locations (header must widen in lockstep with content, or the header and page content will visually misalign at ≥1024px).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tab/view crossfade | Custom `useState` + `setTimeout` fade logic, or a new animation library | `tw-animate-css`'s `animate-in fade-in duration-base` on a `key`-ed content wrapper | Already a dependency, zero JS, matches `.planning/research/STACK.md`'s Pattern 2 |
| Reduced-motion detection | A `useReducedMotion()` React hook with `matchMedia` listener | A single global `@media (prefers-reduced-motion: reduce)` CSS rule | All motion in this phase's scope is CSS-only; a JS hook adds a render-tree dependency for something CSS already handles natively (Anti-Pattern 2 in `.planning/research/ARCHITECTURE.md`) |
| Desktop responsive type scale | Per-component `lg:text-lg` on every heading/label across 4 pages | Root `html { font-size }` media-query scaling | One shared mechanism vs. dozens of scattered edits; matches D-07's "shared tokens, not per-page layout" |
| Elevation/gradient color source | A second token file (`theme.ts`, `tokens.json`) | Extend the existing `:root` + `@theme inline` blocks in `globals.css` | Already the project's sole token mechanism (Anti-Pattern 1 in `.planning/research/ARCHITECTURE.md`) |

**Key insight:** Every requirement in this phase (FOUND-01 through MOTION-03) is solvable with CSS custom properties, Tailwind v4's `@theme inline`, and `tw-animate-css` utilities already installed — the discipline required is restraint (don't add a library, don't add a Context/Provider, don't touch store hooks), not new tooling.

## Common Pitfalls

*(Full detail in `.planning/research/PITFALLS.md` — this section flags the instances specific to this phase's exact files.)*

### Pitfall: New elevation/gradient tokens fail contrast after the warm-hue shift
**What goes wrong:** Shifting `--background`/`--card` hue from 264 to 75 and changing lightness steps can silently change the contrast ratio of every existing text/border color that was tuned against the *old* background value (`--muted-foreground`, `--border`, `--destructive`, etc.), even though those tokens themselves aren't being edited.
**How to avoid:** After applying the new elevation tokens, re-run a contrast check (4.5:1 normal text / 3:1 large text/UI) for `--foreground` on `--background`, `--muted-foreground` on `--card`/`--surface-2`, and the new gradient-derived criticality colors against `--card`/`--surface-2` — not just eyeballing on a bright monitor. This app has pinch-zoom disabled, making this non-negotiable per PITFALLS.md Pitfall 2.
**Warning sign:** `warning: oklch(0.70 0.14 258)` (the gradient midpoint, a blue-family hue) is the token most likely to read low-contrast against a dark warm-neutral background — verify this one specifically first.

### Pitfall: Root `font-size` scaling overflows fixed-width elements
**What goes wrong:** The `html { font-size: 112.5% }` desktop technique (recommended above) scales every `rem`-based value, including fixed-looking layouts like `tasks/page.tsx:295`'s `max-w-10` day-bar chart or `statistics/page.tsx`'s stat-card grids — something sized to "look right" at 16px-root may clip or wrap awkwardly at 18px-root.
**How to avoid:** After applying the media query, manually check all 4 pages at exactly 1024px, 1280px, and 1536px viewport widths in devtools — the requirement's own success criterion #2 (desktop density) is easy to satisfy for typography while accidentally breaking a chart/grid that assumed the old rem base.
**Warning sign:** Any element using `w-`/`h-`/`max-w-` with a fixed rem-based Tailwind class (not `%`/`fr`/`auto`) inside the 4 page files.

### Pitfall: Criticality gradient replaces a universal color convention
**What goes wrong:** The current `critical`/`warning`/`on_track` = red/amber/green mapping is a globally-understood traffic-light convention. Remapping it to teal→violet (per FOUND-03's literal wording and `.planning/research/FEATURES.md`'s explicit recommendation) removes that convention; violet does not intuitively read as "more urgent than teal" the way red does against green.
**How to avoid:** This is flagged as an assumption requiring a quick visual gut-check before the plan locks it in (see Assumptions Log A1) — not blocking, since `criticality-picker.tsx` already carries `aria-label`/`title` per option (existing markup, no new work needed) which mitigates the pure color-blindness risk PITFALLS.md flags, but the *intuitive urgency* signal is a different, softer risk than accessibility.
**Warning sign:** If a first-pass screenshot of the picker reads as "which one is worse?" ambiguous at a glance, consider preserving relative saturation/lightness intensity (critical = highest chroma/most saturated) as the compensating urgency cue, which the OKLCH values proposed above already do (0.19 chroma for critical vs. 0.11 for on_track).

### Pitfall: Ambient glow color mismatches criticality gradient if tuned independently
**What goes wrong:** Both the ambient background (FOUND-05) and criticality picker (FOUND-03) draw from the same two gradient endpoint tokens (`--gradient-teal`/`--gradient-violet`). If a future page-phase tunes the ambient glow's exact stop percentage or opacity without referencing these shared tokens, the "brand gradient" stops looking like one consistent gradient across surfaces.
**How to avoid:** Both consumers should reference `--gradient-teal`/`--gradient-violet` (or the composed `--gradient-brand`) rather than re-deriving their own teal/violet OKLCH values inline.

## Code Examples

### Reduced-motion global rule (verbatim, ready to paste)
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```
Source pattern: W3C WAI Technique C39 (https://www.w3.org/WAI/WCAG22/Techniques/css/C39), already cited in `.planning/research/PITFALLS.md`'s sources.

### Tab content crossfade (`tw-animate-css`, verified utility names)
```tsx
// tw-animate-css confirms `animate-in`/`fade-in` compose with Tailwind's `duration-*`
// (--tw-duration is the same CSS var Tailwind's own duration-* utilities set)
// verified in node_modules/tw-animate-css/dist/tw-animate.css:
//   --animate-in: enter var(--tw-animation-duration, var(--tw-duration, .15s)) ...
<div key={view} className="animate-in fade-in duration-base">
  {/* content */}
</div>
```

### `max-w-app` utility (Tailwind v4 container namespace, verified)
```css
/* globals.css @theme inline */
--container-app: 88rem;
```
```tsx
// any of the 5 files listed above
<main className="mx-auto w-full max-w-5xl lg:max-w-app flex-1 px-4 py-8 sm:px-6 sm:py-12">
```
Verified the `--container-*` namespace already produces the currently-used `max-w-5xl` utility at `node_modules/tailwindcss/theme.css:343` (`--container-5xl: 64rem`) — adding `--container-app` follows the exact same mechanism.

## State of the Art

| Old Approach (this codebase, pre-Phase-1) | Current/Recommended Approach | When Changed | Impact |
|--------------------------------------------|-------------------------------|---------------|--------|
| `.dark {}` shadcn-default grayscale block coexisting with `:root` | Single `:root` block, no light/dark toggle exists so no second block is needed | This phase (FOUND-01) | Unblocks every other token in this phase — currently silently overridden |
| Hardcoded hex criticality colors (`#ef4444` etc.) | OKLCH tokens referencing the shared gradient (`var(--gradient-teal)`, etc.) | This phase (FOUND-03) | Criticality colors now participate in the same contrast-validation and token-update mechanism as everything else |
| Implicit Tailwind default transition duration (150ms, undocumented in this codebase) | Explicit `duration-micro`/`duration-base`/`duration-slow` tokens | This phase (FOUND-06) | Makes motion timing intentional/auditable instead of accidental |

**Deprecated/outdated:** Nothing framework-level is deprecated for this phase's scope — this section is included per the template but has no findings beyond the codebase's own dead CSS blocks, already covered above.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Criticality levels should fully remap from red/amber/green to points along the teal→violet gradient (rather than keeping red/green hue family and only adjusting saturation/lightness) | Architecture Patterns → `criticality-picker.tsx`; Common Pitfalls | If the user actually wants the traffic-light convention preserved, this is a visible, easy-to-notice wrong turn in the very first component touched — but low cost to reverse (isolated to one small color map + one style prop) |
| A2 | Root `html { font-size: 112.5% }` media-query scaling is the correct mechanism for FOUND-04's type-scale lever (vs. per-component responsive text classes) | Architecture Patterns → Desktop type-scale | If it overflows a fixed-width element (see Pitfalls), the fix is either a scoped override on that one element or dialing back the percentage — recoverable, but requires a manual pass across all 4 pages to catch |
| A3 | Exact OKLCH numeric values proposed for elevation tiers (0.16/0.19/0.22/0.25/0.29 lightness at hue 75) and gradient endpoints (hue 195/258/322) satisfy WCAG contrast against existing text tokens | Architecture Patterns → token additions | Needs an actual contrast-checker pass (not just eyeballing) before being treated as final; flagged explicitly in Common Pitfalls |
| A4 | `--container-app: 88rem` (1408px) is an appropriate desktop max-width — no explicit numeric target was given in CONTEXT.md beyond "wider" | Architecture Patterns → Container Width Rollout | If too wide, line-length/readability suffers on ultrawide monitors; if too narrow, doesn't meaningfully address the "empty screen" complaint — this is a numeric judgment call, easy to tune later since it's a single token |

**If this table is empty:** N/A — see entries above; all four are numeric/design judgment calls made in the absence of pixel-exact user direction, not verified-fact claims.

## Open Questions

1. **Should the ambient glow live in a shared layout (new `src/app/tasks/layout.tsx`) or be duplicated per page?**
   - What we know: No `src/app/tasks/layout.tsx` currently exists — each page independently renders `<SiteHeader>` + `<main>`. The ambient glow needs to appear on all 4 pages.
   - What's unclear: Whether introducing a shared `tasks/layout.tsx` (a new file, not just a token/CSS change) counts as within this phase's scope or should be deferred, since it touches routing structure rather than pure styling.
   - Recommendation: A shared layout is the DRY choice (avoids pasting the same glow `<div>` 4 times) and is a low-risk structural addition (Next.js layouts don't change page behavior/props) — but flag it explicitly in the plan as a structural file addition, not "just CSS," so it gets the same "does this change behavior?" scrutiny PITFALLS.md Pitfall 1 calls for.

2. **Does `--warning`/`--gold`/`--silver`/`--bronze`/`--on-track` (existing semantic tokens used elsewhere, e.g. Statistics/Habits streak displays) need re-validation against the new warm-neutral background, or are they out of this phase's scope?**
   - What we know: These tokens exist in `:root` today (lines 91-95) and aren't named in any FOUND-0x requirement explicitly.
   - What's unclear: Whether "elevation-tier dark palette" (FOUND-02) implies re-validating *all* existing semantic colors against the new background, or only the ones this phase explicitly touches (background/card/surface/popover/criticality).
   - Recommendation: Treat as out of scope for token *value* changes, but in scope for a contrast *check* (per Pitfalls) since the background hue is changing under them — if a check reveals a real failure, that's a signal to fix the specific token, not a full re-audit.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build/dev | ✓ | v24.14.1 | — |
| npm | Package management | ✓ | 11.11.0 | — |
| Tailwind CSS | All token work | ✓ | 4.3.1 | — |
| `tw-animate-css` | Tab/view crossfade | ✓ | 1.4.0 | — |
| `@base-ui/react` | Button press states | ✓ | ^1.6.0 | — |
| Chrome DevTools (manual) | Contrast/computed-style/reduced-motion verification | Assumed available (developer's own machine) | — | — |

**Missing dependencies with no fallback:** None — this phase requires nothing beyond what's already installed.
**Missing dependencies with fallback:** None applicable.

## Validation Architecture

> No automated test suite exists in this repository (`package.json` scripts: `dev`/`build`/`start`/`lint` only — confirmed, no `test` script, no `*.test.*`/`*.spec.*` files, no Jest/Vitest/Playwright config found). Per `.planning/research/PITFALLS.md`, every phase's verification is manual by project convention. This section documents the manual verification map in place of an automated test map, per the template's allowance for "config file: none — see Wave 0."

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None installed |
| Config file | none |
| Quick run command | `npm run lint` (catches JSX/TS errors introduced by restyling, not visual regressions) |
| Full suite command | `npm run build` (catches any build-breaking token/syntax error in `globals.css` or component changes) |

### Phase Requirements → Verification Map
| Req ID | Behavior | Verification Type | Command/Steps | Automatable? |
|--------|----------|---------------------|----------------|--------------|
| FOUND-01 | `.dark` no longer overrides `:root` | Manual — devtools computed style | Inspect `<html class="dark">` → Computed → `--background` matches `:root`'s value | ❌ manual only |
| FOUND-02 | 3-4 visually distinct elevation steps | Manual — visual + contrast checker | Screenshot card/modal/popover side by side; run each pair through a WCAG contrast tool | ❌ manual only |
| FOUND-03 | Gradient functionally maps criticality/category | Manual — visual | Open criticality picker, confirm 3 distinct gradient-derived colors, distinguishable with `aria-label` present | ❌ manual only |
| FOUND-04 | Desktop type-scale + density at ≥1024px | Manual — devtools responsive mode | Check computed `font-size` on `<html>` at 1024/1280/1536px; check no overflow/clipping | ❌ manual only |
| FOUND-05 | Static ambient gradient, all 4 pages | Manual — visual + Performance tab | Visual check per page; confirm zero repaint activity in DevTools Performance recording (idle) | ❌ manual only |
| FOUND-06 | Global reduced-motion fallback | DevTools emulation | Chrome DevTools → Rendering → "Emulate CSS media feature prefers-reduced-motion: reduce" → confirm all transitions collapse to ~0ms | ❌ manual only (browser feature, no automated harness) |
| MOTION-02 | Hover/press on buttons/tabs | Manual — mouse + touch/emulation | Hover and click-hold on button/nav-tab/view-tab/criticality-picker; also test `(hover: none)` emulation for sticky-hover regressions | ❌ manual only |
| MOTION-03 | Tab-switch animates 150-300ms | Manual — visual + DevTools Performance | Switch `view`/route, confirm crossfade duration visually matches `duration-base` (200ms), no instant snap | ❌ manual only |

### Sampling Rate
- **Per task commit:** `npm run lint` (fast syntax/type check)
- **Per wave merge:** `npm run build` + the manual verification map above for every requirement touched in that wave
- **Phase gate:** Full manual walkthrough of all 8 requirements' verification steps before `/gsd:verify-work`, since no automated substitute exists

### Wave 0 Gaps
- No test framework exists and none is being added — this is a pre-existing, accepted project condition (per `.planning/codebase/CONCERNS.md`/PITFALLS.md), not a gap introduced by this phase. If the milestone later decides visual regression tooling is warranted, that is a separate, explicit decision — not implied by this phase's scope.

## Security Domain

`security_enforcement` is not set in `.planning/config.json` (absent = enabled), so this section is included per policy — but this phase has effectively no security surface: it is a CSS/token/JSX-styling change with zero new data input, zero new auth/session logic, and zero new network calls (confirmed in Architectural Responsibility Map — everything is Browser/Client or build-time CSS).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No | Not touched by this phase |
| V3 Session Management | No | Not touched by this phase |
| V4 Access Control | No | Not touched by this phase |
| V5 Input Validation | No | No new user input introduced (criticality picker already existed; no new form/field added) |
| V6 Cryptography | No | Not touched by this phase |

### Known Threat Patterns for this stack
None applicable — no injection surface, no new trust boundary. The only "risk" this phase touches is accessibility (contrast, focus visibility, reduced-motion), which is covered under Common Pitfalls/Validation Architecture rather than ASVS.

## Sources

### Primary (HIGH confidence)
- `src/app/globals.css` (this repo) — direct read, confirmed exact line numbers of `:root`/`.dark`/`@media` blocks and existing token values
- `src/app/layout.tsx`, `src/components/tasks/nav-tabs.tsx`, `src/components/tasks/view-tabs.tsx`, `src/components/tasks/criticality-picker.tsx`, `src/components/tasks/check-box.tsx`, `src/components/ui/button.tsx`, `src/components/site-header.tsx`, `src/app/tasks/page.tsx`, `src/app/tasks/habits/page.tsx`, `src/app/tasks/statistics/page.tsx`, `src/app/tasks/projects/page.tsx` (this repo) — direct read, confirmed current implementation, class names, line numbers, and duplicated `max-w-5xl` usage
- `node_modules/tailwindcss/theme.css` (installed, v4.3.1) — confirmed `--container-*` namespace (lines 333-345) and `--breakpoint-lg: 64rem` (line 329, = 1024px)
- `node_modules/tw-animate-css/dist/tw-animate.css` (installed, v1.4.0) — confirmed `animate-in`/`fade-in`/`--tw-duration` mechanism and default 150ms/200ms durations
- `node_modules/shadcn/dist/tailwind.css` (installed) — confirmed no competing `.dark` color block exists here, so deleting globals.css's dead blocks is safe
- `.planning/research/ARCHITECTURE.md`, `.planning/research/STACK.md`, `.planning/research/PITFALLS.md` (project-level research, already vetted) — cascade-collision root-cause analysis, motion-mechanism recommendations, accessibility/performance pitfalls

### Secondary (MEDIUM confidence)
- `.planning/research/FEATURES.md` — explicit recommendation to map criticality levels onto the teal→violet gradient (basis for Assumption A1)
- W3C WAI Technique C39 (https://www.w3.org/WAI/WCAG22/Techniques/css/C39) — canonical `prefers-reduced-motion` global-rule pattern, cross-referenced via `.planning/research/PITFALLS.md`'s sources list

### Tertiary (LOW confidence)
- Exact OKLCH numeric tuning (elevation lightness steps, gradient hue midpoint, container width value) — this researcher's synthesis within the direction CONTEXT.md locked, not independently verified against an external source; flagged in Assumptions Log A2-A4

## Metadata

**Confidence breakdown:**
- Cascade collision root cause & fix: HIGH — confirmed by direct source read of this repo's actual files, cross-checked against the shadcn import
- Token mechanism (`@theme inline`, `--container-*`, `--duration-*`): HIGH — confirmed against installed Tailwind v4 source, not training-data assumption
- Exact OKLCH/motion numeric values: MEDIUM — reasoned within locked constraints, needs a contrast-checker pass before being treated as final (flagged explicitly)
- Criticality gradient semantic remap: MEDIUM — directionally supported by project-level research (FEATURES.md) but a genuine design judgment call flagged for quick confirmation

**Research date:** 2026-07-04
**Valid until:** 2026-08-03 (30 days — stable CSS/Tailwind mechanisms, no fast-moving dependency in scope)
