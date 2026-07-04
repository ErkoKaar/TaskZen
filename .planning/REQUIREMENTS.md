# Requirements: TaskZen — Task Manager Visual Redesign

**Defined:** 2026-07-04
**Core Value:** Every existing capability must keep working exactly as it does today — the redesign only changes how it looks and feels, never what it does.

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Foundation

- [ ] **FOUND-01**: Resolve the `:root`/`.dark` CSS cascade collision in `globals.css` (leftover shadcn grayscale `.dark` block currently likely overrides the intended warm/teal `:root` palette since `<html class="dark">` is set) before extending tokens
- [ ] **FOUND-02**: Elevation-tier dark palette (3–4 distinct surface lightness steps: page bg → card → raised card/modal → popover) extending existing OKLCH tokens
- [ ] **FOUND-03**: Teal→violet accent gradient (from the pulse logo) mapped functionally to criticality levels, categories, and priority accents — not just decorative
- [ ] **FOUND-04**: Desktop type-scale increase and layout density adjustment at ≥1024px breakpoints, fixing the "empty screen" complaint via typography + freed vertical rhythm, not just bigger fonts
- [ ] **FOUND-05**: Ambient background gradient layer (static or near-static, GPU-cheap: transform/opacity/background-position only) across all four pages
- [ ] **FOUND-06**: Shared motion tokens (duration/easing constants) and a global `prefers-reduced-motion` fallback wired in from the start

### Motion & Micro-interactions

- [ ] **MOTION-01**: Checkbox/task-completion and habit-toggle micro-interaction (check animation + strikethrough/fade, ~150–300ms)
- [ ] **MOTION-02**: Hover/press feedback on all interactive elements (buttons, cards, nav tabs)
- [ ] **MOTION-03**: Smooth tab/view-switch transitions (day/week/month, nav-tabs, view-tabs) via `tw-animate-css` (with a `<ViewTransition>` spike considered, CSS crossfade fallback)
- [ ] **MOTION-04**: Expand/collapse transitions on Projects page task lists via `tw-animate-css` accordion presets
- [ ] **MOTION-05**: Subtle card hover-lift (translateY + glow) on task/habit/project cards

### Brand Expression

- [ ] **BRAND-01**: Pulse/heartbeat glow accent reserved for meaningful live/active indicators (e.g. "today" marker, streaks) — not a global/infinite decorative animation
- [ ] **BRAND-02**: Statistics count-up/tween animation for stat numbers, built on tabular-nums typography so digits don't jitter in width
- [ ] **BRAND-03**: Staggered list-entry animation for task/habit lists on view load (capped at ~5–8 visible items)

### Page Redesigns

- [ ] **PAGE-01**: Tasks page (day/week/month views) redesigned with dark/alive treatment — 100% CRUD parity
- [ ] **PAGE-02**: Habits page redesigned with dark/alive treatment — 100% CRUD parity
- [ ] **PAGE-03**: Statistics page redesigned with dark/alive treatment — 100% data parity
- [ ] **PAGE-04**: Projects page redesigned with dark/alive treatment — 100% CRUD parity

### Functional Parity

- [ ] **PARITY-01**: No functional/behavioral changes to CRUD, data shown, or navigation across all four pages — verified manually per page (no automated test suite exists)
- [ ] **PARITY-02**: Mobile/PWA layout, disabled zoom, and installed-app behavior remain fully usable after redesign

## v2 Requirements

None — this is a bounded visual-redesign milestone with no deferred functional scope. Anything beyond it is out of scope entirely (see below), not deferred.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Drag-and-drop reordering | New functionality/interaction model, not a visual change — conflicts with 100% functional-parity constraint |
| Particle/canvas/WebGL ambient backgrounds | Expensive on battery-powered mobile PWA use; categorical mismatch for an all-day work tool |
| Sound effects / haptic feedback on interactions | Not part of PROJECT.md's four "alive" pillars; classic multi-sensory overreach |
| Pervasive `backdrop-filter` glassmorphism panels | One of the most expensive CSS properties to composite; causes scroll/animation jank on mobile PWA |
| IA/layout restructuring (new widgets, reorganized nav, new dashboard sections) | Conflicts with 100% functional-parity constraint; single biggest scope-creep risk per research |
| Auto-playing infinite ambient animations (whole-page pulsing/rotating gradients) | Battery/CPU cost for an all-day-open tool; fights `prefers-reduced-motion`; desensitizes the pulse brand motif |
| FocusLoop module (`/`, timer/session tracking) | Separate app, not part of this redesign pass |
| Light mode / theme toggle | Dark is the only mode for this module; no light-theme design needed |
| Backend/data model changes (Supabase schema, RLS, notifications logic) | UI/visual layer only |
| Fixing pre-existing bugs unrelated to the redesign (e.g. notification "sent" flag on transient push failure) | Tracked in `.planning/codebase/CONCERNS.md`, not blocking this redesign |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Pending |
| FOUND-02 | Phase 1 | Pending |
| FOUND-03 | Phase 1 | Pending |
| FOUND-04 | Phase 1 | Pending |
| FOUND-05 | Phase 1 | Pending |
| FOUND-06 | Phase 1 | Pending |
| MOTION-01 | Phase 2 | Pending |
| MOTION-02 | Phase 1 | Pending |
| MOTION-03 | Phase 1 | Pending |
| MOTION-04 | Phase 3 | Pending |
| MOTION-05 | Phase 2 | Pending |
| BRAND-01 | Phase 4 | Pending |
| BRAND-02 | Phase 3 | Pending |
| BRAND-03 | Phase 2 | Pending |
| PAGE-01 | Phase 2 | Pending |
| PAGE-02 | Phase 2 | Pending |
| PAGE-03 | Phase 3 | Pending |
| PAGE-04 | Phase 3 | Pending |
| PARITY-01 | Phase 4 | Pending |
| PARITY-02 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 20/20 ✓
- Unmapped: 0

---
*Requirements defined: 2026-07-04*
*Last updated: 2026-07-04 after roadmap creation*
