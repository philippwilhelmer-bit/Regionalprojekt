# Phase 7: Extensibility and Quality Validation - Research

**Researched:** 2026-03-23
**Domain:** Vitest integration testing — validation evidence for adapter extensibility, cross-source deduplication, alert simulation, and query performance
**Confidence:** HIGH (all findings verified directly from project source code; no external library research required)

## Summary

Phase 7 is entirely a testing phase. No new production code is introduced. The work is a single new test file (`src/test/validation.test.ts`) that exercises existing, already-implemented code against the four success criteria. All infrastructure needed — the pgLite test DB helpers, the adapter registry mock pattern, the `vi.spyOn(console, 'warn')` alert assertion pattern — is already established and verified in prior phase tests.

The only net-new code assets are: (1) a new ORF Steiermark Source row in the seed data (`prisma/seed-data/sources.ts`), (2) a recorded RSS fixture file at `src/test/fixtures/orf-steiermark.rss.xml`, (3) a `seedBulkArticles(db, count)` helper added to `src/test/setup-db.ts`, and (4) `fetch()` interception (likely `vi.mock` or `msw`) to serve the fixture without a live network call. The validation test file itself is the main deliverable.

The critical finding for the planner is that the `ingest.ts` health transition logic uses `source.healthFailureThreshold` (a per-source DB field, configurable via CMS), not a module-level constant. The alert test must seed the Source row with the correct `healthFailureThreshold` value and then drive exactly that many consecutive failures to reach DOWN. The circuit-breaker `console.warn` emits a string (not an object), while `dead-man.ts` emits an object — the assertion style differs between these two.

**Primary recommendation:** Write `src/test/validation.test.ts` as four `describe()` blocks mirroring the success criteria exactly, reusing `createTestDb()` / `cleanDb()` / `adapterRegistry` direct assignment / `vi.spyOn(console, 'warn')` — all verified patterns from prior phases.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Use **ORF Steiermark** as the second RSS source — real Austrian public broadcaster feed with strong regional Steiermark coverage
- Reuse the existing generic `rssAdapter` — adding ORF Steiermark = **one new Source DB row** seeded alongside OTS.at in the existing source seed script
- Zero new adapter code or registry changes — this is the proof that ING-02 extensibility works
- Tests use a **recorded fixture** of a real ORF Steiermark RSS response (saved to file, no live network calls) — deterministic and proves the real feed format parses correctly
- **Automated vitest tests for all 4 success criteria** — passing tests = proof; no separate validation report document
- One **dedicated validation test file**: `src/test/validation.test.ts` (alongside existing `setup-db.ts`)
- `describe()` blocks mirror the 4 success criteria exactly (e.g. `describe('Criterion 1: Adapter Extensibility')`)
- Leave existing module-level tests (dedup.test.ts, ingest.test.ts, etc.) as-is — scope is the 4 new criteria only
- Validation tests cover ingestion and alerting only — AI pipeline quality is out of scope
- Integration test: seed an ORF Steiermark Source row, run `ingest()` against the recorded ORF RSS fixture, assert articles arrive in the DB
- Use **real pgLite DB** via `createTestDb()` + `cleanDb()` pattern for cross-source dedup test
- Insert an OTS.at article, then simulate the same content arriving via the RSS adapter (fixture with matching title+body) — assert `ingest()` skips the duplicate
- Test both the **fire case** and the **no-fire case** for each of the three alerts
- Assert `console.warn` was called with the **exact structured payload shape** (not just `toHaveBeenCalled()`)
- Shared pgLite DB with `cleanDb()` between tests (consistent with established pattern)
- Source failure alert: mock adapter injected via `adapterRegistry` direct property assignment with `afterEach` restore
- Circuit-breaker: Insert `PipelineRun` rows with tokens summing above `AI_DEFAULT_DAILY_TOKEN_THRESHOLD = 500_000`
- Dead-man: Seed `PipelineConfig` row with explicit `deadManThresholdHours = 6`, Insert an `Article` with `publishedAt = 7 hours ago`
- Performance tool: `performance.now()` timing of Prisma queries in vitest (no HTTP server, no external load testing tool)
- Dataset: 1000 `PUBLISHED` articles seeded across all 13 Bezirke (~77 per Bezirk)
- Seed helper: new `seedBulkArticles(db, count)` helper added to `src/test/setup-db.ts`
- Threshold: each query must complete in < **500ms** against 1000-article pgLite dataset
- Performance tests in the same `src/test/validation.test.ts` file under `describe('Criterion 4: Performance')`

### Claude's Discretion
- Exact ORF Steiermark RSS fixture filename and location (e.g. `src/test/fixtures/orf-steiermark.rss.xml`)
- How `fetch()` is intercepted in tests to serve the fixture (msw, vi.mock, or direct adapter DI)
- Exact token sum value for circuit-breaker test (above `AI_DEFAULT_DAILY_TOKEN_THRESHOLD = 500_000`)
- Number of failing `ingest()` runs needed to reach `HEALTH_FAILURE_THRESHOLD` (read from source config)
- Whether `seedBulkArticles` assigns one Bezirk per article or multiple via ArticleBezirk junction

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ING-02 | System ingests content from generic RSS/Atom feeds | Confirmed: `rssAdapter` in `src/lib/ingestion/adapters/rss.ts` is generic; Source DB row with `type: 'RSS'` and `url` is sufficient. ORF Steiermark Source row + fixture + ingest() call proves it. |
| ING-03 | System deduplicates content using content fingerprinting (not URL-only) | Confirmed: `isDuplicate()` in `dedup.ts` has a slow-path `contentHash` check across all sources. The cross-source dedup test in validation.test.ts drives this path through the full `ingest()` pipeline. |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | ^2.1.9 | Test runner, assertions, spies, mocks | Already configured and in use across all prior phases |
| @electric-sql/pglite | ^0.4.1 | In-process PostgreSQL for tests | Already in use via `createTestDb()` / `cleanDb()` |
| pglite-prisma-adapter | ^0.6.1 | Prisma adapter for pgLite | Already wired; must stay at 0.6.1 (0.7.x conflicts with Prisma v6) |
| @prisma/client | ^6.19.2 | Database ORM | Already in use throughout |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| feedsmith | ^2.9.1 | RSS/Atom parser | Already used by `rssAdapter`; fixture must parse via this library |
| node crypto | built-in | `computeContentHash` for dedup | Already used in `dedup.ts` |

No new dependencies are required for Phase 7.

**Installation:**
```bash
# No new packages — all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── test/
│   ├── setup-db.ts          # Add seedBulkArticles() here
│   ├── validation.test.ts   # NEW — the entire phase deliverable
│   └── fixtures/
│       └── orf-steiermark.rss.xml  # NEW — recorded fixture
prisma/
└── seed-data/
    └── sources.ts           # Add ORF Steiermark entry here
```

### Pattern 1: Four describe() blocks mirroring success criteria

**What:** One top-level `describe()` per success criterion. The passing test file is the evidence.
**When to use:** Always — this is the locked decision.

```typescript
// src/test/validation.test.ts structure
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { createTestDb, cleanDb, seedBulkArticles } from './setup-db'

describe('Criterion 1: Adapter Extensibility', () => { ... })
describe('Criterion 2: Cross-Source Deduplication', () => { ... })
describe('Criterion 3: Operator Alerts', () => { ... })
describe('Criterion 4: Performance', () => { ... })
```

### Pattern 2: adapterRegistry direct property assignment (mock injection)

**What:** Directly assign a `vi.fn()` to `adapterRegistry.RSS` (or `.OTS_AT`) for controlled test doubles. Restore in `afterEach`.
**When to use:** Criterion 1 (serve fixture instead of live fetch), Criterion 3 source-failure alert.

```typescript
// Source: established pattern from src/lib/ingestion/ingest.test.ts
import { adapterRegistry } from '../lib/ingestion/adapters/registry'

const originalRssAdapter = adapterRegistry.RSS
afterEach(() => {
  adapterRegistry.RSS = originalRssAdapter
  vi.restoreAllMocks()
})

// In test: replace with fixture-returning mock
adapterRegistry.RSS = vi.fn().mockResolvedValue(fixtureItems)
```

**Alternative for fetch interception:** Instead of mocking `adapterRegistry.RSS`, mock `global.fetch` via `vi.spyOn(global, 'fetch')` to return the fixture XML. This lets `rssAdapter` run fully end-to-end (including `parseFeed()`), which is stronger evidence that the real ORF format parses correctly. This is within Claude's discretion.

```typescript
// Fetch mock approach — stronger evidence for ING-02
vi.spyOn(global, 'fetch').mockResolvedValue({
  ok: true,
  text: async () => orfFixtureXml,
} as Response)
```

### Pattern 3: console.warn spy for alert assertions

**What:** `vi.spyOn(console, 'warn').mockImplementation(() => {})` — suppress output and capture calls.
**When to use:** Criterion 3 for all three alert types.

```typescript
// Source: established pattern from src/lib/ai/circuit-breaker.test.ts
const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
// ... trigger alert condition ...
expect(warnSpy).toHaveBeenCalledOnce()
// For circuit-breaker (string payload):
expect(warnSpy.mock.calls[0][0]).toContain('CIRCUIT_BREAKER')
// For dead-man (object payload):
expect(warnSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'DEAD_MAN_ALERT' }))
warnSpy.mockRestore()
```

### Pattern 4: Shared pgLite DB + cleanDb() between tests

**What:** `beforeAll` creates one `createTestDb()` instance; `beforeEach` calls `cleanDb()`.
**When to use:** All describe blocks in validation.test.ts.

```typescript
// Source: established pattern from all prior phase tests
let db: PrismaClient

beforeAll(async () => {
  db = await createTestDb()
})

beforeEach(async () => {
  await cleanDb(db)
})
```

### Pattern 5: seedBulkArticles for performance dataset

**What:** New helper in `src/test/setup-db.ts` that bulk-inserts N PUBLISHED articles with ArticleBezirk associations.
**When to use:** Criterion 4 performance tests only.

```typescript
// To be added to src/test/setup-db.ts
export async function seedBulkArticles(prisma: PrismaClient, count: number): Promise<void> {
  // 1. Seed all 13 Bezirke (reuse seedBezirke() from prisma/seed.ts or inline)
  // 2. Fetch all bezirk IDs
  // 3. For each article n=0..count-1:
  //    - crypto.randomUUID() for publicId (matches Phase 6 backfill pattern)
  //    - slug: `artikel-${n}`
  //    - status: PUBLISHED, publishedAt: new Date()
  //    - ArticleBezirk: assign bezirke[n % 13] for even distribution
}
```

### Pattern 6: performance.now() query timing

**What:** Wrap Prisma query calls in `performance.now()` before/after, assert delta < 500ms.
**When to use:** Criterion 4 for the three reader queries.

```typescript
// Source: CONTEXT.md decision; performance.now() is global in Node/vitest
const start = performance.now()
await listArticlesReader(db, { bezirkIds: [bezirkId] })
const elapsed = performance.now() - start
expect(elapsed).toBeLessThan(500)
```

### Anti-Patterns to Avoid

- **Calling live ORF Steiermark RSS URL in tests:** Non-deterministic, network-dependent, defeats the purpose of a recorded fixture. Use the fixture file exclusively.
- **Testing `isDuplicate()` in isolation for Criterion 2:** The locked decision requires testing the full `ingest()` pipeline blocking the duplicate, not just calling `isDuplicate()` directly.
- **Using `toHaveBeenCalled()` alone for alert assertions:** CONTEXT.md explicitly requires asserting the exact structured payload shape.
- **Creating a separate pgLite DB per describe block:** One shared DB with `cleanDb()` is the established pattern and is faster.
- **Using `HEALTH_FAILURE_THRESHOLD` as a module-level constant:** In the current codebase, the threshold is `source.healthFailureThreshold` (a DB field), not a hardcoded module export. The test must seed the Source with the desired threshold and drive that many failures.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| In-process test DB | Custom SQLite wrapper | `createTestDb()` from `src/test/setup-db.ts` | Already implemented, used across 6 phases |
| Adapter mock injection | Custom adapter registry abstraction | Direct `adapterRegistry.RSS = vi.fn()` assignment | Established pattern from `ingest.test.ts` |
| Alert capture | Custom event emitter / logging wrapper | `vi.spyOn(console, 'warn')` | Established pattern from `circuit-breaker.test.ts` |
| Feed parsing | Custom XML parser | `feedsmith.parseFeed()` already used by `rssAdapter` | Just provide valid RSS XML in fixture |
| Performance measurement | External load testing tool (k6, autocannon) | `performance.now()` in vitest | Locked decision in CONTEXT.md; pgLite is in-process so HTTP server not needed |

## Common Pitfalls

### Pitfall 1: console.warn payload shape differs between alert types

**What goes wrong:** `circuit-breaker.ts` emits `console.warn(string)` (a string with template literal), while `dead-man.ts` emits `console.warn(object)`. Tests that use the wrong assertion style will either miss the check or cause a false positive.
**Why it happens:** Two different developers wrote these modules in different phases with different logging conventions.
**How to avoid:**
- Circuit-breaker: `expect(warnSpy.mock.calls[0][0]).toContain('CIRCUIT_BREAKER')`
- Dead-man: `expect(warnSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'DEAD_MAN_ALERT' }))`
- Source health degradation in `ingest.ts`: also a string template — use `.toContain('DEGRADED')` or `.toContain('DOWN')`
**Warning signs:** Test passes with `toHaveBeenCalled()` but fails with `toHaveBeenCalledWith()`.

### Pitfall 2: healthFailureThreshold is a per-Source DB field, not a module constant

**What goes wrong:** `ingest.ts` uses `src.healthFailureThreshold` (from the DB row) — it was originally a module-level constant `HEALTH_FAILURE_THRESHOLD = 3` but was later moved to a configurable DB field. If the test seeds a Source without explicitly setting `healthFailureThreshold`, the default must be verified in the Prisma schema.
**Why it happens:** The STATE.md entry reads "HEALTH_FAILURE_THRESHOLD = 3 as module-level constant in ingest.ts — Phase 5 CMS will make it configurable per-source." `ingest.ts` line 91 now uses `src.healthFailureThreshold` directly.
**How to avoid:** Check the Prisma schema for the default value of `healthFailureThreshold`. Seed the Source with an explicit value (e.g. `healthFailureThreshold: 3`) so the test is self-documenting and independent of schema defaults.
**Warning signs:** The DOWN transition test fails because more or fewer failures than expected are needed.

### Pitfall 3: cleanDb() order and PipelineConfig singleton

**What goes wrong:** `checkDeadMan()` calls `getPipelineConfig(db)` which uses `pipelineConfig.findFirst()`. If `cleanDb()` removes the PipelineConfig row and the test relies on the find-or-create default, it should work fine — but explicit seeding in the test is safer and matches the CONTEXT.md decision.
**Why it happens:** PipelineConfig is a singleton with find-or-create semantics. `cleanDb()` deletes it (line 74: `await prisma.pipelineConfig.deleteMany()`), so each test starts without one.
**How to avoid:** Seed `PipelineConfig` explicitly in each dead-man test's `beforeEach` or within the test body with the exact `deadManThresholdHours` value needed.
**Warning signs:** Dead-man test asserts wrong threshold behavior because the default 6-hour threshold was used when the test intended a different value.

### Pitfall 4: Cross-source dedup requires matching contentHash, not just externalId

**What goes wrong:** The dedup test must use identical `title` and `body` text for the OTS.at pre-seeded article and the RSS fixture item. If the text differs even by whitespace, `computeContentHash()` produces different hashes, and the duplicate is not detected — the test passes for the wrong reason.
**Why it happens:** `computeContentHash()` normalizes whitespace and case, but `||` separator is in the hash. The RSS fixture item and the pre-seeded OTS.at article must produce the same hash.
**How to avoid:** In the test, compute `computeContentHash(title, body)` for the pre-seeded article and verify it matches the hash that would come from the fixture item. The fixture item's `description` field maps to `body` in `rssAdapter`.

### Pitfall 5: pgLite performance with 1000 articles + ArticleBezirk rows

**What goes wrong:** pgLite runs in-process WASM PostgreSQL. Seeding 1000 articles with ArticleBezirk junction rows (1000+ rows) in `beforeAll` may take several seconds. If done in `beforeEach` it will time out.
**Why it happens:** pgLite has no persistent disk storage optimization; each operation goes through WASM.
**How to avoid:** Call `seedBulkArticles()` once in `beforeAll` for Criterion 4 (not `beforeEach`). Do not call `cleanDb()` before performance queries — but if sharing the DB across all criteria, seed bulk articles after other describe blocks have finished their per-test cleanup, or use a separate pgLite DB instance for Criterion 4.

### Pitfall 6: Article.publicId is String? (nullable)

**What goes wrong:** `getArticleByPublicId()` looks up by `publicId`. The `seedBulkArticles` helper must assign a non-null `publicId` (UUID) to each article, otherwise the detail lookup query cannot be tested.
**Why it happens:** The schema allows nullable `publicId` (introduced in Phase 6 with a backfill migration). New articles seeded in tests can set it explicitly.
**How to avoid:** In `seedBulkArticles()`, always set `publicId: crypto.randomUUID()` for each article — consistent with the Phase 6 backfill decision noted in STATE.md.

## Code Examples

Verified patterns from project source:

### ORF Steiermark Source seed entry
```typescript
// prisma/seed-data/sources.ts — add after existing entries
{
  type: 'RSS' as ArticleSource,
  url: 'https://steiermark.orf.at/rss',
  enabled: true,
  pollIntervalMinutes: 30,
}
```
This is the only production code change in Phase 7. The test seeds this row directly via `prisma.source.create()` rather than calling `seedSources()`.

### Criterion 1: Adapter Extensibility test structure
```typescript
// Source: CONTEXT.md decision + ingest.test.ts pattern
describe('Criterion 1: Adapter Extensibility', () => {
  it('ingests ORF Steiermark via RSS adapter with no new adapter code', async () => {
    // Arrange: fixture items parsed from orf-steiermark.rss.xml
    const fixtureItems: RawItem[] = [ /* parsed from XML fixture */ ]
    adapterRegistry.RSS = vi.fn().mockResolvedValue(fixtureItems)

    const orfSource = await db.source.create({
      data: { type: 'RSS', url: 'https://steiermark.orf.at/rss', enabled: true }
    })

    // Act
    const result = await ingest(db, orfSource)

    // Assert
    expect(result.itemsNew).toBeGreaterThan(0)
    const articles = await db.article.findMany({ where: { source: 'RSS' } })
    expect(articles.length).toBeGreaterThan(0)
  })
})
```

### Criterion 2: Cross-source dedup test structure
```typescript
// Source: CONTEXT.md decision + dedup.test.ts cross-source pattern
describe('Criterion 2: Cross-Source Deduplication', () => {
  it('blocks duplicate when same article arrives via both OTS_AT and RSS', async () => {
    const title = 'Unwetter in der Steiermark'
    const body = 'Ein schweres Unwetter hat die Steiermark getroffen.'

    // Pre-seed: OTS.at article already in DB
    await db.article.create({
      data: {
        externalId: 'ots-001',
        source: 'OTS_AT',
        title,
        content: body,
        contentHash: computeContentHash(title, body),
        status: 'FETCHED',
      }
    })

    // Simulate same content arriving via RSS adapter
    const rssItems: RawItem[] = [{ externalId: 'rss-001', title, body, sourceUrl: '...', publishedAt: new Date() }]
    adapterRegistry.RSS = vi.fn().mockResolvedValue(rssItems)
    const rssSource = await db.source.create({ data: { type: 'RSS', url: 'https://...', enabled: true } })

    // Act
    const result = await ingest(db, rssSource)

    // Assert: duplicate was blocked
    expect(result.itemsNew).toBe(0)
    const allArticles = await db.article.findMany()
    expect(allArticles).toHaveLength(1) // only the original OTS.at article
  })
})
```

### Criterion 3: Dead-man alert test structure
```typescript
// Source: CONTEXT.md decision + circuit-breaker.test.ts spy pattern + dead-man.ts impl
describe('Criterion 3: Operator Alerts — Dead-Man', () => {
  it('fires DEAD_MAN_ALERT when last publish was 7 hours ago', async () => {
    await db.pipelineConfig.create({ data: { deadManThresholdHours: 6, maxRetryCount: 3 } })
    const sevenHoursAgo = new Date(Date.now() - 7 * 60 * 60 * 1000)
    await db.article.create({
      data: { source: 'MANUAL', title: 'Old', content: 'Old', status: 'PUBLISHED', publishedAt: sevenHoursAgo }
    })

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await checkDeadMan(db)
    expect(warnSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'DEAD_MAN_ALERT' }))
    warnSpy.mockRestore()
  })

  it('does NOT fire when last publish was 1 hour ago', async () => {
    await db.pipelineConfig.create({ data: { deadManThresholdHours: 6, maxRetryCount: 3 } })
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)
    await db.article.create({
      data: { source: 'MANUAL', title: 'Recent', content: 'Recent', status: 'PUBLISHED', publishedAt: oneHourAgo }
    })

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await checkDeadMan(db)
    expect(warnSpy).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })
})
```

### Criterion 4: Performance test structure
```typescript
// Source: CONTEXT.md decision; performance.now() global in Node.js
describe('Criterion 4: Performance', () => {
  beforeAll(async () => {
    await seedBulkArticles(db, 1000)
  })

  it('listArticlesReader by Bezirk completes in < 500ms with 1000 articles', async () => {
    const bezirke = await db.bezirk.findMany({ take: 1 })
    const start = performance.now()
    await listArticlesReader(db, { bezirkIds: [bezirke[0].id] })
    expect(performance.now() - start).toBeLessThan(500)
  })

  it('article detail lookup by publicId completes in < 500ms', async () => {
    const article = await db.article.findFirst({ where: { status: 'PUBLISHED' }, select: { publicId: true } })
    const start = performance.now()
    await getArticleByPublicId(db, article!.publicId!)
    expect(performance.now() - start).toBeLessThan(500)
  })

  it('getArticlesByBezirk (RSS feed query) completes in < 500ms', async () => {
    const bezirk = await db.bezirk.findFirst({ select: { slug: true } })
    const start = performance.now()
    await getArticlesByBezirk(db, bezirk!.slug)
    expect(performance.now() - start).toBeLessThan(500)
  })
})
```

### seedBulkArticles helper skeleton
```typescript
// To be added to src/test/setup-db.ts
import { randomUUID } from 'node:crypto'

export async function seedBulkArticles(prisma: PrismaClient, count: number): Promise<void> {
  // Seed bezirke first (required for ArticleBezirk FK)
  const bezirkeData = [ /* 13 Steiermark bezirke slugs/names */ ]
  for (const b of bezirkeData) {
    await prisma.bezirk.upsert({ where: { slug: b.slug }, update: {}, create: b })
  }
  const bezirke = await prisma.bezirk.findMany()

  for (let n = 0; n < count; n++) {
    const article = await prisma.article.create({
      data: {
        publicId: randomUUID(),
        source: 'MANUAL',
        title: `Artikel ${n}`,
        content: `Inhalt ${n}`,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        slug: `artikel-${n}`,  // if slug field exists on Article model
      }
    })
    // Assign to bezirk[n % 13] for even distribution
    await prisma.articleBezirk.create({
      data: { articleId: article.id, bezirkId: bezirke[n % bezirke.length].id }
    })
  }
}
```
Note: The `slug` field on Article needs verification against the current Prisma schema — it may not exist. The `publicId` field is confirmed as `String?` in Phase 6.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `HEALTH_FAILURE_THRESHOLD` module constant | `source.healthFailureThreshold` DB field | Phase 5 CMS | Alert test must use DB field, not import the constant |
| `deadManThresholdHours` from env var | `PipelineConfig.deadManThresholdHours` DB row | Phase 5 | Dead-man test must seed `PipelineConfig` row |
| RSS source as placeholder (Kleine Zeitung) | ORF Steiermark as second source | Phase 7 | New Source row in `prisma/seed-data/sources.ts` |

**Deprecated/outdated:**
- The `HEALTH_FAILURE_THRESHOLD = 3` constant that was in `ingest.ts` during Phase 2 is referenced in STATE.md but is no longer a module export — the DB field is now the source of truth.

## Open Questions

1. **Does Article model have a `slug` field?**
   - What we know: Phase 6 added `publicId` and a `slugify()` function. The detail URL is `/artikel/[publicId]/[slug]` but the slug may be computed at render time, not stored.
   - What's unclear: Whether `prisma.article.create({ data: { slug: ... } })` is valid.
   - Recommendation: Check `prisma/schema.prisma` or the Phase 6 migration SQL before writing `seedBulkArticles`. If no `slug` field, omit it from the seed helper.

2. **What is the default value of `source.healthFailureThreshold` in the schema?**
   - What we know: `ingest.ts` uses `src.healthFailureThreshold` as the DOWN boundary. `ingest.test.ts` hardcodes `const HEALTH_FAILURE_THRESHOLD = 3` as a comment.
   - What's unclear: Whether the Prisma schema has `@default(3)` for `healthFailureThreshold`.
   - Recommendation: Read `prisma/schema.prisma` field definition. If default is 3, tests that seed Sources without explicit `healthFailureThreshold` will behave consistently. Explicit seeding is still preferred.

3. **fetch() interception approach for Criterion 1**
   - What we know: Claude's discretion allows `msw`, `vi.mock`, or direct adapter DI.
   - What's unclear: Whether `msw` is installed (it is not in `package.json`).
   - Recommendation: Use `vi.spyOn(global, 'fetch')` for the fetch-interception approach — no new dependency, same result. Alternatively, mock `adapterRegistry.RSS` directly and skip `rssAdapter` entirely — simpler but weaker evidence. For strongest ING-02 evidence, mock `fetch` so `rssAdapter` runs fully end-to-end with the real fixture XML.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^2.1.9 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run src/test/validation.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ING-02 | ORF Steiermark source ingests via existing RSS adapter with no new adapter code | integration | `npx vitest run src/test/validation.test.ts` | ❌ Wave 0 |
| ING-03 | Same article arriving via OTS_AT and RSS produces exactly one DB row | integration | `npx vitest run src/test/validation.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/test/validation.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/test/validation.test.ts` — covers ING-02, ING-03, and all 4 success criteria
- [ ] `src/test/fixtures/orf-steiermark.rss.xml` — recorded real ORF Steiermark RSS fixture
- [ ] `seedBulkArticles()` in `src/test/setup-db.ts` — needed for Criterion 4 performance dataset

*(No framework install needed — vitest already configured and working)*

## Sources

### Primary (HIGH confidence)
- Direct source code inspection: `src/lib/ingestion/ingest.ts` — health state machine, `adapterRegistry` usage, console.warn string format
- Direct source code inspection: `src/lib/ingestion/adapters/registry.ts` — `adapterRegistry` shape, existing OTS_AT + RSS entries
- Direct source code inspection: `src/lib/ingestion/adapters/rss.ts` — `rssAdapter` function, feedsmith `parseFeed()` usage, `item.guid.value` for externalId
- Direct source code inspection: `src/lib/ingestion/dedup.ts` — `computeContentHash()` normalization, `isDuplicate()` cross-source slow path
- Direct source code inspection: `src/lib/ai/circuit-breaker.ts` — `checkCostCircuitBreaker()`, string console.warn format, `AI_DEFAULT_DAILY_TOKEN_THRESHOLD = 500_000`
- Direct source code inspection: `src/lib/publish/dead-man.ts` — `checkDeadMan()`, object console.warn format, `getPipelineConfig()` usage
- Direct source code inspection: `src/test/setup-db.ts` — `createTestDb()`, `cleanDb()` deletion order
- Direct source code inspection: `src/lib/ingestion/ingest.test.ts` — `adapterRegistry` direct assignment mock pattern, `afterEach` restore
- Direct source code inspection: `src/lib/ai/circuit-breaker.test.ts` — `vi.spyOn(console, 'warn')` assertion pattern
- Direct source code inspection: `src/lib/content/articles.ts` — `listArticlesReader()`, `getArticleByPublicId()`, `getArticlesByBezirk()` signatures for performance tests
- Direct source code inspection: `prisma/seed-data/sources.ts` — current seed entries, `SourceSeedEntry` type
- `.planning/phases/07-extensibility-and-quality-validation/07-CONTEXT.md` — locked decisions, discretion areas

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — historical decisions, `HEALTH_FAILURE_THRESHOLD` evolution note
- `.planning/REQUIREMENTS.md` — ING-02, ING-03 requirement text

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in use
- Architecture: HIGH — all patterns directly verified from existing test files
- Pitfalls: HIGH — identified from direct code inspection, not speculation
- Open questions: LOW — require schema verification (quick file read can resolve before planning)

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (stable codebase, no external moving parts)
