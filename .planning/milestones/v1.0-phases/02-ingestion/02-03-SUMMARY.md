---
phase: 02-ingestion
plan: 03
subsystem: ingestion
tags: [vitest, tdd, fetch, prisma, pglite, ots-at, rest-api, dedup, rate-limit]

# Dependency graph
requires:
  - phase: 02-ingestion
    plan: 01
    provides: Source, IngestionRun, contentHash schema + migration; Wave 0 test stubs
  - phase: 02-ingestion
    plan: 02
    provides: RawItem interface and AdapterFn type in src/lib/ingestion/types.ts

provides:
  - createOtsAtAdapter(db?) factory — returns an AdapterFn targeting OTS.at REST API
  - otsAtAdapter default export for production use
  - List-then-dedup-then-detail pattern: fetches /api/liste, skips items already in Article DB, fetches /api/detail only for new items
  - Defensive body extraction: CANDIDATE_BODY_FIELDS tried in order with warn-and-fallback
  - 4 passing GREEN tests for ING-01

affects: [02-05, 02-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "createOtsAtAdapter(db?) factory pattern — injected PrismaClient for DI without modifying the AdapterFn signature"
    - "vi.spyOn(globalThis, 'fetch') for HTTP mocking — no real network in tests"
    - "CANDIDATE_BODY_FIELDS defensive body extraction with console.warn fallback"
    - "OTS_API_KEY read from process.env exclusively — never persisted"

key-files:
  created:
    - src/lib/ingestion/adapters/ots-at.ts
  modified:
    - src/lib/ingestion/adapters/ots-at.test.ts

key-decisions:
  - "createOtsAtAdapter(db?) factory pattern chosen over DI second param on AdapterFn — factory keeps AdapterFn signature clean (source only) while enabling test injection"
  - "CANDIDATE_BODY_FIELDS defensive extraction — OTS API body field name is MEDIUM confidence; trying TEXT/BODY/INHALT/text/body prevents silent empty results"
  - "Dedup check (source+externalId) before /api/detail fetch — protects 2,500 req/day rate limit; reuses Article DB as source of truth without a separate seen-set"

patterns-established:
  - "TDD RED→GREEN: stub file replaced with real tests importing from unwritten module; confirm FAIL (cannot find module); implement; confirm PASS"
  - "Adapter factory pattern: createXxxAdapter(db?) returns AdapterFn — use for all DB-accessing adapters"

requirements-completed: [ING-01]

# Metrics
duration: 8min
completed: 2026-03-21
---

# Phase 2 Plan 03: OTS.at REST API adapter Summary

**OTS.at adapter with list-then-dedup-then-detail rate-limit protection, defensive body extraction, and factory DI pattern — 4 tests GREEN, TDD RED to GREEN in one pass**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-21T21:02:15Z
- **Completed:** 2026-03-21T21:10:00Z
- **Tasks:** 2 (1 RED + 1 GREEN)
- **Files modified:** 2

## Accomplishments
- Implemented `createOtsAtAdapter(db?)` factory returning a fully-typed `AdapterFn` for OTS.at
- Rate limit protection: checks `article.findFirst({ source: 'OTS_AT', externalId })` before each detail fetch, skipping items already in DB
- Defensive body extraction using `CANDIDATE_BODY_FIELDS = ['TEXT', 'BODY', 'INHALT', 'text', 'body']` — handles MEDIUM-confidence field name from OTS API research
- All 4 OTS adapter tests GREEN; full suite 23 passing with no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: OTS adapter RED tests** - `322f312` (test)
2. **Task 2: OTS adapter implementation GREEN** - `7a9a8f5` (feat)

**Plan metadata:** (docs commit follows)

_Note: TDD tasks — RED commit first, then GREEN implementation commit_

## Files Created/Modified
- `src/lib/ingestion/adapters/ots-at.ts` - createOtsAtAdapter factory + otsAtAdapter default export
- `src/lib/ingestion/adapters/ots-at.test.ts` - 4 real tests replacing Wave 0 todo stubs

## Decisions Made
- `createOtsAtAdapter(db?)` factory pattern chosen over adding a second parameter to `AdapterFn` — the factory keeps the public contract `(source: ArticleSource) => Promise<RawItem[]>` clean while still allowing PrismaClient injection for tests
- `CANDIDATE_BODY_FIELDS` approach chosen for body extraction — the OTS API research noted MEDIUM confidence on the body field name; trying multiple candidates prevents silent empty-string articles while the real field name is confirmed
- Dedup uses `article.findFirst({ source: 'OTS_AT', externalId: item.OTSKEY })` directly (not `isDuplicate` from dedup.ts) — `isDuplicate` requires a contentHash argument which doesn't exist until after the detail fetch; a pre-fetch existence check is the correct split

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
- `npx` not on PATH in this shell environment — resolved by prefixing all commands with `PATH="/Users/philipp/.nvm/versions/node/v25.8.0/bin:$PATH"` (same pattern as prior plans in this phase).

## User Setup Required
None - no external service configuration required (OTS_API_KEY is required at runtime but is a deployment concern, not a test concern).

## Next Phase Readiness
- `createOtsAtAdapter` and `otsAtAdapter` exported from `src/lib/ingestion/adapters/ots-at.ts`
- Plan 02-04 (RSS adapter) can proceed without any dependency on this plan
- Plan 02-05 (adapter registry) and 02-06 (ingest orchestrator) can import `otsAtAdapter` directly

---
*Phase: 02-ingestion*
*Completed: 2026-03-21*

## Self-Check: PASSED

All 3 required files exist. Both task commits (322f312, 7a9a8f5) verified in git history.
