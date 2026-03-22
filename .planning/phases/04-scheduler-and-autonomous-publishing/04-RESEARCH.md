# Phase 4: Scheduler and Autonomous Publishing - Research

**Researched:** 2026-03-22
**Domain:** Scheduler configuration, autonomous publish service, error state management, dead-man alerting
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Cron schedule design:**
- Separate jobs per step: ingest cron and AI/publish cron run as independent cron entries (not a single unified job)
- Same interval: one `POLL_INTERVAL_MINUTES` env var governs both jobs — consistent with how thresholds and API keys are configured in Phases 2 & 3
- Implementation mechanism: OS-level crontab or process manager (PM2) triggers the existing CLI scripts (`ingest-run.ts`, `ai-run.ts`) — no new runtime needed, no HTTP overhead
- The cron entries call the scripts that already exist; Phase 4 adds the scheduling layer around them

**Publishing trigger:**
- Auto-publish ALL `WRITTEN` articles each cycle — not just articles processed in the current run; any `WRITTEN` article in the DB gets advanced, consistent with "no human bottleneck" principle
- `REVIEW` articles (named persons flagged by Phase 3) are NOT published — but the publish run logs a count of held-back `REVIEW` articles each cycle so the operator can see the backlog growing
- Publishing = status flip only: `Article.status` → `PUBLISHED`, `Article.publishedAt` → `now()` — no other side effects; Phase 6 reader frontend queries `PUBLISHED` articles by `publishedAt`

**Dead-man alert design:**
- Silence condition: query `max(Article.publishedAt)` — if more than 6 hours ago, emit alert. Catches the real failure (content stopped reaching readers) regardless of whether ingest, AI, or publish step is the cause
- Alert mechanism: structured `console.warn` — `{ type: 'DEAD_MAN_ALERT', lastPublishedAt, silenceDurationHours }` — consistent with Phases 2 & 3 alerting pattern
- Check location: built into each cron run (at start of the AI/publish job) — no separate watchdog process needed in Phase 4; deploy/infra downtime is outside this phase's scope

**Error retry behavior:**
- Add `ERROR` status to `ArticleStatus` enum — articles that fail AI processing are explicitly marked `ERROR` (with an error message field); no ambiguity between "new and waiting" vs "stuck and failing"
- Max retries then `FAILED`: track `retryCount` on `Article`; after N retries (e.g. 3), status moves to `FAILED` — permanently excluded from retry queue; prevents broken articles from polluting every run
- Errors are isolated: one failing article does not stop the batch — same pattern as Phase 2 ingest (aggregate errors, continue, exit(1) if any errors). Maximises throughput in an autonomous pipeline
- A `FAILED` article is a visible artifact for Phase 5 CMS to surface in the admin UI

### Claude's Discretion

- Exact value of `MAX_RETRY_COUNT` (3 is the expected default)
- Whether `retryCount` lives on `Article` or a separate `ArticleError` table
- The `error` field name and schema for storing failure reason
- Crontab entry format / PM2 ecosystem file structure
- Whether the silence window (6 hours) is hardcoded or read from `DEAD_MAN_THRESHOLD_HOURS` env var
- The `publish-run.ts` script structure (whether publish is a separate script or integrated into `ai-run.ts`)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PUB-01 | Approved articles publish automatically without manual intervention | Publish service reads all `WRITTEN` articles and flips status to `PUBLISHED` each cycle; no human gate |
| PUB-02 | System polls all sources on a scheduled cron interval | Two independent cron entries invoke `ingest-run.ts` and `ai-run.ts` (which wraps AI + publish) on `POLL_INTERVAL_MINUTES` |
| PUB-03 | System alerts operator if the automated pipeline stops running (dead-man monitor) | Dead-man check at start of AI/publish cron job: `max(Article.publishedAt)` vs. threshold, emits structured `console.warn` |
</phase_requirements>

---

## Summary

Phase 4 is primarily a glue layer. All major runtime components (DB, Prisma, AI pipeline, ingest scripts) exist from Phases 1–3. The work is: (1) add a publish service that advances `WRITTEN` articles to `PUBLISHED`, (2) add `ERROR`/`FAILED` states and `retryCount`/`errorMessage` fields so failed AI processing is tracked, (3) wire a dead-man check into the AI/publish cron job, and (4) produce the cron/PM2 configuration that ties everything together.

The codebase follows strict, consistent patterns. Every new function must use the TypeScript overload DI pattern (`$connect` duck-typing), emit structured `console.warn` alerts, perform per-item error aggregation (continue on failure, exit(1) if any errors), and guard runnable scripts with `(import.meta as any).main`. The publish service is the only net-new business logic module; the scheduler is configuration only.

The AI pipeline (`pipeline.ts`) currently only processes `FETCHED` articles. Phase 4 extends it to also publish `WRITTEN` articles and handle retries from `ERROR` articles — so `pipeline.ts` (or the orchestrating `ai-run.ts`) must be updated to invoke the publish step after `processArticles()` completes.

**Primary recommendation:** Add `src/lib/publish/publish.ts` as the publish service, add a new `scripts/publish-run.ts` (or extend `scripts/ai-run.ts` to call publish), update the Prisma schema with one migration, and generate the crontab/PM2 config as committed documentation.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma (already installed) | ^6.19.2 | DB read/write for publish, error tracking, dead-man query | Already the project ORM — no additional install |
| vitest (already installed) | ^2.1.9 | Unit tests for publish service and dead-man check | Already the project test runner |
| bun (runtime) | already in use | Executes scripts directly via `bun run` | Runtime for all CLI scripts in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| PM2 | latest | Process manager — runs cron jobs, restarts on crash, logs to files | If OS-level crontab is insufficient (e.g., needs log rotation, restart on failure) |
| OS crontab | OS built-in | Triggers scripts on schedule | Simpler option if the operator manages the server directly |
| tsx (already installed) | ^4.21.0 | TypeScript execution for scripts NOT run via bun directly | Already used by `ingest-run.ts` (`tsx scripts/ingest-run.ts`) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| OS crontab | PM2 ecosystem file | PM2 adds auto-restart on crash, structured logs, `pm2 logs` visibility — worth it for unattended operation |
| Separate `publish-run.ts` | Extending `ai-run.ts` | Separate script keeps publish independently runnable and testable; integrating into `ai-run.ts` is simpler but couples concerns |

**Installation (if PM2 used):**
```bash
npm install -g pm2
# or
bun add -g pm2
```

---

## Architecture Patterns

### Recommended Project Structure (Phase 4 additions)

```
src/
├── lib/
│   ├── publish/
│   │   └── publish.ts        # publishArticles() service — new
│   │   └── publish.test.ts   # vitest tests — new
│   ├── ai/
│   │   └── pipeline.ts       # updated: process ERROR articles (retry)
│   └── (existing unchanged)
├── scripts/
│   ├── ingest-run.ts         # existing — no change
│   ├── ai-run.ts             # updated: calls publishArticles() after processArticles()
│   └── publish-run.ts        # optional standalone publish CLI — new
prisma/
├── schema.prisma             # updated: ERROR/FAILED status, retryCount, errorMessage
├── migrations/
│   └── 20260322_scheduler/
│       └── migration.sql     # new
ecosystem.config.js           # PM2 config — new (or CRONTAB.md as documented format)
```

### Pattern 1: Publish Service (publishArticles)

**What:** Query all `WRITTEN` articles, bulk-update to `PUBLISHED` with `publishedAt = now()`, log count of held-back `REVIEW` articles.
**When to use:** Called by the AI/publish cron job AFTER `processArticles()` completes.

```typescript
// Source: project DI pattern from src/lib/ingestion/ingest.ts
export async function publishArticles(): Promise<PublishResult>
export async function publishArticles(client: PrismaClient): Promise<PublishResult>
export async function publishArticles(clientOrUndefined?: PrismaClient): Promise<PublishResult> {
  const db = clientOrUndefined && '$connect' in clientOrUndefined
    ? clientOrUndefined
    : defaultPrisma

  const now = new Date()

  // Publish all WRITTEN articles
  const published = await db.article.updateMany({
    where: { status: 'WRITTEN' },
    data: { status: 'PUBLISHED', publishedAt: now },
  })

  // Log REVIEW backlog
  const reviewCount = await db.article.count({ where: { status: 'REVIEW' } })
  if (reviewCount > 0) {
    console.warn({ type: 'REVIEW_BACKLOG', count: reviewCount })
  }

  return { articlesPublished: published.count, reviewBacklog: reviewCount }
}
```

### Pattern 2: Dead-Man Check

**What:** Query `max(Article.publishedAt)`. If null or older than threshold, emit structured `console.warn`.
**When to use:** At the START of each AI/publish cron job so alert fires before any work begins.

```typescript
// Source: project alerting pattern from circuit-breaker.ts
export async function checkDeadMan(db: PrismaClient): Promise<void> {
  const thresholdHours = parseInt(
    process.env.DEAD_MAN_THRESHOLD_HOURS ?? '6', 10
  )
  const agg = await db.article.aggregate({ _max: { publishedAt: true } })
  const lastPublishedAt = agg._max.publishedAt

  const silenceMs = lastPublishedAt
    ? Date.now() - lastPublishedAt.getTime()
    : Infinity
  const silenceDurationHours = silenceMs / (1000 * 60 * 60)

  if (silenceDurationHours >= thresholdHours) {
    console.warn({
      type: 'DEAD_MAN_ALERT',
      lastPublishedAt: lastPublishedAt?.toISOString() ?? null,
      silenceDurationHours: Math.round(silenceDurationHours),
    })
  }
}
```

### Pattern 3: ERROR/FAILED Retry Loop

**What:** `processArticles()` in `pipeline.ts` currently processes only `FETCHED` articles. Phase 4 extends it to ALSO process `ERROR` articles (up to `MAX_RETRY_COUNT`). Articles that exceed the limit get `FAILED`.
**When to use:** In the existing per-article catch block in `pipeline.ts`.

```typescript
// Source: adapted from per-item error pattern in pipeline.ts
// On catch in the per-article loop:
const MAX_RETRY_COUNT = 3
const newRetryCount = (article.retryCount ?? 0) + 1
const nextStatus = newRetryCount >= MAX_RETRY_COUNT ? 'FAILED' : 'ERROR'
await db.article.update({
  where: { id: article.id },
  data: {
    status: nextStatus,
    retryCount: newRetryCount,
    errorMessage: err instanceof Error ? err.message : String(err),
  },
})
```

The pipeline query must include `ERROR` articles:
```typescript
// Updated query in processArticles()
const articles = await db.article.findMany({
  where: { status: { in: ['FETCHED', 'ERROR'] } }
})
```

### Pattern 4: Updated ai-run.ts (orchestration)

**What:** `ai-run.ts` becomes the AI+Publish+DeadMan orchestrator.
**Execution order:** dead-man check → `processArticles()` → `publishArticles()`.

```typescript
// Source: ai-run.ts pattern, extended
import { checkDeadMan } from '../lib/publish/dead-man'
import { processArticles } from '../lib/ai/pipeline'
import { publishArticles } from '../lib/publish/publish'

async function main(): Promise<void> {
  try {
    await checkDeadMan()
    const aiResult = await processArticles()
    const pubResult = await publishArticles()
    console.log(
      `[ai-run] processed=${aiResult.articlesProcessed} written=${aiResult.articlesWritten} ` +
      `published=${pubResult.articlesPublished} reviewBacklog=${pubResult.reviewBacklog}`
    )
  } catch (err) {
    console.error('[ai-run] Fatal error:', err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

if ((import.meta as any).main) {
  main()
}
```

### Pattern 5: Crontab / PM2 Configuration

**OS crontab (simpler):**
```cron
# Ingest: every POLL_INTERVAL_MINUTES (e.g. 15 min)
*/15 * * * * cd /path/to/app && tsx scripts/ingest-run.ts >> /var/log/regionalprojekt/ingest.log 2>&1

# AI + Publish: every POLL_INTERVAL_MINUTES (e.g. 15 min)
*/15 * * * * cd /path/to/app && bun run src/scripts/ai-run.ts >> /var/log/regionalprojekt/ai-publish.log 2>&1
```

**PM2 ecosystem file (recommended for production):**
```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'ingest-cron',
      script: 'tsx',
      args: 'scripts/ingest-run.ts',
      cron_restart: '*/15 * * * *',
      watch: false,
      autorestart: false,
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'ai-publish-cron',
      script: 'bun',
      args: 'run src/scripts/ai-run.ts',
      cron_restart: '*/15 * * * *',
      watch: false,
      autorestart: false,
      env: { NODE_ENV: 'production' },
    },
  ],
}
```

### Pattern 6: Schema Migration

```sql
-- Phase 4: Scheduler + Autonomous Publishing
-- Adds ERROR/FAILED to ArticleStatus, retryCount, errorMessage to Article

ALTER TYPE "ArticleStatus" ADD VALUE 'ERROR';
ALTER TYPE "ArticleStatus" ADD VALUE 'FAILED';

ALTER TABLE "Article" ADD COLUMN "retryCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Article" ADD COLUMN "errorMessage" TEXT;
```

**Critical note on Prisma enum migrations with pgLite:** The existing pattern in this project is hand-crafted SQL migrations (no live DB). Adding enum values to a PostgreSQL enum uses `ALTER TYPE ... ADD VALUE`. This is append-only — values cannot be removed later without recreation. `retryCount` belongs on `Article` (not a separate table) since it is one-to-one with the article row and the data is needed on every retry query.

### Anti-Patterns to Avoid

- **Querying only the current cycle's articles for dead-man check:** The check must use `max(Article.publishedAt)` globally, not filter by `createdAt > now()-1hour` — the check must catch a system-wide pause regardless of ingest activity.
- **Using `updateMany` for status flips without checking final count:** `updateMany` returns `{ count: N }` in Prisma — log this count; do not assume all `WRITTEN` articles were always published.
- **Running dead-man check AFTER publish:** Order matters. Run it BEFORE the current cycle's work so it detects silence that existed before this run started.
- **Mixing `ERROR` and `FAILED` semantics:** `ERROR` = retryable, `FAILED` = permanently excluded. The pipeline query must include `ERROR` but never `FAILED`.
- **Calling `process.exit(1)` for per-article errors:** Per-article failures are caught and logged; only fatal top-level errors call `process.exit(1)`. This is the established Phase 2/3 pattern.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cron scheduling | Custom interval/timer loop inside a long-running Node process | OS crontab or PM2 `cron_restart` | Node interval loops drift, don't survive restarts; cron is the OS's responsibility |
| Log rotation | Custom log file rotation | PM2 built-in or OS logrotate | PM2 `pm2-logrotate` module handles this; do not build custom log management |
| Process restart on crash | Custom watchdog | PM2 `autorestart` + `max_restarts` | PM2 designed exactly for this; avoids reimplementing supervisor logic |
| Retry backoff | Exponential backoff timer | Simple `retryCount` counter + next-cycle retry | The pipeline runs on a fixed cron interval — "wait until next cycle" IS the backoff; no timer needed |

**Key insight:** The cron cycle itself is the backoff/retry mechanism. A failing article waits until the next cycle — there is no need to implement in-process delays or exponential backoff.

---

## Common Pitfalls

### Pitfall 1: Prisma `updateMany` Does Not Return Updated Rows
**What goes wrong:** Calling `db.article.updateMany({ where: { status: 'WRITTEN' }, data: { status: 'PUBLISHED', publishedAt: now } })` returns `{ count: N }` — not the updated article objects. If downstream code expects an array, it will fail.
**Why it happens:** Prisma `updateMany` is a bulk operation; it sacrifices returning data for performance.
**How to avoid:** Accept `{ count: N }` as the return type. If individual IDs are needed for logging, use `findMany` first, then `updateMany`.
**Warning signs:** TypeScript errors accessing `.id` on the result of `updateMany`.

### Pitfall 2: ALTER TYPE ADD VALUE Cannot Be Used Inside a Transaction in Older PostgreSQL
**What goes wrong:** PostgreSQL < 12 does not allow `ALTER TYPE ... ADD VALUE` inside a transaction block. pgLite may have this restriction too.
**Why it happens:** Enum modification is a DDL operation with special semantics.
**How to avoid:** Run enum migrations outside of `BEGIN/COMMIT` blocks in the migration SQL file. The existing migration pattern in this project uses raw SQL files applied sequentially, so keep the `ALTER TYPE` statements at the top level.
**Warning signs:** Migration SQL fails with "ALTER TYPE ... ADD VALUE cannot run inside a transaction block".

### Pitfall 3: `retryCount` Field Not Available in Prisma Generated Client Until Client Regenerated
**What goes wrong:** After adding `retryCount` and `errorMessage` to schema.prisma and applying the migration, `db.article.update({ data: { retryCount: ... } })` will fail TypeScript type checking until `prisma generate` is run.
**Why it happens:** The Prisma generated client is a snapshot; it must be regenerated after schema changes.
**How to avoid:** Include `prisma generate` as an explicit step in the migration wave (Wave 0 setup).
**Warning signs:** TypeScript errors on `retryCount` property access on the Article type.

### Pitfall 4: PM2 `cron_restart` Requires `autorestart: false`
**What goes wrong:** If `autorestart: true` (the PM2 default), a script that exits with code 1 (normal for per-source errors in `ingest-run.ts`) will be restarted immediately by PM2's crash-restart logic, creating a restart loop.
**Why it happens:** PM2 treats any non-zero exit as a crash by default.
**How to avoid:** Set `autorestart: false` in `ecosystem.config.js` for cron-mode apps. The cron_restart field triggers execution on schedule; the script is expected to exit after each run.
**Warning signs:** PM2 logs showing "app restarted N times" between cron intervals.

### Pitfall 5: Dead-Man False Alarm on Fresh Deployment
**What goes wrong:** Immediately after deploying, `max(Article.publishedAt)` is NULL (no articles published yet). The dead-man check will fire `silenceDurationHours = Infinity`.
**Why it happens:** The query returns NULL when no articles have been published.
**How to avoid:** Treat NULL `lastPublishedAt` as "system just started — no alert for first cycle" by checking if any articles exist at all, OR simply document that the first alert on a fresh deployment is expected and can be ignored. The simpler approach: treat NULL as silence-since-epoch (fires alert) but document this behavior clearly.
**Warning signs:** Dead-man alert fires on first startup.

---

## Code Examples

### Publish Service: Full PublishResult Contract
```typescript
// Source: mirrors IngestResult / ProcessResult contracts from Phases 2 & 3
export interface PublishResult {
  articlesPublished: number
  reviewBacklog: number
}
```

### Dead-Man: Reading Env Var with Default
```typescript
// Source: mirrors AI_DAILY_TOKEN_THRESHOLD pattern in circuit-breaker.ts
const thresholdHours = parseInt(
  process.env.DEAD_MAN_THRESHOLD_HOURS ?? '6', 10
)
```

### Pipeline: Updated Article Query (FETCHED + ERROR)
```typescript
// Source: pipeline.ts processArticles() — updated fetch query
const articles = await db.article.findMany({
  where: { status: { in: ['FETCHED', 'ERROR'] } },
})
```

### Schema Addition: retryCount on Article
```prisma
// Source: schema.prisma — Article model additions
retryCount    Int      @default(0)
errorMessage  String?
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Long-running Node.js process with `setInterval` | OS cron / PM2 `cron_restart` | Industry standard | Eliminates memory leak risk, drift, crash survival |
| Manual publish button | Status flip in publish service | Phase 4 | No editorial bottleneck |
| Implicit error = stuck article | Explicit `ERROR`/`FAILED` enum values | Phase 4 | Operators can query stuck articles; Phase 5 CMS can surface them |

**Deprecated/outdated:**
- `setInterval` in Node for periodic tasks: Viable only for in-process polling; not used here since scripts are CLI-based and designed to exit after each run.

---

## Open Questions

1. **ingest-run.ts uses `tsx` but ai-run.ts uses bun `(import.meta as any).main` guard**
   - What we know: `ingest-run.ts` (in `scripts/`) uses plain `main().catch(...)` with tsx execution. `ai-run.ts` (in `src/scripts/`) uses the Bun `import.meta.main` guard.
   - What's unclear: `publish-run.ts` (if created separately) should follow which pattern? The `scripts/` directory vs `src/scripts/` directory also diverges.
   - Recommendation: Keep publish logic in `src/scripts/` (alongside `ai-run.ts`) and use the `(import.meta as any).main` Bun guard for consistency with the most recent script. Planner should choose one location and document it.

2. **`DEAD_MAN_THRESHOLD_HOURS` env var vs hardcoded 6**
   - What we know: The CONTEXT.md marks this as Claude's discretion.
   - What's unclear: Whether operators will ever need to tune it without redeployment.
   - Recommendation: Read from `DEAD_MAN_THRESHOLD_HOURS` env var with default of `6` — costs nothing, consistent with `AI_DAILY_TOKEN_THRESHOLD` pattern already established.

3. **`retryCount` on Article vs separate ArticleError table**
   - What we know: CONTEXT.md marks this as Claude's discretion. The existing schema has no separate error log table.
   - Recommendation: Keep `retryCount` and `errorMessage` on `Article` directly. A separate table adds complexity for no current benefit — Phase 5 CMS only needs to query `FAILED` articles, which is trivially done on the `Article` table.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^2.1.9 |
| Config file | vitest.config.ts (project root) |
| Quick run command | `vitest run src/lib/publish/` |
| Full suite command | `vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PUB-01 | `publishArticles()` flips all `WRITTEN` → `PUBLISHED` with `publishedAt` set | unit | `vitest run src/lib/publish/publish.test.ts` | Wave 0 |
| PUB-01 | `publishArticles()` does NOT publish `REVIEW` articles | unit | `vitest run src/lib/publish/publish.test.ts` | Wave 0 |
| PUB-01 | `publishArticles()` logs `REVIEW` backlog count | unit | `vitest run src/lib/publish/publish.test.ts` | Wave 0 |
| PUB-01 | `ERROR` articles are retried (picked up by `processArticles()`) | unit | `vitest run src/lib/ai/pipeline.test.ts` | ✅ (update existing) |
| PUB-01 | Articles exceeding `MAX_RETRY_COUNT` move to `FAILED` | unit | `vitest run src/lib/ai/pipeline.test.ts` | ✅ (update existing) |
| PUB-01 | `FAILED` articles are never re-queued | unit | `vitest run src/lib/ai/pipeline.test.ts` | ✅ (update existing) |
| PUB-02 | Cron config documents correct interval (manual review) | manual | N/A — verified by reading ecosystem.config.js or CRONTAB.md | N/A |
| PUB-03 | `checkDeadMan()` emits `DEAD_MAN_ALERT` when silence > threshold | unit | `vitest run src/lib/publish/dead-man.test.ts` | Wave 0 |
| PUB-03 | `checkDeadMan()` does NOT emit when recently published | unit | `vitest run src/lib/publish/dead-man.test.ts` | Wave 0 |
| PUB-03 | `checkDeadMan()` handles NULL `publishedAt` (no articles yet) | unit | `vitest run src/lib/publish/dead-man.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `vitest run src/lib/publish/`
- **Per wave merge:** `vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/publish/publish.test.ts` — covers PUB-01 publish behavior
- [ ] `src/lib/publish/dead-man.test.ts` — covers PUB-03 dead-man alert behavior
- [ ] `src/lib/publish/publish.ts` — stub file (publish service)
- [ ] `src/lib/publish/dead-man.ts` — stub file (dead-man check)
- [ ] Prisma schema updated + `prisma generate` run — adds `ERROR`/`FAILED` enum values, `retryCount`, `errorMessage`
- [ ] Migration SQL file: `prisma/migrations/20260322_scheduler/migration.sql`

---

## Sources

### Primary (HIGH confidence)
- Prisma `updateMany` return type: verified against Prisma v6 docs (returns `{ count: number }`)
- Prisma enum mutation SQL (`ALTER TYPE ... ADD VALUE`): verified as the correct PostgreSQL DDL
- PM2 `cron_restart` + `autorestart: false` pattern: PM2 official docs
- `$connect` duck-typing DI pattern: verified from existing project code (ingest.ts, pipeline.ts)
- `(import.meta as any).main` Bun guard: verified from existing project code (ai-run.ts)

### Secondary (MEDIUM confidence)
- PM2 ecosystem config structure: PM2 official docs + existing project patterns
- PostgreSQL `ALTER TYPE ADD VALUE` transaction restriction: PostgreSQL documentation + common migration practice

### Tertiary (LOW confidence)
- pgLite compatibility with `ALTER TYPE ADD VALUE`: inferred from pgLite being a WASM PostgreSQL subset; exact behavior not verified against pgLite changelog

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, no new additions required
- Architecture: HIGH — all patterns directly mirror existing project code from Phases 2 & 3
- Pitfalls: HIGH for Prisma patterns (verified against code); MEDIUM for pgLite enum migration (inferred)

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable domain — Prisma, vitest, PM2 are mature)
