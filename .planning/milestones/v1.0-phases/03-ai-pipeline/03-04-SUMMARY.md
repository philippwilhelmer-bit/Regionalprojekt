---
phase: 03-ai-pipeline
plan: "04"
subsystem: ai
tags: [prisma, vitest, pglite, circuit-breaker, cost-guard, token-tracking]

# Dependency graph
requires:
  - phase: 03-ai-pipeline
    provides: PipelineRun schema model and migration (from 03-01)

provides:
  - checkCostCircuitBreaker(db) — daily token budget guard returning boolean
  - AI_DEFAULT_DAILY_TOKEN_THRESHOLD constant (500000)

affects:
  - 03-05-ai-pipeline (pipeline.ts calls checkCostCircuitBreaker before LLM calls)
  - 04-scheduler (dead-man monitor reads PipelineRun cost data)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PrismaClient DI via function argument (duck-typing) — consistent with Phase 2 ingest.ts pattern"
    - "Prisma aggregate _sum for daily token count with startedAt >= midnight WHERE clause"
    - "Structured console.warn alert format: [ai-pipeline] CIRCUIT_BREAKER totalTokens=N threshold=N"

key-files:
  created:
    - src/lib/ai/circuit-breaker.ts
  modified:
    - src/lib/ai/circuit-breaker.test.ts

key-decisions:
  - "Threshold read from AI_DAILY_TOKEN_THRESHOLD env var with parseInt fallback to 500000 — consistent with OTS_API_KEY pattern"
  - "midnight local time (todayStart.setHours(0,0,0,0)) for daily window — matches intuitive daily budget expectation"
  - "threshold met (>=) halts generation — conservative: exactly-at-threshold is treated as exhausted"

patterns-established:
  - "Circuit-breaker: single aggregate query + compare + structured warn — no retry, no caching"

requirements-completed:
  - AI-04

# Metrics
duration: 8min
completed: 2026-03-22
---

# Phase 03 Plan 04: Cost Circuit-Breaker Summary

**Daily token budget guard using Prisma aggregate on PipelineRun, halting AI generation with structured console.warn when threshold exceeded**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-22T00:30:00Z
- **Completed:** 2026-03-22T00:38:00Z
- **Tasks:** 2 (RED + GREEN TDD)
- **Files modified:** 2

## Accomplishments

- Prisma PipelineRun migration regenerated Prisma client (PipelineRun was missing from generated types)
- 10 tests covering all behavior cases — below threshold, exactly at threshold, exceeds, yesterday excluded, env var override, default fallback, no warn when below threshold
- Implementation in 49 lines: aggregate query → compare → conditional warn → return boolean

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — failing tests for checkCostCircuitBreaker()** - `cb9f0cb` (test)
2. **Task 2: GREEN — implement checkCostCircuitBreaker()** - `4ac2dc4` (feat)

## Files Created/Modified

- `src/lib/ai/circuit-breaker.ts` - checkCostCircuitBreaker() + AI_DEFAULT_DAILY_TOKEN_THRESHOLD export
- `src/lib/ai/circuit-breaker.test.ts` - 10 Vitest tests using pgLite test DB

## Decisions Made

- Used `>=` for threshold comparison (threshold met = halt) — conservative budget enforcement
- `todayStart.setHours(0, 0, 0, 0)` for midnight local time — intuitive daily window
- No singleton pattern — accepts PrismaClient as argument, same DI pattern as ingest.ts

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Regenerated Prisma client to include PipelineRun model**
- **Found during:** Task 1 (RED test setup)
- **Issue:** PipelineRun existed in schema and migration but was missing from generated Prisma client (`node_modules/.prisma/client/index.d.ts` had 0 matches for PipelineRun)
- **Fix:** Ran `prisma generate` to regenerate the client from the current schema
- **Files modified:** node_modules/.prisma/client/ (regenerated)
- **Verification:** `grep -c "PipelineRun" .../index.d.ts` returned 426 after regeneration
- **Committed in:** cb9f0cb (part of test commit — client is not committed to git)

---

**Total deviations:** 1 auto-fixed (blocking — missing generated types)
**Impact on plan:** Necessary prerequisite. The migration and schema were correct; only the generated client needed regenerating.

## Issues Encountered

None beyond the Prisma client regeneration above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `checkCostCircuitBreaker(db)` ready to be called from `processArticles()` (Phase 03-05)
- Returns `false` to halt immediately when budget exhausted — caller must check and abort generation
- `AI_DEFAULT_DAILY_TOKEN_THRESHOLD` exported for reference/testing by callers

---
*Phase: 03-ai-pipeline*
*Completed: 2026-03-22*
