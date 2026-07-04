# Stack Research

**Domain:** Dark, "alive" animated UI on Next.js 16 / React 19 / Tailwind v4 / shadcn/ui (brownfield visual redesign, no new features)
**Researched:** 2026-07-04
**Confidence:** HIGH (Context7-equivalent verification via `node_modules/next/dist/docs/`, official MDN/web.dev, and cross-checked WebSearch)

## Executive Take

**No new animation library is needed, and none should be added.** The project already has everything required: Tailwind v4's CSS-first engine, `tw-animate-css` for enter/exit utility classes, `@base-ui/react` (unstyled primitives with `data-open`/`data-closed`/`data-state` attributes built for exactly this), and — since this app runs on **actual Next.js 16 + React 19.2 canary internals** — native browser/React animation primitives that didn't exist when most "you need Framer Motion" advice was written. The 2025/2026 standard for this stack is: **CSS-first, JS-optional**. Reach for a JS animation library only for things CSS structurally cannot do (physics-based drag, FLIP list-reorder animations) — none of which are in scope here (no reordering, no drag requirements in PROJECT.md).

This keeps bundle size flat, respects the "no new libraries unless a real gap is found" constraint, and — critically — sidesteps a real risk: `next dev`/`next build` now run on **Turbopack by default** in Next.js 16, and some animation libraries with older CJS/webpack-only interop patterns can hit rough edges there. Motion (the Framer Motion successor) is Turbopack-compatible if it were ever needed, but it isn't needed for this milestone's scope (hover/press feedback, expand/collapse, tab crossfades, ambient background effects).

## Recommended Stack

### Core Technologies (already installed — use as-is)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Tailwind CSS v4 | `^4` (via `@tailwindcss/postcss`) | Utility styling, OKLCH design tokens, `@theme`/`@custom-variant` | CSS-first v4 engine natively supports arbitrary values, custom properties, and container queries — no `tailwind.config.js` needed. Already how `globals.css` defines the palette. |
| `tw-animate-css` | `^1.4.0` (installed) | Declarative `animate-in`/`animate-out`, `fade-*`, `zoom-*`, `slide-*`, `blur-in-*` utility classes; drop-in `tailwindcss-animate` replacement for Tailwind v4 | Zero-JS, pure CSS. Directly covers "hover/press feedback" and "smooth state transitions" (checkbox toggle, card enter/exit) via utility classes alone. Already imported in `globals.css:2`. |
| `@base-ui/react` | `^1.6.0` (installed) | Unstyled primitive components (Dialog, Popover, Collapsible, Accordion, Checkbox, etc.) underlying shadcn-style components | Every Base UI component exposes `data-open` / `data-closed` / `data-starting-style` / `data-ending-style` attributes specifically designed to be targeted by CSS transitions/animations (see `base-ui.com/react/handbook/animation`) — this is the *supported* way to animate mount/unmount in this stack, no wrapper library required. |
| Native CSS transitions/`@keyframes` | N/A (browser feature) | Micro-interactions: hover/press/focus states, color/transform/opacity animation | `transition-colors`, `transition-transform`, `duration-150`–`duration-300`, `ease-out` Tailwind utilities are the correct tool for 150–300ms feedback per the requirement — this is literally what CSS transitions are for, no runtime cost. |

### Modern CSS Techniques (native, zero dependencies, verified against Next.js 16's own minimum browser targets)

| Technique | Purpose | Browser support (2026) | Notes |
|-----------|---------|------------------------|-------|
| `@starting-style` + `transition-behavior: allow-discrete` | Animate elements *in* from `display:none`/`opacity:0` without JS (e.g. a toast, a newly-added task row, a completed-task fade-out before removal) | Chrome/Edge 117+ (allow-discrete: 121+), Safari 17.5+, Firefox 129+ — Baseline "Newly Available" | Next.js 16's own stated minimum browser support is Chrome 111+, Edge 111+, Firefox 111+, Safari 16.4+ — slightly *older* than this feature's floor. Use it as **progressive enhancement**: wrap in `@supports (transition-behavior: allow-discrete)` or just accept instant-swap fallback on the small % of users on older engines. Never block a feature on this. |
| CSS `@property` + custom-property animation | Animate gradient angle/position for the ambient teal→violet glow motif smoothly (custom properties are not animatable by default without `@property`) | Chrome/Edge 85+, Safari 16.4+, Firefox 128+ | Needed if the ambient background glow uses an animated `conic-gradient`/`radial-gradient` angle rather than a static one. |
| CSS grid `grid-template-rows: 0fr → 1fr` trick | Expand/collapse animation (habit list groups, project task lists) without measuring pixel heights in JS | All evergreen browsers, no flag needed | **Prefer this over `interpolate-size`/`calc-size()`** (see "What NOT to Use" — Safari/Firefox don't support those yet) for any collapsible content in this redesign. |
| `prefers-reduced-motion` media query | Accessibility — disable/soften ambient and directional animations for motion-sensitive users | Universal | Required any time "ambient background effects" or directional slides are added; wrap all decorative `@keyframes`-driven animation in this query per Next's own view-transitions guide recommendation. |
| `color-scheme: dark` + OKLCH tokens | Consistent native form control / scrollbar theming in dark mode | Universal (already set in `globals.css:55`) | Already correctly set; no action needed, just don't remove it. |

### Framework-Native Animation (Next.js 16 / React 19.2-specific — verify before use)

| Feature | Version/Flag | Purpose | Status |
|---------|--------------|---------|--------|
| React `<ViewTransition>` + `experimental.viewTransition` in `next.config.ts` | Next.js 16.2.9 / React 19.2 canary (bundled — **no `react@canary` install needed**, confirmed in `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md`) | Declarative wrapper around the native browser View Transitions API. Handles route-to-route crossfades (Tasks ↔ Habits ↔ Projects ↔ Statistics via `TasksNavTabs`, which already uses `next/link`) and same-route content swaps (day/week/month `ViewTabs`, which uses local `useState`, via `key`-driven `ViewTransition`). | **Experimental flag.** HIGH confidence it works as documented (official Next.js 16 docs), MEDIUM confidence recommendation to *enable* it for this milestone — it's exactly the tool for "smooth tab switches, no instant snaps," but it's an opt-in `next.config.ts` flag on a production app. Recommend a **spike/validation early in the redesign** (small phase or research spike) rather than assuming it's risk-free; fallback is plain CSS crossfade via `tw-animate-css` `fade-in`/`fade-out` if it misbehaves. |
| `useEffectEvent` (React 19.2) | Bundled canary | Extract non-reactive logic (e.g. reading current theme/animation-preference) out of effects that drive imperative animation timing, without over-triggering re-renders | Not required for this milestone's scope, but available if a hand-rolled JS-driven ambient effect needs an effect that reads latest state without being a dependency. |
| `Activity` component (React 19.2) | Bundled canary | Keep a hidden view's state alive with `display:none` instead of unmounting (e.g. keeping Week/Month/Year data warm when switching `ViewTabs`) | Optional — nice-to-have for snappier tab switches, not required for "alive" feel. Flag as a possible Phase enhancement, not a Phase 1 requirement. |
| React Compiler (`reactCompiler: true` in `next.config.ts`) | Stable in Next.js 16, **opt-in, not default** | Auto-memoizes components, reduces re-renders during animation-heavy re-paints | Not required for this redesign, but worth knowing it's available and stable if animation-driven re-renders (e.g. re-rendering a whole day view on every checkbox hover-state change) become a perf concern. Adds Babel compile-time overhead — don't turn on speculatively. |

### Supporting Libraries (already installed — reuse for Statistics page)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `recharts` | `^3.9.0` | Statistics page charts | Recharts 3.x ships built-in `isAnimationActive`/`animationDuration`/`animationEasing` props on chart primitives (Bar, Line, Pie, etc.) — use these instead of wrapping charts in a separate animation library for the Statistics page's "alive" feel. |
| `lucide-react` | `^1.21.0` | Icons | No animation-specific action needed; icons can be animated via the same CSS transform/transition utilities as everything else (e.g. a checkbox check icon scaling in). |
| `class-variance-authority` / `clsx` / `tailwind-merge` | `^0.7.1` / `^2.1.1` / `^3.6.0` | Variant + conditional class composition | Use to compose animation-state variants (e.g. `data-[state=checked]:animate-in`) alongside existing variant patterns in `button.tsx` — no new pattern needed. |

## Installation

No new packages required.

```bash
# Nothing to install — tw-animate-css, @base-ui/react, and Tailwind v4 already cover this milestone's needs.
```

If, after implementation, a genuine gap emerges (e.g. drag-to-reorder is added to a later milestone, which is explicitly out of scope here), the single recommended addition would be:

```bash
npm install motion
```

(`motion` — npm package name for the Framer Motion successor — not `framer-motion`, which is the deprecated legacy package name.)

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| CSS transitions + `tw-animate-css` for micro-interactions | Motion (`motion` npm package, ex-Framer Motion) | If a future milestone adds drag-and-drop reordering, physics-based gestures, or scroll-linked parallax that CSS structurally can't express declaratively. Not needed for this milestone. |
| `grid-template-rows: 0fr→1fr` for expand/collapse | `interpolate-size: allow-keywords` / `calc-size()` | Once Firefox and Safari ship support (currently Chromium-only, 129+) — revisit in a future pass; using it today would silently no-op the animation for ~40%+ of users depending on audience browser mix. |
| React `<ViewTransition>` (Next.js `experimental.viewTransition`) for route/tab crossfades | Plain `tw-animate-css` `fade-in`/`fade-out` classes toggled by `usePathname()`/state | If the experimental flag proves unstable in a spike, or if the team wants zero experimental-flag risk in a production app — the CSS-only fallback achieves ~80% of the visual effect with zero framework risk. |
| Native `@starting-style`/`allow-discrete` for enter animations of dynamically-added elements | `tw-animate-css`'s `animate-in`/`fade-in` classes (JS-toggled mount) | `tw-animate-css` already handles this today with broader browser support than `@starting-style`; prefer it as the default, use `@starting-style` opportunistically for `display:none`-based elements where a class-toggle approach is awkward. |
| Recharts built-in animation props | A separate chart animation wrapper | Never for this milestone — Recharts 3.9's animation props are sufficient and already installed. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Framer Motion / `framer-motion` (legacy package name) | Renamed/superseded by `motion`; installing the old package name pulls deprecated docs/APIs and isn't the current recommended entry point | If a JS animation library is ever truly needed, install `motion` instead |
| `interpolate-size` / `calc-size()` as the *only* mechanism for expand/collapse | Not supported in Safari or Firefox as of 2026 — would silently fail to animate for a large share of users with no visual fallback (content still toggles, just instantly) | `grid-template-rows: 0fr → 1fr` trick, which works in all evergreen browsers today |
| Heavy JS scroll-linked / parallax libraries (e.g. GSAP ScrollTrigger, Lenis) for "ambient background effects" | Out of proportion to the requirement ("subtle ambient/background effects... without hurting readability or performance") and directly conflicts with the "no new libraries unless a real gap is found" constraint; also a common source of jank on lower-end devices, which risks the explicit "must not hurt performance" requirement | A static or slow (20–60s) CSS `@keyframes`-animated gradient/radial-glow using the existing OKLCH tokens, GPU-accelerated via `transform`/`opacity`/`background-position` only |
| `next/legacy/image`, `experimental.turbopack` config key, `experimental_ppr` route config, `unstable_cacheLife`/`unstable_cacheTag` imports | All removed/renamed in Next.js 16 (per `node_modules/next/dist/docs/.../version-16.md`) — training data from pre-16 Next.js will suggest these and they will fail to build | `next/image`, top-level `turbopack` config key, `cacheComponents` config, `cacheLife`/`cacheTag` (no `unstable_` prefix) — **irrelevant to animation work directly, but flagged because any AI-assisted coding on this repo is prone to reaching for the pre-16 API by habit** |
| Animating `box-shadow` color/spread directly for the ambient glow at high frequency | `box-shadow` is not GPU-accelerated and repaints on every frame — will cause jank on the "ambient background" effect that's meant to run continuously | Animate `opacity`/`transform` on a separate pseudo-element/absolutely-positioned blurred div carrying the glow, or use a static `filter: blur()` glow whose *position* (not shadow spread) animates via `transform` |
| `scroll-behavior: smooth` on `<html>` without also adding `data-scroll-behavior="smooth"` | Next.js 16 changed the default — it **no longer overrides** `scroll-behavior` during SPA navigations the way Next.js 15 did. If a smooth in-page scroll is desired to *also* apply consistently across route transitions, the old auto-override behavior must be explicitly opted back in | Add `data-scroll-behavior="smooth"` to `<html>` in `src/app/layout.tsx` if smooth scroll during navigation is desired; otherwise no action needed |

## Stack Patterns by Variant

**For micro-interactions (buttons, cards, checkboxes — hover/press feedback, 150–300ms):**
- Use Tailwind's `transition-colors`/`transition-transform`/`transition-all` + `duration-150`/`duration-200`/`duration-300` + `ease-out` utilities directly on the element.
- Because this is a pure state → state style change (no mount/unmount, no layout reflow) — the textbook case for CSS transitions, zero JS.

**For enter/exit of dynamically added/removed elements (new task row, completed task disappearing, toast-like feedback):**
- Use `tw-animate-css`'s `animate-in fade-in slide-in-from-*` / `animate-out fade-out slide-out-to-*` classes, toggled via conditional rendering or a Base UI primitive's `data-open`/`data-closed` state.
- Because this is exactly what the package exists for, and it's already a dependency.

**For expand/collapse (habit groups, project task lists, any accordion-like disclosure):**
- Use the `grid-template-rows: 0fr → 1fr` CSS trick (grid row track transition), or if using a Base UI Accordion/Collapsible primitive, use its data-attribute-driven height variable (mirrors the `--radix-accordion-content-height` pattern `tw-animate-css`'s `accordion-down`/`accordion-up` utilities already expect).
- Because it degrades gracefully everywhere and needs no JS height measurement.

**For tab/view switches (Tasks/Habits/Projects/Statistics nav, day/week/month view toggle):**
- Spike React's `<ViewTransition>` behind `experimental.viewTransition` first (crossfade + optional shared-element/directional slide per the official Next.js 16 guide); fall back to a plain CSS crossfade via `tw-animate-css` if the experimental flag causes any regression.
- Because this is precisely the documented use case for the feature, and it's free (bundled in the canary Next.js 16 already ships) — but it is experimental, so validate before committing to it as load-bearing.

**For ambient/background depth effects:**
- Use a slow, GPU-cheap CSS `@keyframes` animation (`background-position`, `transform`, or `opacity` only — never layout-affecting properties) on a fixed/absolutely-positioned decorative layer behind content, built from the existing OKLCH teal→violet gradient tokens; gate it behind `prefers-reduced-motion: no-preference`.
- Because this satisfies "adds depth without hurting readability or performance" without any new dependency, and is trivially disable-able for accessibility.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `tw-animate-css@1.4.0` | `tailwindcss@^4` | Purpose-built as the Tailwind v4 CSS-first replacement for the old `tailwindcss-animate` JS plugin. **Note:** its own README flags that upcoming `v2.0.0` will include breaking changes with a migration guide — don't blindly `npm update` past `^1.4.0` mid-redesign without checking the changelog. |
| Next.js `16.2.9` App Router | React `19.2.4` (bundled canary internally for App Router features regardless of the pinned `react`/`react-dom` version in `package.json`) | `<ViewTransition>`, `useEffectEvent`, and `Activity` are available via this canary integration without installing `react@canary` yourself — confirmed directly in the official Next.js 16 docs shipped in this repo's `node_modules`. |
| `experimental.viewTransition` (Next.js 16 config flag) | Browsers without View Transitions API support | Explicitly documented as a no-op fallback: "Without browser support, your application works normally, the transitions simply do not animate." Safe to enable. |
| `@starting-style`/`allow-discrete` | Next.js 16's stated minimum browser targets (Safari 16.4+, Firefox 111+) | Feature's real floor (Safari 17.5+, Firefox 129+) is *narrower* than Next 16's official minimum — must be used as progressive enhancement, not a load-bearing mechanism, or some in-support-range users get no animation (which is an acceptable, non-breaking degradation). |
| `interpolate-size`/`calc-size()` | Firefox, Safari | **Not supported at all** in either engine as of this research date — do not rely on these for any user-facing animation in this milestone. |

## Sources

- `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md` (official, bundled with installed Next.js 16.2.9) — HIGH confidence, verified `<ViewTransition>` usage, `transitionTypes`, shared-element morphing, Suspense reveals, reduced-motion guidance
- `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/viewTransition.md` — HIGH confidence, confirms `experimental.viewTransition` flag and no-install-needed canary bundling
- `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` — HIGH confidence, official breaking-change list (Turbopack default, React 19.2/canary, React Compiler stable-but-opt-in, `scroll-behavior` override change, minimum browser versions, removed pre-16 APIs)
- `node_modules/tw-animate-css/README.md` (installed package, v1.4.0) — HIGH confidence, confirms available utility classes and v2.0.0 breaking-change warning
- `src/app/globals.css`, `package.json`, `src/components/tasks/nav-tabs.tsx`, `src/components/tasks/view-tabs.tsx` (this repo) — HIGH confidence, confirms current tokens, installed versions, and route vs. in-page tab implementation
- MDN — `@starting-style`, `transition-behavior`, `interpolate-size`, `calc-size()` (via WebSearch, cross-referenced against multiple 2026-dated articles: devtoolbox.dedyn.io, web.dev/blog/baseline-entry-animations, piccalil.li) — MEDIUM-HIGH confidence, browser support figures cross-checked across 3+ independent sources
- `base-ui.com/react/handbook/animation` (via WebSearch) — MEDIUM confidence (not directly fetched/verified against installed `@base-ui/react` version, but consistent with Radix-style `data-state` conventions already implied by `tw-animate-css`'s accordion utilities)
- Motion/Framer Motion ecosystem status (via WebSearch: motion.dev, LogRocket, Syncfusion 2026 roundups) — MEDIUM confidence, used only to justify *not* adding it, not as an active recommendation

---
*Stack research for: Dark, animated, "alive" UI layer on Next.js 16 / React 19 / Tailwind v4 / shadcn/ui*
*Researched: 2026-07-04*
