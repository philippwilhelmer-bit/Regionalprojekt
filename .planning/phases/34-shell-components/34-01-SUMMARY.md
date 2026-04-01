---
phase: 34-shell-components
plan: "01"
subsystem: ui
tags: [tailwindcss, glassmorphism, material-symbols, react, next]

# Dependency graph
requires:
  - phase: 33-color-token-foundation
    provides: --color-glass-nav token, --shadow-nav token, --color-ink, --color-slate, --color-aged-wood tokens in globals.css
provides:
  - Glassmorphic bottom nav bar with frosted-glass background
  - icon-filled utility class for Material Symbols FILL axis
  - Top-border active state pattern (replaces pill pattern)
  - Archivist icon set in nav: auto_stories, forest, face_5, book_2
affects: [35-bezirk-picker, 36-article-reader, any phase using WurzelNavBar]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "icon-filled utility class uses font-variation-settings: 'FILL' 1 for Material Symbols filled state"
    - "Glassmorphic nav uses bg-glass-nav (color-mix token) + backdrop-blur-md"
    - "Top-border active indicator: border-t-2 border-ink (active) vs border-t-2 border-transparent (inactive) — prevents height jump"
    - "Disabled nav items use border-t-2 border-transparent for layout consistency"

key-files:
  created: []
  modified:
    - src/components/reader/WurzelNavBar.tsx
    - src/app/globals.css

key-decisions:
  - "Tailwind v4 auto-generates -webkit-backdrop-filter (verified: 1 match in tailwindcss/dist/lib.js) — no manual @layer utilities override needed"
  - "Active nav state replaced: aged-wood pill removed in favor of top-border (border-t-2 border-ink) per Phase 34 shell component spec"
  - "Inactive icon color set to text-ink (same as active) — visual distinction comes from icon-filled vs outlined state only"

patterns-established:
  - "Border-gap pattern: all enabled tabs (active + inactive) get border-t-2 to prevent height jump on active state change"
  - "icon-filled class: add to Material Symbols span for FILL=1 (filled icon), omit for FILL=0 (outlined)"

requirements-completed: [SHEL-01, SHEL-02]

# Metrics
duration: 8min
completed: 2026-04-01
---

# Phase 34 Plan 01: Shell Components — Bottom Nav Summary

**Glassmorphic WurzelNavBar with bg-glass-nav backdrop-blur, top-border active indicator, and Archivist icon set (auto_stories/forest/face_5/book_2)**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-01T18:28:11Z
- **Completed:** 2026-04-01T18:36:27Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `.icon-filled` utility to globals.css using `font-variation-settings: 'FILL' 1` for Material Symbols filled state
- Replaced opaque `bg-parchment` nav with `bg-glass-nav backdrop-blur-md` glassmorphic surface
- Replaced aged-wood pill active indicator with `border-t-2 border-ink` top-border pattern
- Updated all 4 nav icons to Archivist set: auto_stories, forest, face_5, book_2
- Active icon uses `icon-filled` class; inactive icons render as outlined

## Task Commits

Each task was committed atomically:

1. **Task 1: Verify backdrop-blur prefix and add icon-filled utility** - `929f91a` (chore)
2. **Task 2: Rebuild WurzelNavBar with glassmorphism and Archivist icons** - `c314bdd` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

- `src/components/reader/WurzelNavBar.tsx` — Glassmorphic nav with updated icons, top-border active state, icon-filled class
- `src/app/globals.css` — Added .icon-filled utility class

## Decisions Made

- Tailwind v4 auto-generates `-webkit-backdrop-filter` for `backdrop-blur-md` (verified empirically via grep on lib.js — 1 match). No manual `@layer utilities` override was needed, resolving the Phase 34 blocker documented in STATE.md.
- Inactive icon color: `text-ink` (same as active) — visual distinction relies solely on filled vs outlined icon state, not color. This matches the Archivist design spec more cleanly.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- `npx` not available in PATH during bash execution — resolved by using explicit nvm node path (`~/.nvm/versions/node/v25.8.0/bin/node`) for vitest and build commands.
- Pre-existing test failures in `bezirke.test.ts` and `root-layout-adsense.test.ts` (unrelated to this plan) — confirmed no regressions introduced.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- WurzelNavBar glassmorphic pattern established and ready for visual review
- `icon-filled` utility class available for any other Material Symbols components in Phase 34+
- No blockers for remaining Phase 34 plans

## Self-Check: PASSED

- FOUND: src/components/reader/WurzelNavBar.tsx
- FOUND: src/app/globals.css
- FOUND: .planning/phases/34-shell-components/34-01-SUMMARY.md
- FOUND: commit 929f91a (Task 1)
- FOUND: commit c314bdd (Task 2)

---
*Phase: 34-shell-components*
*Completed: 2026-04-01*
