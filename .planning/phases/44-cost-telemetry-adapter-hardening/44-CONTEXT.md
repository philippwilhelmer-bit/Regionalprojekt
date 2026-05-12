# Phase 44: Cost Telemetry & Adapter Hardening - Context

**Gathered:** 2026-05-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire per-article AI cost telemetry onto `Article` (six columns: `aiInputTokens`, `aiCachedInputTokens`, `aiOutputTokens`, `aiCostUsd Decimal(10,6)`, `aiModel`, `aiProcessedAt`), surface cost in the admin UI (sortable column on the articles list + dedicated aggregate page), spike-test and then ship the Anthropic Message Batches API as the default AI transport (with a per-article fallback flag) introducing a new `BATCHED` ArticleStatus, and harden the ingestion adapters (OTS bulk dedup, AbortController 10s per fetch, OTS `lastFetchedAt` cursor with 30-min overlap, RSS conditional GET via etag/lastModified, transactional IngestionRun + Source.healthStatus update).

Covers requirements **TLM-01..07** and **INGEST-01..05** (twelve total). Bundles manifest items B1, B2, B4, B5, A4, A5, P3-CF-2.

REVIEW-heuristic work, structured `isStateWide` boolean cleanup, and the quality-eval loop belong to Phase 45 and are explicitly out of scope here.

</domain>

<decisions>
## Implementation Decisions

### Cost UI / UX (TLM-03, TLM-04)

- **Aggregate view: dedicated `/admin/cost` page.** New top-level admin route (linked from admin nav). Keeps the articles list uncluttered and gives room to grow into v3.3 cost+quality dashboards.
- **Articles-list cost column: always visible.** Add a `Kosten` column to `src/app/(admin)/admin/articles/page.tsx` between `Quelle` and `Datum`. Default sort stays `publishedAt desc`; clicking the column header sorts by `aiCostUsd desc` (sort param on the URL, server-side `orderBy` in `listArticlesAdmin`).
- **Display currency: EUR with daily FX.** Store `aiCostUsd` in USD (matches Anthropic billing, single source of truth). Render as `€0,0012` and aggregates as `€1,23` (de-AT locale). FX rate source and caching strategy are **Claude's discretion** (likely: hardcoded fallback rate in `bundesland.config.ts` with optional daily fetch via frankfurter.app or a similar free EUR/USD endpoint, cached server-side).
- **Aggregate dimensions: per source × per day only.** Matches TLM-04 verbatim. Two breakdowns on `/admin/cost`: a "top sources by total cost" table and a "last 30 days" daily series. **Not** in scope: per-Bezirk, per-model breakdowns (deferred).

### Batches API strategy (TLM-05, TLM-06, TLM-07)

- **Spike-test gates the commit.** Dedicated plan `44-02` measures real Haiku 4.5 batch round-trip on a representative payload (~20 articles, current production-like fixtures). Methodology — sample size, p50/p95 threshold (15-min cron window is the hard limit), pass/fail criteria — is **Claude's discretion** at planning time. Operator runs the spike and pastes results into the plan file before `44-03` starts.
- **If spike passes (p50 ≤ 15min):** Ship Batches as default. `TLM-05` per-article fallback flag preserved for emergency rollback (env var or PipelineConfig column, decided at planning).
- **If spike fails (p50 > 15min):** Fall back to `p-limit(4)` concurrency on the per-article path (manifest item B6). Ship the `BATCHED` enum + code path behind the flag (off by default) so v3.3 can retry without re-architecture.
- **Cron orchestration: submit-only per run, poll separately.** Each cron invocation: (1) advance any open `BATCHED` rows by polling Anthropic's batch endpoint and transitioning to `WRITTEN | REVIEW | ERROR`; (2) submit a fresh batch of up to 100 `FETCHED` rows. Whether this is one route (`/api/cron` does both) or two (`/api/cron` submit + `/api/cron-poll` poll) is **Claude's discretion** — single route is the recommended default for simplicity unless cron interval tuning makes splitting necessary.
- **BATCHED operator UX: minimal.** Add `BATCHED` to the `ArticleFilters` status dropdown (`src/app/(admin)/admin/articles/ArticleFilters.tsx`) and to the status-badge mapping. **No** manual operator actions (no force-fail button, no resubmit button) in Phase 44 — deferred.
- **Per-message batch errors increment `retryCount` like any other AI failure.** Unified retry semantics: a stuck article hits `PipelineConfig.maxRetryCount` → transitions to `FAILED`. The existing per-article try/catch + `retryCount` logic in `pipeline.ts` continues to be the single source of truth. `errorMessage` is populated from the batch result's error field for operator visibility.

### Adapter hardening defaults (INGEST-01..05)

- **OTS cursor with 30-min overlap.** `Source.lastFetchedAt` drives the `von=` parameter: `von = lastFetchedAt - 30min` (in epoch seconds). Overlap absorbs cron skew and late-arriving OTS entries; existing dedup-by-externalId catches duplicates harmlessly. Typical fetch window collapses from 24h to ~45min.
- **NULL cursor → 24h fallback.** On a brand-new source or pre-v3.2 row where `lastFetchedAt IS NULL`, use the existing `LOOKBACK_SECONDS = 24 * 60 * 60` constant. Preserves current behavior for the first post-deploy run.
- **AbortController scope: per `fetch()` call, 10s timeout.** Each individual HTTP request (OTS `/liste`, OTS `/detail`, RSS feed body) gets its own `AbortController` with `setTimeout(() => abort(), 10_000)`. Total adapter time unbounded — one slow detail call does not starve the others. Matches Vercel function timeout semantics.
- **RSS conditional GET — update etag/lastModified on 200 only.** When the feed returns HTTP 200 with a body, persist `response.headers.get('etag')` and `response.headers.get('last-modified')` to the `Source` row. HTTP 304 short-circuits parsing entirely (return zero items, do NOT touch the cursor or rewrite headers — stored values remain authoritative).
- **Transactional health update.** Wrap the `IngestionRun.update` + `Source.consecutiveFailures/healthStatus/lastSuccessAt` updates in a single `db.$transaction([...])` for both the success and the failure paths in `src/lib/ingestion/ingest.ts:83-96` and `:133-146`. A crash between them never leaves the two rows divergent.

### Plan breakdown & sequencing

- **Four plans, strictly sequential** — phase 44 does not parallelize:
  - **`44-01-PLAN.md`** — Telemetry: schema migration (Article × 6 columns), populate from merged-call return in `pipeline.ts` final `$transaction`, `/admin/cost` page, `listArticlesAdmin` sort param, `Kosten` column in articles list. Covers TLM-01..04.
  - **`44-02-PLAN.md`** — Batches spike-test: write the spike script, run it against production-like fixtures, record p50/p95 latency in the plan file, decide commit-or-fallback. No production code changes (or only a feature-flag stub).
  - **`44-03-PLAN.md`** — Batches integration: schema migration (`BATCHED` enum), submit + poll code paths, per-article fallback flag, batch-error handling. Conditional content based on `44-02` outcome. Covers TLM-05..07.
  - **`44-04-PLAN.md`** — Ingest hardening: schema migration (Source × 3 columns: `lastFetchedAt`, `etag`, `lastModified`), bulk dedup in `ots-at.ts`, AbortController 10s in both adapters, RSS conditional GET, transactional health update in `ingest.ts`. Covers INGEST-01..05.
- **Order: 44-01 → 44-02 → 44-03 → 44-04.** Telemetry first so the spike-test in 44-02 already has cost data flowing in production. Ingest last because it is independent of all AI-pipeline changes — landing it after Batches avoids a churned migration history if anything in 44-03 pivots.
- **One schema migration per plan.** 44-01 owns the Article telemetry columns. 44-03 owns the `BATCHED` enum. 44-04 owns the Source.lastFetchedAt/etag/lastModified columns. Each plan's migration travels with the code that uses it — no upfront monolithic migration, no `prisma db push` (the v3.1 Article.theme migration-drift precedent in PROJECT.md is the anti-pattern we're correcting).

### Claude's Discretion

- **EUR FX rate source** — hardcoded `EUR_USD_RATE` constant in `bundesland.config.ts` vs daily fetch from frankfurter.app or ECB vs hybrid (hardcoded fallback + opportunistic refresh). Storage: USD in DB, EUR at render time, with a server-side helper (`src/lib/admin/cost-format.ts` or similar).
- **Spike-test methodology** — sample size, payload composition, pass/fail latency threshold (the recommendation is p50 ≤ 15min; planner refines).
- **Cron flow split vs unified** — single `/api/cron` that does poll-then-submit vs separate `/api/cron-poll` route. Default to single route unless plan research shows a reason to split.
- **Per-article fallback flag mechanism** — env var (e.g. `AI_USE_BATCHES`) vs `PipelineConfig.useBatches Boolean`. Env var matches Phase 43 precedent (`AI_USE_MERGED_CALL`); DB column gives admin-UI toggleability.
- **`/admin/cost` page composition** — exact charts/tables/widgets, navigation entry-point design, whether to add a top-of-page totals strip, German labels (`Heute`, `Letzte 7 Tage`, `Pro Quelle`).
- **Status badge styling for `BATCHED`** — color, label (`Batched` vs `In Bearbeitung` vs `Warteschlange`).
- **Whether to persist `ProcessResult.totalCachedInputTokens` to a new `PipelineRun.totalCachedInputTokens Int?` column.** The Phase 43 CONTEXT notes this is in-memory only; Phase 44 is the natural place to add the column. Probably yes for consistency, but planner confirms.
- **Whether `pipeline.ts` final `$transaction` data block accommodates all six new Article columns in one update or splits them.** One update is simpler.

</decisions>

<specifics>
## Specific Ideas

- **Anthropic Message Batches API** — 50% discount on input + output. Async submit + poll model. Polling is fine (no webhook server). Reference: https://docs.anthropic.com/en/api/creating-message-batches
- **Spike-test goal** is purely latency measurement against the 15-min Vercel cron cadence — not quality, not cost (cost is known from the 50% discount). The cron cadence is the only thing that could break the design.
- **Admin UX should feel native to the existing admin shell** — Wurzelwelt/Archivist tokens (Ink/Parchment/Slate/Aged Wood), no new design tokens, no new fonts. The `/admin/cost` page composes existing primitives (tables, cards, badges) the same way `/admin/articles` does.
- **The `Kosten` column should sort on header click via a `?sort=cost` query param** — same router-based pattern as the existing filters (no client state, no JS sort).
- **Per-source cost aggregation** must traverse `Article.sourceId → Source.name` (or `Source.url` if no name field — currently there is no `Source.name`, just `Source.url` and `Source.type`). Admin display should show the URL trimmed to host, e.g. `ots.at`, `orf.at/steiermark`.
- **Operator decision: PipelineRun token totals stay** as the cost-circuit-breaker input. Migrating the circuit breaker to sum `aiCostUsd` is a v3.3 question (see AIPL-FUTURE-05 in REQUIREMENTS).

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`src/lib/ai/pipeline.ts:56-68`** — `ProcessResult` interface already exposes `totalCachedInputTokens`. Phase 44 just persists it (probably to a new `PipelineRun.totalCachedInputTokens` column) and populates the six new `Article` columns inside the final `$transaction` at lines 253-275.
- **`src/lib/ai/steps/merged.ts`** — `runMergedCall` returns `{inputTokens, cacheCreationTokens, cachedInputTokens, outputTokens, ...}`. Phase 44 reads these in the pipeline integration and writes them to the `Article.update` data block. Pricing math (`aiCostUsd`) is a small derived helper based on Anthropic Haiku 4.5 published rates plus the cache-read/cache-write modifiers.
- **`src/lib/admin/articles-actions.ts:170-227`** — `listArticlesAdmin` already supports `bezirkId`, `sourceType`, `status`, `fromDate`, `toDate`, `limit`, `offset`. Phase 44 adds a `sort?: 'cost' | 'publishedAt'` option (or similar) and an `orderBy` switch.
- **`src/app/(admin)/admin/articles/page.tsx:88-105`** — table markup; add the `Kosten` `<th>` between `Quelle` and `Datum` columns.
- **`src/app/(admin)/admin/articles/ArticleRow.tsx`** — per-row rendering; add cost cell with EUR formatting helper.
- **`src/app/(admin)/admin/articles/ArticleFilters.tsx:13-20`** — `STATUSES` array. Append `{ value: 'BATCHED', label: 'In Bearbeitung' }` (or chosen label).
- **`src/lib/ingestion/adapters/ots-at.ts:142-152`** — sequential `findFirst` dedup loop. Replace with `prismaClient.article.findMany({ where: { source: 'OTS_AT', externalId: { in: keys } }, select: { externalId: true } })` once.
- **`src/lib/ingestion/adapters/ots-at.ts:18-22`** — `OTS_BASE_URL`, `LIST_SIZE`, `LOOKBACK_SECONDS` constants. The 24h `LOOKBACK_SECONDS` becomes the NULL-cursor fallback. Adapter takes new `Source` shape with `lastFetchedAt`, computes `von = lastFetchedAt ? Math.floor(lastFetchedAt.getTime()/1000) - 30*60 : Math.floor(Date.now()/1000) - LOOKBACK_SECONDS`.
- **`src/lib/ingestion/adapters/ots-at.ts:45-57, 63-74`** — both `fetchOtsList` and `fetchOtsDetail` get an AbortController. Pattern: `const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 10_000); try { return await fetch(url, {signal: ctrl.signal}); } finally { clearTimeout(t); }`.
- **`src/lib/ingestion/adapters/rss.ts:33-42`** — `fetch(source.url)` becomes `fetch(source.url, { headers: { 'If-None-Match': source.etag, 'If-Modified-Since': source.lastModified, signal: ctrl.signal } })`. Early return `[]` on `response.status === 304`. The function signature already returns `RawItem[]`, so an empty array is a clean short-circuit.
- **`src/lib/ingestion/ingest.ts:57-146`** — orchestrator. Three `update`s need transactional wrapping: the success path (`IngestionRun.update` at :133 + `Source.update` at :139), the failure path (`IngestionRun.update` at :83 + `Source.update` at :93). The transaction shape is `await db.$transaction([db.ingestionRun.update(...), db.source.update(...)])`. Also: success-path `Source.update` extends to set `lastFetchedAt: new Date()`, and on RSS, `etag` / `lastModified` from the response. The current `consecutiveFailures` / `healthStatus` reset and `lastSuccessAt` semantics are preserved.
- **`prisma/schema.prisma`** — three additive migrations: (1) `Article` gets six telemetry columns, (2) `ArticleStatus` enum gets `BATCHED` value (between `FETCHED` and `WRITTEN`), (3) `Source` gets `lastFetchedAt DateTime?`, `etag String?`, `lastModified String?`. All nullable so existing rows remain valid.

### Established Patterns

- **DI via `$connect` duck-typing** (`pipeline.ts:103-111`, `ots-at.ts:120-122`, `ingest.ts:44-55`) — every new module reachable from tests follows this. Adapter and pipeline integrations preserve it verbatim.
- **`Decimal(p,s)` columns** are new for this project (no precedent). Prisma's `Decimal` maps to `@prisma/client/runtime/library`'s `Decimal` type — multiplication/sum at the application layer uses `.add()` / `.mul()`. The `/admin/cost` aggregate query can SUM at SQL level (Prisma supports `_sum` aggregation) to avoid pulling rows.
- **Server Action + `requireAuth()`** for any mutating admin endpoint (Phase 5 onward). The `/admin/cost` page is read-only and uses the existing admin shell — no new auth surface.
- **Token accounting already includes cache-creation in `totalInputTokens`** (`pipeline.ts:184-187`). Carry the same convention to the per-article `aiInputTokens` column: `aiInputTokens = merged.inputTokens + merged.cacheCreationTokens` (fresh input + cache writes; cache reads stored separately in `aiCachedInputTokens`).
- **Cron Route Handler + `CRON_SECRET` bearer auth** (existing `/api/cron`) — any new batch-poll endpoint reuses this pattern, never the Server Action auth pattern.
- **Tests inject a mocked `Anthropic` via `pipeline._clientFactory.create = () => mockClient`** (`pipeline.ts:86-88`). The Batches integration adds a second mockable surface — the SDK's `batches.create` / `batches.retrieve` methods — reachable through the same client.

### Integration Points

- **Pipeline merged-path final `$transaction`** (`pipeline.ts:253-275`) — the `data: {}` of the `article.update` gains six fields (`aiInputTokens`, `aiCachedInputTokens`, `aiOutputTokens`, `aiCostUsd`, `aiModel`, `aiProcessedAt`). Single update, all columns populated atomically with the status transition.
- **Batches path** — net-new code in `src/lib/ai/batches/` (proposed). Two functions: `submitBatch(client, articles, db)` → opens a batch with one `messages.create`-equivalent message per article (using the same merged `tools + tool_choice` shape as `runMergedCall`), writes `Article.status='BATCHED'` rows with `batchId` (probably a new column, or stored in `errorMessage`/temporary table — planner decides), and `pollBatch(client, db)` that retrieves an open batch and applies the result to each `BATCHED` row using the same `computeFinalStatus` + `$transaction` shape as the synchronous merged path.
- **`/api/cron` route** — orchestration switch: if batches enabled, route to `pollOpenBatches` → `submitNewBatch`; else current synchronous `processArticles`. The merged-call output schema is the contract — Batches just changes transport.
- **`/admin/cost` page** — new file `src/app/(admin)/admin/cost/page.tsx`. Reads from `Article` via a new DAL helper (e.g. `getCostAggregates(db, {window: '30d'})`) that returns `{perSource: [{sourceId, sourceLabel, totalUsd, articleCount}], perDay: [{date, totalUsd, articleCount}]}`. Admin nav entry to be added in whichever component renders the admin shell.
- **`Article.aiCostUsd` Decimal serialization to client** — Prisma's `Decimal` is not JSON-serializable by default. The Server Component returns serializable shapes (`.toNumber()` or `.toString()`); never let a `Decimal` cross the network boundary.
- **`src/lib/admin/articles-actions.ts` `listArticlesAdmin`** — add `sortBy?: 'cost' | 'date'` parameter; switch `orderBy` accordingly. `cost` sort uses `[{ aiCostUsd: 'desc' }, { id: 'desc' }]` (NULL-last by Prisma default on `desc` — confirm during planning; if NULL-first is the default, add explicit `{aiCostUsd: { sort: 'desc', nulls: 'last' }}`).
- **Pricing helper** — small pure function in `src/lib/ai/pricing.ts` (proposed): `computeCostUsd({inputTokens, cachedInputTokens, outputTokens, model}) → Decimal`. Centralizes Haiku 4.5 rates (and any future model). Required by both the synchronous and the batches paths; the batches path applies the 50% discount inline (per-call multiplier or a separate `computeBatchCostUsd` wrapper).

</code_context>

<deferred>
## Deferred Ideas

- **Webhook server for Batches API** — explicitly out of scope per REQUIREMENTS (polling is sufficient for the cron cadence).
- **Manual operator actions on BATCHED rows** (force-fail, resubmit, force-cancel) — Phase 44 ships filter+badge only. Reconsider in v3.3 if stuck batches become an operational pain point.
- **Historical pre-v3.2 article backfill of telemetry columns** — REQUIREMENTS explicitly leaves these as `NULL` (interpreted as "unknown — pre-telemetry"). No migration script.
- **Per-Bezirk cost breakdown** — interesting for spend-per-region analysis but not selected. Defer until editorial demand emerges.
- **Per-model cost breakdown** — mostly degenerate today (single Haiku model). Revisit if AiSourceConfig.modelOverride is actually exercised across multiple models in production.
- **Cost-aware circuit breaker** — migrating the existing `checkCostCircuitBreaker` from `PipelineRun.totalInputTokens` to a `SUM(aiCostUsd)` query. Useful (tighter budget control) but a v3.3 question (AIPL-FUTURE-05 in REQUIREMENTS).
- **`p-limit(4)` concurrency on the per-article path** — kept ready as the Phase 44 fallback if the Batches spike fails. Built only if the spike rules out Batches.
- **Admin-UI toggleable Batches/per-article flag** (vs env var) — defer; env var matches the Phase 43 `AI_USE_MERGED_CALL` precedent and is fine for an operator-only knob.
- **Admin nav redesign** to accommodate the new `/admin/cost` link — keep additive, just append a nav entry.
- **Multi-model pricing helper** that pulls rates from a config table — overkill for one model.

</deferred>

---

*Phase: 44-cost-telemetry-adapter-hardening*
*Context gathered: 2026-05-12*
