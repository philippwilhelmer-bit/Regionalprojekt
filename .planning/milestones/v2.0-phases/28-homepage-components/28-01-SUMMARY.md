---
phase: 28-homepage-components
plan: "01"
subsystem: ui
tags: [react, nextjs, tailwind, wurzelwelt, components, homepage]

requires:
  - phase: 27-app-chrome
    provides: WurzelAppBar, WurzelNavBar, global design tokens established
  - phase: 26-design-system-brand-foundation
    provides: Tailwind v4 @theme tokens, Wurzelwelt color palette, wurzelmann.png mascot

provides:
  - MascotGreeting speech-bubble card with time-aware greeting and Wurzelmann avatar
  - RegionalEditorialCard full-width aspect-video editorial card with Newsreader headline
  - HeroArticle restyled as Wurzelwelt Topmeldung with gradient pill badge and organic spacing

affects:
  - 28-02 (HomepageLayout rewire — imports all three components)

tech-stack:
  added: []
  patterns:
    - "Time-of-day greeting via client component with getHours() slot detection"
    - "CSS triangle speech-bubble tail using inline border trick"
    - "CTA gradient pill: bg-gradient-to-br from-primary to-primary-container rounded-full"
    - "next/image for mascot PNG with transparent background, no circular crop"

key-files:
  created:
    - src/components/reader/MascotGreeting.tsx
    - src/components/reader/RegionalEditorialCard.tsx
  modified:
    - src/components/reader/HeroArticle.tsx

key-decisions:
  - "MascotGreeting is a client component — uses getHours() for time-of-day slot, no SSR possible"
  - "RegionalEditorialCard reuses formatRelativeTime from ArticleCard.tsx — no duplication"
  - "HeroArticle: Topmeldung badge changed from flat bg-primary to gradient pill matching CTA pattern from Phase 26-02"
  - "Bezirk badge on HeroArticle uses rounded-full (Wurzelwelt style) instead of rounded-sm"

patterns-established:
  - "MascotGreeting pattern: client-side time-aware greeting in speech bubble with mascot avatar below"
  - "RegionalEditorialCard pattern: aspect-video image + serif headline + uppercase label, no bezirk color maps"

requirements-completed: [COMP-02, COMP-03, COMP-04]

duration: 2min
completed: 2026-03-29
---

# Phase 28 Plan 01: Homepage Components Summary

**MascotGreeting speech-bubble card, RegionalEditorialCard editorial card, and Wurzelwelt-restyled HeroArticle Topmeldung — three ready-to-import homepage building blocks**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-29T11:12:45Z
- **Completed:** 2026-03-29T11:14:30Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created MascotGreeting: client component with time-aware greeting (Guten Morgen/Tag/Abend), CSS-triangle speech-bubble tail, 56px Wurzelmann avatar via next/image
- Created RegionalEditorialCard: full-width aspect-video image, Newsreader serif headline, uppercase Jakarta Sans category label, relative timestamp from shared formatRelativeTime
- Restyled HeroArticle: rounded-sm on outer container, gradient pill badge (from-primary to-primary-container rounded-full), rounded-full Bezirk badge, organic spacing p-[var(--spacing-gutter)] pb-8

## Task Commits

Each task was committed atomically:

1. **Task 1: Create MascotGreeting and RegionalEditorialCard components** - `791c055` (feat)
2. **Task 2: Restyle HeroArticle as Wurzelwelt Topmeldung** - `e7d4053` (feat)

## Files Created/Modified

- `src/components/reader/MascotGreeting.tsx` - Speech-bubble card with time-of-day greeting and Wurzelmann avatar
- `src/components/reader/RegionalEditorialCard.tsx` - Full-width editorial card with aspect-video image, serif headline, uppercase label
- `src/components/reader/HeroArticle.tsx` - Restyled with Wurzelwelt rounded corners, gradient pill badge, organic spacing

## Decisions Made

- MascotGreeting implemented as `"use client"` component because time-of-day detection requires `new Date().getHours()` — cannot SSR
- RegionalEditorialCard imports `formatRelativeTime` from ArticleCard.tsx to avoid code duplication — plan specified this reuse pattern
- No bezirk gradient color maps added to RegionalEditorialCard per plan requirement — single `text-primary` label color
- HeroArticle dark gradient overlay (from-black/80 via-black/30 to-transparent) preserved unchanged for headline legibility

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All three components compile with zero TypeScript errors
- MascotGreeting, RegionalEditorialCard, and HeroArticle ready to be imported in HomepageLayout (Plan 02)
- No blockers

## Self-Check: PASSED

- FOUND: src/components/reader/MascotGreeting.tsx
- FOUND: src/components/reader/RegionalEditorialCard.tsx
- FOUND: src/components/reader/HeroArticle.tsx
- FOUND commit: 791c055
- FOUND commit: e7d4053

---
*Phase: 28-homepage-components*
*Completed: 2026-03-29*
