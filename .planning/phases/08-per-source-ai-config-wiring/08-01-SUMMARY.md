---
phase: 08-per-source-ai-config-wiring
plan: 01
subsystem: database
tags: [prisma, postgresql, migrations, vitest, typescript]

# Dependency graph
requires:
  - phase: 05-editorial-cms
    provides: AiSourceConfig model and Source model with aiSourceConfig relation
  - phase: 03-ai-pipeline
    provides: step2-write.ts runStep2Write() function
provides:
  - Article.sourceId nullable FK to Source with onDelete SetNull
  - Source.articles reverse relation (Article[])
  - @@index([sourceId]) on Article model
  - Hand-crafted migration SQL at 20260323_phase8_article_source_id
  - Wave 0 test stubs for per-source AI override behavior
affects:
  - 08-02 (Plan 02 implements GREEN phase using these stubs and schema)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hand-crafted migration SQL for pgLite compatibility (sorted directory scan)"
    - "Wave 0 it.todo() stubs — compile-clean placeholders before implementation"

key-files:
  created:
    - prisma/migrations/20260323_phase8_article_source_id/migration.sql
    - src/lib/ai/steps/step2-write-source-override.test.ts
  modified:
    - prisma/schema.prisma

key-decisions:
  - "Article.sourceId uses onDelete: SetNull — articles survive Source deletion, falling through to global AI config"
  - "Relation field named sourceFk (not source) — Article already has source ArticleSource enum field; Prisma forbids duplicate field names"
  - "Wave 0 stub has no implementation imports — prevents TypeScript errors before Plan 02 implementation exists"

patterns-established:
  - "sourceFk naming pattern: FK relation fields use Fk suffix when enum field occupies the natural name"

requirements-completed: [AICONF-02]

# Metrics
duration: 8min
completed: 2026-03-23
---

# Phase 8 Plan 01: Per-Source AI Config — Schema Foundation Summary

**Article.sourceId nullable FK to Source added to Prisma schema with onDelete: SetNull, migration SQL hand-crafted, and Wave 0 vitest stub created for per-source AI override path**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-23T23:30:00Z
- **Completed:** 2026-03-23T23:38:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added `sourceId Int?` and `sourceFk Source?` relation fields to Article model in Prisma schema
- Added `@@index([sourceId])` and `articles Article[]` reverse relation to Source model
- Hand-crafted migration SQL at `prisma/migrations/20260323_phase8_article_source_id/migration.sql` with SET NULL FK and index DDL
- Ran `prisma generate` — Prisma client regenerated with new sourceId field on Article type
- Created Wave 0 test stub with two `it.todo()` cases for per-source override and global fallback paths
- All TypeScript checks pass (`tsc --noEmit` exits 0), vitest reports 2 todo / 0 failures

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Article.sourceId FK to Prisma schema + migration SQL + prisma generate** - `6719890` (feat)
2. **Task 2: Wave 0 — write step2-write-source-override.test.ts stub** - `d571494` (test)

## Files Created/Modified

- `prisma/schema.prisma` - Added sourceId Int?, sourceFk Source? relation, @@index([sourceId]) to Article; added articles Article[] to Source
- `prisma/migrations/20260323_phase8_article_source_id/migration.sql` - ALTER TABLE ADD COLUMN sourceId with FK to Source(id) ON DELETE SET NULL, CREATE INDEX
- `src/lib/ai/steps/step2-write-source-override.test.ts` - Wave 0 stubs: two it.todo() cases for per-source override and null/global fallback

## Decisions Made

- `sourceFk` relation field name (not `source`) — Article already has `source ArticleSource` enum field; Prisma forbids duplicate field names in the same model
- `onDelete: SetNull` for the FK — articles survive Source deletion and fall through to global AI config, consistent with Phase 8 design intent
- No implementation imports in Wave 0 stub — keeps file TypeScript-clean before Plan 02 implementation files exist

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. `npx` required explicit PATH setup with `~/.nvm/versions/node/v25.8.0/bin` — shell environment did not have nvm in PATH. All commands succeeded once PATH was set.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- DB contract established: `Article.sourceId` FK ready for Plan 02 pipeline wiring
- Wave 0 stubs ready for Plan 02 RED → GREEN TDD implementation
- `prisma generate` complete — all downstream TypeScript files can reference `article.sourceId` without errors

---
*Phase: 08-per-source-ai-config-wiring*
*Completed: 2026-03-23*
