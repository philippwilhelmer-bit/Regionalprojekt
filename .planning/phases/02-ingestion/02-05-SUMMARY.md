---
phase: 02-ingestion
plan: 05
subsystem: ingestion
tags: [vitest, tdd, prisma, pglite, adapter-registry, health-tracking, dedup, ingestion-run]

# Dependency graph
requires:
  - phase: 02-ingestion
    plan: 02
    provides: RawItem interface, AdapterFn type in types.ts
  - phase: 02-ingestion
    plan: 03
    provides: createOtsAtAdapter factory, otsAtAdapter default export
  - phase: 02-ingestion
    plan: 04
    provides: rssAdapter for RSS/Atom feeds

provides:
  - adapterRegistry: Partial<Record<ArticleSource, AdapterFn>> — OTS_AT/RSS mapped, MANUAL absent
  - ingest(source): core orchestrator with IngestionRun open/close, dedup, Article.create, health tracking
  - listSources(options?): Source DAL with enabled filter and DI overloads
  - getSourceById(id): Source DAL lookup with DI overloads
  - updateSourceHealth(id, patch): health patch write with DI overloads
  - HEALTH_FAILURE_THRESHOLD = 3 constant for DEGRADED/DOWN transitions
  - 16 new passing tests (8 ingest + 5 sources + 3 registry)

affects: [02-06, 03-tagging, 05-cms]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "adapterRegistry pattern: Partial<Record<ArticleSource, AdapterFn>> — single registry for all polling adapters"
    - "ingest() orchestrator: IngestionRun framing (open at start, close with counts or error) + health tracking in same transaction-less flow"
    - "Health threshold: DEGRADED (>=1 failure), DOWN (>=HEALTH_FAILURE_THRESHOLD=3), OK on success — module constant, Phase 5 makes it configurable"
    - "Structured console.warn on health transitions — no external alert service in Phase 2"
    - "vi.spyOn(registryModule.adapterRegistry, 'OTS_AT', 'get') — spy on registry property getter for adapter mocking in ingest() tests"

key-files:
  created:
    - src/lib/ingestion/adapters/registry.ts
    - src/lib/ingestion/ingest.ts
    - src/lib/content/sources.ts
  modified:
    - src/lib/ingestion/adapters/registry.test.ts
    - src/lib/ingestion/ingest.test.ts
    - src/lib/content/sources.test.ts

key-decisions:
  - "rssAdapter cast to AdapterFn in registry via 'as unknown as AdapterFn' — rssAdapter takes Source (Prisma model, has .url) not ArticleSource enum; ingest() always passes the full Source row which satisfies both signatures"
  - "HEALTH_FAILURE_THRESHOLD = 3 as module-level constant in ingest.ts — Phase 5 CMS will make it configurable per-source; no premature abstraction"
  - "vi.spyOn on adapterRegistry property getter pattern for ingest() tests — avoids mocking the entire module, targets only the adapter resolution point"
  - "updateSourceHealth takes explicit SourceHealthPatch struct — ingest() computes the new values; DAL is a dumb writer with no threshold logic"

patterns-established:
  - "Adapter mocking in orchestrator tests: vi.spyOn(registryModule.adapterRegistry, 'KEY', 'get').mockReturnValue(vi.fn()...)"
  - "IngestionRun framing: create at start, update with finishedAt + counts or error — never left open"

requirements-completed: [ING-04, ING-05]

# Metrics
duration: 15min
completed: 2026-03-21
---

# Phase 2 Plan 05: Adapter registry + core ingest() + Source DAL Summary

**Full ingestion pipeline wired end-to-end: adapterRegistry maps source types to adapters, ingest() orchestrates IngestionRun framing + dedup + health tracking, and Source DAL exposes listSources/updateSourceHealth — 16 tests GREEN**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-21T23:03:00Z
- **Completed:** 2026-03-21T23:22:00Z
- **Tasks:** 2 (1 RED + 1 GREEN)
- **Files modified:** 6

## Accomplishments
- `adapterRegistry` wires OTS_AT and RSS adapters; MANUAL is intentionally absent from the registry
- `ingest()` provides the full orchestration loop: open IngestionRun → resolve adapter → fetch → per-item dedup via `isDuplicate()` → `article.create()` for new items → close IngestionRun with counts or error → update source health
- Health transitions fully tested: DEGRADED after 1-2 failures, DOWN at threshold 3, OK reset on success with `lastSuccessAt`
- Source DAL: `listSources` with enabled filter, `getSourceById`, `updateSourceHealth` — all with TypeScript DI overloads matching established project pattern
- Full ingestion suite: 32 tests passing (8 ingest + 5 sources + 3 registry + 16 pre-existing)

## Task Commits

Each task was committed atomically:

1. **Task 1: RED registry and sources DAL tests** - `815301a` (test)
2. **Task 2: registry, sources DAL, and core ingest() implementation GREEN** - `4c35eee` (feat)

**Plan metadata:** (docs commit follows)

_Note: TDD tasks — RED commit first, then GREEN implementation commit_

## Files Created/Modified
- `src/lib/ingestion/adapters/registry.ts` - adapterRegistry map: OTS_AT → otsAtAdapter, RSS → rssAdapter
- `src/lib/ingestion/ingest.ts` - ingest() orchestrator with health tracking and IngestionRun framing
- `src/lib/content/sources.ts` - Source DAL: listSources, getSourceById, updateSourceHealth
- `src/lib/ingestion/adapters/registry.test.ts` - 3 tests for key resolution (OTS_AT/RSS/MANUAL)
- `src/lib/ingestion/ingest.test.ts` - 8 tests for ingest() orchestration and health transitions
- `src/lib/content/sources.test.ts` - 5 tests for listSources filter and updateSourceHealth transitions

## Decisions Made
- `rssAdapter` cast to `AdapterFn` in registry via `as unknown as AdapterFn` — rssAdapter signature is `(source: Source)` (Prisma model with `.url`) while `AdapterFn` uses `ArticleSource` enum; ingest() passes the full Source row which satisfies both
- `HEALTH_FAILURE_THRESHOLD = 3` as module-level constant in `ingest.ts` — Phase 5 CMS will expose it as a configurable per-source setting; no premature abstraction now
- `updateSourceHealth` takes an explicit `SourceHealthPatch` struct — ingest() computes the correct new values; the DAL function is a dumb writer with no embedded threshold logic
- Adapter mocking pattern for ingest() tests: `vi.spyOn(registryModule.adapterRegistry, 'OTS_AT', 'get')` — targets only the registry lookup point, no full module mock needed

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
- `npx` not on PATH in this shell environment — resolved by prefixing all commands with `PATH="/Users/philipp/.nvm/versions/node/v25.8.0/bin:$PATH"` (same pattern as prior plans in this phase).
- Pre-existing timeout failures in `articles.test.ts` and `bezirke.test.ts` — these are Wave 0 stubs for future plans, not caused by this plan's changes. Confirmed in-scope tests (ingestion + sources) all pass.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `adapterRegistry`, `ingest()`, `listSources`, `getSourceById`, `updateSourceHealth` all implemented and tested
- Plan 02-06 (ingest cron/scheduler) can import `ingest()` directly and call `listSources({ enabled: true })` to get sources to poll
- ING-04 (health tracking) and ING-05 (adapter plug-in contract) complete: adding a new adapter to `registry.ts` is the only change needed for a new source type
- Full ingestion pipeline functional end-to-end

---
*Phase: 02-ingestion*
*Completed: 2026-03-21*

## Self-Check: PASSED

All 7 required files exist. Both task commits (815301a, 4c35eee) verified in git history.
