# Phase 2: Ingestion - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Raw content flows reliably from OTS.at and RSS sources into the database. Duplicates are blocked before reaching the AI pipeline. Operators are alerted when sources fail. No scheduling (Phase 4), no AI processing (Phase 3), no CMS UI (Phase 5) — just the ingestion layer and its supporting data model.

</domain>

<decisions>
## Implementation Decisions

### Source configuration storage
- Sources live in the database only — not in bundesland.config.ts
- Seeded via an idempotent seed script (same pattern as Bezirk seed in Phase 1)
- Source record stores: type (OTS_AT / RSS), URL, enabled flag — nothing else; credentials stay in .env
- Sources are scoped per Bundesland deployment (each deployment has its own source list)
- Phase 5 CMS (CMS-04) can add/disable sources at runtime against this DB model

### Operator alerting
- On source failure: write a structured log entry AND update a health flag on the source record (consecutive_failures count, last_success_at, health status)
- Alert threshold: N consecutive failed polls (N is configurable, default 3) — transient failures don't trigger alerts
- Failed source stays enabled — it keeps polling and self-heals if the source comes back; operator manually disables via Phase 5 CMS
- No external alert service in Phase 2 (no email/Slack) — structured logs are consumed by whatever log aggregator the operator runs

### Polling cadence
- Each source row has a poll_interval_minutes field — polling interval is per-source, configurable via Phase 5 CMS
- Phase 2 ships an ingest() function and a runnable script — manual trigger only; Phase 4 scheduler calls it on a timer
- Each poll run is recorded in an IngestionRun table: source, started_at, finished_at, items_found, items_new, error — enables Phase 4 dead-man monitor and Phase 5 health dashboard

### Adapter contract (ING-05 extensibility)
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

</decisions>

<specifics>
## Specific Ideas

- The seed script for sources should be idempotent (same guard as Phase 1 Bezirk seed: skip if already exists)
- Bundesland scoping on sources aligns with the Phase 1 principle: "config file should be the single source of truth for what this deployment is" — but since sources are now in DB, the seed script plays that role for ingestion bootstrap

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/prisma.ts` — singleton PrismaClient with DI overload pattern; ingestion service should follow the same pattern for testability
- `src/lib/content/articles.ts` — DAL with TypeScript overloads for DI (zero-arg = production singleton, client-injection = test); ingestion DAL should mirror this pattern
- Bezirk seed script — idempotent seed pattern with `import.meta.url` guard; source seed should follow the same structure

### Established Patterns
- TypeScript overloads for DI (duck-typing `$connect` instead of `instanceof PrismaClient`) — required for vitest compatibility
- `ArticleSource` enum already in schema: `OTS_AT`, `RSS`, `MANUAL` — adapter registry keys should match this enum
- `Article.externalId` + `Article.source` composite index already exists — deduplication can leverage `@@index([source, externalId])`
- `Article.rawPayload: Json?` — already reserved for storing raw source content before AI rewrite
- `Article.status: FETCHED` — the initial status for ingested items; ingestion sets this, AI pipeline advances it

### Integration Points
- Ingestion writes `Article` rows with `status: FETCHED` — AI pipeline (Phase 3) picks up `FETCHED` articles
- `Source` DB model (new in Phase 2) will be read by Phase 4 scheduler and managed by Phase 5 CMS
- `IngestionRun` table will be read by Phase 4 dead-man monitor and Phase 5 health dashboard

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-ingestion*
*Context gathered: 2026-03-21*
