# Feature Research

**Domain:** Dark-themed, "alive" visual/interaction redesign for a task/habit/project manager (no new functionality)
**Researched:** 2026-07-04
**Confidence:** MEDIUM-HIGH (patterns cross-verified across multiple sources; no single authoritative spec exists for "alive dark UI" as a category, so some judgment calls are flagged)

## Scope Note

This is a **visual/interaction feature landscape**, not a functional one. "Features" here means *design/interaction patterns*, evaluated against the existing four pages (Tasks day/week/month, Habits, Statistics, Projects) and the constraint that CRUD/data behavior must not change. Table stakes = patterns users now expect from any modern dark productivity tool (Linear, Things 3, Todoist, Notion-class). Differentiators = where TaskZen's pulse-logo brand can show up distinctively. Anti-features = patterns that look impressive in a demo but actively hurt this specific product (dense, data-heavy, desktop-first, must stay fast on a hand-written PWA with no animation library beyond `tw-animate-css`).

## Feature Landscape

### Table Stakes (Users Expect These)

Patterns present in essentially every credible dark-mode productivity app (Linear, Todoist, Things, Notion, Craft). Missing these makes a "redesign" look unfinished or like it skipped basics.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Checkbox/task-completion micro-interaction (check-in animation + strikethrough + fade) | Every task manager confirms completion visually within ~150–300ms; instant snap-to-done feels broken | LOW | Animate `transform`/`opacity` only (scale-in checkmark, then fade+collapse row or strike text). Avoid animating `height`/`box-shadow` directly — causes repaint jank. Apply to `check-box.tsx` and habit toggle. |
| Hover/press feedback on all interactive elements (buttons, cards, nav tabs) | Baseline affordance — users need instant confirmation an element is clickable/pressed | LOW | 100–200ms `transform: scale()`/opacity shift + border/glow brightening. `tw-animate-css` + Tailwind `transition-*` utilities cover this without a JS library. |
| Tab/view switch transition (day↔week↔month, nav tabs, view-tabs) | Instant content swap reads as a "flash," breaks spatial continuity | LOW-MEDIUM | Crossfade + small slide (8–16px) using `animate-in`/`animate-out` (already a codebase dependency via `tw-animate-css`). 150–250ms, ease-out. |
| Expand/collapse animation (project task lists, accordion-style sections) | Content that appears/disappears without motion feels like a layout bug, not an interaction | LOW | `tw-animate-css` ships `accordion-down`/`accordion-up` presets specifically for this — direct fit for Projects page task lists. |
| Respect `prefers-reduced-motion` | Accessibility baseline; also a pure CSS media query, near-zero cost | LOW | Wrap ambient/looping animations and large transitions in `@media (prefers-reduced-motion: reduce)` fallback to instant/no-motion. |
| Consistent focus states / keyboard affordance preserved through redesign | Redesign must not silently break existing accessibility semantics | LOW | Visual restyle of focus rings (glow instead of default blue outline) is fine; removing them is not. |
| Loading/optimistic-update feedback preserved (existing optimistic pattern in `store.ts`/`projects-store.ts`) | Users already experience instant local updates; redesign must not introduce new perceived latency | LOW | Purely additive — new animations wrap existing optimistic state changes, don't replace them. |
| Legible numeric/stat typography (tabular figures, clear hierarchy) on Statistics page | Users scan stats quickly; misaligned/jittering digits erode trust in the number | LOW | Use `font-variant-numeric: tabular-nums` on all stat/count displays so digits don't shift width as they change. |
| Dark surfaces with real contrast hierarchy (not just "everything is one shade of near-black") | Baseline dark-UI competence — flat single-tone dark UIs look unfinished, per virtually every dark-mode guide reviewed | LOW-MEDIUM | Define 3–4 elevation tiers (page bg → card → raised card/modal → popover) via slightly lighter OKLCH lightness steps, not opacity overlays alone (opacity overlays on dark backgrounds desaturate/muddy accent colors). |

### Differentiators (Competitive Advantage / Brand Expression)

Not required by category norms, but where TaskZen can express the "alive, pulse-logo" identity distinctively. Should map directly to the "richer color + ambient depth" goals in PROJECT.md.

| Feature | Value Proposition | Complexity | Notes |
|---------|--------------------|------------|-------|
| Pulse/heartbeat glow accent tied to logo motif (e.g., a subtle glowing accent line or dot that pulses near active/live elements — active timer-adjacent indicators, "today" markers, streak indicators) | Directly ties the brand's literal visual identity (neon heartbeat logo) into the product UI, rather than generic glow-for-glow's-sake | MEDIUM | CSS `@keyframes` animating `opacity`/`filter: drop-shadow()` on a small SVG/pseuodo-element only — never animate a large blurred `box-shadow` continuously (repaint cost scales with area). Keep to 1–2 elements, not global. |
| Teal→violet gradient used functionally (priority/criticality accents, category chips, active-state borders) rather than only decoratively | Gives the "richer, more expressive palette" real information value — gradient becomes a signal, not wallpaper | LOW-MEDIUM | Map existing criticality levels (Critical/Warning/On-track) and categories to points along the teal→violet spectrum instead of arbitrary hues; reinforces brand + adds functional color-coding users can learn. |
| Ambient ombre/mesh-gradient page background (large, soft, mostly-static radial/conic gradient anchored to a corner, very low opacity) | Fixes the literal "empty desktop screen" complaint — gives large negative-space areas depth without adding content | LOW-MEDIUM | Pure CSS: 1–2 large fixed radial-gradient `background-image` layers with `blur()`/soft-edge on the page container, `will-change: auto` (not animated per-frame — a fully static ambient gradient is often visually indistinguishable from a slow-drifting one to typical users, and is free performance-wise). If motion is added, animate `background-position` or a `transform: translate()` on a pseudo-element, never re-paint the gradient itself every frame. |
| Confident, larger desktop type scale + increased content density via layout (not just font-size) | Directly targets the stated primary pain point: small type + excess whitespace feels empty on desktop (≥1024px) | MEDIUM | Two independent levers: (1) raise base/heading font sizes and line-height at `lg:`/`xl:` breakpoints using Tailwind's responsive type utilities; (2) use freed vertical rhythm for a secondary content lane (e.g., wider stat cards, secondary metadata columns, multi-column project boards) rather than just "bigger everything." Reference pattern: Linear pairs dense information layout with a single restrained accent color and strong type hierarchy rather than decorative filler. |
| Staggered list-entry animation (tasks/habits fade+slide in with small per-item delay on view load or filter change) | Reinforces the "alive" feeling on every view load without being a one-off gimmick | LOW-MEDIUM | CSS animation-delay per index (`nth-child` or inline style var), capped at ~5–8 visible items then no further stagger (avoid slow perceived load on long lists). |
| Count-up/tween animation for statistics numbers on Statistics page load | Adds motion/liveliness to the page most likely to otherwise feel like a static report | MEDIUM | CSS-only approximants exist but a tiny requestAnimationFrame tween (no library) is more reliable for exact final values; must finish quickly (≤600ms) and only run once per mount, not on every re-render/optimistic update. |
| Subtle card "lift" on hover (translateY + shadow/glow increase) for task/habit/project cards | Reinforces depth hierarchy established by ambient background + elevation tiers | LOW | `transform: translateY(-2px)` + glow shadow, `transform`/`opacity` only — GPU-cheap. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|----------------|------------------|-------------|
| Full drag-and-drop reordering as part of this redesign (e.g., dnd-kit integration for tasks/projects) | "Alive" UIs often have drag/reorder; feels like a natural companion to micro-interactions | This is **new functionality**, not a visual change — explicitly out of scope per PROJECT.md ("no new features"). Also a real complexity jump (needs a library, touch support, persistence of order) unrelated to the stated goal. | If reordering doesn't already exist in `store.ts`/`projects-store.ts`, leave it out entirely. If it already exists, only restyle the existing drag affordance/animation — don't add new drag surfaces. |
| Particle systems / canvas-based animated backgrounds (floating particles, animated starfields, WebGL blobs) | Visually striking in portfolio/marketing sites; feels maximally "alive" | Continuous canvas/WebGL redraw is expensive on battery-powered/mobile PWA use, competes for the same GPU budget as scroll/typing responsiveness, and is a categorical mismatch for a *work* tool used for hours — becomes visual noise/distraction rather than ambience. Also, no such library exists in the stack and adding one violates the "no new animation library unless a real gap is found" constraint. | Static or near-static CSS gradient/glow layers (see Differentiators) deliver most of the "depth" perception at near-zero runtime cost. |
| Skeuomorphic sound effects / haptic feedback on every completion | "Feels alive" is often over-interpreted as multi-sensory feedback | Sound-on-every-checkbox is a classic overreach that annoys users in shared/office spaces and has no existing precedent in this PWA; haptics need native APIs with inconsistent support. Neither was requested in PROJECT.md's definition of "alive" (micro-interactions + transitions + ambient effects + color). | Keep feedback purely visual, consistent with the four pillars actually specified. |
| Heavy `backdrop-filter: blur()` glassmorphism panels used pervasively (frosted-glass cards, nav, modals) | Popular "dark, modern" aesthetic reference (macOS-style frosted panels) | `backdrop-filter` is one of the most expensive CSS properties to composite, especially over animated/scrolling content, and used pervasively across four data-dense pages it will cause visible scroll/animation jank, particularly on lower-end/mobile PWA devices this app must still support | Use flat elevated surfaces with subtle border + glow instead of blur-based glass; reserve `backdrop-filter` (if used at all) for a single occasional overlay (e.g., a modal backdrop), not for structural, always-visible panels. |
| Redesigning information architecture/layout structure alongside the visual pass (e.g., adding new dashboard widgets, reorganizing nav) | Once "in the code," it's tempting to also fix layout/IA issues noticed along the way | Explicitly conflicts with the "100% functional/CRUD parity, no new features" constraint in PROJECT.md; scope creep risk is the single biggest threat to this milestone | Any IA/layout change that isn't purely "spacing/density/typography of the existing structure" gets logged as a follow-up idea, not implemented now. |
| Auto-playing looping ambient animations that run indefinitely and can't be paused (e.g., constantly pulsing glows across the whole page, animated conic gradients rotating forever) | Feels maximally "alive," matches the heartbeat/pulse brand literally | Continuous infinite animations increase CPU/GPU usage for the entire session (this is a productivity tool people keep open all day), fight `prefers-reduced-motion` expectations, and desensitize users to the pulse motif if it's everywhere rather than meaningful | Reserve the literal pulse/glow animation for specific, meaningful states (e.g., "today" indicator, active/live item) — not the whole canvas; make any looping animation pausable via `prefers-reduced-motion` and keep iteration counts finite where possible (e.g., pulse 2–3 times then settle, rather than forever). |
| Replacing existing checkbox/toggle components' underlying markup or state model to "make animation easier" | Animation sometimes seems to need new DOM structure | This is a visual-only redesign — restructuring `check-box.tsx`/`criticality-picker.tsx` internals beyond what's needed for animation risks behavior regressions in a codebase with **no test suite** | Prefer CSS-only animation (transitions/`@keyframes`/`tw-animate-css` data-state utilities) over introducing new component state; verify manually in-browser after each change per PROJECT.md's constraint. |

## Feature Dependencies

```
[Elevation-tier dark palette] (surfaces + accent gradient mapping)
    └──requires──> [Extend existing OKLCH tokens in globals.css]
                       └──enables──> [Criticality/category color-coding via teal→violet gradient]
                       └──enables──> [Card hover-lift + glow]

[Ambient background gradient layer]
    └──requires──> [Elevation-tier dark palette] (must sit behind/complement surface tiers, not clash)
    └──enhances──> [Desktop density/typography fix] (fills negative space perceptually, reducing pressure to over-densify layout)

[Checkbox/task-completion micro-interaction]
    └──requires──> [prefers-reduced-motion fallback] (motion-sensitive users need instant alternative)
    └──enhances──> [Existing optimistic update pattern in store.ts] (wraps it, doesn't replace it)

[Tab/view switch transition] ──uses──> [tw-animate-css animate-in/animate-out utilities]
[Expand/collapse animation] ──uses──> [tw-animate-css accordion-down/accordion-up presets]

[Pulse/heartbeat brand accent] ──conflicts──> [Auto-playing infinite ambient animation everywhere] (anti-feature)
    (the pulse motif only stays meaningful if reserved for specific live/active states)

[Statistics count-up animation] ──requires──> [Tabular-nums typography] (numbers must not jitter in width while tweening)

[Drag-and-drop reordering] ──conflicts──> [No new features constraint] (anti-feature — excluded regardless of dependencies)
```

### Dependency Notes

- **Ambient background gradient requires elevation-tier palette first:** if the layered card/surface lightness steps aren't defined yet, an ambient gradient underneath will either wash out cards (too bright) or be invisible (too dark) — palette work should land before/with the ambient-effect work, not after.
- **Micro-interactions enhance, not replace, the existing optimistic-update pattern:** `store.ts` and `projects-store.ts` already do optimistic local state changes with manual rollback; animations should trigger off those existing state transitions, not introduce a new "pending" visual state that could desync from actual rollback behavior.
- **tw-animate-css covers the two highest-value transition patterns out of the box:** accordion presets for expand/collapse (Projects page) and animate-in/out for tab/view switches (nav-tabs, view-tabs) — no new library needed, matching PROJECT.md's stack constraint.
- **Pulse accent vs. ambient looping conflict:** both are "differentiator" ideas from the brand motif, but building both as continuous, everywhere animations at once would violate the anti-feature guidance on infinite looping motion — pick pulse-as-meaningful-signal over pulse-as-decoration.
- **Drag-and-drop is excluded regardless of how well it fits the "alive" theme:** it is a functional/interaction-model change, not a visual one, and PROJECT.md is explicit that no new features are in scope for this milestone.

## MVP Definition

Since this milestone has no "launch" in the traditional sense (it's a visual redesign of an existing, working product), "MVP" here means the minimum set of changes that fully addresses the four "alive" pillars from PROJECT.md across all four pages, sequenced by dependency.

### Launch With (v1 — this milestone)

- [ ] Elevation-tier dark palette + teal→violet accent mapping extended from existing `globals.css` tokens — foundation everything else depends on
- [ ] Ambient background gradient layer (static or near-static) on all four pages — directly fixes the "empty desktop screen" complaint
- [ ] Desktop type-scale increase + density adjustments (≥1024px) — the explicitly named primary pain point
- [ ] Checkbox/task-completion and habit-toggle micro-interactions — highest-frequency interaction, biggest "does this feel alive" signal
- [ ] Tab/view-switch transitions (day/week/month, nav tabs) via `tw-animate-css`
- [ ] Expand/collapse transitions on Projects page task lists via `tw-animate-css` accordion presets
- [ ] Hover/press feedback across buttons, cards, nav elements
- [ ] `prefers-reduced-motion` fallback wired in from the start (cheap, and avoids retrofitting)

### Add After Validation (within this milestone, later phase)

- [ ] Pulse/heartbeat brand accent on specific live/active elements (today marker, streaks) — depends on palette + restraint decision about where it appears
- [ ] Statistics count-up/tween number animation — depends on tabular-nums typography being in place first
- [ ] Staggered list-entry animation on task/habit lists — polish layer, apply once base interactions feel right

### Future Consideration (explicitly not this milestone)

- [ ] Any new functionality suggested by the redesign process (new widgets, reorder, IA changes) — log as ideas, do not implement; would violate functional-parity constraint

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|----------------------|----------|
| Elevation-tier palette + accent mapping | HIGH | MEDIUM | P1 |
| Desktop type scale + density fix | HIGH | MEDIUM | P1 |
| Ambient background gradient | HIGH | LOW-MEDIUM | P1 |
| Checkbox/completion micro-interaction | HIGH | LOW | P1 |
| Tab/view transitions | MEDIUM | LOW | P1 |
| Expand/collapse (Projects) | MEDIUM | LOW | P1 |
| Hover/press feedback everywhere | MEDIUM | LOW | P1 |
| prefers-reduced-motion support | MEDIUM (accessibility) | LOW | P1 |
| Pulse/heartbeat brand accent | MEDIUM | MEDIUM | P2 |
| Statistics count-up animation | LOW-MEDIUM | MEDIUM | P2 |
| Staggered list-entry animation | LOW-MEDIUM | LOW-MEDIUM | P2 |
| Card hover-lift/glow | MEDIUM | LOW | P2 |
| Drag-and-drop reordering | N/A (excluded) | HIGH | Excluded |
| Particle/canvas ambient backgrounds | LOW (risk > value here) | HIGH | Excluded |
| Pervasive backdrop-filter glassmorphism | LOW (risk > value here) | MEDIUM-HIGH | Excluded |

**Priority key:**
- P1: Core to satisfying PROJECT.md's four "alive" pillars and the primary desktop-density complaint
- P2: Meaningful polish that reinforces brand identity, sequenced after P1 foundations exist
- Excluded: Anti-features per above — do not implement this milestone

## Competitor/Reference Pattern Analysis

| Pattern | Linear (dense SaaS/PM tool) | Things 3 / Todoist (consumer task apps) | Our Approach |
|---------|------------------------------|-------------------------------------------|--------------|
| Dark surface strategy | Near-black base, muted borders, single accent color, contrast/hierarchy over decoration | Dark base with softer accent chips per category/priority | Elevation-tier OKLCH steps + teal→violet accent used functionally per criticality/category (closer to Todoist's functional color use, with Linear's restraint on decoration) |
| Typography | Custom sans, strong heading weight (500–700), tabular-nums for numeric data, dense layout with clear hierarchy | Larger, friendlier body type, more whitespace (consumer-friendly, less dense) | Follow Linear's density/hierarchy discipline for desktop (fixes the "empty" complaint) while keeping Todoist/Things-level approachability for everyday task text |
| View/tab transitions | Near-instant, crossfade-based, "fast" perception prioritized over decorative motion | Slide transitions between list views | Fast crossfade + small slide via `tw-animate-css`, biased toward Linear's "feels instant" philosophy rather than long decorative transitions |
| Ambient/brand expression | Minimal — relies on typography/spacing, almost no background decoration | Minimal — flat colors, occasional accent illustrations | Deliberately more ambient than either reference (soft gradient + pulse accent), since PROJECT.md explicitly wants "richer palette + ambient depth" as differentiation from the current flat state — this is the one axis where TaskZen intentionally diverges from the minimal-decoration SaaS norm |

## Sources

- [How we redesigned the Linear UI (part II)](https://linear.app/now/how-we-redesigned-the-linear-ui) — MEDIUM confidence (official design writeup)
- [Design System Analysis: Linear](https://getdesign.md/linear.app/design-md) — MEDIUM confidence (third-party analysis, cross-checked against Linear's own post)
- [Recreating YouTube's Ambient Mode Glow Effect — Smashing Magazine](https://www.smashingmagazine.com/2023/07/recreating-youtube-ambient-mode-glow-effect/) — MEDIUM-HIGH confidence (reputable technical publication, verifies glow/ambient technique + performance framing)
- [tw-animate-css — npm](https://www.npmjs.com/package/tw-animate-css) and [Tailwind v4 — shadcn/ui](https://ui.shadcn.com/docs/tailwind-v4) — HIGH confidence (official package/docs; confirms `accordion-down`/`accordion-up` and `animate-in`/`animate-out` presets are available in the already-installed dependency, matching PROJECT.md's "no new animation library" constraint)
- [A Comprehensive Guide to Ambient Light Effects in Web Design](https://silphiumdesign.com/guide-to-ambient-light-effects-in-web-design/) — LOW-MEDIUM confidence (single design-agency source, used only for corroborating "soft/diffused ambient light reduces eye strain" framing already supported elsewhere)
- General micro-interaction timing/accessibility guidance (200–400ms range, `prefers-reduced-motion`) — MEDIUM confidence, corroborated across multiple independent articles ([DesignerUp](https://designerup.co/blog/complete-guide-to-ui-animations-micro-interactions-and-tools/), [Userpilot](https://userpilot.com/blog/micro-interaction-examples/), [Netcode Design](https://netcodesign.com/micro-interactions-that-feel-magical-best-practices-code-snippets/)) — quantitative "37% increase in perceived responsiveness" style stats from these sources are marketing-blog-sourced and NOT independently verified; treat directional guidance (timing ranges, easing choices, reduced-motion support) as reliable, treat specific percentage claims as unverified and omit from decision-making.
- Performance guidance on avoiding `box-shadow`/`filter` animation and preferring `transform`/`opacity`, and on `backdrop-filter` compositing cost — MEDIUM confidence, consistent with well-established browser rendering-pipeline behavior (paint vs. composite layers), corroborated across [freefrontend.com CSS glow effects](https://freefrontend.com/css-glow-effects/) and general web-performance literature reflected in search summaries.
- Project-specific context: `.planning/PROJECT.md`, `.planning/codebase/STRUCTURE.md` (existing stack: Tailwind v4, shadcn/ui, `tw-animate-css`, OKLCH tokens in `globals.css`, no test suite, existing optimistic-update pattern in `store.ts`/`projects-store.ts`).

---
*Feature research for: Dark, "alive" visual redesign of TaskZen Task Manager (Tasks/Habits/Statistics/Projects)*
*Researched: 2026-07-04*
