---
phase: 1
slug: design-foundation-motion-system
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-04
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None installed — no test framework in this repo (confirmed: no `test` script, no `*.test.*`/`*.spec.*` files) |
| **Config file** | none — manual verification map below substitutes for automated tests, per project convention (`.planning/codebase/TESTING.md`, `.planning/research/PITFALLS.md`) |
| **Quick run command** | `npm run lint` |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~30-60 seconds (build) |

---

## Sampling Rate

- **After every task commit:** Run `npm run lint`
- **After every plan wave:** Run `npm run build` + the manual verification map below for every requirement touched in that wave
- **Before `/gsd:verify-work`:** Full manual walkthrough of all 8 requirements' verification steps — no automated substitute exists
- **Max feedback latency:** ~60 seconds (build) + manual check time

---

## Per-Task Verification Map

| Req ID | Behavior | Verification Type | Command/Steps | Automatable? | Status |
|--------|----------|---------------------|----------------|--------------|--------|
| FOUND-01 | `.dark` no longer overrides `:root` | Manual — devtools computed style | Inspect `<html class="dark">` → Computed → `--background` matches `:root`'s intended value | ❌ manual only | ⬜ pending |
| FOUND-02 | 3-4 visually distinct elevation steps | Manual — visual + contrast checker | Screenshot card/modal/popover side by side; run each pair through a WCAG contrast tool | ❌ manual only | ⬜ pending |
| FOUND-03 | Gradient functionally maps criticality/category | Manual — visual | Open criticality picker, confirm 3 distinct gradient-derived colors, distinguishable with `aria-label` present | ❌ manual only | ⬜ pending |
| FOUND-04 | Desktop type-scale + density at ≥1024px | Manual — devtools responsive mode | Check computed `font-size` on `<html>` at 1024/1280/1536px; check no overflow/clipping | ❌ manual only | ⬜ pending |
| FOUND-05 | Static ambient gradient, all 4 pages | Manual — visual + Performance tab | Visual check per page; confirm zero repaint activity in DevTools Performance recording (idle) | ❌ manual only | ⬜ pending |
| FOUND-06 | Global reduced-motion fallback | DevTools emulation | Chrome DevTools → Rendering → "Emulate CSS media feature prefers-reduced-motion: reduce" → confirm all transitions collapse to ~0ms | ❌ manual only | ⬜ pending |
| MOTION-02 | Hover/press on buttons/tabs | Manual — mouse + touch/emulation | Hover and click-hold on button/nav-tab/view-tab/criticality-picker; also test `(hover: none)` emulation for sticky-hover regressions | ❌ manual only | ⬜ pending |
| MOTION-03 | Tab-switch animates 150-300ms | Manual — visual + DevTools Performance | Switch view/route, confirm crossfade duration visually matches `duration-base` (~200ms), no instant snap | ❌ manual only | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework is being added — this is a pre-existing, accepted project condition (per `.planning/codebase/CONCERNS.md` / `.planning/research/PITFALLS.md`), not a gap introduced by this phase.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `.dark`/`:root` cascade collision fix | FOUND-01 | No visual regression testing exists; a CSS cascade fix is only verifiable via computed styles in devtools | Open devtools, inspect `<html>`, confirm computed CSS variables match `:root` values, not the deleted `.dark` block |
| All elevation/gradient/motion behaviors | FOUND-02..06, MOTION-02, MOTION-03 | Pure visual/interaction outcomes; no test framework exists in this repo | See Per-Task Verification Map above |

---

## Validation Sign-Off

- [x] All tasks have a manual verification path documented above (no automated framework exists project-wide)
- [x] Sampling continuity: `npm run lint` after every commit, `npm run build` after every wave
- [x] Wave 0 covers all requirements (no gaps — existing infra is accepted as-is)
- [x] No watch-mode flags
- [x] Feedback latency < 60s (build) + manual check time
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
