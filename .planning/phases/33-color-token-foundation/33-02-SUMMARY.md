---
phase: 33-color-token-foundation
plan: "02"
subsystem: ui
tags: [tailwind, design-tokens, reader-components, color-migration, archivist]

# Dependency graph
requires:
  - 33-01 (Archivist @theme token system in globals.css)
provides:
  - 9 core reader components fully migrated to Archivist token system
  - Unified ink gradient replacing per-Bezirk color maps
  - Tonal background separation replacing border-b line rules
  - Spinner using inline borderRadius instead of rounded-full Tailwind class
affects: [34-glassmorphism-nav, 35-reader-features]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Unified gradient: from-ink to-ink-soft replaces all per-Bezirk hex gradients"
    - "Tonal separation: bg-parchment item / bg-parchment-dim parent replaces border-b"
    - "Functional circle exception: style={{ borderRadius: 50% }} on spinner, not rounded-full"
    - "Badge tokens: text-parchment bg-ink-soft rounded-xs"

key-files:
  created: []
  modified:
    - src/components/reader/ArticleCard.tsx
    - src/components/reader/TopMeldungenRow.tsx
    - src/components/reader/ListItem.tsx
    - src/components/reader/ArticleFeed.tsx
    - src/components/reader/HeroArticle.tsx
    - src/components/reader/EditorialCard.tsx
    - src/components/reader/SearchPageLayout.tsx
    - src/components/reader/BezirkModal.tsx
    - src/components/reader/CookieBanner.tsx

key-decisions:
  - "BEZIRK_COLORS and BEZIRK_BADGE_COLORS maps deleted — single unified ink gradient for all cards"
  - "ListItem border-b removed — tonal bg shift (bg-parchment hover:bg-parchment-dim) creates separation"
  - "Spinner uses style={{ borderRadius: 50% }} to exempt functional circle from decorative radius ban"
  - "text-primary/text-secondary for section labels mapped to text-ink-muted (UI chrome, not accent)"
  - "Weiterlesen link in EditorialCard uses text-aged-wood for warm editorial accent"

# Metrics
duration: 11min
completed: 2026-04-01
---

# Phase 33 Plan 02: Reader Component Token Migration Summary

**9 core reader components migrated from per-Bezirk hex maps and old tokens to unified Archivist ink/parchment/slate/aged-wood system — BEZIRK_COLORS deleted, borders replaced with tonal shifts, oversized radii flattened**

## Performance

- **Duration:** ~11 min
- **Started:** 2026-04-01T16:04:41Z
- **Completed:** 2026-04-01T16:15:56Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- Deleted BEZIRK_COLORS (13-entry gradient map) and BEZIRK_BADGE_COLORS (13-entry badge map) from ArticleCard.tsx and TopMeldungenRow.tsx — replaced with single `from-ink to-ink-soft` gradient
- Removed `border-b border-surface last:border-b-0` from ListItem — replaced with `bg-parchment hover:bg-parchment-dim` tonal shift
- Replaced all zinc-* classes (zinc-900, zinc-700, zinc-600, zinc-500, zinc-400, zinc-300) across all 9 files with ink family tokens (ink, ink-soft, ink-muted, ink-dim, slate-muted)
- Replaced old token names (text-primary, bg-background, text-secondary, bg-primary-container, from-primary, etc.) with Archivist equivalents
- Flattened all decorative rounded-full, rounded-xl, rounded-lg to rounded-xs (badges/pills/CTAs) or rounded-sm (containers)
- ArticleFeed spinner: replaced `rounded-full` Tailwind class with `style={{ borderRadius: '50%' }}` inline — exempts functional circle from decorative radius rule
- All 9 files verified clean: zero zinc-*, zero old tokens, zero oversized radii, zero BEZIRK_COLORS references, zero border-b separators

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate ArticleCard.tsx and TopMeldungenRow.tsx** - `e7debdb` (feat)
2. **Task 2: Migrate ListItem, ArticleFeed, HeroArticle, EditorialCard** - `9c5b963` (feat)
3. **Task 3: Migrate SearchPageLayout, BezirkModal, CookieBanner** - `16eec5f` (feat)

## Files Created/Modified

- `src/components/reader/ArticleCard.tsx` — BEZIRK_COLORS/BEZIRK_BADGE_COLORS deleted, unified ink gradient, zinc-* -> ink tokens, badge rounded-xs
- `src/components/reader/TopMeldungenRow.tsx` — same maps deleted, from-parchment fade edge, all tokens updated
- `src/components/reader/ListItem.tsx` — border-b removed, tonal bg shift added, zinc-* -> ink tokens
- `src/components/reader/ArticleFeed.tsx` — zinc-* removed, spinner inline borderRadius:50%
- `src/components/reader/HeroArticle.tsx` — from-primary/primary-container -> from-ink/ink-soft, rounded-full badges -> rounded-xs
- `src/components/reader/EditorialCard.tsx` — zinc-* -> ink tokens, text-primary -> text-aged-wood for Weiterlesen link
- `src/components/reader/SearchPageLayout.tsx` — bg-background -> bg-parchment, all zinc-* removed, rounded-full pills -> rounded-xs
- `src/components/reader/BezirkModal.tsx` — bg-primary/text-white -> bg-ink/text-parchment, rounded-full CTA -> rounded-xs
- `src/components/reader/CookieBanner.tsx` — rounded-full accept button -> rounded-xs, zinc-* removed

## Decisions Made

- BEZIRK_COLORS deleted entirely (clean break, not preserved as fallback) — unified ink gradient handles all cards
- ListItem tonal separation: item uses `bg-parchment`, parent container provides the contrast via `bg-parchment-dim`
- Section label colors (`text-primary` used as accent in original) mapped to `text-ink-muted` — these are UI chrome, not primary accent
- Editorial "Weiterlesen" link uses `text-aged-wood` — warm editorial accent aligned with Archivist palette
- Spinner exemption: `style={{ borderRadius: '50%' }}` is the established pattern for functional (not decorative) circular shapes

## Deviations from Plan

None — plan executed exactly as written. The test failures observed (DB/AI/admin test files) are pre-existing failures documented in Plan 33-01 SUMMARY, unrelated to reader component CSS changes.

## Self-Check: PASSED

- FOUND: `src/components/reader/ArticleCard.tsx`
- FOUND: `src/components/reader/TopMeldungenRow.tsx`
- FOUND: `src/components/reader/ListItem.tsx`
- FOUND: `src/components/reader/ArticleFeed.tsx`
- FOUND: `src/components/reader/HeroArticle.tsx`
- FOUND: `src/components/reader/EditorialCard.tsx`
- FOUND: `src/components/reader/SearchPageLayout.tsx`
- FOUND: `src/components/reader/BezirkModal.tsx`
- FOUND: `src/components/reader/CookieBanner.tsx`
- FOUND: commit `e7debdb` (feat(33-02): migrate ArticleCard and TopMeldungenRow to Archivist tokens)
- FOUND: commit `9c5b963` (feat(33-02): migrate ListItem, ArticleFeed, HeroArticle, EditorialCard to Archivist tokens)
- FOUND: commit `16eec5f` (feat(33-02): migrate SearchPageLayout, BezirkModal, CookieBanner to Archivist tokens)

---
*Phase: 33-color-token-foundation*
*Completed: 2026-04-01*
