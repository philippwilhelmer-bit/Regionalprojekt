---
phase: 03-ai-pipeline
plan: "05"
subsystem: ai
tags: [anthropic, claude, prisma, vitest, pglite, pipeline, circuit-breaker, tdd, seo]

# Dependency graph
requires:
  - phase: 03-ai-pipeline/03-02
    provides: "runStep1Tag() — Step 1 tag & classify with bezirkSlugs + hasNamedPerson"
  - phase: 03-ai-pipeline/03-03
    provides: "runStep2Write() — Step 2 write & SEO with German article rewrite + seoTitle + metaDescription"
  - phase: 03-ai-pipeline/03-04
    provides: "checkCostCircuitBreaker(db) — daily token budget guard returning boolean"

provides:
  - "processArticles() — pipeline orchestrator: FETCHED → TAGGED → WRITTEN/REVIEW"
  - "ProcessResult interface: { articlesProcessed, articlesWritten, totalInputTokens, totalOutputTokens }"
  - "_clientFactory.create factory — testable Anthropic client injection"
  - "ai-run.ts CLI entry point for Phase 4 scheduler"
  - "Fully tested pipeline.ts with 10 GREEN vitest integration tests"

affects:
  - "04-scheduler (calls processArticles() on cron tick; reads PipelineRun for dead-man monitor)"
  - "05-cms (reads REVIEW queue; reads WRITTEN articles)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "processArticles() DI overload: zero-arg production (singleton), injected-client for tests — mirrors ingest.ts exactly"
    - "_clientFactory.create object pattern for Anthropic client injection — mutable object property survives vitest module isolation"
    - "FETCHED→TAGGED (db.$transaction with ArticleBezirk upserts) → WRITTEN/REVIEW (article update) sequential state machine"
    - "try/finally PipelineRun closure — always closed even on unexpected outer error"
    - "Per-article catch: log console.error + continue — run never aborts for single article failure"

key-files:
  created:
    - src/lib/ai/pipeline.ts
    - src/scripts/ai-run.ts
  modified:
    - src/lib/ai/pipeline.test.ts

key-decisions:
  - "_clientFactory.create mutable object pattern instead of vi.spyOn on exported let — vitest module isolation breaks spyOn on ESM let bindings; object property mutation survives closure boundaries"
  - "Circuit-breaker checked before PipelineRun.create — no run record opened if budget exhausted"
  - "try/finally for PipelineRun close — guarantees PipelineRun.finishedAt is always written"
  - "Per-article catch block with console.error — single article failure doesn't abort the run"
  - "import.meta.main cast as any in ai-run.ts — Bun extension not in TypeScript's standard ImportMeta types; cast is correct and documented"

patterns-established:
  - "Testable Anthropic factory: _clientFactory.create = () => mockClient — works across vitest ESM module isolation"
  - "Pipeline orchestrator: load all lookup data once, check guard, open run, iterate articles, close run in finally"

requirements-completed: [AI-01, AI-02, AI-03, AI-04, AI-05, SEO-02]

# Metrics
duration: 10min
completed: 2026-03-22
---

# Phase 03 Plan 05: Pipeline Orchestrator Summary

**processArticles() pipeline orchestrator with TDD — FETCHED→TAGGED→WRITTEN/REVIEW state machine using Step 1+2+circuit-breaker, PipelineRun tracking, and ai-run.ts CLI**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-21T23:36:55Z
- **Completed:** 2026-03-22T00:00:00Z
- **Tasks:** 2 (RED + GREEN TDD)
- **Files modified:** 3

## Accomplishments

- `processArticles()` wires Step 1 (tag), Step 2 (write), and circuit-breaker into a single orchestrated function
- FETCHED→TAGGED transition uses `db.$transaction` with ArticleBezirk upserts (AI-02)
- TAGGED→WRITTEN or REVIEW based on `hasNamedPerson` from Step 1 (AI-03); seoTitle + metaDescription written (SEO-02)
- PipelineRun opened/closed with token totals in try/finally; per-article errors logged and skipped (AI-05)
- `ai-run.ts` CLI mirrors `ingest-run.ts` pattern with structured log and `process.exit(1)` on error
- 10 integration tests GREEN; full 87-test suite GREEN; `tsc --noEmit` clean

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — failing tests for processArticles()** - `feef4f2` (test)
2. **Task 2: GREEN — implement pipeline.ts + ai-run.ts** - `f19c393` (feat)

_Note: TDD tasks have separate RED (test) and GREEN (impl) commits_

## Files Created/Modified

- `src/lib/ai/pipeline.ts` - processArticles() orchestrator + ProcessResult + _clientFactory
- `src/lib/ai/pipeline.test.ts` - 10 vitest integration tests using pgLite test DB
- `src/scripts/ai-run.ts` - CLI entry point for Phase 4 scheduler

## Decisions Made

- **`_clientFactory.create` mutable object pattern** instead of `vi.spyOn` on exported `let` — in vitest's ESM/CJS transform, spying on an exported `let` binding doesn't intercept calls made from within the same module because the internal call uses the local binding, not the module namespace. An exported mutable object property sidesteps this limitation cleanly.
- **Circuit-breaker checked before `PipelineRun.create`** — no run record is opened when the budget is exhausted. Matches the spec: "returns ProcessResult with 0 written if halted."
- **`try/finally` for PipelineRun close** — guarantees `finishedAt` is always written even if an unexpected outer error occurs, preventing stale open runs.
- **`(import.meta as any).main` cast** in `ai-run.ts` — `import.meta.main` is a Bun runtime extension not reflected in TypeScript's standard `ImportMeta` interface. The cast is correct (Bun sets this) and documented with a comment.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced vi.spyOn pattern with _clientFactory.create mutable object**
- **Found during:** Task 2 (GREEN — first test run)
- **Issue:** Tests used `vi.spyOn(pipeline, '_createAnthropicClient').mockReturnValue(mockClient)` but the internal call to `_createAnthropicClient()` inside `pipeline.ts` uses the local closure binding, not the module namespace. The real `new Anthropic()` constructor was invoked, failing with "Could not resolve authentication method."
- **Fix:** Changed `_createAnthropicClient` from an exported `let` function to a delegated call through `_clientFactory.create` (exported mutable object). Tests assign `_clientFactory.create = () => mockClient` directly. Restored in `afterEach`.
- **Files modified:** `src/lib/ai/pipeline.ts`, `src/lib/ai/pipeline.test.ts`
- **Verification:** `npx vitest run src/lib/ai/pipeline.test.ts` — 10/10 passed
- **Committed in:** f19c393 (part of GREEN implementation commit)

**2. [Rule 1 - Bug] Fixed `import.meta.main` TypeScript error in ai-run.ts**
- **Found during:** Task 2 (`npx tsc --noEmit`)
- **Issue:** `import.meta.main` caused `error TS2339: Property 'main' does not exist on type 'ImportMeta'` — no `@types/bun` in the project
- **Fix:** Cast `import.meta` as `any` for the guard: `(import.meta as any).main`
- **Files modified:** `src/scripts/ai-run.ts`
- **Verification:** `npx tsc --noEmit` — no errors
- **Committed in:** f19c393

---

**Total deviations:** 2 auto-fixed (both Rule 1 — bugs discovered during test execution)
**Impact on plan:** Both fixes required for correctness. No scope creep.

## Issues Encountered

None beyond the two auto-fixed items above.

## User Setup Required

None — no external service configuration required for this plan. `ANTHROPIC_API_KEY` is needed for production runs but not for tests.

## Next Phase Readiness

- `processArticles()` is the function the Phase 4 scheduler will call on every cron tick — fully tested and ready
- `ai-run.ts` provides the CLI entry point for Phase 4 to import and schedule
- All AI pipeline requirements completed: AI-01 through AI-05, SEO-02
- Phase 3 AI pipeline is complete

---
*Phase: 03-ai-pipeline*
*Completed: 2026-03-22*

## Self-Check: PASSED

- src/lib/ai/pipeline.ts — FOUND
- src/lib/ai/pipeline.test.ts — FOUND
- src/scripts/ai-run.ts — FOUND
- .planning/phases/03-ai-pipeline/03-05-SUMMARY.md — FOUND
- commit feef4f2 (RED) — FOUND
- commit f19c393 (GREEN) — FOUND
