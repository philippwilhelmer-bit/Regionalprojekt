# Plan 07-02 Summary — Validation Test Suite

## Status: COMPLETE

## What was built

**`src/test/validation.test.ts`** — 12 tests across 4 describe blocks, all green.

### Criterion 1: Adapter Extensibility (ING-02)
- Mocks `global.fetch` with the ORF Steiermark RSS fixture
- Seeds an RSS Source row, calls `ingest(db, source)`
- Asserts `itemsNew > 0` and RSS articles exist in DB
- Proof: ORF Steiermark ingests via the existing `rssAdapter` with zero new adapter code

### Criterion 2: Cross-Source Deduplication (ING-03)
- Pre-seeds OTS_AT article with `computeContentHash(title, body)`
- Mocks `adapterRegistry.RSS` with the same title+body → `itemsNew === 0`, DB has exactly 1 article
- Second test: different content → `itemsNew === 1`

### Criterion 3: Operator Alerts
- **Source health DEGRADED**: seed source with `consecutiveFailures=0`, one failing ingest → warn contains `'DEGRADED'`
- **Source health DOWN**: seed source with `consecutiveFailures=2, healthFailureThreshold=3`, one failing ingest → warn contains `'DOWN'`
- **Circuit-breaker fire**: 600k tokens → `checkCostCircuitBreaker` returns false + warn contains `'CIRCUIT_BREAKER'`
- **Circuit-breaker no-fire**: 100k tokens → returns true, no warn
- **Dead-man fire**: article published 7h ago, threshold 6h → `console.warn({ type: 'DEAD_MAN_ALERT', ... })`
- **Dead-man no-fire**: article published 1h ago → no warn

### Criterion 4: Reader Query Performance
- `beforeAll` seeds 1000 PUBLISHED articles with `seedBulkArticles(db, 1000)` — 60s timeout
- All three reader functions (`listArticlesReader`, `getArticleByPublicId`, `getArticlesByBezirk`) complete in under 500ms

## Pitfalls found and corrected vs. plan

1. **`ingest()` throws on adapter failure** — wrapped in try/catch in all health tests
2. **`consecutiveFailures` read from passed object** — seeded source at threshold-1 to reach DOWN in one call
3. **`console.warn` fires for both DEGRADED and DOWN** — plan's "no-fire" source health case replaced with explicit DEGRADED test
4. **Dead-man fires when no articles** (`Infinity >= threshold`) — no-fire test seeds a recently-published article
5. **Global `beforeEach(cleanDb)` wiped Criterion 4 dataset** — moved `cleanDb` into per-criteria `beforeEach`, Criterion 4 uses its own `beforeAll`
6. **`beforeAll` timeout in full suite** — added explicit 60s timeout to Criterion 4 `beforeAll`

## Verification

```
npx vitest run src/test/validation.test.ts   → 12/12 pass
npx vitest run                               → 183/183 pass (24 files)
```
