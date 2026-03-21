---
phase: 03-ai-pipeline
plan: "02"
subsystem: ai
tags: [anthropic, claude, structured-outputs, tdd, vitest, typescript]

# Dependency graph
requires:
  - phase: 03-01
    provides: Wave 0 test stubs for step1-tag, Anthropic SDK installed, schema migration applied

provides:
  - runStep1Tag() — Step 1 AI call that classifies articles to Bezirke and detects named persons
  - Step1Result interface — bezirkSlugs, hasNamedPerson, inputTokens, outputTokens
  - buildBezirkContext() helper — injects Bezirk slugs and gemeindeSynonyms into system prompt

affects:
  - 03-04-pipeline — pipeline.ts calls runStep1Tag() as Step 1 of processArticles()
  - 03-05-ai-run — CLI uses processArticles() which calls runStep1Tag()

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Injected Anthropic client pattern: accept client as first arg for vi.spyOn testability"
    - "output_config json_schema mode: constrained token sampling via 'as any' cast (output_config not in SDK types)"
    - "makeTextBlock() helper in tests: wraps text with citations: null to satisfy TextBlock type"

key-files:
  created:
    - src/lib/ai/steps/step1-tag.ts
    - src/lib/ai/steps/step1-tag.test.ts
  modified: []

key-decisions:
  - "Injected Anthropic client as first arg to runStep1Tag() — enables vi.spyOn mocking without module-level singletons"
  - "output_config cast as 'any' — Anthropic SDK types don't expose output_config at TypeScript level despite it being supported at runtime"
  - "citations: null in test TextBlock fixtures — SDK TextBlock type requires citations field (can be null)"
  - "System prompt wording is LOW confidence — treat as draft until validated with real OTS data in Phase 7"

patterns-established:
  - "Step function accepts injected Anthropic client — consistent pattern for step2-write.ts"
  - "buildBezirkContext() is module-level helper — iteratable without code changes"

requirements-completed: [AI-02, AI-03]

# Metrics
duration: 3min
completed: 2026-03-22
---

# Phase 03 Plan 02: Step 1 Tag & Classify Summary

**runStep1Tag() calls claude-haiku-4-5-20251001 with json_schema output_config, injects Bezirk slugs and gemeindeSynonyms into system prompt, returns bezirkSlugs, hasNamedPerson, and token counts — 8 tests GREEN**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-21T23:29:35Z
- **Completed:** 2026-03-22T00:32:45Z
- **Tasks:** 2 (RED + GREEN)
- **Files modified:** 2

## Accomplishments

- `runStep1Tag(client, articleText, bezirke)` fully implemented and tested — no real API calls in tests
- `buildBezirkContext()` helper injects Bezirk slugs, names, and gemeindeSynonyms into system prompt
- System prompt guides classification to Steiermark Bezirk slugs with explicit hasNamedPerson definition
- 8 test cases covering: bezirkSlugs array, hasNamedPerson boolean, token counts, empty array case, no-text-block error, model name assertion, output_config format assertion, bezirk context injection
- `npx tsc --noEmit` passes cleanly

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Add failing tests for runStep1Tag()** - `17698d2` (test)
2. **Task 2 (GREEN): Implement runStep1Tag()** - `22763fe` (feat)

## Files Created/Modified

- `src/lib/ai/steps/step1-tag.ts` - runStep1Tag() implementation with buildBezirkContext() helper and system prompt
- `src/lib/ai/steps/step1-tag.test.ts` - 8 vitest tests using vi.spyOn mock pattern

## Decisions Made

- **Injected client pattern:** `runStep1Tag(client, ...)` accepts Anthropic client as first argument — enables `vi.spyOn(client.messages, 'create')` mocking without module-level singleton; consistent with Phase 2 DI patterns
- **output_config as `as any`:** The Anthropic SDK TypeScript types do not expose the `output_config` parameter at the type level despite runtime support — cast to `any` is necessary and consistent with the RESEARCH.md recommendation
- **`citations: null` in test fixtures:** Anthropic SDK v0.80.0 `TextBlock` requires a `citations` field (can be `null`) — test helper `makeTextBlock()` wraps text blocks with this field to satisfy TypeScript
- **System prompt as LOW confidence:** Prompt wording for Austrian regional news classification is provisional — flagged in STATE.md as needing validation against real OTS data in Phase 7

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TextBlock type error in test fixtures**
- **Found during:** Task 2 (GREEN — TypeScript check)
- **Issue:** Anthropic SDK v0.80.0 `TextBlock` interface requires `citations: Array<TextCitation> | null` — test mock `{ type: 'text', text: '...' }` was missing this field, causing `TS2322`
- **Fix:** Added `makeTextBlock()` helper in test file that constructs `{ type: 'text', text, citations: null }` as `Anthropic.Messages.TextBlock`
- **Files modified:** `src/lib/ai/steps/step1-tag.test.ts`
- **Verification:** `npx tsc --noEmit` passes, 8 tests GREEN
- **Committed in:** `22763fe` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - type error in test fixture)
**Impact on plan:** Required for TypeScript correctness. No scope creep.

## Issues Encountered

- The 03-03 agent (which ran after the initial 03-02 RED commit `17698d2`) reverted `step1-tag.test.ts` back to Wave 0 stubs as part of its own execution. The test file and implementation had to be re-established. The implementation file (`step1-tag.ts`) was already present on disk as untracked, only the test file needed to be restored.

## Next Phase Readiness

- `runStep1Tag()` is ready for integration into `processArticles()` pipeline (Plan 03-04)
- `step2-write.ts` (Plan 03-03) can be developed independently — same client injection pattern applies
- Both step functions accept an injected Anthropic client — `processArticles()` will create one client and pass it to both steps

---
*Phase: 03-ai-pipeline*
*Completed: 2026-03-22*
