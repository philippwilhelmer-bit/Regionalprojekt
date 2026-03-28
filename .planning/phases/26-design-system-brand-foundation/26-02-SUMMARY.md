---
phase: 26-design-system-brand-foundation
plan: "02"
subsystem: ui
tags: [design-tokens, tailwind, border-migration, reader-components, spacing]

# Dependency graph
requires:
  - 26-01 (Wurzelwelt color tokens, --radius-sm, spacing tokens)
provides:
  - All reader components migrated to Wurzelwelt borderless design language
  - Zero legacy color token references in reader layer
  - Semantic token coverage across 19 reader component files
  - Organic spacing tokens (--spacing-gutter, --spacing-section) wired into layout
  - CTA gradient pill buttons (from-primary to-primary-container rounded-full)
affects:
  - 26-03 (component restyling can build on clean token base)
  - 26-04 (brand rename applies to already-clean semantic token names)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Border-free design via tonal background shifts (bg-surface, bg-surface-elevated, shadow-sm)
    - CTA gradient pill pattern: bg-gradient-to-br from-primary to-primary-container rounded-full
    - Nav edge definition via shadow-[0_-2px_8px] instead of border-t
    - Active state tonal highlight: bg-primary/10 text-primary (no border)
    - Organic spacing via CSS custom properties: px-[var(--spacing-gutter)], py-[var(--spacing-section)]

key-files:
  created: []
  modified:
    - src/components/reader/ArticleCard.tsx
    - src/components/reader/EditorialCard.tsx
    - src/components/reader/TopMeldungenRow.tsx
    - src/components/reader/HomepageLayout.tsx
    - src/components/reader/BezirkSection.tsx
    - src/components/reader/ListItem.tsx
    - src/components/reader/SearchPageLayout.tsx
    - src/components/reader/RegionalSelector.tsx
    - src/components/reader/RegionalNavBar.tsx
    - src/components/reader/BottomNavClient.tsx
    - src/components/reader/BezirkModal.tsx
    - src/components/reader/ShareButton.tsx
    - src/components/reader/CookieBanner.tsx
    - src/components/reader/Footer.tsx
    - src/components/reader/Header.tsx
    - src/components/reader/RegionalAppBar.tsx
    - src/components/reader/HeroArticle.tsx
    - src/components/reader/EilmeldungBanner.tsx
    - src/components/reader/ArticleFeed.tsx
    - src/app/(public)/artikel/[publicId]/[slug]/page.tsx

key-decisions:
  - "Spinner animation border in ArticleFeed kept as functional (border-2 border-t-primary) — only decorative borders removed"
  - "Task 2 spacing work merged into Task 1 commit since HomepageLayout, BezirkSection, and TopMeldungenRow were all rewritten together"
  - "ListItem uses border-surface for internal row separators — this is a tonal/semantic token, not a decorative legacy border"

# Metrics
duration: 7min
completed: 2026-03-28
---

# Phase 26 Plan 02: Reader Component Border Migration Summary

**Migrated 20 reader component files from bordered/sharp v1.1 to Wurzelwelt borderless design: zero legacy tokens, shadow-based card depth, tonal background alternation, and CTA gradient pills**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-28T21:21:46Z
- **Completed:** 2026-03-28T21:28:34Z
- **Tasks:** 2
- **Files modified:** 20

## Accomplishments

- Eliminated all legacy color token references (styrian-green, cream, cream-dark, sage, alpine-red) from 19 reader components and 1 article page
- Replaced all decorative borders with tonal alternatives: shadow-sm for cards, shadow-[0_-2px_8px] for navigation bars, bg-surface for footer separation
- Applied CTA gradient pill pattern to 3 primary action buttons (BezirkModal save, CookieBanner accept, SearchPageLayout back button)
- BezirkModal chips fully border-free: selected = `bg-primary text-white`, unselected = `bg-surface-elevated shadow-sm`
- SearchPageLayout search input migrated to `bg-surface ring-1 ring-secondary/20` tonal fill with focus ring
- Navigation active state uses `bg-primary` pill indicator with `text-background` icon (no border)
- Footer simplified from `bg-zinc-100 border-t border-zinc-200` to `bg-surface`
- HomepageLayout sections alternate bg-background / bg-surface with py-[var(--spacing-section)] gaps
- Organic spacing tokens applied to HomepageLayout, BezirkSection, TopMeldungenRow containers

## Task Commits

Each task was committed atomically:

1. **Task 1 + Task 2: Migrate reader components + apply organic spacing** - `66949ee` (feat)
   (Task 2 spacing work was integrated into Task 1 since all layout files were rewritten together)

## Files Created/Modified

All 20 files in `src/components/reader/` listed in frontmatter plus `src/app/(public)/artikel/[publicId]/[slug]/page.tsx`.

## Decisions Made

- Functional animation border in ArticleFeed spinner (`border-t-primary`) preserved — only decorative borders removed
- `border-surface` used in ListItem row separators as a tonal token (not a legacy border — this uses the new semantic token)
- Task 2 spacing tokens were applied inline during Task 1 rewrite rather than as a separate diff

## Deviations from Plan

None - plan executed exactly as written. Tasks 1 and 2 were committed as a single atomic commit since HomepageLayout was the primary focus of both tasks and was rewritten once.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All reader components now use Wurzelwelt semantic tokens exclusively
- Zero legacy v1.1 color names remain in any reader component
- Component layer is ready for Phase 26-03+ visual refinements
- CTA gradient pattern established as reusable design primitive

## Self-Check: PASSED
