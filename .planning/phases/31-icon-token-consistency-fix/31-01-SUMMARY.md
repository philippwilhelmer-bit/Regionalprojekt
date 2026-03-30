---
phase: 31-icon-token-consistency-fix
plan: 01
subsystem: ui
tags: [material-symbols, tailwind, design-tokens, icon-font, semantic-tokens]

requires:
  - phase: 27-app-chrome
    provides: WurzelAppBar and WurzelNavBar components with icon spans
  - phase: 28-homepage-components
    provides: MascotGreeting, RegionalEditorialCard, HomepageLayout with zinc tokens

provides:
  - All icon spans across reader components use material-symbols-rounded matching the CDN font variant
  - Phase 28 components and layout.tsx body use Wurzelwelt semantic text-text tokens instead of zinc
  - Test mock for public layout references current WurzelAppBar/WurzelNavBar
  - DS-03 requirement closed in REQUIREMENTS.md

affects: [29-article-detail, 30-cms-admin-restyling, future-icon-usage]

tech-stack:
  added: []
  patterns:
    - "Icon spans use material-symbols-rounded class to match CDN Material+Symbols+Rounded stylesheet"
    - "Semantic token text-text replaces text-zinc-900/800; text-text/{opacity} replaces text-zinc-{lighter}"

key-files:
  created: []
  modified:
    - src/components/reader/WurzelNavBar.tsx
    - src/components/reader/WurzelAppBar.tsx
    - src/components/reader/EilmeldungBanner.tsx
    - src/components/reader/ShareButton.tsx
    - src/components/reader/BottomNavClient.tsx
    - src/components/reader/SearchPageLayout.tsx
    - src/components/reader/RegionalAppBar.tsx
    - src/components/reader/Header.tsx
    - src/components/reader/RegionalNavBar.tsx
    - src/components/reader/MascotGreeting.tsx
    - src/components/reader/RegionalEditorialCard.tsx
    - src/components/reader/HomepageLayout.tsx
    - src/app/layout.tsx
    - src/app/__tests__/public-layout-metadata.test.ts
    - .planning/REQUIREMENTS.md

key-decisions:
  - "material-symbols-rounded class matches the CDN-loaded Rounded variant (Material+Symbols+Rounded) — all icon spans updated to match"
  - "text-zinc-900/800 maps to text-text; lighter zinc shades map to text-text/{opacity} following Wurzelwelt opacity convention"

patterns-established:
  - "Icon pattern: <span className=\"material-symbols-rounded ...\"> — class must match CDN font variant exactly"
  - "Semantic opacity pattern: text-text/60, text-text/50, text-text/40 for subdued text instead of zinc shades"

requirements-completed:
  - DS-03

duration: 5min
completed: 2026-03-30
---

# Phase 31 Plan 01: Icon Token Consistency Fix Summary

**Aligned all 9 icon-bearing components to use material-symbols-rounded (matching CDN font), replaced residual zinc tokens with text-text semantic tokens in 4 scoped files, fixed stale WurzelAppBar/WurzelNavBar test mocks, and closed DS-03 in REQUIREMENTS.md**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-30T15:00:00Z
- **Completed:** 2026-03-30T15:05:00Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments

- Replaced `material-symbols-outlined` with `material-symbols-rounded` in 9 reader components — icons now render correctly from the CDN Rounded font variant
- Replaced all `text-zinc-*` classes with Wurzelwelt semantic `text-text` and `text-text/{opacity}` tokens in MascotGreeting, RegionalEditorialCard, HomepageLayout, and layout.tsx
- Updated `public-layout-metadata.test.ts` mocks from stale RegionalAppBar/RegionalNavBar to current WurzelAppBar/WurzelNavBar — both tests pass
- Marked DS-03 as Complete in REQUIREMENTS.md (checkbox + traceability table)

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace material-symbols-outlined with rounded and remove zinc tokens** - `c25d14f` (fix)
2. **Task 2: Fix stale test mock and update REQUIREMENTS.md traceability** - `587c470` (fix)

## Files Created/Modified

- `src/components/reader/WurzelNavBar.tsx` - Icon class: outlined -> rounded
- `src/components/reader/WurzelAppBar.tsx` - Icon class: outlined -> rounded
- `src/components/reader/EilmeldungBanner.tsx` - Icon class: outlined -> rounded
- `src/components/reader/ShareButton.tsx` - Icon class: outlined -> rounded
- `src/components/reader/BottomNavClient.tsx` - Icon class: outlined -> rounded
- `src/components/reader/SearchPageLayout.tsx` - Icon class: outlined -> rounded
- `src/components/reader/RegionalAppBar.tsx` - Icon class: outlined -> rounded
- `src/components/reader/Header.tsx` - Icon class: outlined -> rounded
- `src/components/reader/RegionalNavBar.tsx` - Icon class: outlined -> rounded
- `src/components/reader/MascotGreeting.tsx` - text-zinc-900/600 -> text-text/text-text/60
- `src/components/reader/RegionalEditorialCard.tsx` - text-zinc-900/400 -> text-text/text-text/40
- `src/components/reader/HomepageLayout.tsx` - text-zinc-500 -> text-text/50 (2 occurrences)
- `src/app/layout.tsx` - body text-zinc-900 -> text-text
- `src/app/__tests__/public-layout-metadata.test.ts` - Mocks updated to WurzelAppBar/WurzelNavBar
- `.planning/REQUIREMENTS.md` - DS-03 marked Complete

## Decisions Made

None - followed plan as specified.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Icon rendering is now correct across all reader components
- All DS-03 through DS-07 requirements show as Complete in REQUIREMENTS.md
- No outstanding design system token gaps identified in scoped files

---
*Phase: 31-icon-token-consistency-fix*
*Completed: 2026-03-30*
