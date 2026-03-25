---
phase: 04-scheduler-and-autonomous-publishing
plan: 02
subsystem: publish
tags: [typescript, vitest, tdd, publish, dead-man, pglite]

# Dependency graph
requires:
  - phase: 04-01
    provides: publishArticles() and checkDeadMan() typed stubs with it.todo() test placeholders

provides:
  - publishArticles() — fully implemented with DI overload, updateMany WRITTEN→PUBLISHED, REVIEW_BACKLOG warn
  - checkDeadMan() — fully implemented with DI overload, aggregate _max publishedAt, DEAD_MAN_ALERT warn
  - publish.test.ts — 5 real test cases, all GREEN
  - dead-man.test.ts — 5 real test cases, all GREEN

affects: [04-04-orchestrator, 04-scheduler-and-autonomous-publishing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TDD RED/GREEN cycle: write failing tests before implementing, commit each phase
    - DI overload with $connect duck-typing (same as ingest.ts and pipeline.ts)
    - pgLite in-memory DB injected via DI overload in all test cases
    - vi.spyOn(console, 'warn') for structured alert verification

key-files:
  created: []
  modified:
    - src/lib/publish/publish.ts
    - src/lib/publish/publish.test.ts
    - src/lib/publish/dead-man.ts
    - src/lib/publish/dead-man.test.ts

key-decisions:
  - "findFirst used instead of findUnique for externalId lookup — externalId is String? (nullable, not @unique) in Article schema"
  - "Math.round(silenceDurationHours) in DEAD_MAN_ALERT — produces clean integer hours in alert payload"
  - "Infinity sentinel for NULL publishedAt silenceMs yields silenceDurationHours > 1000 — test asserts this rather than exact value"

# Metrics
duration: 3min
completed: 2026-03-22
---

# Phase 4 Plan 02: Publish Service and Dead-Man Monitor (TDD) Summary

**publishArticles() and checkDeadMan() fully implemented via TDD — 10 tests GREEN, tsc exits 0**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-22T06:49:31Z
- **Completed:** 2026-03-22T06:52:48Z
- **Tasks:** 4 (RED + GREEN for each feature)
- **Files modified:** 4

## Accomplishments
- Wrote 5 failing tests for publishArticles() — RED phase confirmed via test run
- Implemented publishArticles(): DI overload, updateMany WRITTEN→PUBLISHED, count REVIEW backlog, structured console.warn
- Wrote 5 failing tests for checkDeadMan() — RED phase confirmed via test run
- Implemented checkDeadMan(): DI overload, aggregate _max publishedAt, env var threshold (default 6h), structured DEAD_MAN_ALERT
- All 10 tests GREEN, `npx tsc --noEmit` exits 0

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — failing tests for publishArticles()** - `5db5f46` (test)
2. **Task 2: GREEN — implement publishArticles()** - `1112803` (feat)
3. **Task 3: RED — failing tests for checkDeadMan()** - `d93af62` (test)
4. **Task 4: GREEN — implement checkDeadMan()** - `4358248` (feat)

## Files Created/Modified
- `src/lib/publish/publish.ts` — Full implementation replacing throw stub
- `src/lib/publish/publish.test.ts` — 5 real test cases replacing it.todo() stubs
- `src/lib/publish/dead-man.ts` — Full implementation replacing throw stub
- `src/lib/publish/dead-man.test.ts` — 5 real test cases replacing it.todo() stubs

## Decisions Made
- `findFirst` used instead of `findUnique` for `externalId` lookups in tests — `externalId` is `String?` (nullable, not `@unique`) in the Article schema so `findUnique` rejects it.
- `Math.round(silenceDurationHours)` in DEAD_MAN_ALERT produces clean integer hours matching the plan spec.
- For the NULL publishedAt case, `silenceMs = Infinity` yields `silenceDurationHours = Infinity`; `Math.round(Infinity)` returns `Infinity`. Test asserts `> 1000` rather than exact value to avoid floating-point/Infinity brittleness.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Changed findUnique to findFirst for externalId lookup in publish.test.ts**
- **Found during:** Task 2 (GREEN phase for publishArticles)
- **Issue:** Test used `db.article.findUnique({ where: { externalId: '...' } })` but `externalId` is `String?` (nullable, not `@unique`) in the schema — Prisma rejected it at runtime.
- **Fix:** Changed two test assertions to use `findFirst` instead of `findUnique`.
- **Files modified:** src/lib/publish/publish.test.ts
- **Commit:** 1112803 (included in GREEN phase commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Minimal — test helper method only, no behavior change.

## Issues Encountered
None beyond the auto-fixed deviation above.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- publishArticles() and checkDeadMan() are fully tested and ready for wiring into the orchestration layer (Plan 04)
- Both modules follow the established DI overload pattern — compatible with the scheduler integration

---
*Phase: 04-scheduler-and-autonomous-publishing*
*Completed: 2026-03-22*

## Self-Check: PASSED

- src/lib/publish/publish.ts: FOUND
- src/lib/publish/dead-man.ts: FOUND
- src/lib/publish/publish.test.ts: FOUND
- src/lib/publish/dead-man.test.ts: FOUND
- .planning/phases/04-scheduler-and-autonomous-publishing/04-02-SUMMARY.md: FOUND
- Commits: 5db5f46, 1112803, d93af62, 4358248 — all verified in git log
