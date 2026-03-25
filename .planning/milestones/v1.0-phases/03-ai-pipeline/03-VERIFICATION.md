---
phase: 03-ai-pipeline
verified: 2026-03-22T00:50:00Z
status: passed
score: 24/24 must-haves verified
re_verification: false
---

# Phase 03: AI Pipeline Verification Report

**Phase Goal:** Implement the complete AI article processing pipeline — Claude-powered tag/classify, rewrite/SEO, cost circuit-breaker, and CLI entry point
**Verified:** 2026-03-22T00:50:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

All truths are drawn directly from the five plan `must_haves` blocks.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Article.seoTitle field exists in schema and is accepted by Prisma | VERIFIED | `prisma/schema.prisma` line 45: `seoTitle String?` inside Article model |
| 2 | PipelineRun model exists and is accepted by Prisma | VERIFIED | `prisma/schema.prisma` contains full PipelineRun model with all required fields and `@@index([startedAt])` |
| 3 | All Wave 0 test stubs turned GREEN (no it.todo() remaining) | VERIFIED | 38/38 tests pass: `4 files, 38 tests, 0 failures` |
| 4 | cleanDb() truncates PipelineRun rows | VERIFIED | `src/test/setup-db.ts` line 67: `await prisma.pipelineRun.deleteMany()` — first delete in chain |
| 5 | @anthropic-ai/sdk is installed and importable | VERIFIED | `package.json`: `"@anthropic-ai/sdk": "^0.80.0"` |
| 6 | runStep1Tag() calls claude-haiku-4-5-20251001 with output_config JSON schema mode | VERIFIED | `step1-tag.ts` lines 97-108: `model: 'claude-haiku-4-5-20251001'`, `output_config.format.type: 'json_schema'` |
| 7 | System prompt injects all Bezirke slugs and gemeindeSynonyms | VERIFIED | `buildBezirkContext()` in `step1-tag.ts` lines 51-59; test asserts `callArgs.system` contains `'liezen'` |
| 8 | Returns bezirkSlugs array and hasNamedPerson boolean | VERIFIED | `Step1Result` interface exported; 8/8 step1-tag tests pass |
| 9 | Returns inputTokens and outputTokens from response.usage | VERIFIED | `step1-tag.ts` lines 122-124: maps `response.usage.input_tokens/output_tokens` |
| 10 | runStep1Tag() independently testable with mocked Anthropic client | VERIFIED | No real API calls; vi.fn mock pattern; 8 tests pass without ANTHROPIC_API_KEY |
| 11 | runStep2Write() calls claude-haiku-4-5-20251001 with output_config JSON schema mode | VERIFIED | `step2-write.ts` lines 89-98: correct model + output_config |
| 12 | Returns headline, lead, body, seoTitle, and metaDescription | VERIFIED | `Step2Result` interface; 10/10 step2-write tests pass |
| 13 | Returns inputTokens and outputTokens from response.usage | VERIFIED | `step2-write.ts` lines 122-124 |
| 14 | runStep2Write() independently testable with mocked Anthropic client | VERIFIED | 10 tests pass without ANTHROPIC_API_KEY |
| 15 | checkCostCircuitBreaker() returns true when below threshold | VERIFIED | `circuit-breaker.ts` lines 38-48; 10/10 circuit-breaker tests pass |
| 16 | checkCostCircuitBreaker() returns false when threshold met or exceeded | VERIFIED | Exact threshold test passes: `totalTokens=500000 >= 500000 → false` |
| 17 | Structured console.warn emitted when circuit-breaker fires | VERIFIED | `circuit-breaker.ts` line 42-44: `[ai-pipeline] CIRCUIT_BREAKER totalTokens=... threshold=...`; test asserts on `'CIRCUIT_BREAKER'` |
| 18 | Only today's PipelineRun rows are summed | VERIFIED | WHERE clause `startedAt: { gte: todayStart }` with `todayStart.setHours(0,0,0,0)`; yesterday-data test passes |
| 19 | Threshold from AI_DAILY_TOKEN_THRESHOLD env var, defaulting to 500000 | VERIFIED | `parseInt(process.env.AI_DAILY_TOKEN_THRESHOLD ?? '500000', 10)`; env-var override test passes |
| 20 | processArticles() orchestrates Step1+Step2+circuit-breaker, advances article status | VERIFIED | 10/10 pipeline integration tests pass including FETCHED→WRITTEN and FETCHED→REVIEW paths |
| 21 | ArticleBezirk junction rows created for each bezirkSlug from Step 1 | VERIFIED | `pipeline.ts` lines 124-138: `db.$transaction([article.update, ...db.articleBezirk.upsert()])` |
| 22 | seoTitle and metaDescription from Step 2 written to Article row | VERIFIED | `pipeline.ts` lines 148-157: `seoTitle: step2.seoTitle, metaDescription: step2.metaDescription` in update |
| 23 | PipelineRun opened at start and closed with token totals in try/finally | VERIFIED | `pipeline.ts` lines 82-84 (open) and 169-181 (close in finally block) |
| 24 | ai-run.ts is a runnable CLI calling processArticles() exiting code 1 on error | VERIFIED | `ai-run.ts`: imports processArticles, logs result, `process.exit(1)` in catch, `import.meta.main` guard |

**Score:** 24/24 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `prisma/migrations/20260322_ai_pipeline/migration.sql` | Article.seoTitle DDL + PipelineRun DDL | VERIFIED | Contains `ALTER TABLE "Article" ADD COLUMN "seoTitle" TEXT` and full `CREATE TABLE "PipelineRun"` |
| `src/test/setup-db.ts` | cleanDb() with pipelineRun.deleteMany() | VERIFIED | Line 67: `await prisma.pipelineRun.deleteMany()` — first in deletion chain |
| `src/lib/ai/steps/step1-tag.ts` | runStep1Tag() + Step1Result export | VERIFIED | 127 lines, exports `runStep1Tag` and `Step1Result`, full implementation |
| `src/lib/ai/steps/step1-tag.test.ts` | 8 passing tests (converted from it.todo) | VERIFIED | 8/8 GREEN |
| `src/lib/ai/steps/step2-write.ts` | runStep2Write() + Step2Result export | VERIFIED | 127 lines, exports `runStep2Write` and `Step2Result`, full implementation |
| `src/lib/ai/steps/step2-write.test.ts` | 10 passing tests | VERIFIED | 10/10 GREEN |
| `src/lib/ai/circuit-breaker.ts` | checkCostCircuitBreaker() + AI_DEFAULT_DAILY_TOKEN_THRESHOLD | VERIFIED | 50 lines, both exported, Prisma aggregate query implemented |
| `src/lib/ai/circuit-breaker.test.ts` | 10 passing tests | VERIFIED | 10/10 GREEN (uses pgLite test DB) |
| `src/lib/ai/pipeline.ts` | processArticles() + ProcessResult + _clientFactory | VERIFIED | 186 lines, all three exported, full DI overload pattern |
| `src/lib/ai/pipeline.test.ts` | 10 integration tests (converted from it.todo) | VERIFIED | 10/10 GREEN (uses pgLite test DB) |
| `src/scripts/ai-run.ts` | CLI entry point | VERIFIED | 32 lines, imports processArticles, structured log, exit(1) on error |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `prisma/migrations/20260322_ai_pipeline/migration.sql` | `src/test/setup-db.ts createTestDb()` | `loadMigrationSql()` sorts dirs alphabetically — `20260322_ai_pipeline` picked up | WIRED | `migrations/` dir listing shows `20260321_ingestion`, `20260321000000_init`, `20260322_ai_pipeline` — sorted correctly; `loadMigrationSql()` loops all sorted subdirs |
| `prisma/schema.prisma` | `prisma/migrations/20260322_ai_pipeline/migration.sql` | Schema declares PipelineRun; migration creates it | WIRED | Schema has full `model PipelineRun`; migration has matching `CREATE TABLE "PipelineRun"` |
| `src/lib/ai/steps/step1-tag.ts` | `@anthropic-ai/sdk client.messages.create()` | `output_config.format.type: 'json_schema'` | WIRED | Line 102-107: `output_config: { format: { type: 'json_schema', schema: STEP1_SCHEMA } }` |
| `src/lib/ai/steps/step1-tag.ts` | `Bezirk.gemeindeSynonyms` | `buildBezirkContext()` injects synonym list into system prompt | WIRED | `buildBezirkContext()` lines 51-59 uses `b.gemeindeSynonyms.join(', ')` in system prompt |
| `src/lib/ai/steps/step2-write.ts` | `@anthropic-ai/sdk client.messages.create()` | `output_config.format.type: 'json_schema'` | WIRED | Lines 88-98: `output_config: { format: { type: 'json_schema', schema: Step2Schema } }` |
| `src/lib/ai/circuit-breaker.ts` | `db.pipelineRun.aggregate()` | Prisma `_sum` on totalInputTokens + totalOutputTokens | WIRED | Lines 30-39: `db.pipelineRun.aggregate({ where: { startedAt: { gte: todayStart } }, _sum: { totalInputTokens: true, totalOutputTokens: true } })` |
| `src/lib/ai/circuit-breaker.ts` | `process.env.AI_DAILY_TOKEN_THRESHOLD` | `parseInt` fallback to 500000 | WIRED | Line 22-25: `parseInt(process.env.AI_DAILY_TOKEN_THRESHOLD ?? String(AI_DEFAULT_DAILY_TOKEN_THRESHOLD), 10)` |
| `src/lib/ai/pipeline.ts` | `runStep1Tag()` | Step 1 import + call | WIRED | Line 21: `import { runStep1Tag }`, Line 114: `const step1 = await runStep1Tag(anthropicClient, articleText, allBezirke)` |
| `src/lib/ai/pipeline.ts` | `runStep2Write()` | Step 2 import + call | WIRED | Line 22: `import { runStep2Write }`, Line 142: `const step2 = await runStep2Write(...)` |
| `src/lib/ai/pipeline.ts` | `checkCostCircuitBreaker()` | Pre-run circuit-breaker guard | WIRED | Line 20: `import { checkCostCircuitBreaker }`, Line 76: `const proceed = await checkCostCircuitBreaker(db)` |
| `src/lib/ai/pipeline.ts` | `db.article.findMany({ where: { status: 'FETCHED' } })` | FETCHED-only selection | WIRED | Line 87: `db.article.findMany({ where: { status: 'FETCHED' } })` — exact match |
| `src/lib/ai/pipeline.ts` | `db.articleBezirk.upsert()` | ArticleBezirk junction rows from Step 1 bezirkSlugs | WIRED | Lines 130-137: `db.articleBezirk.upsert({ where: { articleId_bezirkId: ... }, create: ..., update: ... })` |
| `src/scripts/ai-run.ts` | `processArticles()` | Import + call | WIRED | Line 12: `import { processArticles }`, Line 16: `const result = await processArticles()` |

---

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|---------------|-------------|--------|----------|
| AI-01 | 03-01, 03-03, 03-05 | System rewrites ingested content into clean German-language news articles via AI | SATISFIED | `runStep2Write()` produces headline/lead/body in German; `pipeline.ts` writes `title + content` from Step 2 result; test asserts `title='Test Headline'`, `content='Test lead...\n\nTest body...'` |
| AI-02 | 03-01, 03-02, 03-05 | System automatically tags each article with the relevant Bezirk(e) | SATISFIED | `runStep1Tag()` returns `bezirkSlugs`; `pipeline.ts` upserts `ArticleBezirk` rows; test asserts junction row exists with correct `bezirkId` and `taggedAt` |
| AI-03 | 03-01, 03-02, 03-05 | System flags articles mentioning real named persons and routes them to exception queue | SATISFIED | `runStep1Tag()` returns `hasNamedPerson`; `pipeline.ts` sets `status: 'REVIEW'` when `hasNamedPerson=true`; test asserts `updated.status === 'REVIEW'` |
| AI-04 | 03-01, 03-04, 03-05 | System halts AI generation and alerts operator if LLM costs exceed configurable threshold | SATISFIED | `checkCostCircuitBreaker()` queries today's PipelineRun token aggregate, returns false with `console.warn` on breach; integration test confirms no PipelineRun opened when halted |
| AI-05 | 03-01, 03-05 | All AI-generated articles display an "Automatisch erstellt" disclosure label | SATISFIED (schema default) | `prisma/schema.prisma` line 45: `isAutoGenerated Boolean @default(true)` — all AI-pipeline-created articles carry this flag by schema default; no extra write needed in pipeline. Display implementation is a frontend concern (Phase 5 CMS) |
| SEO-02 | 03-01, 03-03, 03-05 | AI generates SEO-optimized article titles and meta descriptions | SATISFIED | `runStep2Write()` returns `seoTitle` (≤60 chars schema) and `metaDescription` (≤160 chars schema); `pipeline.ts` writes both to Article row; test asserts `updated.seoTitle === 'SEO Test Title'`, `updated.metaDescription === 'SEO test meta description.'` |

**Note on AI-05:** The plan explicitly documents this truth: "Article.isAutoGenerated is true by schema default — no extra write needed." The `isAutoGenerated` field defaults to `true` for all Article rows. The visual disclosure label ("Automatisch erstellt") is a frontend rendering concern addressed in Phase 5, which reads this flag. The Phase 3 pipeline's obligation — ensuring the flag is set on AI-generated articles — is satisfied by the schema default.

No orphaned requirements found. All six Phase 3 requirement IDs (AI-01 through AI-05, SEO-02) are claimed by at least one plan and have implementation evidence.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `step1-tag.ts` | 102 | `} as any)` on `client.messages.create()` call | Info | Cast required because `output_config` is not yet in the official Anthropic TypeScript types (documented in plan RESEARCH.md); does not affect runtime behaviour |
| `step2-write.ts` | 88 | `(client.messages.create as Function)(...)` | Info | Same reason — avoids TypeScript error for `output_config` experimental field; both casts are intentional and documented |
| `ai-run.ts` | 29 | `(import.meta as any).main` | Info | Bun `import.meta.main` extension not in standard `ImportMeta` types; cast is correct, documented in SUMMARY, and the standard approach for Bun projects without `@types/bun` |

No blocker or warning anti-patterns found. All three `any` casts are intentional, documented, and affect only type-checking, not runtime correctness.

---

### Human Verification Required

None. All goal-critical behaviour is covered by automated pgLite integration tests and unit tests that run without external services.

The following items are noted for later phases but are not Phase 3 obligations:

1. **AI-05 disclosure label rendering** — the pipeline sets `isAutoGenerated=true` by schema default; the visual "Automatisch erstellt" label in the CMS/frontend is a Phase 5 concern.
2. **Prompt quality validation** — prompts are marked LOW confidence in comments and RESEARCH.md; real OTS data validation is deferred to Phase 7 per plan design.

---

## Summary

Phase 3 goal is fully achieved. All 24 must-have truths are verified against the actual codebase:

- **Schema:** `seoTitle` and `PipelineRun` added correctly to `prisma/schema.prisma` and `migration.sql`; `loadMigrationSql()` picks up the new migration directory via sorted-directory traversal.
- **Step 1 (Tag & Classify):** `runStep1Tag()` is substantively implemented (127 lines), calls `claude-haiku-4-5-20251001` with `output_config` JSON schema mode, injects `gemeindeSynonyms` into the system prompt, returns all required fields. 8 unit tests GREEN.
- **Step 2 (Write & SEO):** `runStep2Write()` is substantively implemented (127 lines), returns all five content and SEO fields plus token counts. 10 unit tests GREEN.
- **Circuit-Breaker:** `checkCostCircuitBreaker()` queries today's PipelineRun aggregate, halts on threshold, emits structured `console.warn`. 10 integration tests GREEN (using pgLite).
- **Pipeline Orchestrator:** `processArticles()` correctly sequences circuit-breaker check → PipelineRun open → Step 1 → ArticleBezirk upsert → Step 2 → Article update → PipelineRun close in try/finally. 10 integration tests GREEN.
- **CLI:** `ai-run.ts` imports and calls `processArticles()` with structured log and `process.exit(1)` guard.
- **Test suite:** 38/38 tests pass in 7.22s.

---

_Verified: 2026-03-22T00:50:00Z_
_Verifier: Claude (gsd-verifier)_
