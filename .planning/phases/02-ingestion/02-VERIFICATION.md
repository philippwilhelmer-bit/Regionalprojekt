---
phase: 02-ingestion
verified: 2026-03-21T23:58:00Z
status: passed
score: 4/4 success criteria verified
re_verification:
  previous_status: gaps_found
  previous_score: 3/4
  gaps_closed:
    - "tsc --noEmit passes with zero TypeScript errors in production source files"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Run tsx scripts/ingest-run.ts against a database seeded with real OTS_API_KEY"
    expected: "Script prints sources found, calls ingest() for each, exits 0 on success"
    why_human: "Requires real OTS_API_KEY env var and a running Postgres instance with seeded sources"
  - test: "Verify OTS_API_KEY is never logged or persisted in a Source DB row"
    expected: "Source rows contain only the API list URL; the key stays in process.env only"
    why_human: "Security property — cannot verify from static analysis alone without inspecting DB writes at runtime"
---

# Phase 2: Ingestion Verification Report

**Phase Goal:** Raw content flows reliably from OTS.at and RSS sources into the database, with duplicates blocked before they reach the AI pipeline and operators alerted on source failures
**Verified:** 2026-03-21T23:58:00Z
**Status:** passed
**Re-verification:** Yes — after gap closure (02-07-PLAN.md)

---

## Re-verification Summary

Previous verification (2026-03-21T23:40:00Z) found one gap: `tsc --noEmit` failed with 4 TypeScript errors in `rss.ts` and `ingest.ts` caused by `AdapterFn` being typed as `(source: ArticleSource) => Promise<RawItem[]>` when adapters require the full `Source` Prisma model.

Plan 02-07 closed the gap with targeted changes:

1. `src/lib/ingestion/types.ts` — `AdapterFn` parameter changed from `ArticleSource` (enum) to `Source` (Prisma model), commits `be5420b` + `cc9eaf8`.
2. `src/lib/ingestion/adapters/registry.ts` — `rssAdapter as unknown as AdapterFn` cast removed; types now align directly.
3. `src/lib/ingestion/ingest.ts` — illegal adapter invocation cast removed; `adapterFn(src)` called directly.
4. `src/lib/ingestion/adapters/rss.ts` — Atom path: `entry.id ?? computeContentHash(title, summary)` guarantees `string` externalId.

**Re-verification result:** `tsc --noEmit` exits 0 with zero output. All 49 tests pass. Gap fully closed.

---

## Goal Achievement

### Success Criteria (from ROADMAP.md)

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | New OTS.at press releases appear in the ingestion queue within one polling cycle — source, external ID, and raw payload stored | VERIFIED | `otsAtAdapter` in `src/lib/ingestion/adapters/ots-at.ts`: list + dedup + detail flow. `ingest()` writes Article rows with `status: FETCHED`, `externalId`, `rawPayload`. 4 adapter tests + ingest integration tests pass. |
| 2 | A generic RSS feed can be added by registering a new adapter config entry; no changes to core ingestion logic required | VERIFIED | `rssAdapter` handles RSS 2.0 + Atom 1.0. `adapterRegistry` maps `RSS -> rssAdapter`. New RSS source requires only a new `Source` DB row with `type: RSS`. No core logic changes needed. 5 tests pass. |
| 3 | Submitting the same article via two different sources results in exactly one database record — content fingerprinting blocks the duplicate | VERIFIED | `computeContentHash` (SHA-256 of normalized title+body) in `dedup.ts`. `isDuplicate` has fast path (source+externalId) and slow path (contentHash). `ingest()` calls `isDuplicate` before every `article.create()`. 3 dedup tests + ingest skip-duplicate test pass. |
| 4 | When OTS.at returns an error or goes silent, an operator alert fires and the failed source is visible in admin with last-successful-fetch timestamp | VERIFIED (Phase 2 scope) | `ingest()` increments `consecutiveFailures`, sets `healthStatus` to `DEGRADED` (1-2 failures) or `DOWN` (>=3), emits `console.warn` with sourceId. `lastSuccessAt` updated on success reset. 5 health-tracking tests pass. External alerting deferred to Phase 4/5 by design (documented in 02-05-PLAN.md). |

**Score:** 4/4 success criteria verified

---

## Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `ingest()` writes Article rows with FETCHED status for new non-duplicate items | VERIFIED | `ingest.ts` line 121: `status: 'FETCHED'`. Test: "writes Article with status FETCHED for new non-duplicate items" passes. |
| 2 | `isDuplicate` returns true for same source+externalId (fast path) and same contentHash cross-source (slow path) | VERIFIED | `dedup.ts` lines 79-90: two-stage `findFirst` queries. All 3 `isDuplicate` tests pass. |
| 3 | OTS.at adapter fetches list, deduplicates by externalId, fetches detail only for new items | VERIFIED | `ots-at.ts`: DB pre-check before `/api/detail`. Test: "does NOT fetch /api/detail for an item whose OTSKEY already exists" passes. |
| 4 | RSS/Atom adapter parses both formats with externalId fallback chain (guid -> link -> contentHash) | VERIFIED | `rss.ts` lines 38-50 (RSS), 53-72 (Atom). RSS 2.0: `guid ?? link ?? computeContentHash`. Atom: `entry.id ?? computeContentHash(title, summary)`. 5 tests pass. |
| 5 | Source health tracked: DEGRADED after 1-2 failures, DOWN after >=3, reset to OK on success | VERIFIED | `ingest.ts` lines 91-98. Tests: DEGRADED, DOWN, reset-on-success all pass. |
| 6 | IngestionRun records opened at start and closed with counts or error on finish | VERIFIED | `ingest.ts` lines 60-62 (open), 133-135 (success close), 85-88 (error close). Test: "creates an IngestionRun record at start and closes it on success" passes. |
| 7 | Source seed is idempotent — re-running produces no duplicate Source rows | VERIFIED | `seed.ts` uses `prisma.source.upsert({ where: { url } })`. 4 seed idempotency tests pass. |
| 8 | `scripts/ingest-run.ts` CLI triggers `ingest()` for all enabled sources | VERIFIED | File exists, imports `listSources({ enabled: true })` and `ingest`. Wiring confirmed by grep. Runtime execution requires live DB (human verification). |
| 9 | `tsc --noEmit` passes with zero errors in all production source files | VERIFIED | `tsc --noEmit` exits 0 with no output. Confirmed by running `node node_modules/.bin/tsc --noEmit` in working directory. |

---

## Required Artifacts

| Artifact | Plan | Status | Details |
|----------|------|--------|---------|
| `prisma/schema.prisma` | 02-01 | VERIFIED | Contains `Source`, `IngestionRun`, `SourceHealth` enum, `contentHash` on Article |
| `src/lib/ingestion/types.ts` | 02-02 / 02-07 | VERIFIED | `AdapterFn = (source: Source) => Promise<RawItem[]>` — correct Prisma model type |
| `src/lib/ingestion/dedup.ts` | 02-02 | VERIFIED | Exports `computeContentHash` and `isDuplicate` with DI overloads |
| `src/lib/ingestion/dedup.test.ts` | 02-02 | VERIFIED | 6 passing tests |
| `src/lib/ingestion/adapters/ots-at.ts` | 02-03 | VERIFIED | Exports `createOtsAtAdapter` factory and `otsAtAdapter` instance |
| `src/lib/ingestion/adapters/ots-at.test.ts` | 02-03 | VERIFIED | 4 passing tests |
| `src/lib/ingestion/adapters/rss.ts` | 02-04 / 02-07 | VERIFIED | Exports `rssAdapter`. Atom path: `entry.id ?? computeContentHash(title, summary)`. Zero TS errors. |
| `src/lib/ingestion/adapters/rss.test.ts` | 02-04 | VERIFIED | 5 passing tests |
| `src/lib/ingestion/adapters/registry.ts` | 02-05 / 02-07 | VERIFIED | `adapterRegistry` with OTS_AT and RSS — no unsafe casts |
| `src/lib/ingestion/adapters/registry.test.ts` | 02-05 | VERIFIED | 3 passing tests |
| `src/lib/ingestion/ingest.ts` | 02-05 / 02-07 | VERIFIED | `ingest()` with full health tracking. Direct `adapterFn(src)` call — no illegal cast. |
| `src/lib/ingestion/ingest.test.ts` | 02-05 | VERIFIED | 8 passing tests |
| `src/lib/content/sources.ts` | 02-05 | VERIFIED | Exports `listSources`, `getSourceById`, `updateSourceHealth` with DI overloads |
| `src/lib/content/sources.test.ts` | 02-05 | VERIFIED | 5 passing tests |
| `prisma/seed-data/sources.ts` | 02-06 | VERIFIED | Exports `steiermarkSources` with OTS_AT + RSS entries |
| `prisma/seed.ts` | 02-06 | VERIFIED | Exports `seedSources()` with idempotent upsert by URL |
| `prisma/seed.test.ts` | 02-06 | VERIFIED | 7 seed tests pass |
| `scripts/ingest-run.ts` | 02-06 | VERIFIED | Imports `listSources` + `ingest`, correct CLI structure |
| `test/fixtures/rss-sample.xml` | 02-01 | VERIFIED | Valid RSS 2.0 with 2 items |
| `test/fixtures/atom-sample.xml` | 02-01 | VERIFIED | Valid Atom 1.0 with 2 entries |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/ingestion/types.ts` | `src/lib/ingestion/adapters/registry.ts` | `AdapterFn` import | WIRED | `import type { AdapterFn } from '../types'` at registry.ts line 14. `adapterRegistry` typed as `Partial<Record<ArticleSource, AdapterFn>>`. |
| `src/lib/ingestion/types.ts` | `src/lib/ingestion/adapters/ots-at.ts` | `AdapterFn` return type | WIRED | `import type { AdapterFn, RawItem }` in ots-at.ts. `createOtsAtAdapter` returns `AdapterFn`. |
| `src/lib/ingestion/types.ts` | `src/lib/ingestion/ingest.ts` | `AdapterFn` used for adapterFn call | WIRED | `adapterFn` resolved from registry (typed as `AdapterFn`), called directly as `adapterFn(src)` — no cast. |
| `src/lib/ingestion/adapters/rss.ts` | `feedsmith parseFeed()` | `import { parseFeed } from 'feedsmith'` | WIRED | `rss.ts` line 10. `feedsmith@^2.9.1` in package.json. |
| `src/lib/ingestion/ingest.ts` | `src/lib/ingestion/adapters/registry.ts` | `adapterRegistry[source.type]` | WIRED | `ingest.ts` line 66: `const adapterFn = adapterRegistry[src.type]`. |
| `src/lib/ingestion/ingest.ts` | `src/lib/ingestion/dedup.ts` | `isDuplicate()` before `Article.create()` | WIRED | `ingest.ts` line 114: `const dup = await isDuplicate(db, src.type, item.externalId, contentHash)`. |
| `src/lib/ingestion/ingest.ts` | `prisma.ingestionRun` | `create` at start, `update` at end | WIRED | Lines 60-62 (open), 85-88 (error close), 133-135 (success close). |
| `src/lib/content/sources.ts` | `prisma.source` | DAL queries | WIRED | `source.findMany`, `source.findFirst`, `source.update` in all three exported functions. |
| `prisma/seed.ts` | `prisma/seed-data/sources.ts` | `import steiermarkSources` | WIRED | Confirmed in seed.ts. |
| `scripts/ingest-run.ts` | `src/lib/ingestion/ingest.ts` | `import ingest` | WIRED | `import { ingest } from '../src/lib/ingestion/ingest'` at scripts/ingest-run.ts line 11. |
| `scripts/ingest-run.ts` | `src/lib/content/sources.ts` | `listSources({ enabled: true })` | WIRED | Import at line 10; call at line 14 `listSources({ enabled: true })`. |

---

## Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| ING-01 | 02-01, 02-03, 02-06 | System ingests press releases from OTS.at via API | SATISFIED | `otsAtAdapter`: list+dedup+detail flow. 4 adapter tests pass. Seed includes OTS_AT source. |
| ING-02 | 02-01, 02-04, 02-06 | System ingests content from generic RSS/Atom feeds | SATISFIED | `rssAdapter` handles RSS 2.0 + Atom 1.0 via feedsmith. 5 tests pass. New RSS source = new DB row only. |
| ING-03 | 02-01, 02-02 | System deduplicates content using content fingerprinting (not URL-only) | SATISFIED | `computeContentHash` (SHA-256) + `isDuplicate` fast/slow paths. Cross-source dedup test confirmed. `contentHash @unique` in schema. |
| ING-04 | 02-01, 02-05 | System alerts operator when a source fails or goes stale | SATISFIED (Phase 2 scope) | `consecutiveFailures` increment, `healthStatus` DEGRADED/DOWN transitions, `lastSuccessAt` on success, `console.warn` structured log. External alerting scoped to Phase 4/5 by design. |
| ING-05 | 02-01, 02-02, 02-05, 02-07 | Source adapters follow a plug-in interface so new sources can be added without changing core ingestion logic | SATISFIED | `adapterRegistry` is the single extension point. `AdapterFn` type correctly uses `Source`. No unsafe casts needed. New source type = add registry entry only. |

No orphaned requirements — all 5 ING requirements claimed by plans and addressed by implementation. All 5 ING requirements are marked complete in REQUIREMENTS.md.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `prisma/seed-data/sources.ts` | ~18 | Placeholder RSS URL | Info | The Kleine Zeitung RSS URL is a known placeholder pending Phase 5 CMS source management. Intentional by design (noted in plan). |

The blocker anti-patterns from the initial verification (unsafe casts and type errors) have been resolved. No remaining blockers or warnings.

---

## Human Verification Required

### 1. End-to-end OTS.at ingestion cycle

**Test:** Set `OTS_API_KEY` to a valid key, run `npx prisma db seed` to seed sources, then run `tsx scripts/ingest-run.ts`.
**Expected:** Script logs sources found, calls OTS `/api/liste`, fetches details for new items, writes Article rows with `status=FETCHED`. Exits 0.
**Why human:** Requires a valid OTS API key and live Postgres instance. Cannot verify with static analysis.

### 2. API key not persisted in database

**Test:** After seeding and running ingest, inspect the Source row for OTS_AT in the database.
**Expected:** The `url` column contains `https://www.ots.at/api/liste` — no API key present. Key only in `process.env.OTS_API_KEY`.
**Why human:** Security property requiring runtime DB inspection.

---

## Metrics

- **Test suite:** 49/49 tests pass across 9 test files
- **TypeScript:** `tsc --noEmit` exits 0, zero diagnostics
- **Commits:** `be5420b` (AdapterFn type fix), `cc9eaf8` (rss.ts Atom fix + test updates)
- **Files modified in gap closure:** 6 (types.ts, registry.ts, ingest.ts, rss.ts, ots-at.test.ts, ingest.test.ts)

---

_Verified: 2026-03-21T23:58:00Z_
_Verifier: Claude (gsd-verifier)_
