---
phase: 05-editorial-cms
plan: 05
subsystem: ai-pipeline
tags: [prisma, vitest, anthropic, pipeline, ingestion, dead-man]

requires:
  - phase: 05-01
    provides: AiConfig, PipelineConfig, AiSourceConfig DB tables + migrations
  - phase: 05-04
    provides: getAiConfig, getPipelineConfig, getResolvedAiConfig DAL functions
  - phase: 03-ai-pipeline
    provides: pipeline.ts, step2-write.ts, dead-man.ts, ingest.ts implementations

provides:
  - pipeline.ts reads PipelineConfig.maxRetryCount from DB (not hardcoded constant)
  - dead-man.ts reads PipelineConfig.deadManThresholdHours from DB (not env var)
  - step2-write.ts builds system prompt from AiConfig DB row via buildSystemPrompt()
  - ingest.ts uses source.healthFailureThreshold directly (field on Source model)

affects:
  - 06-frontend
  - 07-advanced-features

tech-stack:
  added: []
  patterns:
    - "Optional db param as 4th arg to runStep2Write() — extends existing DI pattern without breaking call sites"
    - "buildSystemPrompt(config, bezirkContext) pure function — testable independently of DB/Anthropic"
    - "Dead-man threshold via getPipelineConfig(db) find-or-create — no env var fallback needed"

key-files:
  created: []
  modified:
    - src/lib/ai/pipeline.ts
    - src/lib/ai/steps/step2-write.ts
    - src/lib/ai/steps/step2-write.test.ts
    - src/lib/publish/dead-man.ts
    - src/lib/publish/dead-man.test.ts

key-decisions:
  - "step2-write.ts uses getAiConfig(db) global config only (not getResolvedAiConfig with sourceId) — per-source prompt overrides deferred to Phase 7 with TODO comment"
  - "runStep2Write() db param is optional 4th arg — existing pipeline.ts call site updated to pass db; test updated to inject mock db"
  - "dead-man.test.ts replaces env var threshold test with PipelineConfig DB row test — env var no longer controls threshold"
  - "step2-write test injects makeMockDb() duck-typed PrismaClient — avoids need for full pgLite test DB in unit tests"

patterns-established:
  - "buildSystemPrompt(ResolvedAiConfig, bezirkContext): string pure function — maps tone/articleLength enums to German instruction strings"
  - "Optional db parameter at end of function signature preserves backward compat while enabling DI"

requirements-completed:
  - AICONF-03
  - CMS-04

duration: 12min
completed: 2026-03-22
---

# Phase 5 Plan 05: DB-Driven Config Integration Summary

**Hardcoded pipeline constants replaced with DB-read AiConfig/PipelineConfig: dead-man threshold, retry count, and AI prompt all now configurable via CMS without code deploys**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-22T12:02:10Z
- **Completed:** 2026-03-22T13:06:30Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- `dead-man.ts` now reads `deadManThresholdHours` from `PipelineConfig` DB row via `getPipelineConfig(db)` — threshold configurable via admin UI without restarting the server
- `step2-write.ts` replaced `SYSTEM_PROMPT_TEMPLATE` constant with `buildSystemPrompt(config, bezirkContext)` that maps `AiConfig.tone` and `AiConfig.articleLength` to German instruction strings
- `pipeline.ts` passes `db` to `runStep2Write()` so AI config reads use the same injected DB client as the rest of the pipeline
- All 139 tests GREEN; tsc --noEmit clean

## Task Commits

1. **Task 1: Replace MAX_RETRY_COUNT and HEALTH_FAILURE_THRESHOLD with DB config** — Already committed in prior plans (ec007fc for pipeline.ts, ingest.ts already used `source.healthFailureThreshold` from Phase 2). No new commit needed; verified passing (24 tests GREEN).

2. **Task 2: Replace dead-man env var and step2 system prompt with DB config** — `36ae9a6` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

- `src/lib/publish/dead-man.ts` — Reads `deadManThresholdHours` from `PipelineConfig` via `getPipelineConfig(db)` instead of `process.env.DEAD_MAN_THRESHOLD_HOURS`
- `src/lib/ai/steps/step2-write.ts` — Adds `buildSystemPrompt(ResolvedAiConfig, bezirkContext)`, imports `getAiConfig`, optional `db` 4th param to `runStep2Write()`
- `src/lib/ai/pipeline.ts` — Passes `db` to `runStep2Write()` call
- `src/lib/ai/steps/step2-write.test.ts` — Adds `makeMockDb()` helper; all test calls pass mock db as 4th arg
- `src/lib/publish/dead-man.test.ts` — Replaces env var threshold tests with `PipelineConfig` DB row tests

## Decisions Made

- Used `getAiConfig(db)` (global only) in step2-write, not `getResolvedAiConfig(db, sourceId)` — sourceId unavailable in step2 context; per-source overrides deferred to Phase 7 with a TODO comment
- `runStep2Write()` receives `db` as optional 4th parameter rather than first — preserves `(client, text, bezirkNames)` positional signature; pipeline.ts passes `db` explicitly
- Dead-man test updated to use `db.pipelineConfig.create()` for custom threshold testing instead of `process.env.DEAD_MAN_THRESHOLD_HOURS`
- `makeMockDb()` in step2-write test is a duck-typed mock (just `$connect` + `aiConfig.findFirst`) — avoids full pgLite DB setup cost for unit tests that only need Anthropic behavior

## Deviations from Plan

None - plan executed exactly as written, with the expected finding that Task 1 changes (pipeline.ts + ingest.ts) were already present in the codebase from commits ec007fc and prior Phase 2 work.

## Issues Encountered

None — Task 1 was pre-completed in earlier plans (the pipeline.ts DB integration was done in 05-02 fix commit ec007fc; ingest.ts used `source.healthFailureThreshold` since Phase 2). Task 2 proceeded cleanly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All four integration points now read from DB: `getPipelineConfig` (pipeline.ts, dead-man.ts), `source.healthFailureThreshold` (ingest.ts), `getAiConfig` (step2-write.ts)
- CMS admin UI (Phase 5-02 onwards) can update these values; changes take effect on next pipeline run
- Phase 6 (frontend) can proceed; no pipeline blockers

## Self-Check: PASSED

- `src/lib/publish/dead-man.ts` — FOUND
- `src/lib/ai/steps/step2-write.ts` — FOUND
- `.planning/phases/05-editorial-cms/05-05-SUMMARY.md` — FOUND
- Commit `36ae9a6` — FOUND

---
*Phase: 05-editorial-cms*
*Completed: 2026-03-22*
