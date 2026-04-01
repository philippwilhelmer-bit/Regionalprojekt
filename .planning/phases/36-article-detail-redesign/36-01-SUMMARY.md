---
phase: 36-article-detail-redesign
plan: 01
subsystem: ui
tags: [article, typography, drop-cap, blockquote, hero-image, css, vitest]

# Dependency graph
requires:
  - phase: 33-color-token-foundation
    provides: Archivist design tokens (ink, parchment, slate, aged-wood, spacing)
  - phase: 35-homepage-feature-components
    provides: HeroArticle Archival Header pattern reference
provides:
  - Article detail page with Archival Header (title overlapping hero image via gradient scrim)
  - Float-based drop cap on first article paragraph via .drop-cap CSS class
  - Styled blockquote detection from content via .article-blockquote CSS class
  - article-utils.ts with estimateReadingTime, isBlockquote, stripBlockquotePrefix
affects: [36-article-detail-redesign plan-02, sidebar layout, article reader]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Archival Header: absolute image + gradient scrim + absolute bottom overlay for editorial title placement
    - Drop cap via CSS float::first-letter (not CSS initial-letter — Firefox unsupported)
    - Blockquote detection from plain-text content via startsWith(">") or startsWith("\u201E")
    - Custom paragraph rendering replaces prose class for fine-grained typographic control

key-files:
  created:
    - src/lib/reader/article-utils.ts
    - src/app/__tests__/article-detail.test.ts
  modified:
    - src/app/globals.css
    - src/app/(public)/artikel/[publicId]/[slug]/page.tsx

key-decisions:
  - "Drop cap uses float::first-letter (not initial-letter) — Firefox support for initial-letter is incomplete"
  - "isBlockquote detects both > and \u201E (German lower-9 opening quote) as blockquote markers"
  - "stripBlockquotePrefix uses regex /^[>\"\u00BB\u201E]\\s*/ to handle multiple quote styles"
  - "ShareButton moves to source attribution area temporarily — will move to sidebar in Plan 02"
  - "bg-background replaced with bg-parchment — bg-background is a deprecated token"
  - "prose class removed entirely from article body — custom paragraph map gives full typographic control"

patterns-established:
  - "Archival Header: header.relative.overflow-hidden > img + gradient-scrim + absolute-bottom-overlay"
  - "Drop cap paragraph: first non-blockquote paragraph gets drop-cap class, tracked with dropCapApplied flag"
  - "Content blockquote: isBlockquote() → blockquote.article-blockquote with stripBlockquotePrefix() content"

requirements-completed: [ARTC-01, ARTC-02, ARTC-04]

# Metrics
duration: 15min
completed: 2026-04-01
---

# Phase 36 Plan 01: Article Detail Redesign — Archival Header + Drop Cap + Blockquote Summary

**Premium editorial layout with gradient-scrim title overlay on hero images, float-based drop cap first letter, and content-detected blockquote styling using serif italic tonal dividers**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-01T22:29:00Z
- **Completed:** 2026-04-01T22:35:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Archival Header pattern: article hero image with absolute gradient scrim and title/breadcrumb/date overlaid at bottom (matching HeroArticle.tsx reference)
- Tonal fallback header: `bg-parchment-dim` block with ink text for articles without hero images
- Drop cap via `.drop-cap::first-letter` CSS float (4.5rem headline serif, float-left) — applied to first non-blockquote paragraph only
- Blockquote detection from plain text content — paragraphs starting with `>` or `\u201E` render as styled serif italic blockquotes
- Pure utility functions in `article-utils.ts` with 10 unit tests (GREEN)

## Task Commits

1. **Task 0: Unit test scaffold** - `9c70da3` (test)
2. **Task 1: Archival Header + drop cap + blockquote styling** - `fc0c7e9` (feat)

## Files Created/Modified

- `src/lib/reader/article-utils.ts` — Pure functions: estimateReadingTime, isBlockquote, stripBlockquotePrefix
- `src/app/__tests__/article-detail.test.ts` — 10 Vitest unit tests covering all three utility functions
- `src/app/globals.css` — Added .drop-cap and .article-blockquote CSS utility classes
- `src/app/(public)/artikel/[publicId]/[slug]/page.tsx` — Full rewrite: Archival Header, custom paragraph rendering, drop cap, blockquote, bg-parchment

## Decisions Made

- Drop cap uses `::first-letter` CSS float (not `initial-letter`) — Firefox does not fully support `initial-letter`
- `isBlockquote` detects `>` and `\u201E` (German lower-9 opening quote) as blockquote markers
- `stripBlockquotePrefix` removes `>`, `"`, `\u00BB`, and `\u201E` prefixes plus leading whitespace
- `ShareButton` moved to source attribution area temporarily — will relocate to sidebar column in Plan 02
- `bg-background` replaced with `bg-parchment` (deprecated token removal)
- `prose` class removed entirely — custom paragraph map provides fine-grained typographic control

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

Two pre-existing test failures (`root-layout-adsense.test.ts`, `bezirke.test.ts`) confirmed pre-existing via git stash verification — unrelated to this plan's changes.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 02 (sidebar layout) can now wrap the article body and sidebar in a grid — the content column is clean and ready
- ShareButton is temporarily in the source attribution area — Plan 02 will move it to the sidebar
- Archival Header height (`max-h-[55vh]`) leaves room for sidebar to start below the fold on desktop

---
*Phase: 36-article-detail-redesign*
*Completed: 2026-04-01*
