---
phase: 34-shell-components
plan: "02"
subsystem: ui
tags: [nextjs, tailwind, responsive, hamburger-menu, footer, navigation]

# Dependency graph
requires:
  - phase: 33-color-token-foundation
    provides: Archivist design tokens (bg-ink, text-parchment, font-headline, bg-ink-soft) and Styrian flag stripe decision
provides:
  - Dark editorial footer with bg-ink, Wurzelwelt brand, Rubriken/RSS/Rechtliches columns, Impressum and Kontakt links
  - Responsive WurzelAppBar with hamburger drawer on mobile and desktop nav links
  - Bezirk selector moved to mobile hamburger drawer
affects: [35-bezirk-features, public-layout, reader-pages]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "md:hidden / hidden md:flex breakpoint pair for responsive hamburger vs desktop nav"
    - "Mobile drawer nav as conditional render with menuOpen state"
    - "Disabled future routes shown with opacity-40 and '(bald verfügbar)' hint in drawer"

key-files:
  created: []
  modified:
    - src/components/reader/Footer.tsx
    - src/components/reader/WurzelAppBar.tsx

key-decisions:
  - "pb-28 (112px) on footer ensures content not obscured by fixed h-16 bottom nav"
  - "Bezirk selector moved from header into hamburger drawer — openBezirkModal event preserved for BezirkModal"
  - "Disabled nav items (Wald, Ratgeber) use opacity-40 on desktop links; span elements (non-interactive) in mobile drawer"
  - "Image avatar removed from WurzelAppBar — replaced with left-aligned font-headline italic brand name"
  - "Kontakt links to /impressum — no separate Kontakt page exists"

patterns-established:
  - "Responsive header pattern: md:hidden hamburger + hidden md:flex desktop nav"
  - "Mobile drawer appended directly inside <header> element as conditional nav block"

requirements-completed: [SHEL-03, SHEL-04, SHEL-05]

# Metrics
duration: 10min
completed: 2026-04-01
---

# Phase 34 Plan 02: Footer and WurzelAppBar Shell Summary

**Dark editorial footer with bg-ink Wurzelwelt branding, and responsive WurzelAppBar replacing centered avatar header with hamburger drawer on mobile and Archiv/Bibliothek nav links on desktop**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-01T18:28:12Z
- **Completed:** 2026-04-01T18:38:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Footer rebuilt with bg-ink dark editorial style: serif Wurzelwelt brand, three nav columns (Rubriken, RSS-Feeds, Rechtliches), Impressum and Kontakt links, copyright line with pb-28 bottom clearance
- WurzelAppBar redesigned from centered avatar layout to left-aligned brand + hamburger on mobile / desktop horizontal nav
- Bezirk selector preserved in mobile hamburger drawer via existing openBezirkModal event dispatch
- Build passes (0 errors), no test regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Build dark editorial footer** - `6d83d6e` (feat)
2. **Task 2: Redesign WurzelAppBar with hamburger menu and desktop nav** - `ec6631d` (feat)

**Plan metadata:** (see final commit below)

## Files Created/Modified
- `src/components/reader/Footer.tsx` - Dark editorial footer with bg-ink, brand mark, Rubriken/RSS/Rechtliches columns, legal links, copyright
- `src/components/reader/WurzelAppBar.tsx` - Responsive header with hamburger drawer (mobile) and horizontal nav (desktop); Bezirk in drawer

## Decisions Made
- `pb-28` on footer provides 112px clearance above bottom nav bar (h-16 = 64px, with breathing room)
- Bezirk selector removed from header bar top-right position; moved into hamburger drawer — `openBezirkModal` CustomEvent dispatch preserved, so existing BezirkModal still works
- `Image` (avatar) import removed — new brand identity is text-only serif italic
- Kontakt link points to `/impressum` (same page) since no separate contact page exists
- Disabled future routes (Wald, Ratgeber) shown with `opacity-40` on desktop; non-interactive `<span>` with "(bald verfügbar)" in mobile drawer

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Footer and WurzelAppBar shell complete, wired into `src/app/(public)/layout.tsx`
- Phase 34 remaining plans can build on established hamburger/desktop nav pattern
- Bezirk selector now exclusively in drawer — Phase 35 Bezirk features should note this UX change

## Self-Check: PASSED

- Footer.tsx: FOUND
- WurzelAppBar.tsx: FOUND
- SUMMARY.md: FOUND
- Commit 6d83d6e: FOUND
- Commit ec6631d: FOUND

---
*Phase: 34-shell-components*
*Completed: 2026-04-01*
