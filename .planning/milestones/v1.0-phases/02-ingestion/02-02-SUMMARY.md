---
phase: 02-ingestion
plan: 02
subsystem: ingestion
tags: [prisma, pglite, vitest, tdd, crypto, sha256, dedup, types]

# Dependency graph
requires:
  - phase: 02-ingestion
    plan: 01
    provides: Source, IngestionRun, contentHash schema + migration; Wave 0 test stubs

provides:
  - RawItem interface and AdapterFn type in src/lib/ingestion/types.ts (adapter contract for Plans 03 and 04)
  - computeContentHash(title, body) — SHA-256 of normalized title||body for dedup fingerprinting
  - isDuplicate(db, source, externalId, contentHash) — fast path (source+externalId) and slow path (contentHash) with TypeScript overload DI
  - 6 passing GREEN dedup tests covering ING-03

affects: [02-03, 02-04, 02-05, 02-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "node:crypto createHash('sha256') for content fingerprinting — no external dependency"
    - "computeContentHash normalizes: lowercase + collapse whitespace to single space + trim, then joins with '||'"
    - "isDuplicate TypeScript overloads with '$connect' duck-type check for DI (same pattern as articles.ts)"

key-files:
  created:
    - src/lib/ingestion/types.ts
    - src/lib/ingestion/dedup.ts
  modified:
    - src/lib/ingestion/dedup.test.ts
    - src/test/setup-db.ts

key-decisions:
  - "AdapterFn uses ArticleSource (not a separate Source model type) — matches enum already in @prisma/client"
  - "cleanDb updated to include IngestionRun and Source tables — required for correct test isolation"
  - "Prisma client regenerated after Phase 2 schema changes — Source and IngestionRun models were missing from generated client"

patterns-established:
  - "TDD RED→GREEN: stub file replaced with real tests importing from unwritten module; confirm FAIL; implement; confirm PASS"

requirements-completed: [ING-03, ING-05]

# Metrics
duration: 7min
completed: 2026-03-21
---

# Phase 2 Plan 02: Adapter contract types and dedup service Summary

**SHA-256 content deduplication service with RawItem/AdapterFn adapter contract types — 6 tests GREEN, TDD RED to GREEN in one pass**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-21T20:57:30Z
- **Completed:** 2026-03-21T21:04:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created `src/lib/ingestion/types.ts` defining the RawItem interface and AdapterFn type used by both OTS and RSS adapter plans (02-03, 02-04)
- Implemented `computeContentHash` using node:crypto (built-in) with case/whitespace normalization before SHA-256
- Implemented `isDuplicate` with TypeScript overloads for DI: fast path (source+externalId composite index), slow path (contentHash)
- All 6 dedup tests GREEN; full suite 19 passing with no Phase 1 regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Types contract + dedup RED tests** - `e01091b` (test)
2. **Task 2: Dedup implementation GREEN** - `b6f99de` (feat)

**Plan metadata:** (docs commit follows)

_Note: TDD tasks — RED commit first, then GREEN implementation commit_

## Files Created/Modified
- `src/lib/ingestion/types.ts` - RawItem interface and AdapterFn type (adapter contract)
- `src/lib/ingestion/dedup.ts` - computeContentHash and isDuplicate with DI overloads
- `src/lib/ingestion/dedup.test.ts` - 6 real tests replacing Wave 0 todo stubs
- `src/test/setup-db.ts` - cleanDb extended with ingestionRun and source table cleanup

## Decisions Made
- `AdapterFn` uses `ArticleSource` enum (from `@prisma/client`) as the source type, matching the existing schema enum values (OTS_AT, RSS, MANUAL)
- `cleanDb` in setup-db.ts extended to truncate IngestionRun and Source tables added in Phase 2 — without this, test isolation fails for any tests inserting Source/IngestionRun rows
- Ran `prisma generate` during execution — the Phase 2 schema changes (Source, IngestionRun models) had not been materialized into the generated client, causing `prisma.ingestionRun` to be undefined at test runtime

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed 'body' field reference to 'content' in test data**
- **Found during:** Task 2 (Dedup implementation GREEN)
- **Issue:** Test file used `body` as Article field name; Article schema uses `content`; TypeScript and Prisma both rejected the field
- **Fix:** Changed `body:` to `content:` in the two prisma.article.create() calls in dedup.test.ts
- **Files modified:** src/lib/ingestion/dedup.test.ts
- **Verification:** TypeScript noEmit passes; tests run to completion
- **Committed in:** b6f99de (Task 2 commit)

**2. [Rule 2 - Missing Critical] Updated cleanDb to include Phase 2 tables**
- **Found during:** Task 2 (Dedup implementation GREEN)
- **Issue:** setup-db.ts cleanDb only deleted Phase 1 tables (articleBezirk, article, bezirk); IngestionRun and Source tables from Phase 2 schema were not being cleaned between tests, violating test isolation
- **Fix:** Added `prisma.ingestionRun.deleteMany()` and `prisma.source.deleteMany()` to cleanDb in correct dependency order
- **Files modified:** src/test/setup-db.ts
- **Verification:** All tests pass; no duplicate key errors on re-runs
- **Committed in:** b6f99de (Task 2 commit)

**3. [Rule 3 - Blocking] Ran prisma generate to materialize Phase 2 schema models**
- **Found during:** Task 2 (Dedup implementation GREEN)
- **Issue:** `prisma.ingestionRun` was undefined at runtime because the Phase 2 schema was never regenerated into the @prisma/client — the generated client still only knew about Phase 1 models
- **Fix:** Ran `npx prisma generate` to update generated PrismaClient with Source and IngestionRun models
- **Files modified:** node_modules/@prisma/client (generated, not committed)
- **Verification:** `prisma.ingestionRun.deleteMany()` no longer throws; 6 tests pass
- **Committed in:** b6f99de (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 bug, 1 missing critical, 1 blocking)
**Impact on plan:** All three auto-fixes were necessary for correctness and test isolation. No scope creep.

## Issues Encountered
- `npx` not on PATH in this shell environment — resolved by using `PATH="/Users/philipp/.nvm/versions/node/v25.8.0/bin:$PATH" npx ...` for all commands.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `RawItem` and `AdapterFn` are exported and ready for Plans 02-03 (OTS adapter) and 02-04 (RSS adapter) to implement
- `isDuplicate` is implemented and tested — Plans 02-03 and 02-04 can call it directly in their ingestion logic
- Wave 0 dedup.test.ts stubs fully replaced; 6 tests GREEN

---
*Phase: 02-ingestion*
*Completed: 2026-03-21*

## Self-Check: PASSED

All 4 required files exist. Both task commits (e01091b, b6f99de) verified in git history.
