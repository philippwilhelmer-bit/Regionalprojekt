# Phase 7: Extensibility and Quality Validation - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Confirm by automated test evidence that the two critical architectural properties hold — the adapter pattern genuinely allows new sources without core changes, and deduplication provably blocks cross-source duplicates — and that all three operator alert types fire correctly and key reader pages perform acceptably at scale. This phase produces evidence (passing tests), not new features.

</domain>

<decisions>
## Implementation Decisions

### Second RSS source (ING-02 extensibility proof)
- Use **ORF Steiermark** as the second RSS source — real Austrian public broadcaster feed with strong regional Steiermark coverage
- Reuse the existing generic `rssAdapter` — adding ORF Steiermark = **one new Source DB row** seeded alongside OTS.at in the existing source seed script
- Zero new adapter code or registry changes — this is the proof that ING-02 extensibility works
- Tests use a **recorded fixture** of a real ORF Steiermark RSS response (saved to file, no live network calls) — deterministic and proves the real feed format parses correctly

### Evidence format
- **Automated vitest tests for all 4 success criteria** — passing tests = proof; no separate validation report document
- One **dedicated validation test file**: `src/test/validation.test.ts` (alongside existing `setup-db.ts`)
- `describe()` blocks mirror the 4 success criteria exactly (e.g. `describe('Criterion 1: Adapter Extensibility')`)
- Leave existing module-level tests (dedup.test.ts, ingest.test.ts, etc.) as-is — scope is the 4 new criteria only
- Validation tests cover ingestion and alerting only — AI pipeline quality is out of scope

### Extensibility test (Criterion 1)
- Integration test: seed an ORF Steiermark Source row, run `ingest()` against the recorded ORF RSS fixture, assert articles arrive in the DB
- The test passing with no new adapter code is the evidence that only a new Source row was required

### Cross-source dedup test (Criterion 2)
- Use **real pgLite DB** via `createTestDb()` + `cleanDb()` pattern
- Insert an OTS.at article, then simulate the same content arriving via the RSS adapter (fixture with matching title+body) — assert `ingest()` skips the duplicate
- Tests the full ingest() pipeline blocking the duplicate, not just `isDuplicate()` in isolation

### Alert simulation (Criterion 3)
- Test both the **fire case** and the **no-fire case** for each of the three alerts
- Assert `console.warn` was called with the **exact structured payload shape** (not just `toHaveBeenCalled()`)
- Shared pgLite DB with `cleanDb()` between tests (consistent with established pattern)

**Source failure alert simulation:**
- Mock adapter injected via `adapterRegistry` direct property assignment with `afterEach` restore (existing pattern from `ingest.test.ts`)
- Drive `ingest()` to fail N times consecutively via the throwing mock adapter
- Verify **both DEGRADED** (before threshold) **and DOWN** (at threshold) health transitions + `console.warn` payload shape (type, sourceId, newHealth, consecutiveFailures)

**Circuit-breaker alert simulation:**
- Insert `PipelineRun` rows in pgLite with `totalInputTokens + totalOutputTokens` summing above `AI_DAILY_TOKEN_THRESHOLD`
- Call `checkCostCircuitBreaker(db)`, assert it returns `false` and `console.warn` fires with correct payload

**Dead-man alert simulation:**
- Seed `PipelineConfig` row with explicit `deadManThresholdHours = 6`
- Insert an `Article` with `publishedAt = 7 hours ago`
- Call `checkDeadMan(db)`, assert `console.warn` fires with `DEAD_MAN_ALERT` payload

### Performance test (Criterion 4)
- **Tool:** `performance.now()` timing of Prisma queries in vitest (no HTTP server, no external load testing tool)
- **Dataset:** 1000 `PUBLISHED` articles seeded across all 13 Bezirke (even distribution, ~77 per Bezirk)
- **Seed helper:** new `seedBulkArticles(db, count)` helper added to `src/test/setup-db.ts`; each article gets a real `publicId` (UUID) and generated slug (`artikel-{n}`)
- **Threshold:** each query must complete in < **500ms** against 1000-article pgLite dataset
- **Queries tested** (all three key reader queries):
  1. `listArticlesReader` filtered by Bezirk slugs
  2. Article detail lookup by `publicId` + `slug`
  3. Bezirk RSS feed query (single Bezirk)
- Performance tests in the same `src/test/validation.test.ts` file under `describe('Criterion 4: Performance')`

### Claude's Discretion
- Exact ORF Steiermark RSS fixture filename and location (e.g. `src/test/fixtures/orf-steiermark.rss.xml`)
- How `fetch()` is intercepted in tests to serve the fixture (msw, vi.mock, or direct adapter DI)
- Exact token sum value for circuit-breaker test (above `AI_DEFAULT_DAILY_TOKEN_THRESHOLD = 500_000`)
- Number of failing `ingest()` runs needed to reach `HEALTH_FAILURE_THRESHOLD` (read from source config)
- Whether `seedBulkArticles` assigns one Bezirk per article or multiple via ArticleBezirk junction

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/ingestion/adapters/registry.ts` — `adapterRegistry: Partial<Record<ArticleSource, AdapterFn>>` — one new entry proves extensibility; currently has `OTS_AT` and `RSS`
- `src/lib/ingestion/dedup.ts` — `isDuplicate(client, source, externalId, contentHash)` — cross-source dedup via contentHash already implemented; slow path: `findFirst({ where: { contentHash: hash } })`
- `src/lib/ingestion/ingest.ts` — `HEALTH_FAILURE_THRESHOLD` module constant; health state machine (`OK → DEGRADED → DOWN`); structured `console.warn` on health degradation
- `src/lib/publish/dead-man.ts` — `checkDeadMan(client?)` — reads `PipelineConfig.deadManThresholdHours`, queries `max(Article.publishedAt)`, emits `DEAD_MAN_ALERT`
- `src/lib/ai/circuit-breaker.ts` — `checkCostCircuitBreaker(db)` — aggregates today's PipelineRun tokens, returns `false` + `console.warn` when above threshold
- `src/test/setup-db.ts` — `createTestDb()` + `cleanDb()` — existing pgLite test DB helpers; new `seedBulkArticles()` will be added here
- `src/lib/ingestion/adapters/rss.ts` — existing generic RSS adapter; parses feedsmith `item.guid.value` for externalId; accepts `Source` model

### Established Patterns
- TypeScript DI overloads with `$connect` duck-typing — all service functions follow this; validation tests should too
- `adapterRegistry` direct property assignment for mock injection with `afterEach` restore — documented in STATE.md for `ingest.test.ts`
- `vi.spyOn(console, 'warn')` + `toHaveBeenCalledWith(expect.objectContaining({...}))` — Phase 3 circuit-breaker tests use this pattern
- `cleanDb()` between tests in shared pgLite instance — consistent across all prior phase tests
- `import.meta.url` guard for runnable scripts — not relevant here (test-only phase)

### Integration Points
- New ORF Source row seeded in `src/scripts/seed-sources.ts` (or equivalent seed file) — picked up by `ingest()` via `adapterRegistry[source.type]` lookup
- Performance test queries hit `listArticlesReader()` from `src/lib/reader/articles.ts` (or equivalent DAL) and article detail lookup
- `PipelineConfig` table required for dead-man threshold test — must be seeded in test setup

### Existing DB Indexes (from prisma/schema.prisma)
- `@@index([status])` on Article — used by `listArticlesReader` PUBLISHED filter
- `@@index([publishedAt])` on Article — used by dead-man query and feed ordering
- `@@index([source, externalId])` on Article — fast-path dedup
- `@@index([publicId])` on Article — article detail lookup
- `@@index([bezirkId])` on ArticleBezirk — Bezirk feed filter

</code_context>

<specifics>
## Specific Ideas

- The ORF Steiermark fixture should be a real-world capture of the actual ORF Steiermark RSS feed — download once, commit as a test fixture. This makes the test both deterministic and a proof that real ORF format parses correctly with the generic adapter.
- The validation test file's describe() structure should read like a checklist: each describe block = one success criterion = evidence for one architectural property.
- The `seedBulkArticles` helper can use `crypto.randomUUID()` for publicId (already used in Phase 6 backfill) and sequential slug `artikel-${n}` to keep it simple and avoid collisions.

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-extensibility-and-quality-validation*
*Context gathered: 2026-03-23*
