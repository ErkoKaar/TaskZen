# Roadmap: TaskZen — Task Manager Visual Redesign

## Overview

TaskZen's Task Manager (Tasks, Habits, Projects, Statistics) already works end-to-end — this roadmap only changes how it looks and feels. We start by fixing the shared foundation (the broken dark-palette cascade, elevation tiers, teal→violet brand gradient, desktop type/density, ambient background, and the shared motion/hover/tab-switch system) so the whole app instantly looks and feels different. Then we restyle the two everyday-workflow pages (Tasks, Habits) with their toggle/checkbox micro-interactions, then the two more structurally complex pages (Projects' expand/collapse, Statistics' animated numbers), and finish with the reserved "pulse" brand accent plus a full functional-parity verification pass across desktop and mobile/PWA. Every phase is a visible, shippable increment — nothing is refactored in the dark.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Design Foundation & Motion System** - Fix the broken dark-palette cascade and stand up elevation tiers, the functional teal→violet gradient, desktop type/density, ambient background, and shared hover/tab-switch motion — instantly changing how the whole app looks
- [ ] **Phase 2: Tasks & Habits Pages** - Redesign the two everyday-workflow pages with checkbox/habit-toggle micro-interactions, card hover-lift, and staggered list entry, with full CRUD parity
- [ ] **Phase 3: Projects & Statistics Pages** - Redesign the two structurally complex pages: Projects' expand/collapse task lists and Statistics' tabular-nums count-up numbers, with full data/CRUD parity
- [ ] **Phase 4: Brand Differentiators & Parity Verification** - Add the reserved pulse/heartbeat accent to today-marker and streak elements only, then verify zero functional regressions across desktop and mobile/PWA

## Phase Details

### Phase 1: Design Foundation & Motion System
**Goal**: The whole app instantly reads as the new dark, "alive" design system — correct palette, elevation, desktop density/type, ambient depth, and consistent hover/press/tab-switch feedback — even before any individual page is rebuilt.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06, MOTION-02, MOTION-03
**Success Criteria** (what must be TRUE):
  1. Inspecting `<html class="dark">` in devtools shows computed colors matching the intended warm/teal palette — the leftover grayscale `.dark` block no longer overrides `:root`, and cards/modals/popovers are visually distinguishable via 3-4 clear elevation/lightness steps rather than one flat tone
  2. Desktop screens (≥1024px) show visibly larger type and a denser, fuller layout rhythm instead of empty whitespace
  3. A subtle, near-static teal→violet ambient gradient layer is visible behind content on all four pages without hurting readability or scroll performance
  4. Criticality/category/priority indicators (e.g. the criticality picker) visibly use the teal→violet brand gradient as functional color-coding, not a single flat accent color
  5. Buttons and the shared nav/view tabs show hover and press feedback and animate tab switches smoothly (150-300ms); all of this motion stops or reduces when the OS `prefers-reduced-motion` setting is on
**Plans**: TBD
**UI hint**: yes

### Phase 2: Tasks & Habits Pages
**Goal**: Tasks (day/week/month) and Habits feel dark and alive — with checkbox/toggle micro-interactions, hover-lift cards, and staggered list entry — while every existing capability keeps working exactly as before.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: PAGE-01, PAGE-02, MOTION-01, MOTION-05, BRAND-03
**Success Criteria** (what must be TRUE):
  1. Completing a task or toggling a habit shows a check animation with strikethrough/fade (~150-300ms) instead of an instant snap
  2. Task and habit cards lift and glow subtly on hover
  3. Task and habit lists animate in with a staggered entrance (capped at ~5-8 visible items) when the view loads
  4. The Tasks page (day/week/month views) and Habits page visually match the new dark/alive design system while every create/edit/toggle/delete/archive/restore action still works exactly as before
**Plans**: TBD
**UI hint**: yes

### Phase 3: Projects & Statistics Pages
**Goal**: Projects and Statistics feel dark and alive — expand/collapse project task lists animate smoothly, and stat numbers are legible and animate on load — while all existing data and CRUD behavior remains unchanged.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: PAGE-03, PAGE-04, MOTION-04, BRAND-02
**Success Criteria** (what must be TRUE):
  1. Expanding or collapsing a project's task list animates smoothly (no raw height/width snap) instead of appearing/disappearing instantly
  2. Statistics numbers use tabular-nums (digits don't jitter in width) and animate with a count-up/tween on load
  3. The Projects page (criticality levels, auto-expiry) and Statistics page (aggregate completion stats) visually match the new dark/alive design system while all existing data and CRUD behavior remain unchanged
**Plans**: TBD
**UI hint**: yes

### Phase 4: Brand Differentiators & Parity Verification
**Goal**: The pulse/heartbeat brand motif appears only where it's truly meaningful, and the full redesign is verified to have zero functional regressions on both desktop and mobile/PWA.
**Mode:** mvp
**Depends on**: Phase 2, Phase 3
**Requirements**: BRAND-01, PARITY-01, PARITY-02
**Success Criteria** (what must be TRUE):
  1. A pulse/heartbeat glow accent appears on the "today" marker (Tasks) and active streaks (Habits) — and nowhere else as a generic decorative loop
  2. A manual walkthrough of every CRUD action across Tasks, Habits, Projects, and Statistics confirms zero behavior changes vs. the pre-redesign app (same data shown, same navigation, same actions available)
  3. The app remains fully usable as an installed PWA on mobile — zoom stays disabled and cross-device session sync stays intact — after the redesign
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Design Foundation & Motion System | 0/TBD | Not started | - |
| 2. Tasks & Habits Pages | 0/TBD | Not started | - |
| 3. Projects & Statistics Pages | 0/TBD | Not started | - |
| 4. Brand Differentiators & Parity Verification | 0/TBD | Not started | - |
