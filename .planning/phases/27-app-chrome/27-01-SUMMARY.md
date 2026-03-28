---
phase: 27-app-chrome
plan: "01"
subsystem: ui
tags: [next.js, react, tailwind, material-symbols, wurzelwelt, app-chrome]

# Dependency graph
requires:
  - phase: 26-design-system-brand-foundation
    provides: Wurzelwelt design tokens, Wurzelmann mascot PNG at public/images/wurzelmann.png
provides:
  - WurzelAppBar component with centered brand title and Wurzelmann avatar
  - WurzelNavBar component with 4-tab bottom nav and terracotta accent active state
  - Public layout wired to new Wurzelwelt app chrome
affects: [all reader pages, public layout, 27-app-chrome future plans]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wurzelwelt app bar: sticky top, bg-primary, centered logo+avatar, bezirk selector right"
    - "Wurzelwelt nav bar: fixed bottom, rounded-t-2xl, terracotta accent pill on active tab"

key-files:
  created:
    - src/components/reader/WurzelAppBar.tsx
    - src/components/reader/WurzelNavBar.tsx
  modified:
    - src/app/(public)/layout.tsx

key-decisions:
  - "WurzelAppBar: no Styrian flag stripe — Wurzelwelt brand replaces regional flag accent"
  - "WurzelNavBar: active state uses bg-accent (terracotta #9F411E) instead of bg-primary"
  - "Old RegionalAppBar/RegionalNavBar preserved (not deleted) for future tech debt cleanup"
  - "Bezirk selector moved from left to right side of app bar in Wurzelwelt design"

patterns-established:
  - "Avatar + title centered pair: next/image 32x32 rounded-full ring-2 ring-white/30 beside uppercase bold Newsreader text"
  - "Active nav pill: bg-accent w-16 h-8 rounded-full with text-white icon; inactive: text-primary icon, text-secondary label"

requirements-completed: [COMP-01, COMP-06]

# Metrics
duration: 5min
completed: 2026-03-28
---

# Phase 27 Plan 01: App Chrome Summary

**WurzelAppBar (centered uppercase WURZELWELT + Wurzelmann avatar) and WurzelNavBar (4-tab bottom nav with terracotta accent pill) replacing Styrian-branded chrome on every reader page**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-28T21:50:00Z
- **Completed:** 2026-03-28T21:58:00Z
- **Tasks:** 3 of 3 (Task 3 checkpoint:human-verify — approved on Vercel deployment)
- **Files modified:** 3

## Accomplishments
- Created WurzelAppBar with centered Newsreader bold uppercase WURZELWELT, Wurzelmann avatar (32x32 rounded-full), and bezirk selector on right
- Created WurzelNavBar with terracotta accent pill for active tabs, rounded-t-2xl, 4 tabs matching RegionalNavBar structure
- Updated public layout to import and render both new components — full TypeScript compile passes

## Task Commits

Each task was committed atomically:

1. **Task 1: Create WurzelAppBar** - `ec14e76` (feat)
2. **Task 2: Create WurzelNavBar and wire layout** - `b312ced` (feat)
3. **Task 3: Visual verification** - approved by user on Vercel deployment (checkpoint:human-verify)

## Files Created/Modified
- `src/components/reader/WurzelAppBar.tsx` - Wurzelwelt-branded sticky header with avatar, brand title, bezirk selector
- `src/components/reader/WurzelNavBar.tsx` - 4-tab bottom nav with terracotta active state and rounded top corners
- `src/app/(public)/layout.tsx` - Swapped Regional* imports for Wurzel* components

## Decisions Made
- No Styrian flag stripe in WurzelAppBar — the Wurzelwelt brand identity replaces the regional flag accent entirely
- Active tab uses `bg-accent` (terracotta #9F411E) instead of `bg-primary` (forest green) to use the Wurzelwelt signature active color
- Bezirk selector relocated from left side to right side in the new centered-logo layout
- Old RegionalAppBar.tsx and RegionalNavBar.tsx preserved for future tech debt cleanup phase

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `npx tsc --noEmit src/components/reader/WurzelAppBar.tsx` returns false-positive errors (missing jsx flag, path aliases) when run on a single file — expected behavior; full `npx tsc --noEmit` passes with zero errors as required.

## Next Phase Readiness
- Both WurzelAppBar and WurzelNavBar are live on every public reader page
- Verified on Vercel production deployment — branding, navigation, and Bezirk modal all confirmed working
- App chrome rebrand is complete; Phase 28+ can reference these components

---
*Phase: 27-app-chrome*
*Completed: 2026-03-28*
