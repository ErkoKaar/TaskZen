# Pitfalls Research

**Domain:** Dark/"alive" visual redesign of an existing task/productivity PWA (animation, color, typography, spacing) — functional parity required
**Researched:** 2026-07-04
**Confidence:** HIGH (accessibility/perf fundamentals are stable, well-documented web-platform behavior verified via WCAG, MDN, web.dev; project-specific risks verified against this repo's actual code in `.planning/codebase/CONCERNS.md` and `.planning/PROJECT.md`)

## Critical Pitfalls

### Pitfall 1: Visual refactor silently changes behavior

**What goes wrong:**
While restyling a component, a handler gets moved, a conditional render gets "simplified," a click target shrinks/moves, or an element gets wrapped in a new interactive wrapper (e.g. for a hover/press animation) that changes event bubbling, keyboard tab order, or which element receives the click. The task still *looks* right in a screenshot but a specific action (e.g. "toggle habit," "delete project task," "expand week view") now behaves subtly differently or breaks for one input path.

**Why it happens:**
This project has explicit optimistic-update + manual rollback logic hand-written per mutation (`src/lib/tasks/store.ts`, `src/lib/tasks/projects-store.ts` — see CONCERNS.md "Duplicated optimistic-update + rollback boilerplate"). Restyling a checkbox/button often means touching the same JSX that fires these handlers. There is **no test suite** in this repo, so nothing catches a dropped `onClick`, a changed `disabled` condition, or an `onKeyDown` handler that got dropped when a `<button>` was swapped for a styled `<div>`. Wrapping elements for animation (e.g. adding a motion wrapper `<div>` around a `<Checkbox>`) is the single most common way this happens.

**How to avoid:**
- Never change the underlying interactive element type (native `<button>`, `<input type="checkbox">`, etc.) — only restyle it. If a wrapper `<div>` is needed for an animation/glow effect, it must be non-interactive (`aria-hidden`, no pointer/keyboard handlers) and sit visually behind/around the real control, never intercepting events.
- Diff every changed file against "does this line change *what* happens, or only *how it looks*?" — the CLAUDE.md "Surgical Changes" rule already mandates this; treat it as a hard gate for this redesign.
- Before/after each page redesign, manually run through the exact CRUD list in PROJECT.md ("Task CRUD," "Habit management," "Projects," "Statistics") to confirm capability parity — since there's no automated test, this manual pass is the only regression net.

**Warning signs:**
- A component's prop list shrinks (an `onClick`/`onChange`/`aria-*` prop disappears during a restyle) with no corresponding removal noted.
- Elements gain a wrapping `<div>`/`<motion.div>` that now sits between the click target and the handler.
- Keyboard-only navigation (Tab + Enter/Space) stops reaching or activating a control that used to work.

**Phase to address:**
Every phase that touches an interactive component (checkboxes, buttons, tab switches, expand/collapse). Should be an explicit acceptance check in each page-redesign phase, not a separate phase — mapped as a gate, not a milestone.

---

### Pitfall 2: Dark theme + brand gradient tanks contrast and creates halation

**What goes wrong:**
The "richer, more expressive palette anchored on the pulse-logo gradient (teal-green → violet neon)" reads as vivid on a design mockup but, applied to real text/icons/borders on a near-black background, either (a) fails WCAG contrast (saturated violet/teal at mid-lightness commonly lands below 4.5:1 against dark backgrounds) or (b) technically passes a contrast checker but causes halation/glow discomfort — bright saturated color or pure-white text on near-pure-black background creates a glowing/vibrating effect that's fatiguing, especially for users with astigmatism, and gets worse when combined with actual CSS glow effects (box-shadow/text-shadow bloom used for the "alive" look).

**Why it happens:**
Neon/glow aesthetics are inherently high-saturation; designers pick colors for how they look in a static mockup, not against WCAG contrast math, and not against how they'll be used at small text sizes (task titles, stat labels) rather than large marketing headlines. The existing `globals.css` already has a warm amber primary and teal accent tuned as *accent* colors, not necessarily validated as *text-on-dark* colors — expanding their use to more surfaces (per-category/priority accents, more prominent statistics) multiplies the surfaces where a contrast failure can appear.

**How to avoid:**
- Use near-black (`oklch` lightness ~0.15–0.20, not literal 0) rather than pure black for large background surfaces — softer dark backgrounds reduce halation while still reading as "dark."
- Validate every text/icon color against its actual background with a contrast checker (4.5:1 normal text, 3:1 large text/UI components per WCAG 1.4.3 / 1.4.11) — not just the two "hero" brand colors, but every semantic color already listed in `globals.css` (gold/silver/bronze/warning/on-track) once they're restyled to be more vivid.
- Reserve full-saturation neon/glow treatment for accents (borders, icons, small highlights, active states) — never for body text or large fill areas.
- Because this app already disables pinch-zoom (`viewport user-scalable=no`, noted as existing/out-of-scope in PROJECT.md), low-vision users have **no fallback** to compensate for poor contrast by zooming in — this makes contrast correctness stricter than it would be on a zoomable site, not looser. Treat contrast as non-negotiable specifically because the zoom escape hatch is already removed.

**Warning signs:**
- Any new color token used for text/icons that hasn't been run through a contrast checker against its actual background (not the checker's default white/black).
- Glow/shadow effects added to text itself (as opposed to borders/backgrounds around text).
- Statistics/category color-coding that relies on color alone with no secondary indicator (icon/label) — a colorblind-accessibility regression on top of contrast.

**Phase to address:**
Should be handled by a shared token/design-system pass (ideally the first implementation phase, before per-page work) so every subsequent page redesign phase inherits pre-validated color pairs rather than re-deriving contrast decisions per page.

---

### Pitfall 3: Ambient/background animation ignores `prefers-reduced-motion` and drains mobile battery/frame rate

**What goes wrong:**
"Subtle ambient/background effects" (glow pulses, gradient shifts, particle-like motion) are exactly the category of animation most likely to (a) trigger vestibular discomfort for motion-sensitive users if `prefers-reduced-motion` isn't respected, and (b) be continuously running (not just on interaction), which is the worst case for mobile battery and thermal throttling since it never stops. On a PWA opened in standalone mode on a phone, a continuously-animating background gradient/blur can visibly drop frame rate and warm the device, especially combined with `backdrop-filter`/blur effects, which are markedly more expensive than opacity/transform animations because the browser must re-render everything behind the element every frame.

**Why it happens:**
Ambient effects are attractive because they're "free" motion that doesn't need to be tied to a user action, so it's easy to implement as a CSS `@keyframes` loop with `animation: pulse 3s infinite` and forget it never pauses. It's also easy to forget to wrap decorative animation in a `@media (prefers-reduced-motion: no-preference)` guard, since the app currently has zero motion and thus zero existing precedent for this pattern in the codebase.

**How to avoid:**
- Wrap **every** decorative/ambient animation in `@media (prefers-reduced-motion: no-preference) { ... }` (or the inverse — disable via `(prefers-reduced-motion: reduce)`), applied consistently to all new animations, not just the obvious ones. This is a hard requirement, not a nice-to-have — apply it project-wide from the first animation added.
- Animate only GPU-cheap properties (`transform`, `opacity`) for anything continuous/looping. Reserve `backdrop-filter`/`filter: blur()` for static (non-animating) decorative surfaces, or animate them very sparingly (one subtle element, not a full-screen effect) and test on actual low/mid-range mobile hardware, not just desktop Chrome.
- Pause or reduce ambient animations when the tab/PWA is backgrounded (`visibilitychange`) and consider capping how many simultaneously-animating glow/blur elements exist on screen at once (mobile GPUs handle roughly 3–5 simultaneous blur effects before visible frame drops).
- Test with Chrome DevTools' "Emulate CSS prefers-reduced-motion: reduce" and with actual on-device testing on the lowest-spec phone available — the project's own constraint (PWA, no test suite, manual verification) means this must be a manual device-testing checklist item, not assumed from desktop dev-server preview.

**Warning signs:**
- Any `@keyframes ... infinite` animation with no reduced-motion guard.
- Frame rate visibly drops (janky scrolling, delayed tap feedback) when multiple cards/sections with ambient effects are on screen simultaneously, especially on the Statistics page (likely the most visually dense).
- Device gets warm / battery drain noticeably increases after a few minutes with the app open and idle (a sign something is animating continuously and unnecessarily).

**Phase to address:**
Foundational "alive" motion/design-system phase — the reduced-motion guard pattern and the "cheap properties only for loops" rule should be established once and reused, not re-decided per page. Flag Statistics and any page with multiple simultaneous ambient effects for extra device-performance testing.

---

### Pitfall 4: Animating layout-triggering properties causes jank on state/view transitions

**What goes wrong:**
"Smooth state/view transitions (task completion, expand/collapse, tab switches)" is easy to implement naively by animating `height`, `width`, `top`/`margin`, or grid-template-rows directly — properties that force layout recalculation (reflow) on every animation frame. On mobile, especially with several list items animating at once (e.g. a whole day's task list re-flowing when one task is checked off and reorders/collapses), this produces visible stutter, exactly the opposite of "alive" and smooth.

**Why it happens:**
Layout-affecting properties are the most intuitive way to express "this thing is expanding/collapsing" and are what most tutorials show first; the cheaper alternative (animate `transform`/`opacity`, or use `grid-template-rows: 0fr → 1fr` with `overflow: hidden` as one of the few layout-adjacent properties that's reasonably cheap) requires more deliberate technique choice.

**How to avoid:**
- Prefer `transform`/`opacity` for anything that can be expressed that way (fades, slides, scale-in for completion feedback).
- For expand/collapse where content height is genuinely variable (project task lists, week view), use the CSS grid `grid-template-rows: 0fr` ↔ `1fr` technique (animates a layout property but only per collapsing container, not every reflowed sibling) rather than manually animating `height: auto`.
- For list reordering (e.g. completed task moving to bottom), prefer FLIP-style transform animations over animating position/top directly, or accept an instant reorder with a fade/highlight instead of a moving-position animation if the reorder is not the primary visual moment.
- Since no new animation library is planned (`tw-animate-css` already available, per PROJECT.md), lean on its transform/opacity-based utility classes rather than hand-rolling layout-property keyframes.

**Warning signs:**
- Any new `@keyframes` or Tailwind transition class targeting `height`, `width`, `top`, `left`, `margin`, or `grid-template-columns` directly on elements inside a list.
- Visible stutter/jank specifically when multiple list items change state near-simultaneously (e.g. "mark all done," or day/week view switch that re-renders many cards).

**Phase to address:**
The phase(s) implementing Tasks day/week/month views and Projects (the two pages with list reordering and expand/collapse) — flag for on-device performance verification, not just visual QA.

---

### Pitfall 5: "While we're in there" scope creep breaks the parity constraint

**What goes wrong:**
Mid-redesign, it becomes tempting to also fix a papercut noticed along the way — e.g. add a confirmation toast (CONCERNS.md flags there's currently *no* user-facing error surfacing on failed saves), add a `maxLength` to an input, tweak a date-range query, or "while I'm touching this component" adjust its actual behavior slightly. PROJECT.md explicitly scopes these out ("Fixing pre-existing bugs found during codebase mapping... tracked separately, not blocking this redesign") and states "100% functional/CRUD parity... no new features, no removed features" — but visual work constantly touches the exact files where these known issues live, making the temptation high and the boundary easy to blur without noticing.

**Why it happens:**
The redesign necessarily edits the same components where the known tech-debt/bugs live (optimistic-update handlers, `ghost-input.tsx` with no `maxLength`, notification "sent" flag logic). A well-intentioned engineer sees a bug while restyling adjacent code and "quickly" fixes it, which (a) is out of scope, (b) has no test coverage to verify it didn't introduce a regression, and (c) makes the redesign PR/commit harder to review as "visual-only."

**How to avoid:**
- Treat PROJECT.md's Out of Scope list as a hard boundary per CLAUDE.md's "Surgical Changes" rule: "If you notice unrelated dead code [or bugs], mention it — don't delete/fix it" unless explicitly asked.
- When a redesign phase touches a file with a known CONCERNS.md issue, note it in the phase's execution log as "observed, not fixed" rather than silently resolving it — this keeps the audit trail honest and gives the user a clear later decision point.
- If a genuine visual-only fix is ambiguous (e.g. "does adding a toast component count as a new feature or as UI-only polish for the redesign's error states?"), surface the question rather than deciding silently, per CLAUDE.md's "Think Before Coding" rule.

**Warning signs:**
- A diff for a "redesign" phase includes changes to Supabase queries, validation logic, or store mutation logic beyond what's needed to add a CSS class/animation trigger.
- New behavior appears that wasn't in PROJECT.md's Active requirements (e.g. a new toast/notification system, new input constraints, changed sweep/retention timing).

**Phase to address:**
Applies across all phases — best mitigated by a lightweight per-phase completion checklist item ("no changes outside touched-for-styling files") rather than a dedicated phase.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|-----------------|
| Hardcoding one-off glow/animation values per component instead of design tokens | Faster to ship one page | Palette/motion inconsistency across Tasks/Habits/Statistics/Projects; harder to keep contrast validated everywhere | Never for colors touching text/contrast; acceptable only for a single unique decorative flourish with no reuse |
| Skipping `prefers-reduced-motion` guard on "just one small" animation | Saves a few minutes per animation | Compounds into inconsistent accessibility as more animations are added; easy to forget entirely once precedent of "sometimes we guard, sometimes we don't" is set | Never — apply the guard pattern from the very first animation |
| Leaving the dead `.dark` shadcn class block in `globals.css` unresolved (per PROJECT.md context note) | Avoids a confirmation detour | Future edits may target the wrong selector, producing styling that "does nothing" and wastes debugging time | Acceptable short-term only if confirmed genuinely dead before other phases start editing color tokens; should be resolved early, not deferred indefinitely |
| Manual visual QA only, no snapshot/visual regression tooling | No setup cost, matches project's no-test-suite convention | Every subsequent phase risks silently regressing an earlier page's look with no automated signal | Acceptable given project constraints (no test suite exists, PROJECT.md confirms manual verification is the standard) — but budget explicit manual re-check time per phase, not just for the page being changed |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|-------------------|
| Tailwind CSS v4 (OKLCH tokens) | Assuming v3-era `@tailwind base/components/utilities` directives or config-file-driven theming still apply | v4 uses CSS-first config (`@theme` in CSS) and OKLCH color functions differently than v3 — confirm current syntax against installed version/docs before adding new tokens, don't pattern-match from training-data Tailwind v3 knowledge |
| `tw-animate-css` | Reaching for a new animation library (Framer Motion, GSAP) because a desired transition "isn't in tw-animate-css" | Check what utility classes/keyframes `tw-animate-css` actually ships before concluding a gap exists; PROJECT.md constraint is explicit: no new animation library unless a real gap is found |
| Next.js 16 / React 19 | Assuming Server/Client Component boundaries and directive placement match older Next.js training data when adding `"use client"` for animation state (e.g. hover/press interactivity) | Check `node_modules/next/dist/docs/` for current conventions before restructuring component boundaries to add client-side animation state, per this project's own CLAUDE.md warning |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|-----------------|
| Multiple simultaneous `backdrop-filter`/`filter: blur()` elements on one screen | Visible frame drops, device warmth, sluggish scroll/tap response, especially on mid/low-end Android or older iPhones | Limit simultaneous blur/backdrop-filter effects (roughly 3–5 max per screen on mobile), prefer static (non-animating) blur, animate transform/opacity instead where possible | Becomes noticeable immediately on mobile with 2-3+ layered glow/blur cards visible at once (e.g. Statistics page with several stat cards) |
| Ambient looping animations that never pause | Battery drain, thermal throttling, frame rate degrades over time even when user isn't interacting | Pause on `visibilitychange`/backgrounding, keep loop animations to `transform`/`opacity` only, honor `prefers-reduced-motion` | Breaks first on mobile PWA installed/standalone sessions left open longer than a minute or two |
| Animating `height`/`width`/`top` for list expand/collapse or reorder | Stutter when several list items change at once (bulk complete, view switch) | Use `grid-template-rows: 0fr/1fr` trick, transform-based FLIP reorder, or `transform`/`opacity` fades instead of layout properties | Breaks first on Tasks day/week views and Projects lists once list length grows beyond a handful of items |
| Client-side full-table fetch of `habit_logs`/`tasks`/`projects` (pre-existing, per CONCERNS.md) combined with new render-heavy per-item animation/glow styling | Statistics/Habits pages feel slower to first-paint as history grows, compounded by heavier per-card visual treatment | Not this redesign's job to fix the fetch pattern (out of scope per PROJECT.md), but avoid adding per-item animation complexity that scales linearly with an already-unbounded list without at least confirming acceptable behavior at realistic multi-year history sizes | Already flagged in CONCERNS.md as a scaling limit; redesign should avoid making it worse, not necessarily fix it |

## Security Mistakes

Not a primary concern for a visual-only redesign — this pass does not touch auth, RLS, or API routes. The one domain-relevant note:

| Mistake | Risk | Prevention |
|---------|------|------------|
| Touching `src/lib/tasks/store.ts` / `src/lib/tasks/projects-store.ts` for styling-adjacent refactors (e.g. extracting the optimistic-update boilerplate "while we're in there" per CONCERNS.md) and inadvertently altering the RLS-dependent query shape (e.g. accidentally adding/removing a `.eq("user_id", ...)` filter during a refactor) | Could reintroduce or mask the exact defense-in-depth gap already flagged in CONCERNS.md | Do not refactor mutation/query logic as part of this visual redesign; if a shared helper is genuinely needed for animation state (e.g. transition-in-progress flags), wrap the existing call rather than rewriting the underlying query |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| Focus states redesigned for visual "polish" but made subtle/low-contrast in the new dark palette | Keyboard users lose track of where focus is, especially against a glowing/gradient dark background where a thin default outline disappears | Design an explicit, high-contrast focus style (thick ring, glow, or offset outline in a brand accent color validated for contrast) as a first-class token, not an afterthought inherited from browser defaults |
| Hover-only micro-interactions (button/card hover glow) with no touch equivalent | On mobile/PWA (touch-only), hover states either never trigger or "stick" after a tap until the next tap elsewhere ("sticky hover" bug), producing a stuck-looking glow/highlight | Gate hover-only effects behind `@media (hover: hover) and (pointer: fine)`, and design an explicit `:active`/press state for touch, since this is a PWA primarily used on mobile as well as desktop |
| Color-only differentiation for categories/priorities in the richer palette | Users with color vision deficiency can't distinguish criticality levels or categories that previously relied on more muted, distinct-lightness colors | Pair every color-coded distinction with a secondary cue (icon, label, position) — don't rely on hue alone even if the new palette is visually richer |
| Assuming desktop-fix (spacing/typography) also improves mobile, or vice versa | Since PROJECT.md flags desktop (≥1024px) as the primary pain point but requires mobile/PWA to "remain fully usable," a type-scale/density change tuned for desktop's empty feeling could overflow or crowd the already zoom-disabled mobile layout | Treat desktop density fixes and mobile layout as two explicit checks per page, not one — verify each breakpoint independently rather than assuming a shared fix works both ways |

## "Looks Done But Isn't" Checklist

- [ ] **Ambient/background animation:** Looks good on desktop Chrome at 60fps — verify on an actual mid/low-tier phone in installed PWA (standalone) mode, not just responsive dev tools.
- [ ] **Reduced motion:** Looks complete after adding one `prefers-reduced-motion` guard — verify *every* new `@keyframes`/transition added across all four pages has the guard, not just the first one written.
- [ ] **Contrast on new palette:** Looks fine by eye on a bright monitor — verify actual contrast ratios (4.5:1 / 3:1) for every new text/icon color against its real background, including hover/active/disabled states, not just the default state.
- [ ] **Focus states:** Looks fine with mouse-only testing — verify with keyboard-only navigation (Tab through the whole page) that every interactive element has a visible, high-contrast focus indicator in the new dark theme.
- [ ] **CRUD parity:** Looks visually complete after a page redesign — verify by manually exercising every action listed under that page's requirements in PROJECT.md (not just the ones that happen to get clicked during visual QA).
- [ ] **Touch/hover states on mobile:** Looks right when testing with a mouse — verify on an actual touchscreen (or touch emulation) that no hover-only effect gets "stuck" after a tap.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|-----------------|
| Behavior regression shipped alongside a visual change | MEDIUM | Because there's no test suite, bisect by reverting the specific component's structural (non-style) changes first while keeping styling, using git history per CONCERNS.md's noted lack of test coverage — manually re-verify the specific CRUD action, then re-apply styling more surgically |
| Contrast failure discovered late (after multiple pages restyled with the same token) | MEDIUM | Because tokens are shared, fixing the root token/palette value fixes all pages at once — cheaper the earlier it's caught, which is why token validation should happen before per-page rollout, not after |
| Ambient animation found to tank mobile performance after several pages already use it | MEDIUM-HIGH | If the effect is implemented as a shared CSS class/utility, capping/removing it in one place propagates everywhere; if hand-rolled per component, requires touching each page individually — favor a shared utility from the start to keep this recovery cheap |
| Scope creep merged (an out-of-scope bug fix landed alongside styling) | LOW | Isolate and revert the specific non-styling hunk from the commit/diff; since the fix wasn't asked for and wasn't tested, reverting is safe by default until the user explicitly requests that fix as its own tracked item |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|-------------------|----------------|
| Visual refactor changes behavior | Every page-redesign phase (gate, not standalone phase) | Manual CRUD walkthrough per page against PROJECT.md's Validated/Active requirement list before marking phase done |
| Dark theme + brand gradient contrast/halation | Foundational design-token phase (before per-page work) | Contrast-ratio check (4.5:1/3:1) on every text/icon color pairing actually used, documented once per token, not re-checked ad hoc per page |
| Ambient animation ignoring reduced-motion / draining battery | Foundational motion-pattern phase (establish the guard + cheap-property rule once) | DevTools "prefers-reduced-motion: reduce" emulation pass + on-device (real phone, installed PWA) frame-rate/battery spot-check, especially for Statistics page |
| Layout-property animation jank on list transitions | Tasks (day/week/month) and Projects phases specifically | On-device test of bulk-completion / view-switch / expand-collapse with a realistic (10+ item) list, watching for stutter |
| "While we're in there" scope creep | Every phase (process discipline, not a build phase) | Diff review checklist: confirm no changes outside PROJECT.md's Active scope; any observed-but-unfixed issue noted rather than silently resolved |
| Focus states lost in new dark styling | Foundational design-token phase + each page phase | Keyboard-only Tab-through pass per page, verifying every interactive element retains a visible focus indicator |
| Sticky hover / touch-only mobile regressions | Each page-redesign phase | Manual touch-device (or touch-emulation) pass confirming no hover effect persists after tap, and that press/active states exist as the touch equivalent |

## Sources

- [C39: Using the CSS prefers-reduced-motion query to prevent motion — W3C WAI](https://www.w3.org/WAI/WCAG22/Techniques/css/C39) — HIGH confidence, official WCAG technique
- [prefers-reduced-motion: Sometimes less movement is more — web.dev](https://web.dev/articles/prefers-reduced-motion) — HIGH confidence, official Google web.dev guidance
- [prefers-reduced-motion CSS media feature — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) — HIGH confidence, authoritative reference
- [Respecting Users' Motion Preferences — Smashing Magazine](https://www.smashingmagazine.com/2021/10/respecting-users-motion-preferences/) — MEDIUM confidence, industry practitioner guidance, cross-checked with above
- [Ensures Does Not Disable Text Scaling and Zooming (WCAG 1.4.4) — accessibilitychecker.org](https://www.accessibilitychecker.org/wcag-guides/ensures-does-not-disable-text-scaling-and-zooming/) — HIGH confidence, states the WCAG 1.4.4 AA requirement directly relevant to this app's existing zoom-disabled decision
- [Understanding Accessibility Effects — Disabling Zoom — Deque](https://www.deque.com/blog/accessibility-mobile-web-pinch-zoom-tutorial/) — HIGH confidence, established accessibility vendor
- [Inclusive Dark Mode: Designing Accessible Dark Themes For All Users — Smashing Magazine, 2025](https://www.smashingmagazine.com/2025/04/inclusive-dark-mode-designing-accessible-dark-themes/) — MEDIUM-HIGH confidence, recent (2025) practitioner deep-dive covering pure-black/halation issues, cross-checked with other dark-mode sources found
- [The Designer's Guide to Dark Mode Accessibility — accessibilitychecker.org](https://www.accessibilitychecker.org/blog/dark-mode-accessibility/) — MEDIUM confidence, corroborates halation/pure-black findings
- [How CSS Properties Affect Website Performance — F22 Labs](https://www.f22labs.com/blogs/how-css-properties-affect-website-performance/) — MEDIUM confidence, corroborates backdrop-filter/blur cost claims
- [How to fix filter: blur() performance issue in Safari — graffino.com](https://graffino.com/til/how-to-fix-filter-blur-performance-issue-in-safari) — MEDIUM confidence, practitioner-verified Safari-specific blur performance issue
- [925025 - CSS blur filter is order of magnitude slower than Chrome — Mozilla Bugzilla](https://bugzilla.mozilla.org/show_bug.cgi?id=925025) — HIGH confidence for the underlying claim that blur is markedly more expensive than transform/opacity, sourced from browser engine bug tracker
- `.planning/codebase/CONCERNS.md` — this repo's own audit; used to ground process/scope-creep and query-safety pitfalls in actual existing tech debt rather than generic advice
- `.planning/PROJECT.md` — this project's explicit scope, constraints, and out-of-scope list, used to derive the scope-creep and zoom/contrast interaction pitfalls

---
*Pitfalls research for: Dark/"alive" visual redesign of TaskZen Task Manager module*
*Researched: 2026-07-04*
