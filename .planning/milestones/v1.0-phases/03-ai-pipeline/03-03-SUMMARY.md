---
phase: 03-ai-pipeline
plan: "03"
subsystem: ai
tags: [anthropic, claude, structured-outputs, tdd, seo, german-nlp]

# Dependency graph
requires:
  - phase: 03-ai-pipeline/03-01
    provides: "Wave 0 stubs, Anthropic SDK install, schema migration (seoTitle, PipelineRun)"
provides:
  - "runStep2Write() — Step 2 AI call: rewrite article in German + generate SEO fields"
  - "Step2Result interface with headline, lead, body, seoTitle, metaDescription, inputTokens, outputTokens"
  - "Fully tested step2-write.ts with 10 GREEN vitest tests"
affects: [03-05-pipeline, 03-04-circuit-breaker]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "output_config.format.type json_schema structured output with Anthropic SDK"
    - "Module-level system prompt constant for easy iteration without code changes"
    - "bezirkContext injection pattern: join slugs or fallback to Steiermark-weit"
    - "Text block extraction by type === text (not index-based access)"

key-files:
  created:
    - src/lib/ai/steps/step2-write.ts
    - src/lib/ai/steps/step2-write.test.ts
  modified:
    - src/test/setup-db.ts
    - src/lib/ai/pipeline.test.ts
    - src/lib/ai/steps/step1-tag.test.ts
    - src/lib/ai/circuit-breaker.test.ts

key-decisions:
  - "System prompt kept as module-level constant SYSTEM_PROMPT_TEMPLATE — iteratable without code changes per RESEARCH.md pitfall 5; LOW confidence wording until validated against real OTS data in Phase 7"
  - "bezirkNames injected as comma-separated list into {bezirkContext} placeholder in system prompt; empty list falls back to 'Steiermark-weit'"
  - "Used client.messages.create as Function cast to avoid TypeScript output_config type errors — output_config is valid at runtime but type definitions may lag SDK version"
  - "Wave 0 prerequisite stubs created inline (plan 03-01 had not been executed) as Rule 3 blocking issue fix"

patterns-established:
  - "Step function signature: runStep2Write(client: Anthropic, articleText: string, bezirkNames: string[]) — client injected for vi.spyOn testability"
  - "Mock client factory pattern: makeMockClient(responseOverride?) returns Anthropic with vi.fn() on messages.create"
  - "Token counts always extracted from response.usage.input_tokens / output_tokens"

requirements-completed: [AI-01, SEO-02]

# Metrics
duration: 15min
completed: 2026-03-22
---

# Phase 3 Plan 03: Step 2 Write & SEO Summary

**runStep2Write() TDD-implemented with claude-haiku-4-5-20251001 structured JSON output, returning 5-field German article rewrite plus SEO title and meta description**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-21T23:30:01Z
- **Completed:** 2026-03-22T00:00:00Z
- **Tasks:** 2 (RED + GREEN TDD phases)
- **Files modified:** 7

## Accomplishments
- Implemented `runStep2Write(client, articleText, bezirkNames)` with full structured JSON output via `output_config.format.type: json_schema`
- All five content fields (headline, lead, body, seoTitle, metaDescription) returned from parsed Anthropic response
- Token counts (inputTokens, outputTokens) extracted from `response.usage` on every call
- 10 vitest tests GREEN — no real API calls, all using `vi.fn()` mock client
- Handled Wave 0 prerequisite gap (03-01 not yet executed) by creating stubs inline as Rule 3 deviation

## Task Commits

Each task was committed atomically:

1. **Wave 0 prereqs: cleanDb update + test stubs** - `9cdd9d2` (chore)
2. **RED: failing tests for runStep2Write()** - `f576d3f` (test)
3. **GREEN: implement runStep2Write()** - `cd068a6` (feat)

_Note: TDD tasks have separate RED (test) and GREEN (impl) commits_

## Files Created/Modified
- `src/lib/ai/steps/step2-write.ts` - runStep2Write() implementation + Step2Result interface
- `src/lib/ai/steps/step2-write.test.ts` - 10 vitest tests covering all behavior cases
- `src/test/setup-db.ts` - Added pipelineRun.deleteMany() to cleanDb()
- `src/lib/ai/pipeline.test.ts` - Wave 0 todo stubs for processArticles()
- `src/lib/ai/steps/step1-tag.test.ts` - Wave 0 stubs (expanded by project tooling)
- `src/lib/ai/circuit-breaker.test.ts` - Wave 0 stubs (expanded by project tooling)

## Decisions Made
- System prompt kept as module-level constant `SYSTEM_PROMPT_TEMPLATE` with `{bezirkContext}` placeholder — prompt wording is LOW confidence until validated against real OTS data in Phase 7; keeping it in one place enables iteration without code changes
- Empty `bezirkNames` array falls back to `'Steiermark-weit'` string in system prompt, matching the plan's `buildBezirkContext()` spec
- Used `(client.messages.create as Function)` cast to work around TypeScript type definitions that may not yet include `output_config` — the parameter is valid at runtime per RESEARCH.md
- `max_tokens: 512` as specified in the plan interfaces section

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Wave 0 test stubs and cleanDb update missing (03-01 not executed)**
- **Found during:** Pre-execution check
- **Issue:** Plan 03-03 depends on 03-01 (Wave 0 stubs, SDK install, schema migration). The schema and SDK were already done but the test stub files and cleanDb update had not been created.
- **Fix:** Created `src/lib/ai/pipeline.test.ts`, `step1-tag.test.ts`, `step2-write.test.ts`, `circuit-breaker.test.ts` as Wave 0 `it.todo()` stubs; added `pipelineRun.deleteMany()` to `cleanDb()` in `setup-db.ts`.
- **Files modified:** src/test/setup-db.ts, src/lib/ai/pipeline.test.ts, src/lib/ai/steps/step1-tag.test.ts, src/lib/ai/steps/step2-write.test.ts, src/lib/ai/circuit-breaker.test.ts
- **Verification:** `npx vitest run src/lib/ai/` reports 25 todo tests, 0 failures, TypeScript clean
- **Committed in:** `9cdd9d2` (separate prerequisite commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - Blocking)
**Impact on plan:** Required to unblock TDD execution. No scope creep — strictly the Wave 0 artifacts the plan depended on.

## Issues Encountered
- Project tooling expanded some `it.todo()` stub files (step1-tag.test.ts, circuit-breaker.test.ts) with full test implementations during commit. These changes were taken as-is since they represent correct test implementations (not malicious code).

## User Setup Required
None - no external service configuration required for this plan. The `ANTHROPIC_API_KEY` env var is required for the full pipeline (Phase 3) but no real API calls are made in these tests.

## Next Phase Readiness
- `runStep2Write()` fully tested and ready for use in `pipeline.ts` (plan 03-05)
- `Step2Result` interface exported for pipeline integration
- Wave 0 stubs ready for plan 03-02 (Step 1 Tag) and plans 03-04/03-05

---
*Phase: 03-ai-pipeline*
*Completed: 2026-03-22*
