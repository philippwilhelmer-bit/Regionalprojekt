---
phase: 02-ingestion
plan: 07
subsystem: ingestion
tags: [typescript, prisma, vitest, rss, adapters]

# Dependency graph
requires:
  - phase: 02-ingestion
    provides: "AdapterFn type, rssAdapter, otsAtAdapter, adapterRegistry, ingest() orchestrator"
provides:
  - "Zero TypeScript errors across all production and test source files"
  - "AdapterFn correctly typed as (source: Source) => Promise<RawItem[]>"
  - "rss.ts Atom path with guaranteed string externalId via computeContentHash fallback"
  - "adapterRegistry without unsafe casts"
  - "ingest.ts adapter invocation without illegal cast"
affects: [03-generation, 04-api]

# Tech tracking
tech-stack:
  added: []
  patterns: [AdapterFn uses Prisma Source model (not ArticleSource enum) for full source row access]

key-files:
  created: []
  modified:
    - src/lib/ingestion/types.ts
    - src/lib/ingestion/adapters/registry.ts
    - src/lib/ingestion/ingest.ts
    - src/lib/ingestion/adapters/rss.ts
    - src/lib/ingestion/adapters/ots-at.test.ts
    - src/lib/ingestion/ingest.test.ts

key-decisions:
  - "AdapterFn parameter changed from ArticleSource (enum) to Source (Prisma model) — enables adapters to access source.url and other row fields without unsafe casts"
  - "ingest.test.ts mock pattern changed from vi.spyOn accessor to direct property assignment on adapterRegistry — avoids vitest overload incompatibility with Partial<Record<K,V>>"
  - "ots-at.test.ts fetchSpy typed as any — vi.spyOn return type for overloaded fetch is not assignable to ReturnType<typeof vi.spyOn>"

patterns-established:
  - "Test pattern: mock adapterRegistry entries via direct property assignment with afterEach restore, not vi.spyOn accessor"

requirements-completed: [ING-01, ING-02, ING-03, ING-04, ING-05]

# Metrics
duration: 5min
completed: 2026-03-21
---

# Phase 2 Plan 07: TypeScript Gap Closure Summary

**TypeScript type gap closed: AdapterFn now uses Source (Prisma model), removing all unsafe casts from registry.ts and ingest.ts, and adding Atom externalId fallback in rss.ts — tsc --noEmit exits 0, all 49 tests GREEN**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-21T23:49:46Z
- **Completed:** 2026-03-21T23:53:57Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Changed `AdapterFn = (source: Source) => Promise<RawItem[]>` — correct Prisma model type, not enum
- Removed `rssAdapter as unknown as AdapterFn` cast from registry.ts
- Removed `(adapterFn as (s: Source) => ...)` cast from ingest.ts adapter invocation
- Fixed rss.ts Atom path: `entry.id ?? computeContentHash(title, summary)` guarantees string externalId
- Fixed test files that broke from AdapterFn type change (direct consequence of the fix)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix AdapterFn type and downstream casts** - `be5420b` (fix)
2. **Task 2: Fix rss.ts Atom externalId and run tsc** - `cc9eaf8` (fix)

**Plan metadata:** (docs commit — see final commit)

## Files Created/Modified
- `src/lib/ingestion/types.ts` — AdapterFn parameter: ArticleSource → Source
- `src/lib/ingestion/adapters/registry.ts` — removed unsafe cast and obsolete comment on rssAdapter
- `src/lib/ingestion/ingest.ts` — removed illegal adapter invocation cast, updated stale comments
- `src/lib/ingestion/adapters/rss.ts` — Atom branch externalId: entry.id ?? computeContentHash fallback
- `src/lib/ingestion/adapters/ots-at.test.ts` — pass Source object (not string) to adapter; type fetchSpy as any
- `src/lib/ingestion/ingest.test.ts` — replace vi.spyOn accessor with direct registry property assignment

## Decisions Made
- Changed `AdapterFn` parameter from `ArticleSource` (enum) to `Source` (Prisma model) — this is the root fix: rssAdapter always needed `source.url` (a Prisma Source field, not available on the enum), so the type was wrong from when it was first written.
- `ingest.test.ts` mock strategy changed to direct property assignment: `adapterRegistry.OTS_AT = vi.fn()...` with `afterEach` restore. The `vi.spyOn(obj, key, 'get')` accessor overload requires getter-typed properties; plain value properties on `Partial<Record<K,V>>` don't satisfy vitest's TypeScript overloads.
- `fetchSpy` typed as `any` in ots-at.test.ts: `ReturnType<typeof vi.spyOn>` is the zero-argument overload's return, incompatible with the `MockInstance<fetch>` returned by spying on a global overloaded function. Using `any` is the established pattern for mocking overloaded globals.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test files broken by AdapterFn type change**
- **Found during:** Task 2 (after running tsc to verify zero errors)
- **Issue:** `ots-at.test.ts` called `adapter('OTS_AT')` (string) instead of a `Source` object; `ingest.test.ts` used `vi.spyOn(registry, 'OTS_AT', 'get')` which TypeScript rejects for plain value properties on `Partial<Record<K,V>>`; `fetchSpy` typed incorrectly causing overload mismatch.
- **Fix:** Added `makeSource()` helper and replaced string args with `Source` objects in ots-at.test.ts; rewrote ingest.test.ts mock strategy to use direct registry assignment; typed fetchSpy as `any`.
- **Files modified:** src/lib/ingestion/adapters/ots-at.test.ts, src/lib/ingestion/ingest.test.ts
- **Verification:** tsc --noEmit exits 0; all 49 tests GREEN
- **Committed in:** cc9eaf8 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — direct consequence of planned type fix)
**Impact on plan:** Necessary side-effect of fixing the AdapterFn type. Tests were testing the old incorrect type; fixing them is part of the type gap closure. No scope creep.

## Issues Encountered
- `vi.spyOn(obj, key, 'get')` accessor pattern is incompatible with plain value properties on `Partial<Record<K,V>>` in vitest 2.x — TypeScript correctly rejects it. Replaced with direct property mutation + afterEach restore, which is simpler and more reliable.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 2 is now fully signed off: 49 tests GREEN, tsc --noEmit exits 0, no unsafe casts
- Phase 3 (Generation) can begin on a clean TypeScript foundation
- AdapterFn type is now correct and stable for future adapters

## Self-Check: PASSED

All files confirmed on disk. All task commits confirmed in git log.

---
*Phase: 02-ingestion*
*Completed: 2026-03-21*
