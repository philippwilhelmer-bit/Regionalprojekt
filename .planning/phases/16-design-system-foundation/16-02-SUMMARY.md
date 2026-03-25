---
phase: 16-design-system-foundation
plan: "02"
subsystem: ui
tags: [tailwind, material-icons, google-fonts, design-tokens, border-radius, bezirk-colors]

# Dependency graph
requires:
  - phase: 16-01
    provides: "Tailwind v4 @theme tokens for styrian-green, cream, sage, font-headline/body/label, rounded-sm"
provides:
  - Material Symbols Outlined loaded via CDN link in layout.tsx head
  - newspaper icon in BottomNav (replacing Unicode ◎)
  - arrow_drop_down icon in Header (replacing Unicode ▾)
  - font-headline on all article h1/h2 elements in reader components
  - font-label on BottomNav, Header, and article metadata elements
  - Styrian green/sage/cream palette replacing rainbow Bezirk gradients and badges
  - Sharp 2px border-radius (rounded-sm) across all reader components
  - BezirkModal accent colors using styrian-green instead of blue
affects: [17-typography-system, 18-article-layout, 19-navigation-components, 20-homepage-redesign]

# Tech tracking
tech-stack:
  added: [Material Symbols Outlined (Google CDN icon font)]
  patterns:
    - "material-symbols-outlined class on <span> for icon rendering"
    - "Design palette: styrian-green/sage/cream arbitrary hex variants for 13-Bezirk gradient map"

key-files:
  created: []
  modified:
    - src/app/layout.tsx
    - src/components/reader/Header.tsx
    - src/components/reader/BottomNav.tsx
    - src/components/reader/ArticleCard.tsx
    - src/app/(public)/artikel/[publicId]/[slug]/page.tsx
    - src/components/reader/BezirkModal.tsx
    - src/components/reader/ShareButton.tsx
    - src/components/reader/CookieBanner.tsx

key-decisions:
  - "Material Symbols loaded via CDN <link> tag in layout.tsx <head> block (GDPR acknowledged per CONTEXT.md)"
  - "Bezirk gradient map uses arbitrary hex shades (#3a6b33, #5a7d54, #4a6e44, #244d20) as intermediate styrian-green/sage variations"
  - "All 13 Bezirk badge colors map to text-styrian-green or text-sage on bg-cream for visual cohesion"
  - "BezirkModal selection state uses border-styrian-green + bg-cream instead of border-blue-600 + bg-blue-50"
  - "ArticleFeed.tsx spinner rounded-full intentionally preserved (circular shape required for animation)"

patterns-established:
  - "Icon pattern: <span className='material-symbols-outlined {size}'> with icon ligature text inside"
  - "Palette gradient pattern: from-{token} to-[#hex] for intermediate shades not in Tailwind config"

requirements-completed: [DS-01, DS-02, DS-03, DS-04]

# Metrics
duration: 5min
completed: 2026-03-25
---

# Phase 16 Plan 02: Apply Design Tokens to Reader Components Summary

**Material Symbols icons in nav, Newsreader headlines, Work Sans labels, and Styrian green/sage/cream palette with sharp 2px corners across all reader components**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-25T19:05:00Z
- **Completed:** 2026-03-25T19:10:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Loaded Material Symbols Outlined via CDN; replaced Unicode ◎ in BottomNav with newspaper icon and ▾ in Header with arrow_drop_down
- Applied font-headline (Newsreader) to all article h1/h2 elements and font-label (Work Sans) to nav, header, and metadata labels
- Remapped all 13 Bezirk gradient colors from rainbow palette to styrian-green/sage/cream variants using token classes and arbitrary hex intermediate shades
- Replaced all oversized border-radius values (rounded-xl, rounded-2xl, rounded-full, rounded-lg) with rounded-sm (2px) in every reader component except the spinner

## Task Commits

Each task was committed atomically:

1. **Task 1: Load Material Symbols CDN and apply font tokens + icons to Header, BottomNav, and article headlines** - `7bd9998` (feat)
2. **Task 2: Remap Bezirk colors to design palette and replace all oversized border-radius in reader components** - `3c6d07c` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `src/app/layout.tsx` - Added Material Symbols Outlined CDN `<link>` in `<head>`
- `src/components/reader/Header.tsx` - arrow_drop_down material icon; font-label on site name
- `src/components/reader/BottomNav.tsx` - newspaper material icon; font-label on Nachrichten text
- `src/components/reader/ArticleCard.tsx` - font-headline on h2; Styrian palette BEZIRK_COLORS/BEZIRK_BADGE_COLORS; rounded-sm on card and badges
- `src/app/(public)/artikel/[publicId]/[slug]/page.tsx` - font-headline on h1; font-label on date and related heading
- `src/components/reader/BezirkModal.tsx` - rounded-sm throughout; styrian-green/cream replacing blue accent colors
- `src/components/reader/ShareButton.tsx` - rounded-full -> rounded-sm
- `src/components/reader/CookieBanner.tsx` - rounded -> rounded-sm on both buttons

## Decisions Made
- Material Symbols loaded via CDN `<link>` tag in layout.tsx `<head>` block — acceptable per CONTEXT.md GDPR acknowledgment
- Bezirk gradient map uses arbitrary hex values (#3a6b33, #5a7d54, #4a6e44, #244d20) as intermediate green/sage shades to differentiate all 13 districts while staying in palette
- ArticleFeed.tsx spinner `rounded-full` was intentionally left untouched per plan — circular spinners require the full radius

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required beyond the CDN link already added to layout.

## Next Phase Readiness
- All reader components now fully adopt the design system from Plan 01
- Newsreader headlines, Work Sans labels, Material Symbol icons, Styrian palette, and sharp 2px corners are live
- Phases 17-20 can build on this consistent visual foundation
- Admin pages remain untouched as specified

---
*Phase: 16-design-system-foundation*
*Completed: 2026-03-25*
