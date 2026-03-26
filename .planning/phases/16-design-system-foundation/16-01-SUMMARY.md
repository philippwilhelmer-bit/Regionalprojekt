---
phase: 16-design-system-foundation
plan: "01"
subsystem: ui
tags: [tailwind, css, next/font, google-fonts, design-tokens]

# Dependency graph
requires: []
provides:
  - Tailwind v4 @theme tokens for styrian-green, cream, alpine-red, sage colors
  - Font family tokens --font-headline (Newsreader), --font-body (Inter), --font-label (Work Sans)
  - --radius-sm: 2px border radius override
  - Google Fonts loaded via next/font/google (self-hosted, no external requests at runtime)
  - Body background set to warm cream (#fbfaee) via bg-cream utility class
affects: [17-typography-system, 18-article-layout, 19-navigation-components, 20-homepage-redesign, 16-02]

# Tech tracking
tech-stack:
  added: [next/font/google (Newsreader, Inter, Work_Sans)]
  patterns: [Tailwind v4 @theme for design tokens, CSS variable injection from next/font to @theme]

key-files:
  created: []
  modified:
    - src/app/globals.css
    - src/app/layout.tsx

key-decisions:
  - "Tailwind v4 @theme block in globals.css is the single source of truth for design tokens"
  - "Font CSS variables set on <html> element (not body) so they cascade to all children including portals"
  - "Work_Sans variable named --font-work-sans to avoid camelCase mismatch with CSS custom property naming"
  - "body font-sans class removed; body font now comes from globals.css body rule using var(--font-body)"

patterns-established:
  - "CSS variable bridge: next/font sets --font-* on html, @theme references those for Tailwind utility classes"
  - "Token naming: --color-*, --font-*, --radius-* prefixes align with Tailwind v4 @theme conventions"

requirements-completed: [DS-01, DS-02, DS-04]

# Metrics
duration: 2min
completed: 2026-03-25
---

# Phase 16 Plan 01: Design Tokens and Font Loading Summary

**Tailwind v4 @theme tokens (4 colors, 3 font families, 2px radius override) with Newsreader/Inter/Work Sans self-hosted via next/font/google and cream body background**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-25T19:02:30Z
- **Completed:** 2026-03-25T19:04:30Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Defined all design color tokens in Tailwind v4 @theme: styrian-green (#2D5A27), cream (#fbfaee), alpine-red (#8b0000), sage (#4a5d4e)
- Wired Newsreader, Inter, and Work Sans via next/font/google with CSS variable injection — fonts self-hosted at build time, zero external requests at runtime
- Overrode --radius-sm to 2px so rounded-sm maps consistently to the project's editorial border radius
- Replaced bg-zinc-50 with bg-cream on body, establishing warm cream background for reader frontend

## Task Commits

Each task was committed atomically:

1. **Task 1: Define design tokens in globals.css and wire font loading in layout.tsx** - `424ca91` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `src/app/globals.css` - Tailwind v4 @theme block with color, font, and radius tokens; body font-family rule
- `src/app/layout.tsx` - Newsreader/Inter/Work_Sans imported from next/font/google, CSS variables on html element, bg-cream on body

## Decisions Made
- Font CSS variables applied to `<html>` element (not `<body>`) so they cascade to all children including modals and portals
- `Work_Sans` function maps to `--font-work-sans` CSS variable (lowercase with hyphens per CSS custom property conventions)
- Removed `font-sans` from body className — font now comes from globals.css body rule referencing var(--font-body), which resolves to the Inter variable set by next/font

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. Fonts are self-hosted at build time via next/font/google.

## Next Phase Readiness
- All design tokens available as Tailwind utility classes (bg-cream, text-styrian-green, bg-alpine-red, text-sage, rounded-sm)
- Font utility classes available: font-headline, font-body, font-label
- Plan 16-02 (icon library and component updates) can proceed immediately
- Phases 17-20 have their token foundation ready

---
*Phase: 16-design-system-foundation*
*Completed: 2026-03-25*

## Self-Check: PASSED

- FOUND: src/app/globals.css
- FOUND: src/app/layout.tsx
- FOUND: .planning/phases/16-design-system-foundation/16-01-SUMMARY.md
- FOUND: commit 424ca91 (feat: task 1)
- FOUND: commit b94cf83 (docs: plan metadata)
