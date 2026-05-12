---
phase: 44-cost-telemetry-adapter-hardening
plan: 44-04
subsystem: ingestion
tags: [prisma, abort-controller, conditional-get, http-cache, transactions, rss, ots]

# Dependency graph
requires:
  - phase: 43-ai-pipeline-quick-wins
    provides: legacy ingestion adapter scaffolding (ots-at.ts, rss.ts), ingest.ts orchestrator, AdapterFn registry
provides:
  - bulk dedup pattern for adapters (single findMany + Set diff instead of N findFirst)
  - shared fetchWithTimeout helper with 10s AbortController for all ingestion HTTP
  - AdapterResult envelope (Option A unified return) — items + tri-state etag/lastModified
  - polling cursor (Source.lastFetchedAt) with 30-min overlap window
  - RSS conditional-GET (If-None-Match + If-Modified-Since) with 304 short-circuit
  - transactional close pattern (IngestionRun.update + Source.update in one db.$transaction)
affects: [phase 45, ingest-monitoring, future adapters]

# Tech tracking
tech-stack:
  added: []  # no new npm dependencies
  patterns:
    - "AdapterFn → Promise<AdapterResult> with tri-state etag/lastModified semantics (null=skip, undefined=preserve, string=write)"
    - "fetchWithTimeout(url, init) helper — explicit AbortController + setTimeout/clearTimeout (not AbortSignal.timeout, for testability)"
    - "Conditional spread for tri-state Prisma updates: ...(typeof x === 'string' ? { col: x } : {})"
    - "Proxy-wrap PrismaClient in tests when vi.spyOn doesn't work (Prisma client is itself a Proxy)"

key-files:
  created:
    - "prisma/migrations/20260514_phase44_source_cursor/migration.sql"
    - "src/lib/ingestion/fetch-utils.ts"
    - "src/lib/ingestion/fetch-utils.test.ts"
  modified:
    - "prisma/schema.prisma"
    - "src/lib/ingestion/types.ts"
    - "src/lib/ingestion/adapters/ots-at.ts"
    - "src/lib/ingestion/adapters/ots-at.test.ts"
    - "src/lib/ingestion/adapters/rss.ts"
    - "src/lib/ingestion/adapters/rss.test.ts"
    - "src/lib/ingestion/ingest.ts"
    - "src/lib/ingestion/ingest.test.ts"
    - "src/test/validation.test.ts"

key-decisions:
  - "Option A — unified AdapterResult envelope. AdapterFn now returns { items, etag?, lastModified? } for ALL adapters (OTS sets etag=null, lastModified=null). Keeps ingest.ts as the single transaction site for INGEST-05."
  - "Tri-state etag/lastModified semantics: null=adapter has no support (don't touch column), undefined=304 (preserve prior), string=200 (persist new). Implemented in ingest.ts via conditional spread of update payload."
  - "Explicit AbortController + setTimeout/clearTimeout instead of AbortSignal.timeout(). The explicit form is testable (can assert controller.signal.aborted and that the timer was cleared)."
  - "Defensive guard: skip Prisma findMany entirely when filteredList is empty (avoids round-trip on quiet polling windows)."
  - "Proxy-wrap PrismaClient in two test sites — vi.spyOn cannot wrap the Prisma client's $-prefixed methods because Prisma exposes them through a Proxy get trap (property descriptor is value: undefined until accessed)."

patterns-established:
  - "AdapterResult tri-state for HTTP-cache validators — applicable beyond ingestion to any adapter with optional cache support"
  - "Transactional close: IngestionRun + Source health updated atomically (both paths) — pattern for any orchestrator with side-by-side success/failure rows"
  - "fetchWithTimeout helper as a project-wide convention for any external HTTP outside the AI SDK (which has its own retry/timeout)"

requirements-completed: [INGEST-01, INGEST-02, INGEST-03, INGEST-04, INGEST-05]

# Metrics
duration: ~20 min (4 task commits + ripple fix)
completed: 2026-05-12
---

# Phase 44 Plan 04: Ingestion Hardening Summary

**Bulk-dedup OTS adapter, conditional-GET RSS with 304 short-circuit, source-cursor schema, and atomic IngestionRun/Source health updates — all five INGEST truths now hold.**

## Performance

- **Duration:** ~20 min (start 17:04 UTC, end 17:21 UTC)
- **Started:** 2026-05-12T17:04:00Z
- **Completed:** 2026-05-12T17:24:00Z (incl. ripple fix + SUMMARY)
- **Tasks:** 4 (all auto-completed; no checkpoints)
- **Files modified:** 11 source + 4 docs (PROGRESS.md, SUMMARY.md, migration.sql, schema.prisma)

## Accomplishments

- **INGEST-01:** OTS adapter does exactly one Prisma `findMany({ where: { in: keys } })` regardless of OTS list size, replacing the N-call `findFirst` loop. Defensive empty-list guard skips the DB roundtrip when no items pass keyword pre-filter.
- **INGEST-02:** Every external HTTP call in both OTS (`/api/liste`, `/api/detail`) and RSS adapters now carries a 10s `AbortController` signal via the shared `fetchWithTimeout` helper.
- **INGEST-03:** OTS uses `Source.lastFetchedAt - 30min` as the list-window cursor, with a 24h fallback when null (first run / new source). `ingest.ts` persists `lastFetchedAt = new Date()` on every successful round-trip — including 304 (we still made the round-trip, the cursor advances).
- **INGEST-04:** RSS adapter sends `If-None-Match` and `If-Modified-Since` headers when validators exist on the Source row. A 304 response short-circuits before `response.text()` — the test asserts the spy on `.text()` is never called. On 200, the server's `ETag` and `Last-Modified` are forwarded verbatim (no W/ stripping). Null validators omit the conditional headers entirely (avoids pitfall #7 — sending literal "null" would 412 on strict servers).
- **INGEST-05:** Both success and failure paths in `ingest.ts` now wrap `IngestionRun.update` + `Source.update` in a single `db.$transaction([...])`. A process kill between them can no longer leave `Source.healthStatus` divergent from `IngestionRun.finishedAt`.

## Task Commits

Each task was committed atomically:

1. **Task 1: schema migration + fetchWithTimeout helper** — `79cb1ed` (feat)
2. **Task 2: OTS bulk dedup + lastFetchedAt cursor + AbortController** — `6a3cbf5` (refactor)
3. **Task 3: RSS conditional GET + 304 short-circuit + AbortController** — `c92ae05` (refactor)
4. **Task 4: transactional health update + persist source cursor and validators** — `6559a00` (refactor)

## Files Created/Modified

### Created
- **`prisma/migrations/20260514_phase44_source_cursor/migration.sql`** — Three `ALTER TABLE "Source"` statements adding `lastFetchedAt TIMESTAMP(3)`, `etag TEXT`, `lastModified TEXT`. All nullable for back-compat.
- **`src/lib/ingestion/fetch-utils.ts`** — Pure helper `fetchWithTimeout(url, init)` wrapping `fetch` with an `AbortController` + 10s `setTimeout`/`clearTimeout`. Try/finally only — rejections propagate naturally; the finally clears the timer.
- **`src/lib/ingestion/fetch-utils.test.ts`** — 4 unit tests: single fetch call with signal, no leaked timers on success, abort/reject at 10s with fake timers, header forwarding.

### Modified
- **`prisma/schema.prisma`** — `Source` model gained three nullable columns with phase 44 comment.
- **`src/lib/ingestion/types.ts`** — `AdapterFn` return widened from `RawItem[]` to `AdapterResult { items, etag?, lastModified? }`. Inline JSDoc documents tri-state semantics.
- **`src/lib/ingestion/adapters/ots-at.ts`** — `fetchOtsList` signature now takes `(apiKey, vonEpochSeconds)`; both `fetchOtsList` and `fetchOtsDetail` route through `fetchWithTimeout`. Cursor formula uses `source.lastFetchedAt` with 30-min overlap. Bulk dedup via single `findMany + Set` diff replaces N `findFirst` loop. Returns `{ items, etag: null, lastModified: null }`.
- **`src/lib/ingestion/adapters/ots-at.test.ts`** — 10 tests covering INGEST-01 (single findMany count + arg shape), INGEST-02 (signals on list + detail fetches), INGEST-03 (both cursor branches), return shape, keyword pre-filter, mapping, empty-list defensive, error throw. INGEST-01 uses a Proxy-wrap of `prisma` to count findMany calls (vi.spyOn unreliable on Prisma model proxy).
- **`src/lib/ingestion/adapters/rss.ts`** — Routes through `fetchWithTimeout`. Conditional `If-None-Match` / `If-Modified-Since` headers (only when source has them, never literal "null"). 304 short-circuit returns `{ items: [], etag: undefined, lastModified: undefined }`. 200 path captures `response.headers.get('etag')` / `'last-modified'` before parsing. RSS 2.0 / Atom 1.0 / keyword-filter logic preserved verbatim.
- **`src/lib/ingestion/adapters/rss.test.ts`** — 14 tests covering both conditional-header branches, 304 short-circuit + `.text()` not called, 200 validators forwarded (with/without server headers), AbortSignal attached, RSS 2.0 + Atom 1.0 + keyword filter + error throw.
- **`src/lib/ingestion/ingest.ts`** — Destructures `adapterResult.items` from new envelope. Success and failure paths now wrap two updates in `db.$transaction([...])`. Success update adds `lastFetchedAt: new Date()` plus conditional `etag`/`lastModified` via spread of `typeof x === 'string' ? { ... } : {}`. Module-level JSDoc documents the tri-state contract for future adapter authors.
- **`src/lib/ingestion/ingest.test.ts`** — 6 new tests added (14 total): transactional success + failure (Proxy-wrap on `$transaction`), `lastFetchedAt` persisted on success, all three etag tri-state branches.
- **`src/test/validation.test.ts`** — Rule-3 ripple fix: 3 `vi.fn().mockResolvedValue([...])` mocks of `adapterRegistry.RSS` updated to `AdapterResult` envelope. One `global.fetch` mock upgraded from bare object literal to real `new Response(...)` (rss.ts now reads `response.headers.get('etag')`).

## Decisions Made

- **Option A — unified AdapterResult envelope:** Both adapters share one return shape. OTS sets etag/lastModified to null (tri-state "skip"). The plan offered Option B (RSS adapter takes db via factory and writes columns itself); A was chosen because (a) only two adapters today, (b) etag/lastModified are conceptually adapter-output not side-effect, (c) ingest.ts stays the single transaction site (INGEST-05 wants atomicity).
- **Tri-state etag/lastModified vs. simpler null-only:** Three states are required by the requirement: 304 must NOT clear the previously stored validator (would force an unconditional GET next time), null must NOT clear (OTS would clobber its forever-null state), and string must write. Conditional spread (`...(typeof x === 'string' ? { col: x } : {})`) maps tri-state to Prisma's "absent key = no change" semantics.
- **Proxy-wrap over vi.spyOn for Prisma:** The Prisma client is itself a Proxy. `vi.spyOn(prisma, '$transaction')` sees `value: undefined` on the property descriptor and replaces it with a spy that calls `undefined.apply(...)`. Same issue with `vi.spyOn(prisma.article, 'findMany')` — the `article` accessor doesn't materialize the model proxy at descriptor time. Wrapping `prisma` in a manual `new Proxy(prisma, { get })` with a passthrough for the specific method is reliable across vitest test boundaries.
- **Explicit AbortController over AbortSignal.timeout():** Both achieve the same wall-clock behavior, but the explicit form is observable in tests (`signal.aborted` after `vi.advanceTimersByTime`) and the `clearTimeout` call is asserted via `vi.getTimerCount() === 0`. `AbortSignal.timeout()` would hide that machinery in SDK internals.

### Tri-state semantics table (operator-facing reference)

| Adapter return | Prisma update for `etag` column | Outcome |
| --- | --- | --- |
| `etag: null` (OTS) | key omitted (spread skips) | Source.etag stays at whatever it was (always NULL for OTS) |
| `etag: undefined` (RSS 304) | key omitted (spread skips) | Source.etag preserved — next poll re-uses prior validator |
| `etag: '"abc"'` (RSS 200) | `{ etag: '"abc"' }` | Source.etag overwritten to new value |

Same table applies to `lastModified`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated `src/test/validation.test.ts` mocks for new AdapterResult shape**
- **Found during:** Task 4 (full test-suite verification)
- **Issue:** validation.test.ts mocks `adapterRegistry.RSS` directly with `vi.fn().mockResolvedValue([rawItem...])` at 3 sites and uses a bare `{ ok, text }` object as a fetch mock. Both broke when AdapterFn return widened and rss.ts started calling `response.headers.get('etag')`.
- **Fix:** Wrapped the 3 mock arrays in `{ items: [...], etag: null, lastModified: null }`. Upgraded the fetch mock to `new Response(fixtureXml, { status: 200 })`.
- **Files modified:** src/test/validation.test.ts
- **Verification:** `npm test -- validation.test` → 12/12 pass.
- **Committed in:** 6559a00 (Task 4 commit)

**2. [Rule 1 - Bug] Test data: two `makeRawItem()` calls produced same default externalId**
- **Found during:** Task 4 (running new "transactional success" test)
- **Issue:** `mockOtsAdapter([makeRawItem(), makeRawItem({ externalId: 'item-002' })])` — first call used the default `'item-001'`. Both items hashed to the same content (`Test Article` / `Test body content`) so the dedup logic filtered the second one out, breaking the `itemsNew == 2` assertion.
- **Fix:** Made the two items distinguishable: `({ externalId: 'tx-001', title: 'Tx One', body: 'body-one' })` and `({ externalId: 'tx-002', title: 'Tx Two', body: 'body-two' })`.
- **Files modified:** src/lib/ingestion/ingest.test.ts
- **Verification:** transactional-success test now reports `itemsNew=2` as intended.
- **Committed in:** 6559a00 (Task 4 commit)

**3. [Rule 1 - Bug] fetch-utils test pattern — spy on global clearTimeout broke a later test in the same file**
- **Found during:** Task 1 (initial RED→GREEN cycle for fetch-utils)
- **Issue:** `vi.spyOn(globalThis, 'clearTimeout')` in test 2 replaced the global, and the SUT's `clearTimeout(timer)` then errored with `clearTimeout is not defined` in subsequent tests in the same file.
- **Fix:** Replaced the clearTimeout spy with a fake-timers assertion: `vi.useFakeTimers()` then `expect(vi.getTimerCount()).toBe(0)` after the fetch resolves. Equivalent semantics without monkey-patching globals.
- **Files modified:** src/lib/ingestion/fetch-utils.test.ts
- **Verification:** 4/4 fetch-utils tests pass; no cross-test interference.
- **Committed in:** 79cb1ed (Task 1 commit)

**4. [Rule 1 - Bug] fetch-utils test: unhandled rejection from simulated abort fired after test completion**
- **Found during:** Task 1 (initial GREEN run for "aborts when fetch exceeds 10s")
- **Issue:** The simulated fetch mock attached an `abort` listener that rejected with `AbortError`. With `vi.advanceTimersByTimeAsync`, the abort fired before the test attached its `.rejects` matcher, producing an unhandled rejection in vitest.
- **Fix:** Capture the `expect(promise).rejects.toThrow()` matcher BEFORE advancing the timers, then await it afterwards. Synchronous handler attachment prevents the unhandled-rejection warning.
- **Files modified:** src/lib/ingestion/fetch-utils.test.ts
- **Verification:** Test passes cleanly; no PromiseRejectionHandledWarning in stderr.
- **Committed in:** 79cb1ed (Task 1 commit)

**5. [Rule 1 - Bug] RSS test "does NOT parse body on 304" tried to construct a Response with body + status 304**
- **Found during:** Task 3 (TDD cycle)
- **Issue:** Node's Response constructor rejects `new Response('<body>', { status: 304 })` — per spec, 304 must have null body. The test was clever but invalid.
- **Fix:** Rephrased the test: construct `new Response(null, { status: 304 })`, spy on `response.text()`, and assert `textSpy` was never called. Equivalent intent ("body parse is skipped"), valid construction.
- **Files modified:** src/lib/ingestion/adapters/rss.test.ts
- **Verification:** 14/14 RSS tests pass.
- **Committed in:** c92ae05 (Task 3 commit)

---

**Total deviations:** 5 auto-fixed (1 Rule 3 ripple, 4 Rule 1 test-pattern bugs in newly-authored tests)
**Impact on plan:** All auto-fixes were corrections to test scaffolding I authored during this same plan — none changed adapter behavior or schema. Plan executed exactly as specified for production code paths. No scope creep.

## Issues Encountered

- **`vi.spyOn` on Prisma's Proxy-backed `$`-methods and model proxies is unreliable** — solved by manual `new Proxy(prisma, { get })` wrap in two test sites (ots-at.test.ts INGEST-01, ingest.test.ts INGEST-05 success+failure). Documented in the inline comment of each wrap so future authors don't re-hit it. Pattern is now reusable across the project for any Prisma-method spy.
- **Schema-migration ripple to existing test stubs:** `Source` literal stubs in tests stopped type-checking after the three new columns were added (test only — code paths use `as Source` cast). Fixed in Task 2 and Task 3 by adding `lastFetchedAt: null, etag: null, lastModified: null` to the test helpers. No production code touched.
- **The plan's annotation that `depends_on: ["44-03"]` is ordering-only is honored** — 44-04 was implemented with zero code from 44-03 (which is deferred). The only assumption was that no concurrent migration would land between 44-04's migration timestamp and the next phase 44 plan.

## Verification

- `npm test -- fetch-utils.test ots-at.test rss.test ingest.test` → **53/53 pass**
- `npm test -- validation.test` → **12/12 pass** (after Rule-3 ripple fix)
- `npm test` (full suite) → **421/423 pass**. The 2 remaining failures plus 1 suite-level failure are the documented baseline (`bezirke.test.ts CONF-02` data drift x2, `root-layout-adsense.test.ts` Plus_Jakarta_Sans font loader). None of my changes worsen the baseline.
- `npx tsc --noEmit` → 2 errors remain, both pre-existing baseline (`map-actions.test.ts:182` `afterEach` import, `mapgen.test.ts:193` `ArrayBuffer | SharedArrayBuffer` mismatch from Node 24 upgrade).

## Operator-Visible Behavior Changes

Once deployed:
- **RSS sources will show a one-time payload-size spike** on the first poll after deploy (the `If-None-Match` header is null until the first successful poll persists an etag). Subsequent polls of an unchanged feed will show 304 responses in HTTP logs and `Source.etag` populated.
- **OTS-AT sources will issue fewer DB queries per poll** — one `Article.findMany` regardless of list size, replacing what was previously a per-item `findFirst` loop. Observable in Prisma query logs as a single `SELECT ... WHERE externalId IN (...)` per ingestion run.
- **`Source.lastFetchedAt` populates on every successful run** (including RSS 304). This is the cursor for the next OTS-AT poll; RSS uses it informationally only.
- **A process kill between IngestionRun close and Source health update is now impossible** — both wrap in a single transaction. Crash recovery sees either both-completed or both-pending.

## Next Phase Readiness

- Phase 44 hardening goals **3, 4, and 5 are met** (per success criteria in `44-04-PLAN.md`):
  - ✅ OTS dedup is one findMany regardless of list size
  - ✅ Unchanged RSS feed returns 304 and skips body parse
  - ✅ Process kill between IngestionRun + Source updates never leaves them divergent
- Phase 44 goals **1–2 (telemetry + Batches)** remain deferred per top-of-PLAN.md admonition on 44-01/02/03. The `Source.lastFetchedAt` cursor + etag/lastModified columns are independent of and compatible with whatever telemetry schema 44-01 lands later.
- No follow-up blockers from 44-04. The Prisma Proxy spy pattern (and its workaround) is worth a one-liner in DECISIONS.md if more transactional tests are written.

## Self-Check: PASSED

- Created files exist: fetch-utils.ts, fetch-utils.test.ts, migration.sql, 44-04-SUMMARY.md
- Commits exist: 79cb1ed, 6a3cbf5, c92ae05, 6559a00
- All five INGEST truths verified (single findMany, conditional GET headers + 304 short-circuit, transactional close on both paths)

---
*Phase: 44-cost-telemetry-adapter-hardening*
*Completed: 2026-05-12*
