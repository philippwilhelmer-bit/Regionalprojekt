---
phase: 28-homepage-components
plan: "02"
subsystem: ui
tags: [react, nextjs, tailwind, mascot, homepage, editorial, wurzelwelt]

# Dependency graph
requires:
  - phase: 28-homepage-components-01
    provides: MascotGreeting, RegionalEditorialCard, restyled HeroArticle components
provides:
  - HomepageLayout wired with Wurzelwelt components — MascotGreeting, tonal sections, RegionalEditorialCard, no inline RegionalSelector
affects: [future homepage plans, CMS reader view plans]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Tonal section alternation: wrap major homepage sections in alternating bg-background / bg-surface divs with py-[var(--spacing-section)]
    - Featured + compact layout: one RegionalEditorialCard as featured + up to 3 ListItem rows per Bezirk section

key-files:
  created: []
  modified:
    - src/components/reader/HomepageLayout.tsx
    - src/components/reader/MascotGreeting.tsx

key-decisions:
  - "Wurzelmann avatar final size set to 360px after iterative user feedback (56 → 80 → 104 → 140 → 180 → 360px)"
  - "MascotGreeting motto updated from 'roots & likes' to 'tief verwurzelt' for authentic German brand voice"
  - "RegionalSelector removed from homepage body — WurzelAppBar bezirk button is sole access point"
  - "Styrian flag accent div removed from bezirk section headers — Wurzelwelt brand replaces regional flag accent"

patterns-established:
  - "Tonal section alternation: bg-background / bg-surface divs with py-[var(--spacing-section)] spacing, no border lines"
  - "Bezirk section layout: one RegionalEditorialCard featured + max 3 ListItem rows in bg-surface-elevated rounded-sm shadow-sm container"

requirements-completed: [COMP-05, COMP-07]

# Metrics
duration: 20min
completed: 2026-03-29
---

# Phase 28 Plan 02: Homepage Components Summary

**HomepageLayout rewired with MascotGreeting, tonal section alternation (bg-background/bg-surface), RegionalEditorialCard featured cards, and inline RegionalSelector removed**

## Performance

- **Duration:** ~20 min (plus iterative avatar sizing)
- **Started:** 2026-03-29T11:15:00Z
- **Completed:** 2026-03-29T19:31:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- HomepageLayout now renders MascotGreeting speech bubble with Wurzelmann directly after the hero
- Major homepage sections alternate between bg-background and bg-surface with no border lines (COMP-07)
- Mein Bezirk sections use RegionalEditorialCard for featured article + up to 3 ListItems (COMP-05)
- Flat view (no bezirk selected) mirrors same featured + compact layout pattern
- Inline RegionalSelector removed — WurzelAppBar bezirk button is the sole access point
- Styrian flag accent div removed from all bezirk section headers

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewire HomepageLayout with Wurzelwelt components and tonal sections** - `10f0e4e` (feat)
2. **Task 2: Visual verification of Wurzelwelt homepage** - user approved (no code commit)

**Post-task avatar adjustments:** `f96b91d`, `6cb1479`, `05e1507`, `cd2b33a`, `5de1a2d`, `37cbfc4` (fix — iterative avatar sizing and motto update)

## Files Created/Modified
- `src/components/reader/HomepageLayout.tsx` - Rewired with MascotGreeting, tonal sections, RegionalEditorialCard, no RegionalSelector
- `src/components/reader/MascotGreeting.tsx` - Wurzelmann avatar sized to 360px, motto updated to "tief verwurzelt"

## Decisions Made
- Wurzelmann avatar size iterated from 56px → 360px based on user feedback during visual review
- Motto changed from "roots & likes" to "tief verwurzelt" for authentic German brand voice
- RegionalSelector removed entirely from homepage (WurzelAppBar handles bezirk selection)
- Styrian flag accent removed — Wurzelwelt brand identity supersedes regional flag

## Deviations from Plan

### Post-checkpoint Adjustments

**1. [User-directed] Iterative Wurzelmann avatar sizing**
- **Found during:** Task 2 visual verification (post-checkpoint)
- **Issue:** Initial avatar size (56px) was too small for visual impact on the homepage
- **Fix:** Iteratively increased avatar size: 56 → 80 → 104 → 140 → 180 → 360px based on user feedback
- **Files modified:** src/components/reader/MascotGreeting.tsx
- **Commits:** f96b91d, 6cb1479, cd2b33a, 5de1a2d, 37cbfc4

**2. [User-directed] Wurzelmann motto update**
- **Found during:** Task 2 visual verification (post-checkpoint)
- **Issue:** "roots & likes" motto felt off-brand / too English for a German regional newspaper
- **Fix:** Updated motto text to "tief verwurzelt" (deeply rooted) — authentic German phrasing
- **Files modified:** src/components/reader/MascotGreeting.tsx
- **Commit:** 05e1507

---

**Total deviations:** 2 user-directed post-checkpoint adjustments
**Impact on plan:** Avatar sizing and motto are UX/brand refinements. No scope creep. All plan requirements met.

## Issues Encountered
None during planned implementation. TypeScript compiled clean after Task 1.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 28 complete — all homepage components delivered
- HomepageLayout delivers full Wurzelwelt editorial experience
- Ready for Phase 29 (next phase in roadmap)

---
*Phase: 28-homepage-components*
*Completed: 2026-03-29*
