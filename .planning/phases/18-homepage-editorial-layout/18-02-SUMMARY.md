---
phase: 18-homepage-editorial-layout
plan: "02"
subsystem: ui
tags: [react, nextjs, tailwind, homepage, editorial, hero, bezirk]

# Dependency graph
requires:
  - phase: 18-homepage-editorial-layout
    plan: "01"
    provides: getFeaturedArticle, getPinnedArticles, listArticlesForHomepage, groupArticlesByBezirk query functions and ArticleWithBezirke type
provides:
  - HeroArticle component: full-bleed hero with image/gradient fallback, gradient overlay, serif headline, bezirk badge
  - TopMeldungenRow component: horizontally scrollable top stories row with styrian-green bottom borders and right-edge fade
  - BezirkSection component: editorial 2/3 + 1/3 grid with wood divider and Styrian flag accent
  - HomepageLayout client component: orchestrates all zones with localStorage-based bezirk filtering
  - page.tsx: server component fetching data via Promise.all and rendering HomepageLayout
affects:
  - 18-03 (Eilmeldung banner integrates above hero)
  - 18-04 (future cleanup of ArticleFeed.tsx dead code)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Pre-mount state pattern: bezirk filter applied only after useEffect to avoid hydration mismatch
    - Client component with server-fetched props: server fetches all data, client handles localStorage-based filtering
    - Editorial grid: 2/3 + 1/3 CSS grid with ArticleCard featured prop for the left slot

key-files:
  created:
    - src/components/reader/HeroArticle.tsx
    - src/components/reader/TopMeldungenRow.tsx
    - src/components/reader/BezirkSection.tsx
    - src/components/reader/HomepageLayout.tsx
  modified:
    - src/app/(public)/page.tsx

key-decisions:
  - "Plain <img> tag used in HeroArticle (not next/image) — external image domains are unpredictable per research notes"
  - "BEZIRK_COLORS duplicated in TopMeldungenRow (not imported from ArticleCard) — map is not exported from ArticleCard"
  - "HomepageLayout mounted flag prevents bezirk filter from running during SSR/hydration, avoiding console mismatches"
  - "AdUnit zone='hero' placed between TopMeldungenRow and editorial sections — preserves slot from old page.tsx"

patterns-established:
  - "Pre-mount boolean pattern: useState(false) + setMounted(true) in useEffect guards localStorage reads from SSR"
  - "Editorial zone rendering: hero -> top-stories -> ad slot -> heading -> sections, consistent across filtered/unfiltered states"

requirements-completed: [HOME-01, HOME-02, HOME-03]

# Metrics
duration: 10min
completed: 2026-03-25
---

# Phase 18 Plan 02: Homepage Editorial Layout Components Summary

**Four new editorial components (HeroArticle, TopMeldungenRow, BezirkSection, HomepageLayout) replacing ArticleFeed with a newspaper-style hero + horizontal scroller + bezirk-grouped sections layout**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-25T21:05:06Z
- **Completed:** 2026-03-25T21:15:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- HeroArticle: full-bleed min-60vh hero with real image or styrian-green gradient fallback, text gradient overlay, cream/green bezirk badge, serif headline, 2-line excerpt
- TopMeldungenRow: horizontally scrollable row with per-bezirk gradient thumbnails, styrian-green bottom border per card, Work Sans label, and right-edge cream fade
- BezirkSection: 2/3 + 1/3 editorial grid (ArticleCard featured in left, stacked cards in right column), wood-gradient horizontal divider, Styrian flag accent strip above heading
- HomepageLayout: client component reading `bezirk_selection` from localStorage post-mount, grouping articles by bezirk when filter set, showing flat grid when unfiltered, AdUnit slots preserved

## Task Commits

Each task was committed atomically:

1. **Task 1: Create HeroArticle, TopMeldungenRow, and BezirkSection components** - `ff4e9dc` (feat)
2. **Task 2: Create HomepageLayout and rewire page.tsx** - `b8be28d` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `src/components/reader/HeroArticle.tsx` — Full-bleed hero with image or gradient fallback, overlay, badge, serif headline, excerpt
- `src/components/reader/TopMeldungenRow.tsx` — Horizontal scroll row with per-bezirk cards, green border accents, right-edge fade
- `src/components/reader/BezirkSection.tsx` — 2/3 + 1/3 editorial grid with wood divider and Styrian flag accent
- `src/components/reader/HomepageLayout.tsx` — Client orchestrator with localStorage bezirk filtering, all zones
- `src/app/(public)/page.tsx` — Rewired to server component using getFeaturedArticle, getPinnedArticles, listArticlesForHomepage

## Decisions Made

- **Plain `<img>` in HeroArticle**: next/image requires `domains` config for each external host. Since article image URLs are from unpredictable external sources (research notes flag this), plain `<img>` is correct here.
- **BEZIRK_COLORS duplicated in TopMeldungenRow**: The map is defined inside ArticleCard.tsx but not exported. Rather than refactoring ArticleCard (out of scope), duplicated it into TopMeldungenRow. A future cleanup plan could extract to a shared constants file.
- **Pre-mount guard**: `mounted` state boolean prevents bezirk filter from applying during SSR and initial hydration. Ensures server and client render identical markup until after first paint.
- **AdUnit zone placement**: Preserved `zone="hero"` slot from old page.tsx, now placed between top-stories row and editorial sections. Added `zone="between-articles"` every 2nd bezirk section when filter is active.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All four editorial zone components are ready
- HomepageLayout is wired to server-fetched data from Plan 01 query functions
- ArticleFeed.tsx is now unused dead code — cleanup is a separate concern (noted in plan)
- Plan 03 (Eilmeldung banner) can render above the HeroArticle in the layout hierarchy

---
*Phase: 18-homepage-editorial-layout*
*Completed: 2026-03-25*

## Self-Check: PASSED

All files confirmed present on disk. All commits verified in git log.
