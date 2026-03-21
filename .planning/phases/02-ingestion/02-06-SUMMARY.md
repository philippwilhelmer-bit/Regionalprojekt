---
phase: 02-ingestion
plan: 06
subsystem: ingestion
tags: [prisma, seed, pglite, vitest, cli, typescript]

# Dependency graph
requires:
  - phase: 02-ingestion
    plan: 05
    provides: listSources(filter), ingest(source) — used by ingest-run.ts

provides:
  - steiermarkSources array: OTS_AT + RSS entries with pollIntervalMinutes
  - seedSources(prisma, bundesland): idempotent upsert of Source rows by url
  - prisma/seed.ts updated: main() calls seedSources() after seedBezirke()
  - scripts/ingest-run.ts: CLI entry point fetching enabled sources and calling ingest()
  - 4 seedSources tests GREEN (insert, idempotency, bundesland scoping, coexistence with Bezirk rows)

affects: [04-scheduler, 05-cms]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "seedSources follows exact same pattern as seedBezirke — upsert by unique key (url), bundleand-switch selects data array, exported for testability"
    - "ingest-run.ts: per-source try/catch, aggregate totalFound/totalNew, collect errors array, exit(1) only if any errors occurred"

key-files:
  created:
    - prisma/seed-data/sources.ts
    - scripts/ingest-run.ts
  modified:
    - prisma/seed.ts
    - prisma/seed.test.ts

key-decisions:
  - "seedSources upserts by url (Source.url is @unique in schema) — consistent with how seedBezirke upserts by slug"
  - "ingest-run.ts uses per-source error handling: failures are logged and aggregated, remaining sources continue, exit(1) only if any errors — matches Phase 4 scheduler contract"
  - "Pre-existing TypeScript errors in ingest.test.ts and rss.ts are out of scope — not caused by this plan's changes, noted as pre-existing from Plan 05"

patterns-established:
  - "Seed functions: export seedX(prisma, bundesland), bundesland-switch selects seed data array, upsert by unique key, main() calls after all prior seeds"

requirements-completed: [ING-01, ING-02]

# Metrics
duration: 3min
completed: 2026-03-21
---

# Phase 2 Plan 06: Source seed + ingest-run CLI Summary

**Steiermark Source rows seeded idempotently via seedSources() + scripts/ingest-run.ts CLI trigger ready for Phase 4 scheduler — 49 tests GREEN**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-21T22:30:46Z
- **Completed:** 2026-03-21T22:33:17Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- `steiermarkSources` array defines OTS_AT (15min poll) and RSS placeholder (30min poll) with all required fields
- `seedSources(prisma, bundesland)` follows exact pattern of `seedBezirke` — upsert by url, bundesland-scoped, exported for testability
- `main()` in `seed.ts` calls `seedSources()` after `seedBezirke()` — additive, zero changes to existing logic
- 4 seedSources tests: insert count, idempotency (double-run), bundesland scoping (unknown = 0 rows), Bezirk coexistence
- `scripts/ingest-run.ts`: fetches enabled sources, calls `ingest()` per source, accumulates totals, exits 1 only if any errors — Phase 4 scheduler can call directly
- All 49 tests passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Source seed data, updated seed script, and seed tests** - `e4a7655` (feat)
2. **Task 2: ingest-run.ts CLI entry point** - `80b74e3` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `prisma/seed-data/sources.ts` - steiermarkSources array: OTS_AT + RSS placeholder with pollIntervalMinutes
- `prisma/seed.ts` - Added seedSources() export + main() call after seedBezirke()
- `prisma/seed.test.ts` - Implemented 4 seedSources tests (previously todos), all 7 tests GREEN
- `scripts/ingest-run.ts` - CLI: listSources({ enabled: true }) → ingest() per source, aggregate logging, exit(1) on errors

## Decisions Made
- `seedSources` upserts by `url` — `Source.url` is `@unique` in schema, so this is the natural idempotency key matching the schema's constraint
- `ingest-run.ts` per-source error handling with `errors[]` array: individual source failures don't abort the run, but exit code reflects any failures for Phase 4 scheduler to detect
- Pre-existing TypeScript errors in `ingest.test.ts` and `rss.ts` confirmed out of scope — present before this plan, `ingest-run.ts` itself compiles cleanly

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript errors in `src/lib/ingestion/ingest.test.ts` and `src/lib/ingestion/adapters/rss.ts` appeared in `npx tsc --noEmit` output — confirmed pre-existing from Plan 05 (noted in 02-05-SUMMARY.md). `scripts/ingest-run.ts` itself has zero TypeScript errors.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 2 ingestion layer complete: schema, adapters, dedup, ingest(), health tracking, Source DAL, seed, and CLI entry point all in place
- Phase 4 scheduler only needs to add a timer that calls `tsx scripts/ingest-run.ts`
- ING-01 (OTS.at ingestion) and ING-02 (RSS ingestion) requirements addressed
- All ING-01 through ING-05 requirements across Plans 01-06 complete

---
*Phase: 02-ingestion*
*Completed: 2026-03-21*

## Self-Check: PASSED

All required files exist. Both task commits (e4a7655, 80b74e3) verified in git history.
