---
phase: 12-config-driven-region-list-rss-feature-flag
plan: "02"
subsystem: database
tags: [prisma, seed, config, bezirke, tdd]

# Dependency graph
requires:
  - phase: 12-01
    provides: config.regions array with all 13 Steiermark Bezirke in bundesland.config.ts
provides:
  - seedBezirke reads from config.regions (no hardcoded data in seed.ts)
  - Wrong bundesland param produces 0 rows via config.bundesland mismatch guard
  - seed.test.ts assertions against config.regions.length (config-driven test contract)
affects: [prisma/seed.ts, bundesland.config.ts, any future Bundesland deployment]

# Tech tracking
tech-stack:
  added: []
  patterns: [config-driven seed — iterate config.regions, guard by config.bundesland comparison]

key-files:
  created: []
  modified:
    - prisma/seed.ts
    - prisma/seed.test.ts

key-decisions:
  - "seedBezirke guards by bundesland !== config.bundesland early return — preserves existing test contract where 'tirol' produces 0 rows"
  - "update path only touches name (not gemeindeSynonyms) — existing synonym data in production DB is preserved when re-seeding"
  - "create path uses gemeindeSynonyms: [] — required because the field is non-nullable String[] with no DB default"
  - "gemeindeSynonyms >= 1 test assertion removed — config.regions has no synonym data; synonyms are populated separately by AI pipeline"

patterns-established:
  - "Config-driven seed: iterate config.regions, compare bundesland param to config.bundesland for early return"

requirements-completed: [CONF-01]

# Metrics
duration: 5min
completed: 2026-03-25
---

# Phase 12 Plan 02: Config-Driven Seed Summary

**seedBezirke now iterates config.regions and guards via config.bundesland, removing all hardcoded steiermarkBezirke references from seed.ts**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-25T12:42:43Z
- **Completed:** 2026-03-25T12:47:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Removed `steiermarkBezirke` and `BezirkSeedEntry` imports from `prisma/seed.ts` — file now has zero hardcoded region data
- `seedBezirke` iterates `config.regions` and uses `config.bundesland` for the mismatch guard
- `update` path preserves existing `gemeindeSynonyms` in production; `create` path initialises as `[]`
- `seed.test.ts` assertions now use `config.regions.length` — changing the config auto-validates the test

## Task Commits

Each task was committed atomically:

1. **Task 1: Update seed.test.ts to reflect config-driven mechanic** - `3253c9c` (test)
2. **Task 2: Refactor seedBezirke to read from config.regions** - `7f68fb8` (feat)

**Plan metadata:** (docs commit follows)

_Note: TDD tasks — test commit first, then implementation commit._

## Files Created/Modified
- `prisma/seed.ts` - Removed hardcoded imports, replaced `seedBezirke` body with config-driven implementation
- `prisma/seed.test.ts` - Added config import, updated count assertion to `config.regions.length`, removed `gemeindeSynonyms >= 1` assertion

## Decisions Made
- `bundesland !== config.bundesland` early return (not `bundesland === 'steiermark'`) — ties the guard to config, not a hardcoded string
- `update` only sets `name` — existing `gemeindeSynonyms` data in production is preserved on re-seed
- `gemeindeSynonyms: []` in `create` — non-nullable `String[]` field with no DB default requires explicit value

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CONF-01 is now closed at the seed layer — deploying for a new Bundesland only requires editing `bundesland.config.ts` and re-running the seed
- Phase 12-03 can proceed (RSS and feature flag work)

---
*Phase: 12-config-driven-region-list-rss-feature-flag*
*Completed: 2026-03-25*
