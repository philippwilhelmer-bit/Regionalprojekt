# Phase 2: Ingestion - Research

**Researched:** 2026-03-21
**Domain:** RSS/Atom feed parsing, OTS.at REST API, content deduplication, Prisma schema extension
**Confidence:** MEDIUM — OTS.at API docs are 403-gated; field names verified via web search snippets, not direct doc fetch. All other areas HIGH.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Source configuration storage**
- Sources live in the database only — not in bundesland.config.ts
- Seeded via an idempotent seed script (same pattern as Bezirk seed in Phase 1)
- Source record stores: type (OTS_AT / RSS), URL, enabled flag — nothing else; credentials stay in .env
- Sources are scoped per Bundesland deployment (each deployment has its own source list)
- Phase 5 CMS (CMS-04) can add/disable sources at runtime against this DB model

**Operator alerting**
- On source failure: write a structured log entry AND update a health flag on the source record (consecutive_failures count, last_success_at, health status)
- Alert threshold: N consecutive failed polls (N is configurable, default 3) — transient failures don't trigger alerts
- Failed source stays enabled — it keeps polling and self-heals if the source comes back; operator manually disables via Phase 5 CMS
- No external alert service in Phase 2 (no email/Slack) — structured logs are consumed by whatever log aggregator the operator runs

**Polling cadence**
- Each source row has a poll_interval_minutes field — polling interval is per-source, configurable via Phase 5 CMS
- Phase 2 ships an ingest() function and a runnable script — manual trigger only; Phase 4 scheduler calls it on a timer
- Each poll run is recorded in an IngestionRun table: source, started_at, finished_at, items_found, items_new, error — enables Phase 4 dead-man monitor and Phase 5 health dashboard

**Adapter contract (ING-05 extensibility)**
- Adapters are registered in a static map: `{ OTS_AT: otsAdapter, RSS: rssAdapter }` in a single registry file
- New adapter = new entry in the map; no changes to core ingestion logic
- Adapter interface: `fetch(source: Source) → Promise<RawItem[]>` — adapter handles auth, pagination, and format normalization internally
- OTS.at adapter authenticates via API key: `OTS_API_KEY` environment variable

### Claude's Discretion
- Exact IngestionRun schema fields and indexes
- RawItem shape (the normalized intermediate before DB write)
- Deduplication fingerprint fields (REQUIREMENTS say content fingerprinting, not URL-only — implementation approach is Claude's)
- How "consecutive_failures" is tracked (field on Source row vs separate SourceHealth table)
- Error handling and retry behavior within a single poll run

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ING-01 | System ingests press releases from OTS.at via API | OTS.at REST API documented: `GET /api/liste?app=KEY&query=...&anz=N&von=UNIX_TS` returns JSON with TITEL, DATUM, ZEIT, ZEITSTEMPEL, EMITTENT, WEBLINK fields; `GET /api/detail?app=KEY&id=OTS_KEY` for single item; 2,500 req/day rate limit |
| ING-02 | System ingests content from generic RSS/Atom feeds | feedsmith 2.9.1 supports RSS 0.9x/2.0, Atom 0.3/1.0, RDF, JSON Feed; `parseFeed(xmlString)` returns `{format, feed}` with items array |
| ING-03 | System deduplicates content using content fingerprinting (not URL-only) | SHA-256 over normalized title + body text covers cross-source duplicates; externalId+source composite index already in schema for OTS ID dedup |
| ING-04 | System alerts operator when a source fails or goes stale | Health fields on Source model + structured log entries; `consecutive_failures` threshold (default 3) fires warning log; `last_success_at` enables staleness detection |
| ING-05 | Source adapters follow a plug-in interface so new sources can be added without changing core ingestion logic | Static registry map `{ OTS_AT: otsAdapter, RSS: rssAdapter }` keyed to existing `ArticleSource` enum; `fetch(source) → Promise<RawItem[]>` contract |
</phase_requirements>

---

## Summary

Phase 2 builds the ingestion layer on top of the Phase 1 schema. The three core deliverables are: (1) two new Prisma models (`Source` and `IngestionRun`) with a migration, (2) two adapter implementations (OTS.at REST API and generic RSS/Atom), and (3) a deduplication service that blocks duplicates before they reach the database.

The OTS.at API is a straightforward REST API using a query parameter API key (`app`). It returns JSON with press release metadata. The full content of each press release requires a second call to `/api/detail`. Daily rate limit is 2,500 requests per key — easily sufficient for a polling approach. The OTS API docs are 403-gated from automated fetch, but field names and URL structure were verified via multiple search snippets: TITEL, ZEITSTEMPEL, EMITTENT, WEBLINK are confirmed field names.

For RSS/Atom, `feedsmith` (v2.9.1) is the recommended library: it handles all feed formats, has complete TypeScript types, is tree-shakable, and has 2,000+ tests. It takes a raw XML string as input, meaning the adapter is responsible for HTTP fetching separately (standard `fetch()`). Content fingerprinting uses SHA-256 over normalized title + body, stored as a `contentHash` column with a unique index — this is the primary dedup mechanism for cross-source duplicates. The existing `@@index([source, externalId])` handles OTS-specific ID-based dedup as a fast path.

**Primary recommendation:** Use feedsmith for RSS parsing, Node.js `crypto.createHash('sha256')` for fingerprinting (no extra dependency), and a single new migration that adds `Source`, `IngestionRun`, `contentHash` on `Article`, and health fields on `Source`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| feedsmith | 2.9.1 | RSS/Atom/RDF/JSON Feed parsing | Universal parser, TypeScript-native, 2000+ tests, handles malformed feeds, no dependencies beyond fast-xml-parser |
| Node.js `crypto` | built-in | SHA-256 content fingerprinting | Zero dependency, ships with Node, sufficient for dedup hashing |
| Prisma 6 | 6.19.2 (existing) | ORM for Source, IngestionRun, Article writes | Already in project, DAL patterns established |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `fetch` (native) | Node 18+ built-in | HTTP requests for OTS API + RSS feed fetching | Both adapters use it; no extra dep needed |
| `tsx` | 4.x (existing) | Run seed and ingest scripts directly | Already in devDependencies; same runner as Phase 1 scripts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| feedsmith | @rowanmanning/feed-parser (v2.1.2) | feed-parser normalizes output across formats (easier to work with), but feedsmith preserves original structure and has broader format support (RDF, JSON Feed) and more namespace support (28+) |
| feedsmith | node-feedparser | node-feedparser is stream-based and older; feedsmith has better TypeScript support |
| crypto SHA-256 | simhash or MinHash | Similarity hashing detects near-duplicate text but adds complexity; SHA-256 exact match is sufficient since OTS press releases are not rephrased before distribution |

**Installation:**
```bash
npm install feedsmith
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── ingestion/
│   │   ├── adapters/
│   │   │   ├── ots-at.ts        # OTS.at REST API adapter
│   │   │   ├── rss.ts           # Generic RSS/Atom adapter
│   │   │   └── registry.ts      # Static adapter map { OTS_AT, RSS }
│   │   ├── ingest.ts            # Core ingest(source) function
│   │   ├── dedup.ts             # Content fingerprinting + DB dedup check
│   │   └── types.ts             # RawItem, AdapterFn interfaces
│   └── content/
│       └── sources.ts           # DAL for Source model (mirrors articles.ts pattern)
├── test/
│   └── setup-db.ts              # Existing — no changes needed
prisma/
├── migrations/
│   └── 20260321_ingestion/      # Source, IngestionRun, contentHash, health fields
└── schema.prisma                # Updated with new models
scripts/
└── ingest-run.ts                # CLI entry point — triggers ingest for all enabled sources
```

### Pattern 1: Adapter Contract

**What:** Each adapter is a function matching `(source: Source) => Promise<RawItem[]>`. The adapter owns authentication, HTTP fetching, pagination, and normalization to `RawItem`. Core ingestion logic never knows about HTTP or feed formats.

**When to use:** All source types — OTS.at, RSS, and any future adapter.

**Example:**
```typescript
// src/lib/ingestion/types.ts
export interface RawItem {
  externalId: string       // Source-system unique ID (OTS key, RSS guid/link)
  sourceUrl: string        // Canonical URL of the item
  title: string
  body: string             // Plain text or HTML body for fingerprinting + rawPayload
  publishedAt: Date | null
  rawPayload: unknown      // Original response object — stored verbatim in Article.rawPayload
}

export type AdapterFn = (source: Source) => Promise<RawItem[]>
```

### Pattern 2: Registry Map

**What:** A single file exports the adapter map, keyed to `ArticleSource` enum values. Core ingestion resolves the adapter by `source.type`.

**When to use:** Always — this is how ING-05 extensibility is achieved.

**Example:**
```typescript
// src/lib/ingestion/adapters/registry.ts
import { otsAtAdapter } from './ots-at'
import { rssAdapter } from './rss'
import type { ArticleSource } from '@prisma/client'
import type { AdapterFn } from '../types'

export const adapterRegistry: Record<ArticleSource, AdapterFn | undefined> = {
  OTS_AT: otsAtAdapter,
  RSS: rssAdapter,
  MANUAL: undefined,  // MANUAL articles are not ingested programmatically
}
```

### Pattern 3: DI via TypeScript Overloads (required by project)

**What:** Ingestion DAL functions and `ingest()` accept an optional `PrismaClient` for test injection, using the established duck-typing pattern (`'$connect' in client`).

**When to use:** All ingestion DAL functions and the core `ingest()` function.

**Example:**
```typescript
// Mirrors established pattern from src/lib/content/articles.ts
export async function ingest(source: Source): Promise<IngestionResult>
export async function ingest(client: PrismaClient, source: Source): Promise<IngestionResult>
export async function ingest(
  clientOrSource: PrismaClient | Source,
  maybeSource?: Source
): Promise<IngestionResult> {
  const db = '$connect' in clientOrSource ? clientOrSource as PrismaClient : defaultPrisma
  const source = '$connect' in clientOrSource ? maybeSource! : clientOrSource as Source
  // ...
}
```

### Pattern 4: Deduplication Strategy

**What:** Two-layer dedup. Fast path: check `Article` by `(source, externalId)` — uses the existing composite index. Slow path (cross-source): compute SHA-256 fingerprint of normalized title + body; check against `contentHash` unique column.

**When to use:** Before every `Article.create()` call.

**Example:**
```typescript
// src/lib/ingestion/dedup.ts
import { createHash } from 'node:crypto'

export function computeContentHash(title: string, body: string): string {
  const normalized = [title, body]
    .map(s => s.toLowerCase().replace(/\s+/g, ' ').trim())
    .join('||')
  return createHash('sha256').update(normalized, 'utf8').digest('hex')
}

export async function isDuplicate(
  db: PrismaClient,
  source: ArticleSource,
  externalId: string,
  contentHash: string
): Promise<boolean> {
  // Fast path: exact source + externalId match
  const byId = await db.article.findFirst({ where: { source, externalId } })
  if (byId) return true
  // Slow path: content fingerprint (cross-source dedup)
  const byHash = await db.article.findFirst({ where: { contentHash } })
  return !!byHash
}
```

### Pattern 5: IngestionRun Recording

**What:** Every call to `ingest(source)` opens an `IngestionRun` record at start, closes it at end with counts and optional error message.

**When to use:** Always — enables Phase 4 dead-man monitor and Phase 5 health dashboard.

**Example:**
```typescript
const run = await db.ingestionRun.create({
  data: { sourceId: source.id, startedAt: new Date() }
})
try {
  // ... fetch and write articles
  await db.ingestionRun.update({
    where: { id: run.id },
    data: { finishedAt: new Date(), itemsFound, itemsNew }
  })
} catch (err) {
  await db.ingestionRun.update({
    where: { id: run.id },
    data: { finishedAt: new Date(), error: String(err) }
  })
  throw err
}
```

### Anti-Patterns to Avoid

- **Storing credentials in the Source DB row:** API keys belong in `.env` only; source row stores the URL and type.
- **Calling the OTS detail endpoint for every list result immediately:** Fetch the list first, dedup by externalId, then fetch detail only for items that pass dedup. This minimizes API calls against the 2,500/day limit.
- **Using `instanceof PrismaClient` for DI:** Breaks in vitest due to module isolation. Use `'$connect' in client` duck-typing (established project pattern).
- **Mutating the `Article` schema's enum without a migration:** `ArticleSource` is a Postgres enum; adding values requires a migration.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| RSS/Atom XML parsing | Custom XML parser or regex | feedsmith `parseFeed()` | RSS has 6+ incompatible versions, Atom has namespace edge cases, real feeds are malformed; feedsmith has 2000+ tests covering this |
| Feed format detection | Content-type sniffing or regex | feedsmith auto-detects format | Format detection from XML requires namespace inspection; feedsmith handles this |
| Content hashing | Rolling hash, fuzzy match | Node.js `crypto.createHash('sha256')` | SHA-256 is sufficient for exact dedup; fuzzy matching adds complexity with minimal benefit for press release distribution |
| HTTP retry logic | Custom retry loop with backoff | Simple try/catch + error logging + consecutive_failures counter | Phase 2 records failures and self-heals on next poll; complex retry within a single poll adds latency for little gain. Phase 4 scheduler handles retry via re-polling |

**Key insight:** RSS/Atom parsing looks simple but the format ecosystem is a mess of competing standards, broken implementations, and vendor extensions. feedsmith's 2,000+ tests encode 25 years of real-world feed quirks.

---

## Common Pitfalls

### Pitfall 1: OTS API Rate Limit Exhaustion
**What goes wrong:** With multiple sources each polling frequently, the 2,500 req/day limit is hit. Each source typically requires a `/api/liste` call + N `/api/detail` calls for new items.
**Why it happens:** Default polling intervals set too short; not deduplicating by externalId before fetching detail.
**How to avoid:** Always deduplicate by `(source, externalId)` before fetching detail. Set `poll_interval_minutes` to a reasonable default (e.g. 15 minutes) in the source seed. Document the math in the seed: 96 polls/day × ~5 new items/poll = 480 detail calls/day safely under 2,500.
**Warning signs:** HTTP 429 or 403 responses from api.ots.at.

### Pitfall 2: RSS Feed Items Without GUIDs
**What goes wrong:** Some RSS feeds omit `<guid>` or `<atom:id>`, causing `externalId` to be undefined. Dedup by externalId fails silently; content duplicates pile up.
**Why it happens:** RSS 2.0 `<guid>` is optional; many CMS-generated feeds use only `<link>` or omit both.
**How to avoid:** RSS adapter should derive `externalId` as: `item.guid ?? item.link ?? computeContentHash(item.title, item.description)`. If falling back to the content hash, the fast-path dedup by externalId becomes the same as the slow-path content hash check — still correct, just redundant.
**Warning signs:** Duplicate articles appearing in the database from a single RSS source.

### Pitfall 3: pgLite Migration Gap in Tests
**What goes wrong:** New `Source` and `IngestionRun` tables don't exist in test DBs because `setup-db.ts` only loads SQL from `prisma/migrations/` in sorted order. The new migration must land in that directory.
**Why it happens:** Developers add Prisma schema changes but forget to generate/commit the migration file before writing tests.
**How to avoid:** Generate migration (`npx prisma migrate dev --name ingestion`) before writing ingestion tests. The test `setup-db.ts` automatically picks up all migration files in sort order — no code changes needed.
**Warning signs:** `PrismaClientKnownRequestError` or "relation does not exist" errors in vitest.

### Pitfall 4: contentHash Null on Existing Articles
**What goes wrong:** The `contentHash` column is added to `Article` in Phase 2, but Phase 1 articles have `contentHash = null`. A `@@unique` on `contentHash` would allow multiple `null` values in Postgres (NULL != NULL), which is correct behavior — but the dedup query `WHERE contentHash = $hash` with a `null` input would return no match and fail to dedup.
**Why it happens:** Computing hash at write time but forgetting to handle the `null` edge case in the dedup check.
**How to avoid:** Always compute a non-null `contentHash` before calling `isDuplicate`. Never insert an Article with `contentHash = null` from ingestion paths.
**Warning signs:** Content hash dedup silently passing for new items when title+body is empty.

### Pitfall 5: OTS API Documentation is 403-Gated
**What goes wrong:** Direct fetch of https://api.ots.at/doku/ returns 403 — it requires browser access. The exact JSON response schema (all field names, types, nested structure) cannot be verified programmatically before the adapter is written.
**Why it happens:** APA protects their docs behind browser-only access.
**How to avoid:** The OTS adapter should log the raw API response on first successful call (using the structured logger). An integration test with a real API key should verify the field mapping before production. Treat field names (TITEL, ZEITSTEMPEL, EMITTENT, WEBLINK, OTSKEY) as MEDIUM confidence — they come from web search snippets, not the official docs page.
**Warning signs:** TypeScript `undefined` errors on response fields in the adapter.

---

## Code Examples

Verified patterns from official sources:

### OTS.at API — List Endpoint
```typescript
// Source: api.ots.at (verified field names via search snippets — MEDIUM confidence)
// GET https://www.ots.at/api/liste?app={API_KEY}&query={query}&anz={count}&von={unix_ts}
// Response fields: TITEL, UTL (subtitle), DATUM, ZEIT, ZEITSTEMPEL, EMITTENT, WEBLINK, OTSKEY

const params = new URLSearchParams({
  app: process.env.OTS_API_KEY!,
  anz: '50',
  von: String(Math.floor(sinceDate.getTime() / 1000)),
})
const res = await fetch(`https://www.ots.at/api/liste?${params}`)
if (!res.ok) throw new Error(`OTS API error: ${res.status}`)
const items = await res.json() as OtsListItem[]
```

### OTS.at API — Detail Endpoint
```typescript
// GET https://www.ots.at/api/detail?app={API_KEY}&id={OTSKEY}
// Returns single press release with full content body
const res = await fetch(`https://www.ots.at/api/detail?app=${process.env.OTS_API_KEY}&id=${otsKey}`)
const detail = await res.json() as OtsDetailItem
```

### feedsmith — Parse RSS Feed
```typescript
// Source: github.com/macieklamberski/feedsmith (HIGH confidence)
import { parseFeed } from 'feedsmith'

const response = await fetch(source.url)
if (!response.ok) throw new Error(`RSS fetch failed: ${response.status}`)
const xml = await response.text()
const { feed } = parseFeed(xml)
// feed.items[] for RSS; each item has .title, .link, .description, .pubDate, .guid
```

### SHA-256 Content Fingerprint
```typescript
// Source: Node.js built-in crypto (HIGH confidence)
import { createHash } from 'node:crypto'

export function computeContentHash(title: string, body: string): string {
  const normalized = [title, body]
    .map(s => s.toLowerCase().replace(/\s+/g, ' ').trim())
    .join('||')
  return createHash('sha256').update(normalized, 'utf8').digest('hex')
}
```

### Idempotent Source Seed (same pattern as Phase 1 Bezirk seed)
```typescript
// Mirrors prisma/seed.ts pattern
export async function seedSources(prisma: PrismaClient, bundesland: string): Promise<void> {
  const sources = bundesland === 'steiermark' ? steiermarkSources : []
  for (const s of sources) {
    await prisma.source.upsert({
      where: { url: s.url },
      update: { type: s.type, enabled: s.enabled },
      create: s,
    })
  }
}
if (import.meta.url === `file://${process.argv[1]}`) { /* main() */ }
```

---

## Prisma Schema Extension

New models to add in Phase 2 migration:

```prisma
model Source {
  id                  Int            @id @default(autoincrement())
  type                ArticleSource  // OTS_AT | RSS
  url                 String         @unique
  enabled             Boolean        @default(true)
  pollIntervalMinutes Int            @default(15)
  consecutiveFailures Int            @default(0)
  lastSuccessAt       DateTime?
  healthStatus        SourceHealth   @default(OK)
  createdAt           DateTime       @default(now())
  updatedAt           DateTime       @updatedAt
  runs                IngestionRun[]

  @@index([enabled])
}

enum SourceHealth {
  OK
  DEGRADED   // 1-2 consecutive failures
  DOWN       // >= N consecutive failures (threshold configurable)
}

model IngestionRun {
  id         Int       @id @default(autoincrement())
  source     Source    @relation(fields: [sourceId], references: [id])
  sourceId   Int
  startedAt  DateTime  @default(now())
  finishedAt DateTime?
  itemsFound Int?
  itemsNew   Int?
  error      String?

  @@index([sourceId, startedAt])
}
```

And a new field on the existing `Article` model:
```prisma
// Add to Article model:
contentHash  String?  @unique  // SHA-256 of normalized title+body for cross-source dedup
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| node-feedparser (streams) | feedsmith / @rowanmanning/feed-parser (string-based) | ~2022-2024 | Simpler async/await interface without stream plumbing |
| URL-only dedup | Content hash dedup | Industry practice | Blocks reposts and cross-source duplicates that share the same body |
| Cron-in-code | Separate scheduler phase | Architectural decision | Phase 2 ships `ingest()` as a function; Phase 4 wires it to a timer |

**Deprecated/outdated:**
- `node-feedparser`: Stream-based API is harder to test and integrate with modern async patterns. Not wrong, just less ergonomic than feedsmith.
- URL-only dedup: Insufficient — same press release distributed to multiple RSS feeds will have different URLs but identical content.

---

## Open Questions

1. **OTS.at API response field names**
   - What we know: TITEL, UTL, DATUM, ZEIT, ZEITSTEMPEL, EMITTENT, WEBLINK, OTSKEY confirmed from web search snippets of the api.ots.at/beispiele page
   - What's unclear: Full field list for `/api/detail` endpoint (especially: body/content field name, attachment structure, full character encoding)
   - Recommendation: In the OTS adapter, log the raw JSON of the first successful response before mapping it. This is a Wave 0 or Wave 1 task — the adapter should be written defensively with null-safe field access and TypeScript types marked as partial until verified against real API output.

2. **`consecutiveFailures` reset on partial success**
   - What we know: The field should reset to 0 on a successful poll
   - What's unclear: Should a poll that fetches the list but fails on some detail calls count as success or failure?
   - Recommendation: Count as success (list was reachable) with the individual item errors logged. Reset `consecutiveFailures` to 0 and update `lastSuccessAt`. Item-level errors are noise, not source-level failures.

3. **feedsmith item field normalization**
   - What we know: feedsmith preserves original feed structure, meaning RSS 2.0 items have `.title`, `.link`, `.description`, `.pubDate`, `.guid`; Atom items have different field names
   - What's unclear: Exact TypeScript types for the items array when using the universal `parseFeed()` — format-specific parsers return typed objects, universal parser returns a discriminated union
   - Recommendation: Use format-specific parsers in the RSS adapter after detecting format, or access items through the `feed` object returned by `parseFeed` and handle RSS vs Atom cases explicitly. The TypeScript types from feedsmith should make this clear.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 2.1.9 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `vitest run src/lib/ingestion` |
| Full suite command | `vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ING-01 | OTS adapter fetches list + detail, returns RawItem[] | unit (mock fetch) | `vitest run src/lib/ingestion/adapters/ots-at.test.ts` | Wave 0 |
| ING-01 | OTS adapter maps ZEITSTEMPEL to publishedAt correctly | unit | same file | Wave 0 |
| ING-02 | RSS adapter parses RSS 2.0 feed string into RawItem[] | unit (fixture XML) | `vitest run src/lib/ingestion/adapters/rss.test.ts` | Wave 0 |
| ING-02 | RSS adapter parses Atom feed string into RawItem[] | unit (fixture XML) | same file | Wave 0 |
| ING-02 | New source type added to registry, ingest() picks it up | unit | `vitest run src/lib/ingestion/ingest.test.ts` | Wave 0 |
| ING-03 | isDuplicate() blocks article with same externalId+source | unit (pgLite) | `vitest run src/lib/ingestion/dedup.test.ts` | Wave 0 |
| ING-03 | isDuplicate() blocks article with same contentHash, different source | unit (pgLite) | same file | Wave 0 |
| ING-03 | isDuplicate() allows article with unique contentHash | unit (pgLite) | same file | Wave 0 |
| ING-04 | ingest() increments consecutiveFailures on adapter error | unit (pgLite, mock adapter) | `vitest run src/lib/ingestion/ingest.test.ts` | Wave 0 |
| ING-04 | ingest() sets healthStatus=DOWN after N failures | unit (pgLite) | same file | Wave 0 |
| ING-04 | ingest() resets consecutiveFailures to 0 on success | unit (pgLite) | same file | Wave 0 |
| ING-05 | Registry resolves correct adapter by source.type | unit | `vitest run src/lib/ingestion/adapters/registry.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `vitest run src/lib/ingestion`
- **Per wave merge:** `vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/ingestion/adapters/ots-at.test.ts` — covers ING-01
- [ ] `src/lib/ingestion/adapters/rss.test.ts` — covers ING-02
- [ ] `src/lib/ingestion/dedup.test.ts` — covers ING-03
- [ ] `src/lib/ingestion/ingest.test.ts` — covers ING-04, ING-05 (partial)
- [ ] `src/lib/ingestion/adapters/registry.test.ts` — covers ING-05
- [ ] `src/lib/content/sources.test.ts` — covers Source DAL functions
- [ ] RSS fixture XML files for test/fixtures/ (RSS 2.0 sample, Atom 1.0 sample)
- [ ] Migration: `npx prisma migrate dev --name ingestion` — adds Source, IngestionRun, contentHash

---

## Sources

### Primary (HIGH confidence)
- Node.js `crypto` built-in docs — SHA-256 hashing pattern
- github.com/macieklamberski/feedsmith — feedsmith API, supported formats, parseFeed interface
- Existing project code: `src/lib/content/articles.ts`, `src/lib/prisma.ts`, `prisma/seed.ts`, `src/test/setup-db.ts` — DI patterns, test infrastructure, seed patterns

### Secondary (MEDIUM confidence)
- api.ots.at (search snippets) — OTS API URL structure, `app` parameter, field names: TITEL, UTL, DATUM, ZEIT, ZEITSTEMPEL, EMITTENT, WEBLINK, OTSKEY; 2,500 req/day limit; free with API key registration
- feedsmith npm registry — version 2.9.1 confirmed

### Tertiary (LOW confidence)
- OTS API full detail endpoint field list — docs are 403-gated; only list endpoint fields verified. Detail endpoint body/content field name is UNVERIFIED — must be checked against real API response in implementation.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — feedsmith version verified, crypto built-in, Prisma already in project
- Architecture: HIGH — DAL patterns directly mirror established Phase 1 code
- OTS API field names: MEDIUM — verified from search snippets, not direct doc fetch
- OTS detail endpoint schema: LOW — gated, unverified; must be checked in implementation
- Pitfalls: HIGH — RSS GUID absence and pgLite migration gap are well-known patterns; OTS rate limit math is straightforward

**Research date:** 2026-03-21
**Valid until:** 2026-04-20 (feedsmith and OTS API are stable; re-verify OTS field names against live API on first implementation)
