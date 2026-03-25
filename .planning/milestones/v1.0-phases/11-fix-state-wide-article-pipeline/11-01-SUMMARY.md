---
phase: 11-fix-state-wide-article-pipeline
plan: 01
subsystem: api
tags: [prisma, vitest, anthropic, ai-pipeline, articles, bezirk, state-wide]

# Dependency graph
requires:
  - phase: 03-ai-pipeline
    provides: pipeline.ts orchestrator with step1-tag/step2-write, processArticles()
  - phase: 06-reader-frontend
    provides: listArticlesReader() with bezirkIds personalization filter

provides:
  - steiermark-weit sentinel slug detection in pipeline.ts before bezirkSlugs map loop
  - isStateWide=true written to Article in DB when step1 returns steiermark-weit
  - No ArticleBezirk rows created for state-wide articles (correct data model)
  - console.warn on mixed slugs (steiermark-weit + bezirk slugs co-returned)
  - listArticlesReader OR clause — state-wide articles appear in personalized Bezirk feeds
  - buildSystemPrompt exclusivity instruction for steiermark-weit
  - 6 new passing integration/unit tests covering all three fix sites

affects:
  - reader-frontend
  - ai-pipeline
  - editorial-cms

# Tech tracking
tech-stack:
  added: []
  patterns:
    - isStateWide branch guard before bezirkSlugs map loop in pipeline.ts
    - OR [bezirke filter, isStateWide] pattern in listArticlesReader (mirrors getArticlesByBezirk)

key-files:
  created: []
  modified:
    - src/lib/ai/pipeline.ts
    - src/lib/ai/pipeline.test.ts
    - src/lib/ai/steps/step1-tag.ts
    - src/lib/ai/steps/step1-tag.test.ts
    - src/lib/content/articles.ts
    - src/lib/content/articles.test.ts

key-decisions:
  - "pipeline.ts uses typeof allBezirke[number][] for matchedBezirke type annotation — avoids manual struct declaration, stays in sync with DB model"
  - "isStateWide branch uses single db.article.update (no $transaction) — no ArticleBezirk upserts needed for state-wide articles"
  - "console.warn for mixed slug case is non-fatal — pipeline continues processing, bad data gets flagged in logs"

patterns-established:
  - "State-wide sentinel detection: check includes('steiermark-weit') before any slug→ID mapping"
  - "listArticlesReader OR pattern: matches getArticlesByBezirk to keep consistency across reader DAL"

requirements-completed: [AI-02, READ-06]

# Metrics
duration: 12min
completed: 2026-03-25
---

# Phase 11 Plan 01: Fix State-Wide Article Pipeline Summary

**steiermark-weit sentinel detection added to pipeline.ts: writes isStateWide=true, skips ArticleBezirk rows, warns on mixed slugs; listArticlesReader gains OR clause so state-wide articles appear in personalized Bezirk feeds**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-25T12:00:00Z
- **Completed:** 2026-03-25T12:12:00Z
- **Tasks:** 3 (Tasks 1-3)
- **Files modified:** 6

## Accomplishments

- Fixed the silent drop of `steiermark-weit` slug in pipeline.ts — Article.isStateWide=true now written correctly
- State-wide articles no longer silently invisible: listArticlesReader's OR clause exposes them to any Bezirk feed
- Step 1 system prompt tightened with exclusivity rule preventing mixed bezirkSlugs responses
- 6 new integration/unit tests all GREEN; full suite at 198 passing (was 192+)

## Task Commits

Each task was committed atomically:

1. **Task 1: Wave 0 — add it.todo() stubs** - `a69054f` (test)
2. **Task 2: Fix pipeline.ts + articles.ts + step1 prompt + implement tests** - `6fd6b36` (feat)
3. **Task 3: Full suite verification** - no code changes needed, suite passed

**Plan metadata:** (see final metadata commit)

## Files Created/Modified

- `src/lib/ai/pipeline.ts` - Added steiermark-weit detection block (5c/5d replacement); typeof inferred type for matchedBezirke
- `src/lib/ai/pipeline.test.ts` - 3 new integration tests: isStateWide=true, no ArticleBezirk rows, console.warn on mixed slugs
- `src/lib/ai/steps/step1-tag.ts` - Added exclusivity line to buildSystemPrompt after steiermark-weit return instruction
- `src/lib/ai/steps/step1-tag.test.ts` - 1 new unit test: system prompt contains exclusivity instruction
- `src/lib/content/articles.ts` - listArticlesReader WHERE clause now uses OR [bezirke filter, isStateWide: true]
- `src/lib/content/articles.test.ts` - 2 new integration tests: OR clause includes/excludes correct articles

## Decisions Made

- Used `typeof allBezirke[number][]` for `matchedBezirke` type instead of an explicit struct annotation — stays in sync with DB model, no duplication
- `isStateWide` branch uses a single `db.article.update` (not `db.$transaction`) — correct because there are no ArticleBezirk upserts to batch
- `console.warn` for mixed slugs is non-fatal — pipeline continues; bad LLM response gets flagged for prompt iteration

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — all three edits applied cleanly. TypeScript compile (`tsc --noEmit`) produced no errors after the `typeof allBezirke[number][]` inferred type approach was used for `matchedBezirke`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- State-wide article pipeline fully functional end-to-end
- Articles tagged as state-wide via AI pipeline will now surface in all personalized reader feeds
- No further blockers for Phase 11 — pipeline, prompt, and reader DAL all aligned

---
*Phase: 11-fix-state-wide-article-pipeline*
*Completed: 2026-03-25*

## Self-Check: PASSED

- src/lib/ai/pipeline.ts: FOUND
- src/lib/content/articles.ts: FOUND
- src/lib/ai/steps/step1-tag.ts: FOUND
- .planning/phases/11-fix-state-wide-article-pipeline/11-01-SUMMARY.md: FOUND
- commit a69054f (test stubs): FOUND
- commit 6fd6b36 (feat implementation): FOUND
- Full suite: 198 tests passing, 0 failures
