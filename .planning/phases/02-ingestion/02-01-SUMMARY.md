---
phase: 02-ingestion
plan: 01
subsystem: database
tags: [prisma, pglite, vitest, migrations, ingestion, rss, atom]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Prisma schema (Article, Bezirk, ArticleBezirk), pgLite test setup-db.ts, migration infrastructure
provides:
  - Source model with polling config and health tracking (SourceHealth enum)
  - IngestionRun model for audit log per ingestion attempt
  - contentHash column on Article for cross-source deduplication
  - Migration SQL 20260321_ingestion loaded automatically by pgLite test setup
  - 7 Wave 0 test stub files covering ING-01 through ING-05, Source DAL, and seed idempotency
  - RSS 2.0 and Atom 1.0 XML fixtures for adapter tests
affects: [02-02, 02-03, 02-04, 02-05, 02-06, 03-tagging]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Migration SQL manually crafted (no live DB) and placed in sorted directory for pgLite auto-load"
    - "Wave 0 test stubs use it.todo() — RED phase without import errors"
    - "XML fixtures kept minimal (under 40 lines) with Austrian domain content"

key-files:
  created:
    - prisma/migrations/20260321_ingestion/migration.sql
    - src/lib/ingestion/adapters/ots-at.test.ts
    - src/lib/ingestion/adapters/rss.test.ts
    - src/lib/ingestion/adapters/registry.test.ts
    - src/lib/ingestion/dedup.test.ts
    - src/lib/ingestion/ingest.test.ts
    - src/lib/content/sources.test.ts
    - test/fixtures/rss-sample.xml
    - test/fixtures/atom-sample.xml
  modified:
    - prisma/schema.prisma
    - prisma/seed.test.ts

key-decisions:
  - "Migration SQL created manually (migrate diff --from-empty used for reference) because no live Postgres available — pgLite picks it up via sorted directory scan"
  - "seed.test.ts already had real passing tests — seedSources stubs appended rather than replacing"
  - "contentHash is nullable (@unique) — allows rows without a hash (e.g., MANUAL source items)"

patterns-established:
  - "Wave 0 test stubs: import commented out, all cases as it.todo() — no TypeScript errors before implementation"
  - "Migration naming: YYYYMMDD_descriptor for correct sort order after 20260321000000_init"

requirements-completed: [ING-01, ING-02, ING-03, ING-04, ING-05]

# Metrics
duration: 3min
completed: 2026-03-21
---

# Phase 2 Plan 01: Ingestion Schema and Test Stubs Summary

**Prisma schema extended with Source, IngestionRun, and contentHash; migration SQL committed; 34 Wave 0 todo stubs across 7 files ready for implementation plans to turn GREEN**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-21T18:51:53Z
- **Completed:** 2026-03-21T18:54:30Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Extended schema.prisma with SourceHealth enum, Source model, IngestionRun model, and contentHash on Article
- Created migration SQL 20260321_ingestion auto-loaded by pgLite test infrastructure
- Created 7 Wave 0 test stub files (34 todo tests) covering all ING-01 through ING-05 requirements plus Source DAL and seed idempotency
- Created RSS 2.0 and Atom 1.0 XML fixtures with Austrian domain content

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Prisma schema and generate migration** - `8997055` (feat)
2. **Task 2: Create Wave 0 test stubs and XML fixtures** - `21bfb8c` (test)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `prisma/schema.prisma` - Added SourceHealth enum, Source model, IngestionRun model, contentHash on Article
- `prisma/migrations/20260321_ingestion/migration.sql` - ALTER TABLE + CREATE TABLE + CREATE INDEX for new models
- `src/lib/ingestion/adapters/ots-at.test.ts` - 4 todo stubs for OTS.at adapter (ING-01)
- `src/lib/ingestion/adapters/rss.test.ts` - 5 todo stubs for RSS/Atom parser (ING-02)
- `src/lib/ingestion/adapters/registry.test.ts` - 3 todo stubs for adapter registry (ING-05)
- `src/lib/ingestion/dedup.test.ts` - 5 todo stubs for deduplication logic (ING-03)
- `src/lib/ingestion/ingest.test.ts` - 8 todo stubs for ingest orchestration (ING-04 + ING-05)
- `src/lib/content/sources.test.ts` - 5 todo stubs for Source DAL
- `prisma/seed.test.ts` - Appended 4 todo stubs for seedSources idempotency
- `test/fixtures/rss-sample.xml` - Valid RSS 2.0, 2 items (one with guid, one without)
- `test/fixtures/atom-sample.xml` - Valid Atom 1.0, 2 entries

## Decisions Made
- Migration SQL was crafted manually using `prisma migrate diff --from-empty` as reference, since no live Postgres database is available in this environment. pgLite in tests picks it up automatically via the sorted directory scan in setup-db.ts.
- `prisma/seed.test.ts` already contained 3 passing real tests for seedBezirke — the seedSources stubs were appended to preserve those tests.
- `contentHash` is `String? @unique` (nullable) allowing Article rows without a hash (e.g., MANUAL source items that don't need dedup).

## Deviations from Plan

None - plan executed exactly as written. The only adaptation was appending to the existing seed.test.ts rather than replacing it (the existing file had live tests that must not be removed).

## Issues Encountered
- `prisma migrate dev` requires a live database connection; used `prisma validate` to verify schema validity and manually crafted the migration SQL based on the schema diff. This is correct for this project's pgLite-based test setup.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Schema is in place: Source, IngestionRun, contentHash all available in pgLite test DBs
- All 34 Wave 0 todo stubs are waiting for implementation plans (02-02 through 02-06) to turn them GREEN
- setup-db.ts requires no changes — the new migration SQL is picked up automatically

---
*Phase: 02-ingestion*
*Completed: 2026-03-21*

## Self-Check: PASSED

All 11 required files exist. Both task commits (8997055, 21bfb8c) verified in git history.
