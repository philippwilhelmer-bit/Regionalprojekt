---
phase: 04-scheduler-and-autonomous-publishing
plan: "03"
subsystem: ai-pipeline
tags: [prisma, vitest, tdd, error-handling, retry-logic]

# Dependency graph
requires:
  - phase: 04-01
    provides: ERROR and FAILED ArticleStatus enum values, retryCount and errorMessage Article fields
provides:
  - "processArticles() queries FETCHED + ERROR articles each run (ERROR = retryable)"
  - "Per-article catch block writes retryCount+1, ERROR or FAILED status, errorMessage to Article row"
  - "Articles with retryCount >= MAX_RETRY_COUNT (3) are permanently marked FAILED and excluded"
  - "6 new tests covering retry path, FAILED exclusion, errorMessage, and batch isolation"
affects:
  - 04-scheduler
  - phase 7 (monitoring — can observe FAILED articles as stuck pipeline signal)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "MAX_RETRY_COUNT = 3 module-level constant in pipeline.ts"
    - "Catch block writes to DB (ERROR/FAILED) before logging — DB is source of truth"
    - "upsert pattern in test helpers to safely call from multiple tests without duplicate key errors"

key-files:
  created: []
  modified:
    - src/lib/ai/pipeline.ts
    - src/lib/ai/pipeline.test.ts

key-decisions:
  - "MAX_RETRY_COUNT = 3 as module-level constant — matches user-specified default; Phase 5 CMS will make it configurable"
  - "newRetryCount >= MAX_RETRY_COUNT (not >) for FAILED boundary — strictly >=3 means 3rd failure => FAILED, no fourth chance"
  - "catch block writes status/retryCount/errorMessage via db.article.update before console.error — DB state correct even if logging fails"

patterns-established:
  - "upsert in seedArticleWithStatus test helper — safe for calling multiple times per test without unique constraint errors"
  - "makeFailingAnthropicClient() helper pattern — reusable factory for tests needing AI failure injection"

requirements-completed:
  - PUB-01

# Metrics
duration: 4min
completed: 2026-03-22
---

# Phase 04 Plan 03: Pipeline ERROR Retry and FAILED Permanent Exclusion Summary

**pipeline.ts now retries ERROR-status articles each cycle and permanently marks articles FAILED after 3 consecutive AI failures, with retryCount and errorMessage tracked per article**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-22T06:54:36Z
- **Completed:** 2026-03-22T06:57:42Z
- **Tasks:** 2 (RED + GREEN TDD phases)
- **Files modified:** 2

## Accomplishments

- Extended `processArticles()` article query from `status: 'FETCHED'` to `status: { in: ['FETCHED', 'ERROR'] }` — ERROR articles get retried each scheduler cycle
- Replaced bare catch block with full retry logic: `retryCount++`, `nextStatus = ERROR or FAILED`, `db.article.update` with `status`, `retryCount`, `errorMessage`
- Added `MAX_RETRY_COUNT = 3` module-level constant; articles at or past the threshold are permanently marked `FAILED` and excluded from all future runs
- Added 6 new passing tests covering all retry/exclusion behaviors; all 103 suite tests pass

## Task Commits

Each task was committed atomically:

1. **RED: Add failing tests for ERROR retry and FAILED exclusion** - `6789e17` (test)
2. **GREEN: Implement ERROR retry and FAILED permanent exclusion** - `108272f` (feat)

**Plan metadata:** (docs commit follows)

_TDD plan: test commit (RED) followed by implementation commit (GREEN)_

## Files Created/Modified

- `src/lib/ai/pipeline.ts` - Extended query to include ERROR; new catch block with retry/FAILED logic
- `src/lib/ai/pipeline.test.ts` - Added `seedArticleWithStatus()`, `makeFailingAnthropicClient()` helpers and 6 new tests

## Decisions Made

- `MAX_RETRY_COUNT = 3` as a module-level constant — matches user expectation; will be made configurable via CMS in Phase 5
- Used `>= MAX_RETRY_COUNT` (not `>`) for the FAILED boundary — the 3rd failure sets FAILED, there is no 4th attempt
- `db.article.update` call placed before `console.error` — DB is the source of truth; logging failures do not corrupt article state

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. TDD cycle proceeded cleanly: 5 tests RED (1 was already passing due to FAILED not being in the existing query), all 16 GREEN after implementation. Full suite (103 tests) passes. `tsc --noEmit` exits 0.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- ERROR retry loop is now functional end-to-end: scheduler can run `processArticles()` on a cron and stuck articles will be retried up to 3 times then permanently excluded
- `FAILED` status is a clean signal for Phase 7 monitoring/alerting (articles that exhausted retries without recovery)
- Ready for Phase 04-04 (scheduler wiring / cron setup)

---
*Phase: 04-scheduler-and-autonomous-publishing*
*Completed: 2026-03-22*
