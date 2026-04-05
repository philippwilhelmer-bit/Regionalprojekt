---
phase: 36-article-detail-redesign
plan: 02
subsystem: ui
tags: [article, sidebar, metadata, responsive, grid, sticky, share-button, reading-time]

# Dependency graph
requires:
  - phase: 36-article-detail-redesign plan-01
    provides: Archival Header, drop cap, blockquote styling, article-utils.ts with estimateReadingTime
  - phase: 33-color-token-foundation
    provides: Archivist design tokens (slate, parchment, ink, spacing)
provides:
  - ArticleSidebar client component with sticky desktop metadata panel
  - Two-column lg+ grid layout on article detail page
  - Mobile horizontal metadata strip above article body
  - ShareButton relocated from source attribution to sidebar and mobile strip
affects: [article reader layout, any future article page modifications]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Sticky sidebar via `sticky top-[4rem]` inside a `hidden lg:block` grid column
    - Responsive two-column grid: `lg:grid lg:grid-cols-[1fr_240px] lg:gap-8`
    - Mobile metadata strip via `lg:hidden flex items-center flex-wrap gap-x-4 gap-y-2`

key-files:
  created:
    - src/components/reader/ArticleSidebar.tsx
  modified:
    - src/app/(public)/artikel/[publicId]/[slug]/page.tsx

key-decisions:
  - "ArticleSidebar sticky offset is top-[4rem] to clear WurzelAppBar/RegionalAppBar height"
  - "ShareButton removed from source attribution area — now exclusively in sidebar (desktop) and metadata strip (mobile)"
  - "AdUnit and related articles remain outside the grid — they span full content width"

patterns-established:
  - "Sticky sidebar column: hidden lg:block inside lg:grid-cols-[1fr_240px] grid"
  - "Mobile metadata strip: lg:hidden flex strip directly above article element"
  - "ArticleSidebar props: publisherName, sourceLabel, readingTime, publishedAt, shareTitle, shareUrl"

requirements-completed: [ARTC-03]

# Metrics
duration: 10min
completed: 2026-04-01
---

# Phase 36 Plan 02: Article Detail Redesign — Desktop Sidebar + Mobile Metadata Strip Summary

**Sticky desktop sidebar with source, reading time, published date, and ShareButton beside article body; mobile collapses metadata to a compact horizontal strip above the body using a responsive two-column grid**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-01T22:35:00Z
- **Completed:** 2026-04-01T22:50:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `ArticleSidebar` client component: sticky `aside` with publisher attribution, source label, reading time, published date, and ShareButton in a vertical stack with parchment tonal background
- Two-column responsive grid on article detail page: `lg:grid-cols-[1fr_240px]` wraps article body (left) and sidebar (right) — AdUnit and related articles remain full-width outside the grid
- Mobile metadata strip: `lg:hidden` flex row above article body showing source, reading time, and ShareButton
- ShareButton successfully relocated from temporary source attribution placement (Plan 01) to sidebar on desktop and metadata strip on mobile
- User visually approved the complete article detail redesign across both Plan 01 and Plan 02 features

## Task Commits

1. **Task 1: Create ArticleSidebar and wire two-column grid layout** - `7d67ffe` (feat)
2. **Task 2: Visual verification checkpoint** - approved by user (no code commit)

## Files Created/Modified

- `src/components/reader/ArticleSidebar.tsx` — "use client" component: sticky aside with metadata stack and ShareButton
- `src/app/(public)/artikel/[publicId]/[slug]/page.tsx` — Two-column grid layout, mobile strip, ArticleSidebar integration, ShareButton removed from source attribution

## Decisions Made

- Sticky sidebar offset `top-[4rem]` aligns with WurzelAppBar/RegionalAppBar bar height
- ShareButton removed from source attribution area — it is now rendered exclusively in the sidebar (lg+) and the mobile strip (<lg), avoiding duplication
- AdUnit and related articles placed outside the grid container — they continue to span the full content column width

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- ARTC-01 through ARTC-04 all complete — full article detail redesign delivered
- Phase 36 is complete; ready to advance to Phase 37
- ArticleSidebar is reusable for any future article-type page needing a metadata aside

---
*Phase: 36-article-detail-redesign*
*Completed: 2026-04-01*
