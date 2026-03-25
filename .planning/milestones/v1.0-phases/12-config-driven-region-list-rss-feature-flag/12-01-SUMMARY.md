---
phase: 12-config-driven-region-list-rss-feature-flag
plan: 01
subsystem: config
tags: [typescript, bundesland-config, bezirk, regions, interface]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: BundeslandConfig type established with satisfies operator pattern
provides:
  - BezirkItem interface exported from src/types/bundesland.ts
  - BundeslandConfig.regions field (typed BezirkItem[])
  - bundesland.config.ts regions array with all 13 Steiermark Bezirke
affects:
  - 12-02 (seed plan that reads config.regions to upsert Bezirke)
  - 12-03 (UI plan that reads config.regions for BezirkModal/Header)
  - 12-04 (RSS plan that reads config.regions for feed generation)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - BezirkItem as typed config value object (slug + name co-located in config)
    - satisfies BundeslandConfig enforces new required field at compile time

key-files:
  created: []
  modified:
    - src/types/bundesland.ts
    - bundesland.config.ts

key-decisions:
  - "BezirkItem placed before BundeslandConfig in bundesland.ts — forward-reference not needed since TypeScript resolves types across the file"
  - "regions field added as last field in BundeslandConfig — consistent with appending convention used throughout config type evolution"

patterns-established:
  - "BezirkItem: { slug: string; name: string } — canonical shape for Bezirk reference objects in config layer"

requirements-completed: [CONF-01]

# Metrics
duration: 5min
completed: 2026-03-25
---

# Phase 12 Plan 01: Config Regions Foundation Summary

**BezirkItem interface + BundeslandConfig.regions field added; bundesland.config.ts populated with all 13 Steiermark Bezirke using canonical slugs and display names**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-25T11:30:00Z
- **Completed:** 2026-03-25T11:35:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Exported `BezirkItem { slug: string; name: string }` interface from `src/types/bundesland.ts`
- Added `regions: BezirkItem[]` as required field to `BundeslandConfig` interface
- Populated `bundesland.config.ts` with all 13 Steiermark Bezirke using slugs from `prisma/seed-data/bezirke.ts` and display names from `BezirkModal.tsx`
- `npx tsc --noEmit` exits 0 — `satisfies BundeslandConfig` constraint fully satisfied

## Task Commits

Each task was committed atomically:

1. **Task 1: Add BezirkItem interface and regions field to BundeslandConfig** - `30025f2` (feat)
2. **Task 2: Add regions array to bundesland.config.ts** - `798dfb3` (feat)

## Files Created/Modified
- `src/types/bundesland.ts` - Added `BezirkItem` interface and `regions: BezirkItem[]` to `BundeslandConfig`
- `bundesland.config.ts` - Added `regions` array with 13 Bezirk entries after `features` block

## Decisions Made
- BezirkItem placed immediately before `BundeslandConfig` in the file to keep the type and its usage co-located
- Display names sourced from `BezirkModal.tsx` BEZIRKE array (e.g. "Graz (Stadt)" not "Graz") for consistency with existing UI

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Foundation complete: `config.regions` is the single source of truth for all 13 Bezirke
- Plan 12-02 (seed) can now iterate `config.regions` to upsert Bezirke instead of using hardcoded data
- Plan 12-03 (UI) can now read `config.regions` to replace hardcoded BEZIRKE arrays in BezirkModal and Header
- Plan 12-04 (RSS) can now use `config.regions` to generate per-Bezirk RSS feeds

---
*Phase: 12-config-driven-region-list-rss-feature-flag*
*Completed: 2026-03-25*
