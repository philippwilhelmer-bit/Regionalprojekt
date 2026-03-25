---
phase: 04-scheduler-and-autonomous-publishing
verified: 2026-03-22T08:00:00Z
status: passed
score: 17/17 must-haves verified
re_verification: false
---

# Phase 4: Scheduler and Autonomous Publishing — Verification Report

**Phase Goal:** Autonomous publish pipeline — articles transition APPROVED → PUBLISHED on a schedule; dead-man monitor alerts on pipeline stalls; ERROR articles retry up to 3x before permanent FAILED.
**Verified:** 2026-03-22T08:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | ArticleStatus enum contains ERROR and FAILED | VERIFIED | `prisma/schema.prisma` lines 20-21: `ERROR // retryable failure`, `FAILED // permanently excluded` |
| 2 | Article model has retryCount (Int, default 0) and errorMessage (String?) | VERIFIED | `prisma/schema.prisma` lines 55-56: `retryCount Int @default(0)`, `errorMessage String?` |
| 3 | Migration SQL uses ALTER TYPE outside transaction blocks | VERIFIED | `prisma/migrations/20260322_scheduler/migration.sql`: bare ALTER TYPE statements at top level, no BEGIN/COMMIT |
| 4 | publishArticles() advances all WRITTEN articles to PUBLISHED with publishedAt set | VERIFIED | `publish.ts` line 31-34: `updateMany({ where: { status: 'WRITTEN' }, data: { status: 'PUBLISHED', publishedAt: now } })` |
| 5 | publishArticles() does not touch REVIEW articles | VERIFIED | Query only targets WRITTEN; REVIEW articles excluded by where clause |
| 6 | publishArticles() returns REVIEW backlog count each cycle | VERIFIED | `publish.ts` lines 36-39: count query + conditional console.warn + return value |
| 7 | checkDeadMan() emits structured DEAD_MAN_ALERT when silence exceeds threshold | VERIFIED | `dead-man.ts` lines 26-40: aggregate query, Infinity sentinel for null, console.warn with type/lastPublishedAt/silenceDurationHours |
| 8 | checkDeadMan() does not alert when last publishedAt is within threshold window | VERIFIED | `dead-man.ts` line 35: `if (silenceDurationHours >= thresholdHours)` — no emit below threshold |
| 9 | checkDeadMan() treats NULL publishedAt as silence | VERIFIED | `dead-man.ts` lines 29-31: `silenceMs = lastPublishedAt ? ... : Infinity` — null triggers alert |
| 10 | checkDeadMan() reads threshold from DEAD_MAN_THRESHOLD_HOURS env var (default 6) | VERIFIED | `dead-man.ts` line 24: `parseInt(process.env.DEAD_MAN_THRESHOLD_HOURS ?? '6', 10)` |
| 11 | processArticles() picks up ERROR articles for retry alongside FETCHED | VERIFIED | `pipeline.ts` line 87-89: `where: { status: { in: ['FETCHED', 'ERROR'] } }` |
| 12 | An article that fails AI processing increments retryCount and is set to ERROR | VERIFIED | `pipeline.ts` lines 166-176: `newRetryCount = retryCount+1`, `nextStatus = 'ERROR'` when `< MAX_RETRY_COUNT` |
| 13 | An article retried MAX_RETRY_COUNT (3) times is set to FAILED permanently | VERIFIED | `pipeline.ts` line 168: `const nextStatus = newRetryCount >= MAX_RETRY_COUNT ? 'FAILED' : 'ERROR'`; MAX_RETRY_COUNT = 3 |
| 14 | FAILED articles are permanently excluded from the pipeline query | VERIFIED | Query only includes FETCHED and ERROR — FAILED is absent from the `in` list |
| 15 | ai-run.ts executes checkDeadMan → processArticles → publishArticles in order | VERIFIED | `src/scripts/ai-run.ts` lines 23-25: sequential await calls in correct order |
| 16 | ecosystem.config.js defines ingest-cron and ai-publish-cron with autorestart: false | VERIFIED | `ecosystem.config.js` lines 28-41: both apps have `cron_restart: '*/15 * * * *'` and `autorestart: false` |
| 17 | CRONTAB.md documents OS-level crontab alternative | VERIFIED | `CRONTAB.md` exists with cron entries for both jobs and complete env var reference table |

**Score: 17/17 truths verified**

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `prisma/schema.prisma` | ERROR/FAILED enum + retryCount/errorMessage fields | VERIFIED | Full implementation — 8 enum values, both new fields present |
| `prisma/migrations/20260322_scheduler/migration.sql` | DDL for enum + column additions | VERIFIED | 4 SQL statements, ALTER TYPE outside transactions |
| `src/lib/publish/publish.ts` | publishArticles() with DI overload, updateMany, REVIEW backlog | VERIFIED | Full implementation, 47 lines, no stubs |
| `src/lib/publish/dead-man.ts` | checkDeadMan() with DI overload, aggregate query, env var threshold | VERIFIED | Full implementation, 43 lines, no stubs |
| `src/lib/publish/publish.test.ts` | 5 real tests for PUB-01 behaviors, all GREEN | VERIFIED | 5 real test cases using pgLite DI; no it.todo remaining |
| `src/lib/publish/dead-man.test.ts` | 5 real tests for PUB-03 behaviors, all GREEN | VERIFIED | 5 real test cases using pgLite DI + vi.spyOn; no it.todo remaining |
| `src/lib/ai/pipeline.ts` | Updated query (FETCHED+ERROR) + catch block with retryCount/FAILED logic | VERIFIED | Lines 87-89 (query), lines 164-180 (catch block with MAX_RETRY_COUNT=3) |
| `src/lib/ai/pipeline.test.ts` | 6 new tests for ERROR retry + FAILED exclusion behaviors | VERIFIED | seedArticleWithStatus() + makeFailingAnthropicClient() helpers; 6 new tests present; no it.todo |
| `src/scripts/ai-run.ts` | Orchestration: checkDeadMan → processArticles → publishArticles | VERIFIED | 43 lines; imports and calls all three in correct sequence |
| `ecosystem.config.js` | PM2 config: ingest-cron + ai-publish-cron, autorestart: false | VERIFIED | 2 apps, matching cron_restart expressions, autorestart: false on both |
| `CRONTAB.md` | OS-level crontab alternative with env var table | VERIFIED | Both cron entries + 5-row env var table present |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `migration.sql` | `schema.prisma` | `ALTER TYPE "ArticleStatus" ADD VALUE` | VERIFIED | Both ERROR and FAILED added; ALTER TABLE adds retryCount and errorMessage |
| `src/lib/publish/publish.ts` | `@prisma/client` | `import type { PrismaClient }` | VERIFIED | Line 9: typed import present |
| `src/lib/ai/pipeline.ts` | `db.article.findMany` | `where: { status: { in: ['FETCHED', 'ERROR'] } }` | VERIFIED | Lines 87-89: ERROR included in query |
| `src/lib/ai/pipeline.ts` | `db.article.update` (catch block) | `status: nextStatus, retryCount: newRetryCount, errorMessage` | VERIFIED | Lines 169-176: all three fields written on failure |
| `src/scripts/ai-run.ts` | `src/lib/publish/dead-man.ts` | `import { checkDeadMan }` + `await checkDeadMan()` | VERIFIED | Line 17 (import), line 23 (call) |
| `src/scripts/ai-run.ts` | `src/lib/publish/publish.ts` | `import { publishArticles }` + `await publishArticles()` | VERIFIED | Line 19 (import), line 25 (call) |
| `ecosystem.config.js` | `src/scripts/ai-run.ts` | `script: 'bun', args: 'run src/scripts/ai-run.ts'` | VERIFIED | Lines 37-38: correct script + args |

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| PUB-01 | 01, 02, 03, 04 | Approved articles publish automatically without manual intervention | SATISFIED | publishArticles() flips WRITTEN→PUBLISHED via scheduler; processArticles() handles ERROR retry + FAILED exclusion; ai-run.ts wires the pipeline |
| PUB-02 | 04 | System polls all sources on a scheduled cron interval | SATISFIED | ecosystem.config.js defines both ingest-cron and ai-publish-cron with `cron_restart: '*/15 * * * *'`; CRONTAB.md provides OS alternative |
| PUB-03 | 01, 02, 04 | System alerts operator if the automated pipeline stops running (dead-man monitor) | SATISFIED | checkDeadMan() queries max(publishedAt), emits structured DEAD_MAN_ALERT console.warn when silence exceeds configurable threshold (default 6h); called first in ai-run.ts every cycle |

All three requirements are SATISFIED. No orphaned requirements — REQUIREMENTS.md maps PUB-01, PUB-02, PUB-03 to Phase 4 and all three are covered.

---

### Anti-Patterns Found

None. No TODO/FIXME/HACK/PLACEHOLDER comments found in any Phase 4 deliverable file. No it.todo() stubs remain in any test file. No stub implementations (throw not-implemented) present in publish.ts or dead-man.ts.

---

### Human Verification Required

#### 1. PM2 Cron Integration Test

**Test:** On a server with PM2 installed, run `pm2 start ecosystem.config.js`, wait for the cron to fire, and check `pm2 logs ai-publish-cron`.
**Expected:** Log line `[ai-run] processed=N written=N published=N reviewBacklog=N inputTokens=N outputTokens=N` appears at each 15-minute interval; no crash loop.
**Why human:** PM2 cron scheduling cannot be verified programmatically without a live PM2 runtime environment.

#### 2. DEAD_MAN_ALERT Operator Visibility

**Test:** With a production-like setup, let the pipeline go silent for 7+ hours, then run `bun run src/scripts/ai-run.ts`.
**Expected:** A structured JSON console.warn with `type: DEAD_MAN_ALERT` appears in logs and can be captured by a log aggregator.
**Why human:** Requires a production or staging environment with real timing to verify the alert reaches operators.

---

### Gaps Summary

No gaps. All automated checks pass across all four plans.

---

## Summary

Phase 4 fully achieves its goal. The autonomous publish pipeline is implemented end-to-end:

1. **Schema foundation (Plan 01):** ArticleStatus extended with ERROR/FAILED; Article gains retryCount and errorMessage; migration SQL is correct PostgreSQL (ALTER TYPE outside transactions).

2. **Publish service and dead-man monitor (Plan 02):** publishArticles() flips WRITTEN→PUBLISHED atomically each cycle with REVIEW backlog reporting. checkDeadMan() implements configurable silence detection with structured alerting. Both are tested with real in-memory DB tests — no it.todo stubs remain.

3. **Pipeline retry logic (Plan 03):** processArticles() now includes ERROR articles in its query. Per-article failures increment retryCount and set ERROR or FAILED status based on MAX_RETRY_COUNT=3. FAILED articles are permanently excluded. Six new tests cover all retry/exclusion paths.

4. **Orchestrator + scheduler (Plan 04):** ai-run.ts chains dead-man check → AI pipeline → publish in the documented order. ecosystem.config.js configures PM2 cron for both ingest and AI+publish jobs with autorestart: false. CRONTAB.md provides an OS-level alternative.

All three requirements (PUB-01, PUB-02, PUB-03) are satisfied by concrete, working implementations.

---

_Verified: 2026-03-22T08:00:00Z_
_Verifier: Claude (gsd-verifier)_
