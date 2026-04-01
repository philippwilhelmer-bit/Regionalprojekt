---
phase: 35-homepage-feature-components
plan: 02
subsystem: ui
tags: [react, nextjs, tailwind, archivist-tokens, components]

# Dependency graph
requires:
  - phase: 33-color-token-foundation
    provides: Archivist design tokens (bg-ink, bg-surface, text-parchment, font-label, font-headline)
  - phase: 34-shell-components
    provides: openBezirkModal event pattern established in BezirkModal
provides:
  - HeroArticle with VOLLSTAENDIGEN ARTIKEL LESEN CTA span on gradient overlay (HOME-01)
  - MascotGreeting as flat tonal "Wurzel sagt ..." box without speech bubble or avatar (HOME-02)
  - FragDenWurzelmannCard client component dispatching openBezirkModal event (HOME-04)
affects: [35-03-homepage-layout-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - CTA span on Link card (span inside outer Link avoids nested interactive elements)
    - openBezirkModal window.dispatchEvent pattern reused from BezirkModal
    - Tonal surface box (bg-surface rounded-xs) replaces speech bubble pattern for mascot UI

key-files:
  created:
    - src/components/reader/FragDenWurzelmannCard.tsx
  modified:
    - src/components/reader/HeroArticle.tsx
    - src/components/reader/MascotGreeting.tsx

key-decisions:
  - "FragDenWurzelmannCard: bg-ink dark wrapper deferred to HomepageLayout Plan 03 — card is content-only for reusability"
  - "MascotGreeting: Image import removed entirely; flat tonal box replaces speech bubble + avatar pattern"
  - "HeroArticle CTA: <span> (not <button> or <Link>) used since outer Link handles navigation — avoids nested interactives"

patterns-established:
  - "Tonal box pattern: bg-surface rounded-xs px-4 py-3 replaces speech-bubble for in-feed mascot messaging"
  - "Section background ownership: HomepageLayout owns bg-ink wrappers; child cards are background-agnostic"

requirements-completed: [HOME-01, HOME-02, HOME-04]

# Metrics
duration: 8min
completed: 2026-04-01
---

# Phase 35 Plan 02: Homepage Feature Components Summary

**Three Archivist-identity components: HeroArticle CTA overlay, MascotGreeting flat tonal box, and FragDenWurzelmannCard with openBezirkModal trigger**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-01T19:25:00Z
- **Completed:** 2026-04-01T19:33:05Z
- **Tasks:** 2
- **Files modified:** 3 (2 modified, 1 created)

## Accomplishments
- HeroArticle hero now shows "VOLLSTAENDIGEN ARTIKEL LESEN" CTA span above the gradient (HOME-01)
- MascotGreeting converted from speech bubble + Wurzelmann avatar to a flat tonal surface box with "Wurzel sagt ..." label (HOME-02)
- FragDenWurzelmannCard created as content-only client component dispatching openBezirkModal on click (HOME-04)

## Task Commits

Each task was committed atomically:

1. **Task 1: HeroArticle CTA + MascotGreeting tonal restyle** - `cda0da2` (feat)
2. **Task 2: FragDenWurzelmannCard component** - `8467b3e` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/components/reader/HeroArticle.tsx` - Added VOLLSTAENDIGEN ARTIKEL LESEN CTA span after excerpt block
- `src/components/reader/MascotGreeting.tsx` - Removed Image import + speech bubble + avatar; replaced with flat tonal box
- `src/components/reader/FragDenWurzelmannCard.tsx` - New client component with Bezirk modal trigger

## Decisions Made
- FragDenWurzelmannCard owns only content/behavior; bg-ink dark background wrapper is applied by HomepageLayout in Plan 03 — keeps the card reusable and separates concerns cleanly per HOME-06
- MascotGreeting Image import fully removed (no avatar image anywhere in new design)
- CTA in HeroArticle uses `<span>` not `<button>` or `<Link>` because the entire card is already wrapped in `<Link>` — nested interactive elements would be invalid HTML

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript errors in `src/lib/content/articles.test.ts` (missing `listGrueneWocheArticles` export and `theme` field on Article model) — these are tracked as Phase 35 Plan 01 database work, not introduced by this plan.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three components ready for wiring into HomepageLayout in Plan 03
- FragDenWurzelmannCard bg-ink wrapper needs to be applied by HomepageLayout
- No blockers

---
*Phase: 35-homepage-feature-components*
*Completed: 2026-04-01*
