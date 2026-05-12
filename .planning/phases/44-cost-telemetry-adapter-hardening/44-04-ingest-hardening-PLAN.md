---
phase: 44-cost-telemetry-adapter-hardening
plan: 44-04
type: execute
wave: 4
depends_on: ["44-03"]
files_modified:
  - prisma/schema.prisma
  - prisma/migrations/20260514_phase44_source_cursor/migration.sql
  - src/lib/ingestion/adapters/ots-at.ts
  - src/lib/ingestion/adapters/ots-at.test.ts
  - src/lib/ingestion/adapters/rss.ts
  - src/lib/ingestion/adapters/rss.test.ts
  - src/lib/ingestion/ingest.ts
  - src/lib/ingestion/ingest.test.ts
  - PROGRESS.md
autonomous: true
requirements: [INGEST-01, INGEST-02, INGEST-03, INGEST-04, INGEST-05]

must_haves:
  truths:
    - "The OTS adapter issues at most one DB query to check for duplicate external IDs regardless of list size"
    - "An unchanged RSS feed returns HTTP 304 and the adapter skips body parsing entirely (verifiable by log or test)"
    - "A process kill between IngestionRun.update and Source.healthStatus update leaves both fields consistent on the next read"
  artifacts:
    - path: "prisma/migrations/20260514_phase44_source_cursor/migration.sql"
      provides: "Source × 3 new columns: lastFetchedAt DateTime?, etag String?, lastModified String?. All nullable (existing rows remain valid)."
      contains: "ALTER TABLE \"Source\""
    - path: "src/lib/ingestion/adapters/ots-at.test.ts"
      provides: "New unit test file: bulk-dedup findMany, AbortController per fetch, lastFetchedAt cursor with 30-min overlap"
      min_lines: 100
    - path: "src/lib/ingestion/adapters/rss.test.ts"
      provides: "New unit test file: conditional GET (If-None-Match + If-Modified-Since), 304 short-circuit, etag/lastModified return on 200"
      min_lines: 80
  key_links:
    - from: "src/lib/ingestion/adapters/ots-at.ts:142-152"
      to: "single Prisma findMany call"
      via: "Replace N sequential findFirst calls with one findMany({ where: { source: 'OTS_AT', externalId: { in: keys } }, select: { externalId: true } }) + Set diff for new items"
      pattern: "findMany.*externalId.*in"
    - from: "src/lib/ingestion/adapters/ots-at.ts (fetchOtsList + fetchOtsDetail)"
      to: "AbortController 10s timeout per fetch"
      via: "Each external fetch wraps in fetchWithTimeout(url) helper: new AbortController + setTimeout(abort, 10_000) + clearTimeout in finally"
      pattern: "AbortController"
    - from: "src/lib/ingestion/adapters/ots-at.ts"
      to: "Source.lastFetchedAt cursor"
      via: "von = lastFetchedAt ? Math.floor(lastFetchedAt.getTime()/1000) - 30*60 : Math.floor(Date.now()/1000) - LOOKBACK_SECONDS; adapter receives Source and uses source.lastFetchedAt directly"
      pattern: "lastFetchedAt.*30.*60"
    - from: "src/lib/ingestion/adapters/rss.ts"
      to: "Source.etag + Source.lastModified (conditional GET)"
      via: "fetch headers include If-None-Match (when source.etag) and If-Modified-Since (when source.lastModified); 304 returns { items: [], etag: undefined, lastModified: undefined }; 200 returns { items, etag: response.headers.get('etag'), lastModified: response.headers.get('last-modified') }. Adapter return type expands to { items: RawItem[]; etag?: string | null; lastModified?: string | null }."
      pattern: "If-None-Match"
    - from: "src/lib/ingestion/ingest.ts (success path lines 132-146 + failure path lines 82-96)"
      to: "single db.$transaction([ingestionRun.update, source.update])"
      via: "Both paths wrap IngestionRun.update + Source.update in db.$transaction([...]) array form; success path additionally sets lastFetchedAt=new Date() and for RSS, etag/lastModified from adapter return"
      pattern: "\\$transaction"
---

<objective>
Tighten ingestion adapters along five dimensions that were known weak spots before Phase 44 started:
1. **INGEST-01:** Replace OTS sequential dedup (N findFirst calls) with one findMany.
2. **INGEST-02:** AbortController 10s timeout on every external fetch (OTS list/detail + RSS body).
3. **INGEST-03:** OTS cursor — `Source.lastFetchedAt` with 30-min overlap window (NULL → 24h fallback).
4. **INGEST-04:** RSS conditional GET — If-None-Match + If-Modified-Since; 304 short-circuit; persist new etag/lastModified on 200 only.
5. **INGEST-05:** IngestionRun + Source health updates wrapped in `db.$transaction` (both success and failure paths) so a crash never leaves them divergent.

Purpose: The ingestion path is the most failure-prone surface in the app (external HTTP, rate limits, transient outages). Current behavior is stall-prone (no timeouts), wasteful (full lookback every cron), and inconsistent on crash. Hardening is **pure refactor** — no behavior changes beyond these five requirement bullets.

Output: One migration (Source × 3 cols), two adapters refactored + new test files, ingest.ts transactional wrapping. Locks down the bulk of the v1.0 ingest debt.

**Critical:** This plan is INDEPENDENT of all AI-pipeline changes in 44-01..44-03. The strict sequential `depends_on: ["44-03"]` is a CONTEXT.md ordering lock to avoid concurrent migration history churn — there is no code-level dependency.
</objective>

<execution_context>
@/Users/philipp/.claude/get-shit-done/workflows/execute-plan.md
@/Users/philipp/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/44-cost-telemetry-adapter-hardening/44-CONTEXT.md
@.planning/phases/44-cost-telemetry-adapter-hardening/44-RESEARCH.md
@.planning/phases/44-cost-telemetry-adapter-hardening/44-VALIDATION.md
@AGENTS.md
@prisma/schema.prisma
@src/lib/ingestion/adapters/ots-at.ts
@src/lib/ingestion/adapters/rss.ts
@src/lib/ingestion/ingest.ts
@src/lib/ingestion/types.ts
@src/lib/ingestion/adapters/registry.ts

<interfaces>
<!-- Current AdapterFn signature (to be expanded for RSS return values) -->

From src/lib/ingestion/types.ts:
```typescript
export type AdapterFn = (source: Source) => Promise<RawItem[]>
export interface RawItem {
  externalId: string
  sourceUrl: string
  title: string
  body: string
  publishedAt?: Date | null
  imageUrl?: string
  rawPayload?: unknown
}
```

**Architectural decision (locked in this plan)** — research § Pattern 4 footnote presented two options for carrying etag/lastModified back to ingest.ts:
- Option A: Expand AdapterFn return type to `{ items: RawItem[]; etag?: string | null; lastModified?: string | null }` for ALL adapters. Breaking change but unified.
- Option B: RSS adapter takes db via factory function (like ots-at.ts:120 does), writes columns itself.

**Chosen: Option A.** Reasons: (1) two adapters today, easy to refactor both; (2) `etag`/`lastModified` are conceptually adapter-output, not adapter-side-effect; (3) keeps ingest.ts as the single transaction site (INGEST-05 wants atomicity); (4) OTS adapter returns `{ items, etag: null, lastModified: null }` and the no-op fields are explicit.

AbortController pattern (research § Pattern 3 — verbatim):
```typescript
async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 10_000)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } finally {
    clearTimeout(t)
  }
}
```
This helper lives in `src/lib/ingestion/fetch-utils.ts` (new file) and is shared by both adapters. Pure function, no DI, no test infrastructure needed beyond `vi.spyOn(global, 'fetch')` in adapter tests.

OTS cursor formula (CONTEXT.md locked):
```
von = source.lastFetchedAt
  ? Math.floor(source.lastFetchedAt.getTime() / 1000) - 30 * 60  // 30-min overlap
  : Math.floor(Date.now() / 1000) - LOOKBACK_SECONDS              // 24h fallback (existing constant)
```

ORF RSS validators (verified by live curl 2026-05-12 per research § Sources):
```
ETag: strong (no W/ prefix), e.g. "3e26-..."
Last-Modified: RFC 7231 date string
304 returned with empty body when either header matches
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: feat(44-04): schema migration + shared fetchWithTimeout helper</name>
  <files>prisma/schema.prisma, prisma/migrations/20260514_phase44_source_cursor/migration.sql, src/lib/ingestion/fetch-utils.ts, src/lib/ingestion/fetch-utils.test.ts</files>
  <behavior>
    fetch-utils.test.ts (RED first):
    - Test 1: `fetchWithTimeout('https://example.test/x')` calls `global.fetch` exactly once with the URL and a `signal: AbortSignal`. Spy on `global.fetch` and resolve with `new Response('ok')`.
    - Test 2: When fetch resolves quickly, `clearTimeout` is called (no leaked timer).
    - Test 3: When fetch hangs > 10s (use `vi.useFakeTimers`, return a Promise that never resolves, advance timer by 10_001ms), the AbortController.abort() is called and the rejection surfaces.
    - Test 4: When fetch is given `init: { headers: { foo: 'bar' } }`, those headers are forwarded.
  </behavior>
  <action>
    1. **Modify `prisma/schema.prisma`** — inside `model Source { ... }` (lines 110-129), append three nullable columns:
       ```
       lastFetchedAt   DateTime?
       etag            String?
       lastModified    String?
       ```
       All nullable so existing rows remain valid (OTS-AT cursor fallback handles NULL).

    2. **Run `npx prisma migrate dev --name phase44_source_cursor --create-only`** → verify generated SQL is three `ALTER TABLE "Source" ADD COLUMN ...` statements only. Rename folder to `20260514_phase44_source_cursor/` if timestamp differs. Apply with `npx prisma migrate dev`. Run `npx prisma generate`.

    3. **Create `src/lib/ingestion/fetch-utils.test.ts` FIRST (RED).** Pure unit test with `vi.spyOn(global, 'fetch')`. For Test 3, use `vi.useFakeTimers({ shouldAdvanceTime: false })`, mock fetch to return `new Promise(() => {})` (never resolves), call `fetchWithTimeout`, then `vi.advanceTimersByTime(10_001)`, then await the rejection.

    4. **Create `src/lib/ingestion/fetch-utils.ts` (GREEN):**
       ```typescript
       /**
        * Wraps fetch with an explicit AbortController + 10s timeout.
        * Research § Pattern 3: use explicit setTimeout+clearTimeout, NOT
        * AbortSignal.timeout() — the explicit form is testable (we can assert
        * the controller's abort method was called and clearTimeout fires).
        */
       export async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
         const ctrl = new AbortController()
         const t = setTimeout(() => ctrl.abort(), 10_000)
         try {
           return await fetch(url, { ...init, signal: ctrl.signal })
         } finally {
           clearTimeout(t)
         }
       }
       ```
       Pure function. No DI. Only try/finally (not try/catch) — the rejection propagates naturally; clearTimeout is the only finally responsibility.

    5. No new npm deps.

    Why per requirement: INGEST-02 (10s timeout); pre-req for tasks 2-3.
  </action>
  <verify>
    <automated>npx prisma generate &amp;&amp; npm test -- fetch-utils.test</automated>
  </verify>
  <done>
    Migration applied (Source has three new nullable columns). `fetch-utils.test` passes four cases. Conventional commit: `feat(44-04): add source cursor schema + fetchWithTimeout helper`.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: refactor(44-04): OTS adapter — bulk dedup + lastFetchedAt cursor + AbortController</name>
  <files>src/lib/ingestion/adapters/ots-at.ts, src/lib/ingestion/adapters/ots-at.test.ts, src/lib/ingestion/types.ts</files>
  <behavior>
    ots-at.test.ts (RED first):
    - Test 1 (INGEST-01 "bulk dedup"): Mock OTS list to return 5 items. Pre-insert 2 of their OTSKEYs into pglite Article table (source='OTS_AT'). Spy `prismaClient.article.findMany`. Run adapter. Assert: `findMany` called exactly 1 time, with `where: { source: 'OTS_AT', externalId: { in: ['k1','k2','k3','k4','k5'] } }, select: { externalId: true }`. The adapter returns 3 RawItems (the non-duplicates).
    - Test 2 (INGEST-03 "lastFetchedAt cursor — set"): Source with `lastFetchedAt = new Date('2026-05-12T10:00:00Z')`. Spy `global.fetch`. Run adapter. Assert: the OTS list URL has `von=<floor(epoch_seconds_of_lastFetchedAt - 30*60)>` (= 2026-05-12T09:30:00Z in epoch seconds).
    - Test 3 (INGEST-03 "lastFetchedAt cursor — null"): Source with `lastFetchedAt = null`. URL has `von=<floor(Date.now()/1000) - LOOKBACK_SECONDS>` (24h ago). Use `vi.useFakeTimers` + `vi.setSystemTime` for determinism.
    - Test 4 (INGEST-02 "AbortController on fetchOtsList"): Spy `global.fetch`. Run adapter. Assert: fetch called with `signal` being an AbortSignal.
    - Test 5 (INGEST-02 "AbortController on fetchOtsDetail"): Same — assert each detail call has signal.
    - Test 6 (return shape): adapter returns `{ items: RawItem[], etag: null, lastModified: null }` (Option A unified shape; OTS doesn't use conditional GET).
    - Test 7 (existing behavior preserved): list-filter via `source.keywords` still works on TITEL + UTL fields.
  </behavior>
  <action>
    1. **Modify `src/lib/ingestion/types.ts`** — update AdapterFn return:
       ```typescript
       export interface AdapterResult {
         items: RawItem[]
         etag?: string | null         // RSS-only; OTS returns null
         lastModified?: string | null
       }
       export type AdapterFn = (source: Source) => Promise<AdapterResult>
       ```
       This is a breaking change to AdapterFn — both adapters update in this plan. The registry consumer (ingest.ts) updates in Task 4.

    2. **Create `src/lib/ingestion/adapters/ots-at.test.ts` FIRST (RED)** with seven cases above. Use pglite db + `vi.spyOn(global, 'fetch')`. For tests 1 and others requiring the adapter, instantiate via `createOtsAtAdapter(testDb)` (existing factory).

    3. **Modify `src/lib/ingestion/adapters/ots-at.ts`:**
       - Import `fetchWithTimeout` from `../fetch-utils`.
       - **Change `fetchOtsList` signature**: `async function fetchOtsList(apiKey: string, vonEpochSeconds: number): Promise<OtsListItem[]>` — caller computes `von` from source.lastFetchedAt; the function no longer hard-codes `LOOKBACK_SECONDS`. Replace `await fetch(url)` with `await fetchWithTimeout(url)`.
       - **Change `fetchOtsDetail` signature**: keep `(apiKey, otsKey)`. Replace `await fetch(url)` with `await fetchWithTimeout(url)`.
       - **In the adapter body (returned from createOtsAtAdapter)**:
         ```typescript
         const von = source.lastFetchedAt
           ? Math.floor(source.lastFetchedAt.getTime() / 1000) - 30 * 60
           : Math.floor(Date.now() / 1000) - LOOKBACK_SECONDS
         const listItems = await fetchOtsList(apiKey, von)
         // ...existing keyword pre-filter (unchanged)
         const filteredList = /* unchanged */

         // INGEST-01: bulk dedup — single findMany + Set diff
         const externalIds = filteredList.map((item) => item.OTSKEY)
         const existing = externalIds.length === 0
           ? []
           : await prismaClient.article.findMany({
               where: { source: 'OTS_AT', externalId: { in: externalIds } },
               select: { externalId: true },
             })
         const existingKeys = new Set(existing.map((e) => e.externalId))
         const newItems = filteredList.filter((item) => !existingKeys.has(item.OTSKEY))

         // ...existing detail-fetch loop (unchanged except fetchOtsDetail now times out)
         ```
       - **Return shape change**: at the end, wrap the existing RawItem array:
         ```typescript
         return { items: rawItems, etag: null, lastModified: null }
         ```
       - Keep `LOOKBACK_SECONDS = 24 * 60 * 60` as the NULL-cursor fallback constant. Comment: "// Used only when source.lastFetchedAt is null (first run / new source)".

    4. **Defensive empty-set guard:** if `filteredList.length === 0`, skip the findMany call entirely (Prisma `{ in: [] }` returns 0 rows but is wasted query). Branch on `externalIds.length === 0`.

    5. **No try/catch added.** The existing throws on non-2xx HTTP stay. AbortError from fetchWithTimeout propagates up; ingest.ts's existing catch (line 79) handles it.

    6. No new npm deps.

    Why per requirement: INGEST-01 (bulk dedup), INGEST-02 (AbortController), INGEST-03 (cursor), unified return shape for INGEST-04 (RSS).
  </action>
  <verify>
    <automated>npm test -- ots-at.test</automated>
  </verify>
  <done>
    Seven test cases pass. AdapterFn type updated in types.ts. No regressions in existing adapter behavior (keyword filter, detail fetch, image extraction all preserved). Conventional commit: `refactor(44-04): OTS bulk dedup + lastFetchedAt cursor + AbortController`.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: refactor(44-04): RSS adapter — conditional GET + 304 short-circuit + AbortController</name>
  <files>src/lib/ingestion/adapters/rss.ts, src/lib/ingestion/adapters/rss.test.ts</files>
  <behavior>
    rss.test.ts (RED first):
    - Test 1 (INGEST-04a "conditional GET headers"): Source with `etag='"abc123"'` and `lastModified='Wed, 12 May 2026 10:00:00 GMT'`. Spy `global.fetch`. Run adapter. Assert fetch called with `headers` containing `If-None-Match: "abc123"` AND `If-Modified-Since: Wed, 12 May 2026 10:00:00 GMT`.
    - Test 2 (INGEST-04a "null validators sends no conditional"): Source with both `etag=null` and `lastModified=null`. Assert fetch headers do NOT contain `If-None-Match` or `If-Modified-Since` (research pitfall #7).
    - Test 3 (INGEST-04b "304 short-circuit"): Mock fetch to return `new Response(null, { status: 304 })`. Adapter returns `{ items: [], etag: undefined, lastModified: undefined }` — explicit undefined signals "do NOT rewrite stored values" (ingest.ts checks for `=== undefined` per research § Pattern 4).
    - Test 4 (INGEST-04 "200 returns new validators"): Mock fetch to return `new Response('<rss>...</rss>', { status: 200, headers: { etag: '"xyz789"', 'last-modified': 'Wed, 13 May 2026 10:00:00 GMT' } })`. Adapter returns `{ items: [...], etag: '"xyz789"', lastModified: 'Wed, 13 May 2026 10:00:00 GMT' }`.
    - Test 5 (INGEST-02 "AbortController"): Spy on fetch. Assert call signature includes `signal: AbortSignal`.
    - Test 6 (existing RSS 2.0 parsing preserved): valid RSS body with 3 items returns 3 RawItems. Existing externalId fallback chain (guid → link → contentHash) still works.
    - Test 7 (existing Atom parsing preserved): valid Atom body with 2 entries returns 2 RawItems.
    - Test 8 (existing keyword filter preserved): items matching at least one of `source.keywords` pass through; non-matching filtered out.
  </behavior>
  <action>
    1. **Create `src/lib/ingestion/adapters/rss.test.ts` FIRST (RED)** with eight cases above. Mock `parseFeed` indirectly by providing valid XML bodies (use existing test fixtures if any, otherwise small inline strings). Use `vi.spyOn(global, 'fetch')` to control HTTP behavior.

    2. **Modify `src/lib/ingestion/adapters/rss.ts`:**
       - Import `fetchWithTimeout` from `../fetch-utils`.
       - Change return type from `Promise<RawItem[]>` to `Promise<AdapterResult>`.
       - Build headers conditionally:
         ```typescript
         const headers: Record<string, string> = {
           Accept: 'application/rss+xml, application/atom+xml, application/xml',
         }
         if (source.etag) headers['If-None-Match'] = source.etag
         if (source.lastModified) headers['If-Modified-Since'] = source.lastModified
         ```
         Null check is critical (research pitfall #7: sending literal "null" string causes 412).
       - Call `await fetchWithTimeout(source.url, { headers })`.
       - **304 short-circuit** (BEFORE the existing `!response.ok` check):
         ```typescript
         if (response.status === 304) {
           return { items: [], etag: undefined, lastModified: undefined }
         }
         ```
         `undefined` is the signal to ingest.ts: "do NOT rewrite stored validators on Source row". `null` would mean "actively clear", which is wrong for 304.
       - Keep the existing `if (!response.ok) throw` check (now after 304 short-circuit).
       - On 200, capture new validators BEFORE parsing:
         ```typescript
         const newEtag = response.headers.get('etag') ?? null
         const newLastModified = response.headers.get('last-modified') ?? null
         ```
       - The existing `parseFeed(xml)` + RSS/Atom branches stay verbatim. Wrap the final return in the AdapterResult shape:
         ```typescript
         return { items: parsedItems, etag: newEtag, lastModified: newLastModified }
         ```
         (where `parsedItems` is the current `return items.map(...)` value, captured in a `const`).
       - Forward server's etag verbatim (research § Pattern 5 — no W/ prefix stripping).

    3. **No try/catch added.** Throws on non-2xx propagate up.

    4. No new npm deps.

    Why per requirement: INGEST-04 (conditional GET + 304 short-circuit), INGEST-02 (AbortController).
  </action>
  <verify>
    <automated>npm test -- rss.test</automated>
  </verify>
  <done>
    Eight test cases pass. Adapter sends conditional headers when validators exist, short-circuits on 304, returns new validators on 200. Conventional commit: `refactor(44-04): RSS conditional GET + 304 short-circuit + AbortController`.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: refactor(44-04): ingest.ts transactional health update + persist lastFetchedAt/etag/lastModified</name>
  <files>src/lib/ingestion/ingest.ts, src/lib/ingestion/ingest.test.ts</files>
  <behavior>
    ingest.test.ts (extend existing file — RED first):
    - Test "transactional success": adapter returns 2 items. After `ingest(db, source)` completes: IngestionRun has `finishedAt` + `itemsFound=2` + `itemsNew=2`, Source has `consecutiveFailures=0` + `healthStatus='OK'` + `lastSuccessAt=Date` + `lastFetchedAt=Date`. Both updates happened in a single transaction (test by mocking `db.$transaction` to verify it was called with an array of two updates).
    - Test "transactional failure": adapter throws. After `ingest` rethrows: IngestionRun has `finishedAt` + `error=<msg>`, Source has `consecutiveFailures+=1` + `healthStatus='DEGRADED'`. Both in one transaction. (Assert `db.$transaction` called with the failure-path array.)
    - Test "rss success persists etag": adapter returns `{ items: [], etag: '"abc"', lastModified: 'Wed, ...' }`. After ingest, Source has `etag='"abc"'` AND `lastModified='Wed, ...'` AND `lastFetchedAt=Date`.
    - Test "rss 304 preserves prior etag": Source pre-state has `etag='"old"'`. Adapter returns `{ items: [], etag: undefined, lastModified: undefined }`. After ingest, Source still has `etag='"old"'` (NOT overwritten); `lastFetchedAt` IS updated.
    - Test "ots success: etag stays null": adapter returns `{ items: [], etag: null, lastModified: null }`. After ingest, Source.etag and Source.lastModified are both null (no change). `lastFetchedAt` updated.
    - Test (regression): existing `consecutiveFailures` / `healthStatus` thresholds still apply (DEGRADED at 1, DOWN at healthFailureThreshold).
  </behavior>
  <action>
    1. **Extend `src/lib/ingestion/ingest.test.ts` FIRST (RED)** with the six cases above. To test transactional atomicity, use `vi.spyOn(db, '$transaction')` and assert the array passed to it contains both updates.

    2. **Modify `src/lib/ingestion/ingest.ts`:**

       a. **Adapter result destructuring** — after `rawItems = await adapterFn(src)` (line 78), the new shape:
       ```typescript
       const adapterResult = await adapterFn(src)
       const rawItems = adapterResult.items
       // adapterResult.etag is: null (no conditional GET supported), undefined (304, don't update), or string (200, update)
       // adapterResult.lastModified: same tri-state
       ```

       b. **Failure path (lines 82-96)** — wrap both updates in `db.$transaction`:
       ```typescript
       const newFailures = src.consecutiveFailures + 1
       const newHealth = newFailures >= src.healthFailureThreshold ? 'DOWN' : 'DEGRADED'

       await db.$transaction([
         db.ingestionRun.update({
           where: { id: run.id },
           data: { finishedAt: new Date(), error: errMsg },
         }),
         db.source.update({
           where: { id: src.id },
           data: { consecutiveFailures: newFailures, healthStatus: newHealth },
         }),
       ])

       console.warn(...)  // existing structured log line preserved
       throw err
       ```

       c. **Success path (lines 132-146)** — combine the two existing updates into one transaction AND add lastFetchedAt + conditional etag/lastModified:
       ```typescript
       await db.$transaction([
         db.ingestionRun.update({
           where: { id: run.id },
           data: { finishedAt: new Date(), itemsFound, itemsNew },
         }),
         db.source.update({
           where: { id: src.id },
           data: {
             consecutiveFailures: 0,
             healthStatus: 'OK',
             lastSuccessAt: new Date(),
             lastFetchedAt: new Date(),                              // INGEST-03
             // Conditional update: undefined → don't touch, null → set null, string → set value.
             // Prisma update only includes keys that are present.
             ...(adapterResult.etag !== undefined ? { etag: adapterResult.etag } : {}),
             ...(adapterResult.lastModified !== undefined ? { lastModified: adapterResult.lastModified } : {}),
           },
         }),
       ])

       return { itemsFound, itemsNew }
       ```

       d. The existing `// Step 2`/`Step 3`/`Step 4`/`Step 5`/`Step 6` comments stay; Steps 5 and 6 now collapse into one $transaction (update comments to "// Step 5+6: Transactional close + health update — INGEST-05").

    3. **No new try/catch.** Existing try/catch around `adapterFn(src)` (line 76) preserved verbatim; it now also covers AbortError from fetchWithTimeout (known case: timeout fires within ingest).

    4. **Tri-state etag/lastModified semantics documented in code** (top of ingest.ts):
       ```
       Adapter return shape: AdapterResult = { items, etag, lastModified }
         etag: null      → adapter has no conditional GET support (OTS); don't touch column
         etag: undefined → adapter sent conditional GET, got 304; preserve prior stored value
         etag: <string>  → adapter sent conditional GET, got 200; persist new value
       ```
       Mapping to Prisma: `{ etag: null }` would write NULL → wrong on 304. So the conditional spread `...(adapterResult.etag !== undefined ? ... : {})` is critical. Note: this means OTS adapter (which returns `etag: null`) ALSO won't touch the column — that's correct: OTS sources stay at their initial NULL etag forever, and that's fine.

    5. No new npm deps.

    Why per requirement: INGEST-05 (transactional health), INGEST-03 (lastFetchedAt persist), INGEST-04 (etag/lastModified persist).
  </action>
  <verify>
    <automated>npm test -- ingest.test</automated>
  </verify>
  <done>
    All six new + existing test cases pass. Both success and failure paths wrap updates in db.$transaction. lastFetchedAt always updates on success. etag/lastModified only update on 200 from RSS adapter (304 preserves; OTS no-op). Conventional commit: `refactor(44-04): transactional health update + persist source cursor and validators`.
  </done>
</task>

</tasks>

<verification>
- Migration `20260514_phase44_source_cursor` applied (Source has three new nullable columns)
- `npm test -- fetch-utils.test ots-at.test rss.test ingest.test` all green
- `npm test` full suite still green (no regressions in pipeline.test, articles-actions.test, etc.)
- `npx tsc --noEmit` clean
- AdapterFn return shape is `AdapterResult` everywhere (types.ts + both adapters + ingest.ts caller)
- Manual smoke against production: enable an RSS source and observe second poll returns 304 in the logs (operator-side, not blocking the plan)
</verification>

<success_criteria>
- INGEST-01: OTS dedup is one findMany regardless of list size
- INGEST-02: every external fetch in OTS + RSS adapters carries an AbortSignal
- INGEST-03: OTS uses `lastFetchedAt - 30min` cursor; 24h fallback when NULL; persists `lastFetchedAt=new Date()` on success
- INGEST-04: RSS sends If-None-Match + If-Modified-Since when source has them; 304 short-circuits parse and preserves stored validators; 200 persists new validators
- INGEST-05: success AND failure paths wrap IngestionRun.update + Source.update in single db.$transaction
- PROGRESS.md has four commits logged
</success_criteria>

<output>
After completion, create `.planning/phases/44-cost-telemetry-adapter-hardening/44-04-SUMMARY.md` per `~/.claude/get-shit-done/templates/summary.md`. Include: tri-state semantics of adapterResult.etag/lastModified (with example table), the Option A breaking change to AdapterFn (and confirmation that only two adapters were affected), any operator-visible behavior change observable in production logs.

After 44-04 lands, Phase 44 success criteria are ALL satisfied:
1. ✅ Every WRITTEN/PUBLISHED article has six telemetry columns (44-01)
2. ✅ Admin sorts articles by aiCostUsd with source attribution (44-01)
3. ✅ Pipeline default-submits to Batches API; flag toggles to per-article (44-03)
4. ✅ OTS dedup is one findMany (44-04)
5. ✅ Unchanged RSS feed returns 304 and skips body parse (44-04)
6. ✅ Process kill between IngestionRun + Source updates never leaves them divergent (44-04)
</output>
