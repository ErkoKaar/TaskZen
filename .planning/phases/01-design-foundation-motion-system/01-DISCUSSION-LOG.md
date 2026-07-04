# Phase 1: Design Foundation & Motion System - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-04
**Phase:** 01-design-foundation-motion-system
**Areas discussed:** Palette Direction, Ambient Background, Desktop Density

---

## Palette Direction

| Option | Description | Selected |
|--------|-------------|----------|
| Hoia praegune baas, lisa gradient aktsendina | Amber/kollane jääb primaarseks tegevusvärviks, teal→violet gradient tuleb sisse kriitilisuse/kategooria/aktiivsuse märgistuse ja ambient tausta kaudu | ✓ |
| Nihuta baas teal/violet suunas | Asenda praegune amber-primary logopõhise teal/violet toonivalikuga läbivalt | |

**User's choice:** Hoia praegune baas, lisa gradient aktsendina
**Notes:** Lower visual risk, keeps existing action-color identity intact.

| Option | Description | Selected |
|--------|-------------|----------|
| Hoia praegune sinakas-hall baas | Jätka olemasoleva külma tumeda tooniga | |
| Soojem/neutraalsem must | Nihuta taust neutraalsema, vähem sinaka mustuse suunas enne eleveerimistasemete lisamist | ✓ |

**User's choice:** Soojem/neutraalsem must
**Notes:** Applies before elevation tiers are layered on top.

---

## Ambient Background

| Option | Description | Selected |
|--------|-------------|----------|
| Üks nurk, vaoshoitud | Üks pehme radial-gradient nurgas, madal opacity — Linear-stiilis vaoshoitus | ✓ |
| Kaks nurka, tugevam sügavus | Teal glow ühes nurgas + violet glow vastasnurgas — rohkem "ombre" tunnet | |

**User's choice:** Üks nurk, vaoshoitud
**Notes:** —

| Option | Description | Selected |
|--------|-------------|----------|
| Täiesti staatiline | Null jõudluskulu, käitub identselt kõigile kasutajatele | ✓ |
| Väga aeglane triiv (nt 20-30s tsükkel) | Peaaegu märkamatu liikumine, vajab prefers-reduced-motion fallbacki | |

**User's choice:** Täiesti staatiline
**Notes:** No reduced-motion fallback needed for this specific element since it never animates.

---

## Desktop Density

| Option | Description | Selected |
|--------|-------------|----------|
| Suurem type-scale + rida tihedus | ≥1024px suurem baas/pealkirja font ja line-height tokenid | |
| Type-scale + laiem container/max-width | Lisaks suuremale fondile kasvatada ka lehe content-max-width'i desktopil | ✓ |

**User's choice:** Type-scale + laiem container/max-width
**Notes:** Two levers, not font-size alone.

| Option | Description | Selected |
|--------|-------------|----------|
| Jäta lehe-faaside otsustada | Faas 1 annab ainult tokenid/reeglid; iga leht (Faas 2/3) otsustab ise paigutuse | ✓ |
| Kavanda juba Faasis 1 | Määra juba nüüd üldine paigutuse muster, mida kõik lehed järgivad | |

**User's choice:** Jäta lehe-faaside otsustada
**Notes:** Keeps Phase 1 scoped to shared tokens only.

---

## Claude's Discretion

- **Tab-switch transition ambition:** Not selected for discussion by the user. Defaulted to the safe path per research: `tw-animate-css` `animate-in`/`animate-out` as the committed Phase 1 approach; Next.js 16's experimental `<ViewTransition>` treated as an optional, non-blocking stretch investigation.
- Exact OKLCH tuning for elevation tiers and the warmer neutral base.
- Exact motion token values (duration/easing constants).
- Mechanism for resolving the `:root`/`.dark` cascade collision (left to research/planning, to be confirmed in-browser first).

## Deferred Ideas

- Page-specific layout changes (multi-column Statistics, wider Projects board) — Phase 2/3, not Phase 1.
- Next.js `<ViewTransition>` adoption as a committed feature — optional stretch only.
