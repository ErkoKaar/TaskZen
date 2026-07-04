# Architecture Research

**Domain:** Design-token / motion system layered onto an existing Next.js 16 + Tailwind v4 + shadcn/ui app (visual-only redesign, no data-layer changes)
**Researched:** 2026-07-04
**Confidence:** HIGH (token/motion mechanics verified against this repo's actual files + official Tailwind v4 docs; component-boundary recommendations are MEDIUM — they follow established Tailwind/shadcn convention but are this researcher's design, not an external standard)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  Pages (src/app/tasks/**/page.tsx)                                   │
│  Tasks | Habits | Projects | Statistics — "use client", own useState │
│  for view/UI-only state (selected view, hover, expanded row, etc.)    │
├───────────────────────────────┬───────────────────────────────────────┤
│  Domain-aware components       │  Pure presentational primitives      │
│  src/components/tasks/*        │  src/components/ui/*                 │
│  (check-box, criticality-      │  (button, badge, card, tabs, ...)    │
│  picker, ghost-input, nav-     │  consume token utility classes only, │
│  tabs, view-tabs) — know task/ │  zero knowledge of tasks/habits/     │
│  habit/project *shape*, no     │  projects domain                      │
│  Supabase calls of their own   │                                        │
├───────────────────────────────┴───────────────────────────────────────┤
│  Motion helpers — src/lib/motion.ts (+ optional small wrapper          │
│  components in src/components/ui/) — shared transition/duration/      │
│  easing class strings and reduced-motion helper, no state, no I/O     │
├─────────────────────────────────────────────────────────────────────┤
│  Token layer — src/app/globals.css                                    │
│  :root custom properties → @theme inline → generated Tailwind         │
│  utility classes (bg-*, text-*, duration-*, ease-*, animate-*)         │
└───────────────────────────────┬───────────────────────────────────────┘
                                 │  (className props only — no runtime
                                 │   dependency, no Context, no fetch)
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  UNCHANGED: Domain store hooks (useStore, useProjectsStore) +         │
│  Supabase client layer — pages call these for data/actions exactly    │
│  as today; the token/motion system never imports from here            │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Token layer (`globals.css`) | Single source of truth for color/spacing/typography/motion values as CSS custom properties, registered under `@theme inline` so Tailwind generates matching utility classes | CSS-only, no build step beyond existing `@tailwindcss/postcss` |
| Motion helpers (`src/lib/motion.ts`) | Named, reusable class-string constants (e.g. `transitionBase`, `transitionMicro`) and a `prefersReducedMotion()`/`useReducedMotion()` helper | Plain TS constants/hook, no dependency on React state beyond a `matchMedia` listener |
| Presentational primitives (`src/components/ui/*`) | Visual building blocks (Button, Badge/Chip, Card/Surface, Tabs) that accept props + children and apply token-driven classes; shadcn-style "dumb" components | `cva()` variants (already the established pattern in `button.tsx`) + `cn()` |
| Domain-aware components (`src/components/tasks/*`) | Compose primitives with task/habit/project-specific semantics (e.g. criticality → color mapping) and existing props/callbacks from pages | Existing files restyled in place — props signature unchanged |
| Pages (`src/app/tasks/**/page.tsx`) | Compose domain components + call store hooks; own only UI-local `useState` (selected view, expanded item, etc.) | Existing files restyled in place — hook calls unchanged |

## Recommended Project Structure

```
src/
├── app/
│   └── globals.css          # EXTEND (not replace): add color/motion/typography
│                             # tokens to the existing :root + @theme inline blocks
├── lib/
│   ├── motion.ts             # NEW: shared transition class strings + reduced-motion helper
│   └── tasks/, focusloop/…   # UNCHANGED — no imports added here, none needed
├── components/
│   ├── ui/                   # GROW: currently only button.tsx
│   │   ├── button.tsx        # existing — restyle variants using new tokens only
│   │   ├── badge.tsx         # NEW: criticality/priority/category chip primitive
│   │   ├── card.tsx          # NEW: surface/elevation wrapper (bg-surface, border, radius)
│   │   └── tabs.tsx          # NEW (optional): shared active/inactive tab styling used
│   │                         # by both nav-tabs.tsx and view-tabs.tsx today (duplicated)
│   └── tasks/                 # RESTYLE IN PLACE — no new files required
│       ├── check-box.tsx      # consume ui/ + motion.ts instead of ad hoc classes
│       ├── criticality-picker.tsx
│       ├── ghost-input.tsx
│       ├── nav-tabs.tsx
│       └── view-tabs.tsx
```

### Structure Rationale

- **`src/app/globals.css` stays the single token file.** The repo already uses the Tailwind v4 CSS-first theming convention (`:root` custom properties fed through `@theme inline` to produce utility classes). Introducing a second token source (e.g. a `theme.ts`, a `tokens.json`, or a CSS-in-JS system) would fork the mechanism this app already has working and is unnecessary — extend, don't replace.
- **`src/lib/motion.ts` is new but tiny and dependency-free.** It only holds string constants (`"transition-all duration-base ease-out-soft"`) and a reduced-motion check. This is the one shared place that encodes "150–300ms, one easing vocabulary" so every component references the same values instead of each page hand-typing `duration-200`/`duration-300` inconsistently (already observed: `check-box.tsx` and `view-tabs.tsx` each independently write `transition-colors` with no shared duration).
- **`src/components/ui/` grows to hold genuinely domain-agnostic visual primitives.** This mirrors the shadcn/ui convention already established by `button.tsx` (the only file in that folder today) and is exactly where a `Badge`/`Card`/`Tabs` primitive belongs per this repo's own "Where to Add New Code" convention (`.planning/codebase/STRUCTURE.md`).
- **`src/components/tasks/*` are restyled, not moved or renamed.** They stay the boundary between "knows about criticality/habits/projects" and "purely visual" — their existing prop signatures (`checked`/`onClick`, `value`/`onChange`, etc.) must not change, so pages that call them need zero logic edits, only (at most) additional visual props if a phase explicitly adds one.
- **No new top-level directory (no `src/design-system/`, no `src/theme/`).** Per Simplicity First: the existing `lib` + `components/ui` split already has a natural home for every new piece; adding a parallel structure would just create two places to look for the same kind of thing.

## Architectural Patterns

### Pattern 1: CSS-variable tokens registered through `@theme inline`

**What:** Every new design value (color, motion duration/easing, type scale step) is declared once as a `:root` custom property, then re-declared under `--color-*` / `--duration-*` / `--ease-*` / `--text-*` inside the existing `@theme inline { }` block in `globals.css`. Tailwind v4 turns each `@theme` entry into a matching utility class automatically (`--duration-base: 200ms` → `duration-base` utility works everywhere, including in `transition-*` composites).
**When to use:** Any new token that should be usable as a Tailwind class anywhere in the app (colors, spacing, radius, motion, type).
**Trade-offs:** Zero new dependencies and full IDE/Tailwind IntelliSense support for the new utilities; the only cost is keeping `:root` and `@theme inline` in sync (two blocks to touch per new token) — acceptable for a token set of this size.
**Example:**
```css
:root {
  /* motion tokens */
  --duration-micro: 150ms;
  --duration-base: 200ms;
  --duration-slow: 300ms;
  --ease-out-soft: cubic-bezier(0.16, 1, 0.3, 1);
}
@theme inline {
  --duration-micro: var(--duration-micro);
  --duration-base: var(--duration-base);
  --duration-slow: var(--duration-slow);
  --ease-out-soft: var(--ease-out-soft);
}
```
```tsx
// usage anywhere, no import needed
<button className="transition-colors duration-base ease-out-soft" />
```
Verified against official Tailwind v4 docs: `--duration-*` and `--ease-*` are documented theme namespaces that generate `duration-*` and `ease-*` utilities (tailwindcss.com/docs/transition-duration, /docs/transition-timing-function, /docs/theme).

### Pattern 2: CSS-only enter/exit transitions via existing `tw-animate-css` + Base UI `data-state`

**What:** `tw-animate-css` (already a dependency, already imported in `globals.css`) plus the `shadcn/tailwind.css` import ship `@custom-variant data-open`/`data-closed`/`data-checked`/etc. and `animate-in`/`animate-out`/`fade-in`/`slide-in-from-*`-style utilities keyed off `data-state` attributes that Base UI primitives (`@base-ui/react`, already used by `button.tsx`) already emit. This is the mechanism to use for expand/collapse, tab switches, and any Base UI popover/menu/dialog-style component.
**When to use:** Any mount/unmount or open/closed visual transition on a component built on `@base-ui/react` (or hand-rolled with a matching `data-state` attribute).
**Trade-offs:** No JS animation library, no extra state machine, works with SSR; limited to enter/exit of a binary state — for continuous/ambient effects (Pattern 3) a plain CSS keyframe is still needed.
**Example:**
```tsx
<div data-state={open ? "open" : "closed"}
     className="data-open:animate-in data-open:fade-in data-closed:animate-out data-closed:fade-out duration-base" />
```

### Pattern 3: Keyframe-driven ambient/state effects registered in `@theme inline`, gated by `prefers-reduced-motion`

**What:** For effects that aren't a simple open/closed toggle (task-completion pulse, ambient background glow), declare a `@keyframes` block inside `@theme inline` (same place the existing `accordion-down`/`accordion-up` keyframes from `tw-animate-css` live) and expose it as `--animate-*`, generating an `animate-*` utility. Wrap any always-on ambient animation with a `@media (prefers-reduced-motion: reduce)` override in `globals.css` that disables or shortens it.
**When to use:** Effects not modeled as component open/closed state (checkbox "done" pulse, background gradient drift).
**Trade-offs:** Slightly more CSS to maintain than Pattern 2, but still zero JS/runtime cost; must remember the reduced-motion override every time (this is the one recurring discipline item, not a one-time setup).
**Example:**
```css
@theme inline {
  @keyframes pulse-complete {
    0% { box-shadow: 0 0 0 0 var(--color-primary); }
    100% { box-shadow: 0 0 0 8px transparent; }
  }
  --animate-pulse-complete: pulse-complete 0.4s var(--ease-out-soft);
}
@media (prefers-reduced-motion: reduce) {
  .animate-pulse-complete { animation: none; }
}
```

## Data Flow

### Request Flow (unchanged by this redesign)

```
[User clicks checkbox]
    ↓
[CheckBox component — visual only, restyled]  → calls onClick prop (unchanged)
    ↓
[Page's handler] → [useStore().toggleTask()]  → optimistic setState → Supabase update
    ↓                                                ↓
[Re-render with new `done` value]         ← (rollback on error, unchanged)
```
The token/motion layer sits entirely inside the first box (visual rendering of whatever state the store hook already produced) and never appears between the page and the store hook. No new data flow is introduced; this is strictly a rendering-layer addition.

### State Management

```
[useStore / useProjectsStore]  (UNCHANGED — sole source of domain state)
    ↓ (props: task, habit, project objects — unchanged shape)
[Domain components: CheckBox, CriticalityPicker, ...]
    ↓ (className composition only)
[Presentational primitives: Button, Badge, Card, Tabs]
    ↓ (reads)
[Token layer: CSS custom properties / Tailwind utility classes]
```
Any new local UI state introduced by the redesign (e.g. a hover/press flag, an "just completed" transient flag for the pulse animation) must live in the component that needs it via plain `useState`/`useRef`, exactly like the existing `NAV_ITEMS`/`usePathname` pattern in `nav-tabs.tsx` — it must never be lifted into `useStore`/`useProjectsStore`, and it must never read/write Supabase.

### Key Data Flows

1. **Token propagation:** A single CSS custom-property edit in `globals.css` → recompiled Tailwind utility class → every component using that utility (`bg-primary`, `duration-base`, etc.) updates simultaneously. This is the mechanism that satisfies "restyle four pages without duplicating token logic per page."
2. **Motion class propagation:** A single edit to a constant in `src/lib/motion.ts` → every importer's transition timing/easing updates together, instead of grepping four page files for hardcoded `duration-200` strings.
3. **Domain data flow:** Completely unchanged — see `.planning/codebase/ARCHITECTURE.md` "Primary Request Path" section; this redesign has zero touchpoints with it.

## Scaling Considerations

Not applicable in the traditional sense (this is a visual redesign, not a system being scaled to more users). The relevant "scale" axis here is **number of pages/components restyled**, not traffic:

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1 page restyled | Token layer + 1-2 primitives is enough; risk of over-building `src/components/ui/` before real duplication is proven |
| All 4 pages (Tasks/Habits/Projects/Statistics) | Primitives pay off once ≥2 pages need the same visual pattern (e.g. both `nav-tabs.tsx` and `view-tabs.tsx` already hand-roll near-identical active/inactive tab logic — a shared `Tabs` primitive removes this duplication now, not speculatively) |
| Future pages beyond this milestone | Token layer and `src/lib/motion.ts` need no changes to support new pages — that's the point of centralizing them here |

### Scaling Priorities

1. **First risk:** Building too many speculative `ui/` primitives before confirming which visual patterns actually repeat across the four pages. Mitigation: build primitives in the order pages get restyled (Tasks first per PROJECT.md's desktop-density priority), extracting a primitive only when a second page needs the same pattern — matches this repo's own "Simplicity First" convention.
2. **Second risk:** Statistics page uses `recharts`, which needs JS-resolved color values (hex/rgb), not Tailwind class names, for chart `fill`/`stroke` props. The existing `--chart-1..5` CSS variables are OKLCH strings usable directly in most modern browsers' `fill` if passed as a raw CSS value, but confirm this in-browser before assuming it "just works" — flagged as a phase-specific research item, not solvable by the shared token layer alone.

## Anti-Patterns

### Anti-Pattern 1: Introducing a second token source (Tailwind config file, `styled-components` theme object, CSS-in-JS)

**What people do:** Add a `tailwind.config.ts` with a `theme.extend` block, or a JS/TS `theme.ts` object, alongside the existing CSS-first `globals.css` tokens.
**Why it's wrong:** Tailwind v4's CSS-first `@theme` approach is already fully wired into this project (verified: no `tailwind.config.*` file exists; everything routes through `globals.css`). A second config creates two sources of truth for the same values and directly contradicts Simplicity First / Surgical Changes.
**Do this instead:** Every new token goes into `globals.css`'s existing `:root` + `@theme inline` blocks, using the same OKLCH format already in use.

### Anti-Pattern 2: A new global animation Context/Provider for "themed" motion

**What people do:** Wrap the app in a `MotionProvider`/`AnimationConfigContext` to centrally control durations/easing at runtime, mirroring the existing `FocusTimerProvider` pattern.
**Why it's wrong:** Motion tokens here are static per design (150–300ms is a fixed vocabulary, not a runtime user preference beyond OS-level `prefers-reduced-motion`, which CSS media queries already handle with zero React). A Context adds render-tree coupling and a new dependency surface for something that's just CSS values — directly contradicts "no new state-management... unless a real gap is found" (PROJECT.md constraint).
**Do this instead:** Plain CSS media query (`prefers-reduced-motion`) + the static `src/lib/motion.ts` constants. If truly runtime-configurable motion is ever needed (out of scope for this milestone), only then reconsider.

### Anti-Pattern 3: Letting `src/components/tasks/*` (or pages) reach into `src/components/ui/*` internals via prop-drilled style overrides that re-encode colors/timings ad hoc

**What people do:** Pass one-off `style={{ transitionDuration: "180ms" }}` or a hardcoded hex/oklch value inline in a page or domain component "just this once."
**Why it's wrong:** Reintroduces exactly the per-page duplication this redesign is meant to eliminate, and silently drifts from the token system the moment one page diverges.
**Do this instead:** If an existing token doesn't fit, add a new named token to `globals.css` (or a new motion constant to `motion.ts`) so the next page that needs the same value reuses it — the fix belongs in the shared layer, not the call site.

## Integration Points

### External Services

Not applicable — this redesign has no external service integration. It is presentation-layer only and does not touch Supabase, Web Push, or any API route.

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Token layer (`globals.css`) ↔ everything else | Tailwind-generated utility classes only (`className` strings) | One-directional: components consume tokens, never write to them at runtime |
| `src/lib/motion.ts` ↔ components | Imported string constants / a `useReducedMotion()` hook | No dependency on any store hook; safe to import from any client component |
| `src/components/ui/*` ↔ `src/components/tasks/*` | Component composition (props/children), no shared state | `ui/*` components must remain domain-agnostic — enforce by never importing `useStore`/`useProjectsStore` types there |
| `src/components/tasks/*` ↔ pages | Existing props/callbacks (`checked`/`onClick`, `value`/`onChange`) | **Must not change** during restyle — this is the contract that keeps the store hooks untouched, per this milestone's core constraint |
| Redesign work ↔ `useStore`/`useProjectsStore`/Supabase | None | Explicitly out of bounds; if a phase seems to need a hook change, that's a signal the task has drifted outside "visual redesign" |

### Pre-work item: resolve the `:root` vs `.dark` token collision before adding new tokens

`src/app/layout.tsx` sets `<html class="dark ...">`, so the `.dark { ... }` block in `globals.css` (lines 98-131, leftover shadcn-default grayscale values) and the `:root { ... }` block (lines 54-96, the actual warm/teal palette) both target the same `<html>` element. Both selectors have equal specificity (`:root` and `.dark` are each one class-equivalent selector); per standard CSS cascade rules, when two rules of equal specificity target the same element, the one later in source order wins for any custom property declared in both. `.dark` is declared after `:root` and redeclares nearly every shared token (`--background`, `--primary`, `--accent`, `--border`, `--chart-1..5`, `--sidebar-*`, etc.) with different (grayscale) values — while tokens unique to `:root` (`--surface`, `--surface-2`, `--border-strong`, `--gold`, `--silver`, `--bronze`, `--warning`, `--on-track`) are unaffected since `.dark` never redeclares them.

This is the single most important thing to verify with browser devtools (inspect computed `--primary` on `<html>`) before extending either block — because if `.dark` is in fact winning today, "richer palette" work bolted onto `:root` alone would silently do nothing for any of the shared token names. Given this app is dark-only with no light/dark toggle (confirmed in `PROJECT.md` Out of Scope), the correct fix is almost certainly to delete the `.dark { ... }` block and the `@media (prefers-color-scheme: dark) { :root:not(.light) { ... } }` block entirely (both are leftover shadcn scaffolding for a light/dark toggle this app doesn't have), leaving `:root` as the single, unambiguous source — but confirm in-browser first rather than assuming. The `@custom-variant dark (&:is(.dark *))` declaration and the `dark:` utility variants used inside `button.tsx` (`dark:border-input`, etc.) are a separate, unrelated mechanism (they still fire correctly since `.dark` remains a valid ancestor class) and do not need to change.

## Sources

- This repository: `src/app/globals.css`, `src/app/layout.tsx`, `src/components/ui/button.tsx`, `src/components/tasks/*`, `package.json`, `node_modules/tw-animate-css/dist/tw-animate.css`, `node_modules/shadcn/dist/tailwind.css` (read directly; HIGH confidence, primary evidence for the cascade/collision finding and available animation utilities)
- Tailwind CSS v4 official docs — theme variable namespaces, confirming `--duration-*` and `--ease-*` generate utilities: https://tailwindcss.com/docs/theme, https://tailwindcss.com/docs/transition-duration, https://tailwindcss.com/docs/transition-timing-function (HIGH confidence, official source)
- `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STRUCTURE.md`, `.planning/PROJECT.md` (this project's own prior codebase mapping and milestone scope — primary source for component boundaries and constraints)

---
*Architecture research for: Dark/"alive" visual redesign token & animation system, Next.js 16 + Tailwind v4 + shadcn/ui*
*Researched: 2026-07-04*
