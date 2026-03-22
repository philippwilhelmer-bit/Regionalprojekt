# Phase 4: Scheduler and Autonomous Publishing - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

The platform runs fully unattended — separate cron jobs drive ingest and AI/publish on a configured interval, articles advance from `WRITTEN` to `PUBLISHED` without human action, and the operator is alerted via structured logs if the pipeline goes silent. No CMS UI (Phase 5), no reader frontend (Phase 6) — just the scheduling layer, the publish step, and operational monitoring.

</domain>

<decisions>
## Implementation Decisions

### Cron schedule design
- **Separate jobs per step**: ingest cron and AI/publish cron run as independent cron entries (not a single unified job)
- **Same interval**: one `POLL_INTERVAL_MINUTES` env var governs both jobs — consistent with how thresholds and API keys are configured in Phases 2 & 3
- **Implementation mechanism**: OS-level crontab or process manager (PM2) triggers the existing CLI scripts (`ingest-run.ts`, `ai-run.ts`) — no new runtime needed, no HTTP overhead
- The cron entries call the scripts that already exist; Phase 4 adds the scheduling layer around them

### Publishing trigger
- **Auto-publish ALL `WRITTEN` articles each cycle** — not just articles processed in the current run; any `WRITTEN` article in the DB gets advanced, consistent with "no human bottleneck" principle
- `REVIEW` articles (named persons flagged by Phase 3) are **not published** — but the publish run logs a count of held-back `REVIEW` articles each cycle so the operator can see the backlog growing
- **Publishing = status flip only**: `Article.status` → `PUBLISHED`, `Article.publishedAt` → `now()` — no other side effects; Phase 6 reader frontend queries `PUBLISHED` articles by `publishedAt`

### Dead-man alert design
- **Silence condition**: query `max(Article.publishedAt)` — if more than 6 hours ago, emit alert. Catches the real failure (content stopped reaching readers) regardless of whether ingest, AI, or publish step is the cause
- **Alert mechanism**: structured `console.warn` — `{ type: 'DEAD_MAN_ALERT', lastPublishedAt, silenceDurationHours }` — consistent with Phases 2 & 3 alerting pattern
- **Check location**: built into each cron run (at start of the AI/publish job) — no separate watchdog process needed in Phase 4; deploy/infra downtime is outside this phase's scope

### Error retry behavior
- **Add `ERROR` status** to `ArticleStatus` enum — articles that fail AI processing are explicitly marked `ERROR` (with an error message field); no ambiguity between "new and waiting" vs "stuck and failing"
- **Max retries then `FAILED`**: track `retryCount` on `Article`; after N retries (e.g. 3), status moves to `FAILED` — permanently excluded from retry queue; prevents broken articles from polluting every run
- **Errors are isolated**: one failing article does not stop the batch — same pattern as Phase 2 ingest (aggregate errors, continue, exit(1) if any errors). Maximises throughput in an autonomous pipeline
- A `FAILED` article is a visible artifact for Phase 5 CMS to surface in the admin UI

### Claude's Discretion
- Exact value of `MAX_RETRY_COUNT` (3 is the expected default)
- Whether `retryCount` lives on `Article` or a separate `ArticleError` table
- The `error` field name and schema for storing failure reason
- Crontab entry format / PM2 ecosystem file structure
- Whether the silence window (6 hours) is hardcoded or read from `DEAD_MAN_THRESHOLD_HOURS` env var
- The `publish-run.ts` script structure (whether publish is a separate script or integrated into `ai-run.ts`)

</decisions>

<specifics>
## Specific Ideas

- The two new cron jobs call scripts that already exist from Phases 2 & 3 (`ingest-run.ts`, `ai-run.ts`) — Phase 4 is primarily the glue: the publish step, the scheduler configuration, and the dead-man check
- `PipelineRun` table (Phase 3) already records run history — the dead-man check can additionally query this as a secondary signal if needed
- The AI/publish cron should run the full pipeline cycle: `processArticles()` (AI) → publish `WRITTEN` articles → dead-man check — in that order, so the dead-man check sees the freshest `publishedAt`

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/scripts/ingest-run.ts` — existing CLI script for ingestion; cron calls this directly (system cron or PM2)
- `src/scripts/ai-run.ts` — existing CLI script for AI pipeline; cron calls this directly
- `src/lib/ingestion/ingest.ts` — `IngestResult` + error aggregation pattern to mirror in publish step
- `src/lib/prisma.ts` — singleton PrismaClient with DI overload pattern; publish service follows same pattern
- `IngestionRun` + `PipelineRun` tables — existing run-tracking pattern; dead-man check can query `PipelineRun.finished_at` as secondary signal

### Established Patterns
- `ArticleStatus` enum: `FETCHED → TAGGED → WRITTEN → REVIEW → PUBLISHED` — Phase 4 adds `ERROR` and `FAILED` to this enum
- TypeScript overloads with `$connect` duck-typing for DI (required for vitest compatibility)
- Structured `console.warn` for alerts — `{ type, ...context }` shape
- Per-item error aggregation: continue on failure, accumulate errors, exit(1) if any — from Phase 2 ingest pattern
- `import.meta.url` guard for runnable scripts — `ai-run.ts` and `ingest-run.ts` use this; `publish-run.ts` should too

### Integration Points
- Publish step reads `Article` rows with `status: WRITTEN` — written by Phase 3 AI pipeline
- Publish step writes `Article.publishedAt + status: PUBLISHED` — read by Phase 6 reader frontend
- ERROR/FAILED articles will be surfaced by Phase 5 CMS admin UI
- Dead-man check queries `Article.publishedAt` (primary) and optionally `PipelineRun.finished_at` (secondary)

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-scheduler-and-autonomous-publishing*
*Context gathered: 2026-03-22*
