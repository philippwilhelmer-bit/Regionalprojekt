---
phase: 04-scheduler-and-autonomous-publishing
plan: 01
subsystem: database
tags: [prisma, postgresql, typescript, vitest, publish, scheduler]

# Dependency graph
requires:
  - phase: 03-ai-pipeline
    provides: Article model with WRITTEN/REVIEW statuses, PipelineRun model

provides:
  - ArticleStatus enum with ERROR and FAILED values for scheduler error handling
  - Article.retryCount (Int, default 0) and Article.errorMessage (String?) fields
  - Migration SQL for Phase 4 schema additions (ALTER TYPE outside transaction)
  - publishArticles() typed stub with PublishResult interface (PUB-01 foundation)
  - checkDeadMan() typed stub with DI overloads (PUB-03 foundation)
  - publish.test.ts and dead-man.test.ts with it.todo() stubs for Wave 1

affects: [04-02-publish-service, 04-03-pipeline-retry, 04-scheduler-and-autonomous-publishing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Wave 0 stubs: typed source files with throw placeholders + explicit vitest imports in test files
    - DI overload pattern: zero-arg (production singleton) + client-injection (tests) same as prior phases

key-files:
  created:
    - prisma/migrations/20260322_scheduler/migration.sql
    - src/lib/publish/publish.ts
    - src/lib/publish/dead-man.ts
    - src/lib/publish/publish.test.ts
    - src/lib/publish/dead-man.test.ts
  modified:
    - prisma/schema.prisma

key-decisions:
  - "Wave 0 test stubs import describe/it from vitest explicitly — tsconfig includes test files in compilation, no globals configured"
  - "Migration SQL uses ALTER TYPE outside transaction block — PostgreSQL restriction on enum value additions"
  - "ERROR = retryable failure (scheduler will retry), FAILED = permanently excluded (max retries exceeded)"

patterns-established:
  - "Wave 0 stub pattern: typed source file (exports correct interface/signature, throws not-implemented) + test file with it.todo() stubs + explicit vitest imports"

requirements-completed: [PUB-01, PUB-03]

# Metrics
duration: 7min
completed: 2026-03-22
---

# Phase 4 Plan 01: Schema Foundation and Wave 0 Stubs Summary

**ArticleStatus extended with ERROR/FAILED enum values, Article model gets retryCount/errorMessage fields, Prisma client regenerated, and typed publish service stubs unblock Wave 1 parallel execution**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-03-22T06:40:00Z
- **Completed:** 2026-03-22T06:47:23Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Extended ArticleStatus enum with ERROR (retryable) and FAILED (permanent) values
- Added retryCount and errorMessage fields to Article model, regenerated Prisma client
- Created migration SQL with ALTER TYPE statements outside transaction blocks (PostgreSQL requirement)
- Created typed publish.ts and dead-man.ts stubs with DI overloads matching established project pattern
- Created publish.test.ts and dead-man.test.ts with 9 it.todo() stubs — vitest discovers both files, 0 failures

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema migration — ERROR/FAILED enum + retryCount/errorMessage fields** - `956b5d6` (feat)
2. **Task 2: Wave 0 stubs — publish.ts, dead-man.ts, and it.todo() test files** - `a088251` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added ERROR/FAILED to ArticleStatus enum; added retryCount/errorMessage to Article model
- `prisma/migrations/20260322_scheduler/migration.sql` - DDL for enum additions (outside transaction) and column additions
- `src/lib/publish/publish.ts` - Typed stub exporting PublishResult interface and publishArticles() signature
- `src/lib/publish/dead-man.ts` - Typed stub exporting checkDeadMan() signature with DI overloads
- `src/lib/publish/publish.test.ts` - 5 it.todo() stubs for PUB-01 behaviors
- `src/lib/publish/dead-man.test.ts` - 4 it.todo() stubs for PUB-03 behaviors

## Decisions Made
- Wave 0 test stubs import `describe` and `it` explicitly from `vitest` — the tsconfig includes test files in compilation and no globals are configured, so implicit globals cause TypeScript errors. This matches the existing project test pattern.
- Migration SQL places ALTER TYPE statements outside any transaction block per PostgreSQL restriction on enum value additions.
- ERROR status = retryable failure (scheduler will retry up to max), FAILED = permanently excluded (max retries exceeded).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added explicit vitest imports to test stub files**
- **Found during:** Task 2 (Wave 0 stub creation)
- **Issue:** Plan templates used bare `describe`/`it` globals in test files. tsconfig.json includes test files in compilation and no `globals: true` vitest config is set, so TypeScript reported TS2582 errors on both test files.
- **Fix:** Added `import { describe, it } from 'vitest'` to both test files, matching the pattern used in all existing test files (e.g., dedup.test.ts, ingest.test.ts).
- **Files modified:** src/lib/publish/publish.test.ts, src/lib/publish/dead-man.test.ts
- **Verification:** `npx tsc --noEmit` exits 0 after fix
- **Committed in:** a088251 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Necessary fix for TypeScript correctness. No scope creep — vitest import was already the established project pattern.

## Issues Encountered
None beyond the auto-fixed deviation above.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Wave 1 plans (04-02 publish service TDD, 04-03 pipeline retry TDD) can start immediately
- publishArticles() and checkDeadMan() stubs are importable with correct TypeScript types
- Prisma client typed with retryCount and errorMessage fields ready for use in Wave 1

---
*Phase: 04-scheduler-and-autonomous-publishing*
*Completed: 2026-03-22*
