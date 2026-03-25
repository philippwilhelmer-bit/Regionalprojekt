---
phase: 11-fix-state-wide-article-pipeline
plan: 02
subsystem: database
tags: [prisma, backfill, cli, scripts, bun]

# Dependency graph
requires:
  - phase: 11-01
    provides: pipeline.ts isStateWide fix and articles.ts OR clause fix
provides:
  - One-time operator CLI for backfilling isStateWide=true on articles with no Bezirk associations
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "(import.meta as any).main guard for Bun scripts — prevents auto-execution on import"
    - "--dry-run flag pattern for operator preview before DB writes"

key-files:
  created:
    - src/scripts/backfill-state-wide.ts
  modified: []

key-decisions:
  - "No test file for backfill script — one-time operator tool analogous to ai-run.ts which also has no dedicated test"
  - "dryRun prints candidates and returns early — no DB writes possible in dry-run mode even if candidates exist"
  - "Status filter (PUBLISHED/WRITTEN/REVIEW) excludes mid-pipeline FETCHED/TAGGED articles — no explicit exclusion needed"

patterns-established:
  - "Backfill scripts follow ai-run.ts pattern: import prisma singleton, async main(), (import.meta as any).main guard, .catch(fatal)"

requirements-completed:
  - AI-02

# Metrics
duration: 3min
completed: 2026-03-25
---

# Phase 11 Plan 02: Backfill State-Wide Articles Summary

**Operator CLI tool (`backfill-state-wide.ts`) that sets isStateWide=true on existing PUBLISHED/WRITTEN/REVIEW articles with no ArticleBezirk rows, with --dry-run preview support**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-25T11:05:55Z
- **Completed:** 2026-03-25T11:08:30Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Created `src/scripts/backfill-state-wide.ts` following the established `ai-run.ts` CLI pattern
- Queries articles with `bezirke: { none: {} }` and status in `['PUBLISHED', 'WRITTEN', 'REVIEW']`
- Supports `--dry-run` flag — prints candidates with id/status/title and exits without any DB writes
- Gated by `(import.meta as any).main` — never auto-executes when imported
- Full test suite (198 tests) remains green after adding the script

## Task Commits

Each task was committed atomically:

1. **Task 1: Create backfill-state-wide.ts CLI script** - `6ac0ce0` (feat)

## Files Created/Modified
- `src/scripts/backfill-state-wide.ts` - One-time operator CLI tool for repairing existing state-wide articles that were never flagged

## Decisions Made
- No test file created — script is a one-time operator tool with no business logic, analogous to `ai-run.ts` which also has no dedicated test (as specified in plan)
- `dryRun` check placed before the zero-candidates check — operator always sees the candidate list regardless of whether they intend to write
- Status filter `{ in: ['PUBLISHED', 'WRITTEN', 'REVIEW'] }` is sufficient to exclude mid-pipeline articles; no explicit FETCHED/TAGGED exclusion needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Script is invoked manually by the operator:
- Preview: `bun run src/scripts/backfill-state-wide.ts --dry-run`
- Apply: `bun run src/scripts/backfill-state-wide.ts`

## Next Phase Readiness
- Phase 11 is now complete: pipeline bug fixed (11-01), reader feed fixed (11-01), backfill script delivered (11-02)
- Operator should run `--dry-run` first to review affected articles before applying the backfill

---
*Phase: 11-fix-state-wide-article-pipeline*
*Completed: 2026-03-25*
