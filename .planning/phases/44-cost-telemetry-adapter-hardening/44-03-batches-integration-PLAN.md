---
phase: 44-cost-telemetry-adapter-hardening
plan: 44-03
type: execute
wave: 3
depends_on: ["44-02"]
files_modified:
  - prisma/schema.prisma
  - prisma/migrations/20260513_phase44_batched_enum/migration.sql
  - src/lib/ai/batches/submit.ts
  - src/lib/ai/batches/submit.test.ts
  - src/lib/ai/batches/poll.ts
  - src/lib/ai/batches/poll.test.ts
  - src/lib/ai/batches/result-to-merged.ts
  - src/lib/ai/batches/result-to-merged.test.ts
  - src/lib/ai/pipeline.ts
  - src/lib/ai/pipeline.test.ts
  - src/app/api/cron/route.ts
  - src/app/(admin)/admin/articles/ArticleRow.tsx
  - src/app/(admin)/admin/articles/ArticleFilters.tsx
  - DECISIONS.md
  - PROGRESS.md
autonomous: false
requirements: [TLM-05, TLM-06, TLM-07]

must_haves:
  truths:
    - "The pipeline submits articles to the Anthropic Message Batches API by default; switching to per-article mode requires only toggling a feature flag"
    - "Operator has confirmed Vercel tier (Pro = 15-min function timeout) in DECISIONS.md before the plan merges; Hobby tier (60s) requires a re-plan with split cron routes"
  artifacts:
    - path: "prisma/migrations/20260513_phase44_batched_enum/migration.sql"
      provides: "Postgres enum addition: ArticleStatus gains BATCHED value between FETCHED and WRITTEN. Enum-add ONLY (no DML in same file — Postgres restriction per research § ALTER TYPE)"
      contains: "ALTER TYPE \"ArticleStatus\" ADD VALUE 'BATCHED'"
    - path: "src/lib/ai/batches/submit.ts"
      provides: "submitMergedBatch(client, articles, db) — opens batch with merged-call request shape per article (tools + tool_choice + cache_control ttl 1h), writes Article.status='BATCHED'"
      exports: ["submitMergedBatch"]
      min_lines: 60
    - path: "src/lib/ai/batches/poll.ts"
      provides: "pollOpenBatches(client, db) — retrieves any open batches via batches.list, for each ended batch streams results.jsonl, routes each entry through result-to-merged then writes Article via existing computeFinalStatus + $transaction shape"
      exports: ["pollOpenBatches"]
      min_lines: 80
    - path: "src/lib/ai/batches/result-to-merged.ts"
      provides: "Pure adapter: MessageBatchSucceededResult.message → MergedResult shape (extracts tool_use block exactly like runMergedCall does)"
      exports: ["resultToMerged"]
  key_links:
    - from: "src/app/api/cron/route.ts"
      to: "src/lib/ai/batches/poll.ts AND src/lib/ai/batches/submit.ts"
      via: "Single /api/cron route does poll-then-submit when AI_USE_BATCHES='true'; when 'false' uses existing processArticles synchronous path. Cron schedule (vercel.json) is daily 06:00 so combined poll+submit fits the 5min maxDuration."
      pattern: "pollOpenBatches|submitMergedBatch"
    - from: "src/lib/ai/pipeline.ts"
      to: "src/lib/ai/batches/* AND env AI_USE_BATCHES"
      via: "processArticles reads AI_USE_BATCHES env at start of run (matches Phase 43 AI_USE_MERGED_CALL precedent); when 'true', skips per-article loop and instead submits one batch + relies on next cron tick's poll. When 'false', current synchronous path runs verbatim."
      pattern: "AI_USE_BATCHES"
    - from: "src/lib/ai/batches/poll.ts"
      to: "src/lib/ai/pricing.ts (from 44-01)"
      via: "Per-result cost computed with isBatch=true (50% discount) and cacheTtl='1h' (batches use 1h cache TTL per research)"
      pattern: "computeCostUsd.*isBatch.*true"
    - from: "src/app/(admin)/admin/articles/ArticleFilters.tsx"
      to: "ArticleStatus enum"
      via: "STATUSES array appends { value: 'BATCHED', label: 'In Bearbeitung' } BEFORE migration runs (TypeScript exhaustiveness — per research pitfall #3)"
      pattern: "BATCHED"
    - from: "src/app/(admin)/admin/articles/ArticleRow.tsx"
      to: "STATUS_COLORS"
      via: "STATUS_COLORS map gets BATCHED entry (bg-blue-100 text-blue-800 — Wurzelwelt-compatible neutral indicator) BEFORE migration runs"
      pattern: "BATCHED"
    - from: "DECISIONS.md (Phase 44-03 entry)"
      to: "operator-confirmed Vercel tier"
      via: "Task 4 inserts the Phase 44-03 DECISIONS entry with a TIER_TBD marker on the operator-confirmation line; Task 5 is a blocking checkpoint that the operator replaces TIER_TBD with 'CONFIRMED Pro tier' (or 'CONFIRMED Hobby — split cron required' which blocks merge and triggers re-plan)"
      pattern: "CONFIRMED Pro tier"
---

<objective>
Integrate the Anthropic Message Batches API into the AI pipeline behind an env-var feature flag (`AI_USE_BATCHES`). Add the `BATCHED` enum value (own migration file, enum-add only — Postgres restriction). Wire submit + poll into `/api/cron`. Per-message batch errors flow through the same retryCount/errorMessage semantics as synchronous failures.

**Conditional dominant path:** Read `.planning/phases/44-cost-telemetry-adapter-hardening/44-02-batches-spike-PLAN.md § Spike Results` BEFORE starting. The verdict determines the default of `AI_USE_BATCHES`:
- **PASS (p50 ≤ 900s)** → default `'true'` (batches as default; flag preserved for emergency rollback)
- **FAIL (p50 > 900s)** → default `'false'` (BATCHED enum + code shipped behind flag for v3.3 retry; ALSO add `p-limit(4)` concurrency on the per-article path per manifest B6 as primary acceleration)

> **⚠️ DEFERRED — 2026-05-12 (post v3.2 merged-call closure)**
>
> Entire plan is built on `runMergedCall` foundations (file list includes
> `result-to-merged.ts`, `submitMergedBatch`, etc.) which are dormant in
> production as of 2026-05-12. Executing this plan as drafted would build
> Batches infrastructure for a code path that is not serving traffic.
> See DECISIONS.md 2026-05-12 closure entry.
>
> **Action before executing:** depends on the 44-02 re-evaluation. If
> Batches stays in scope on legacy path, the entire submit/poll/result
> architecture redesigns around the two-call shape. If Batches drops,
> this plan archives.
>
> Do NOT run `/gsd:execute-phase 44` against this plan as drafted.

---

Purpose: 50% input + output discount via Batches API (REQUIREMENTS TLM-05). Telemetry from 44-01 is already populated; this plan just changes the AI transport.

Output: Three new files in `src/lib/ai/batches/`, one enum migration, pipeline + cron orchestration changes, status badge support for `BATCHED`. No UI for manual operator actions on BATCHED rows (deferred per CONTEXT.md).

**Hard merge gate — Vercel tier confirmation (Task 5):** `vercel.json` currently sets `maxDuration: 300` (5 min) on `/api/cron`, which requires Pro tier. The single-route poll-then-submit design only fits within Vercel's Pro 15-min function budget; Hobby tier (60s) would force a different design (two cron routes). Task 4 inserts the DECISIONS.md scaffolding with a `TIER_TBD` marker; Task 5 is a blocking `checkpoint:human-action` requiring the operator to confirm tier in DECISIONS.md (replacing `TIER_TBD` with either `CONFIRMED Pro tier ✓` (merge proceeds) or `CONFIRMED Hobby — split cron required` (this plan halts and re-plans)).
</objective>

<execution_context>
@/Users/philipp/.claude/get-shit-done/workflows/execute-plan.md
@/Users/philipp/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/44-cost-telemetry-adapter-hardening/44-CONTEXT.md
@.planning/phases/44-cost-telemetry-adapter-hardening/44-RESEARCH.md
@.planning/phases/44-cost-telemetry-adapter-hardening/44-VALIDATION.md
@.planning/phases/44-cost-telemetry-adapter-hardening/44-02-batches-spike-PLAN.md
@AGENTS.md
@prisma/schema.prisma
@src/lib/ai/pipeline.ts
@src/lib/ai/steps/merged.ts
@src/app/api/cron/route.ts
@src/app/(admin)/admin/articles/ArticleRow.tsx
@src/app/(admin)/admin/articles/ArticleFilters.tsx
@vercel.json

<interfaces>
<!-- Anthropic SDK shapes — extracted from node_modules/@anthropic-ai/sdk/resources/messages/batches.d.ts -->

```typescript
// SDK surface (v0.80.0):
client.messages.batches.create({ requests: MessageBatchRequest[] }) → Promise<MessageBatch>
client.messages.batches.retrieve(id: string) → Promise<MessageBatch>
client.messages.batches.results(id: string) → AsyncIterable<MessageBatchIndividualResponse>
client.messages.batches.list({ limit?: number }) → Promise<Page<MessageBatch>>

// Key fields:
MessageBatch.id                     // string, e.g. "msgbatch_01..."
MessageBatch.processing_status      // 'in_progress' | 'canceling' | 'ended'
MessageBatch.created_at             // ISO timestamp
MessageBatch.request_counts         // { processing, succeeded, errored, canceled, expired }

MessageBatchIndividualResponse.custom_id   // operator-set, e.g. "article-12345"
MessageBatchIndividualResponse.result.type // 'succeeded' | 'errored' | 'canceled' | 'expired'
// On succeeded:
result.message  // Anthropic.Messages.Message (same shape as messages.create response — tool_use block extraction identical to runMergedCall)
// On errored:
result.error.error.message  // string error message from Anthropic
```

From src/lib/ai/steps/merged.ts (MERGED_OUTPUT_SCHEMA + buildBezirkContext logic + tool_use parsing — replicate the SAME shape in submit.ts and reuse the SAME parser in result-to-merged.ts):
```typescript
// MERGED_OUTPUT_SCHEMA exported (verify) or copy verbatim
// runMergedCall does: response.content.find(block => block.type === 'tool_use')?.input → MergedResult fields
```

From src/lib/ai/pipeline.ts (final $transaction at lines 253-275 — poll.ts reuses this exact shape):
```typescript
// computeFinalStatus = (merged.mentionsPrivateIndividual || (merged.bezirkSlugs.length === 0 && !merged.isStateWide)) ? 'REVIEW' : 'WRITTEN'
// db.$transaction([article.update({ data: { status, telemetry, content, seo }}), ...articleBezirk.upserts])
```

Postgres restriction (research § Pitfall 2):
```
ALTER TYPE "ArticleStatus" ADD VALUE 'BATCHED' BEFORE 'WRITTEN';
-- MUST be the ONLY DDL/DML in this migration file.
-- Postgres rejects same-tx use of a freshly-added enum value.
-- Prisma migrate deploy runs each migration in its own tx by default.
```

Cache TTL difference vs 44-01:
```
Synchronous merged-call (44-01): cacheTtl='5m'   (merged.ts uses default)
Batches path (this plan):        cacheTtl='1h'   (batches run > 5min; research § Submit a batch line 65 of Anthropic batch-processing guide)
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 0: chore(44-03): read spike verdict, update enum-exhaustive consumers BEFORE migration</name>
  <files>src/app/(admin)/admin/articles/ArticleRow.tsx, src/app/(admin)/admin/articles/ArticleFilters.tsx</files>
  <action>
    1. **Read `.planning/phases/44-cost-telemetry-adapter-hardening/44-02-batches-spike-PLAN.md` § Spike Results.** Note the verdict (PASS or FAIL) — it sets the default of `AI_USE_BATCHES` in Task 4.

    2. **Update `src/app/(admin)/admin/articles/ArticleFilters.tsx`** (line 13-20): append to STATUSES array:
       ```typescript
       { value: 'BATCHED', label: 'In Bearbeitung' },
       ```
       Place between FETCHED and REVIEW (matches enum position).

    3. **Update `src/app/(admin)/admin/articles/ArticleRow.tsx`** (line 9-15): add to STATUS_COLORS map:
       ```typescript
       BATCHED: 'bg-blue-100 text-blue-800',
       ```
       Color chosen: Wurzelwelt-compatible neutral indicator (blue ≠ green/yellow/red, which carry success/warn/error semantics). No new design tokens introduced.

    4. **Grep for other ArticleStatus consumers that might need updating:**
       ```bash
       grep -rn "ArticleStatus\|'FETCHED'\|'WRITTEN'\|'REVIEW'" src/ | grep -v ".test.ts" | grep -v "node_modules"
       ```
       Cross-check: any switch/match on `article.status` without a `default` clause must add `case 'BATCHED':` (or fall through to default). Verify `src/lib/ai/pipeline.ts:143` (`status: { in: ['FETCHED', 'ERROR', 'TAGGED'] }`) — this stays as-is (BATCHED is intentionally excluded from the per-article retry selector; poll path handles it).

    5. **No migration yet.** Migration runs in Task 1, but the enum consumers above must update FIRST so TSC doesn't fail between migration apply and consumer update.

    6. **No DECISIONS.md entry in this task.** The Phase 44-03 DECISIONS entry is written in Task 4 (the natural home — that's where `AI_USE_BATCHES` actually gets set and the env-var-and-tier narrative lives). Task 5 is the blocking checkpoint that flips the operator-confirmation line.

    Why per requirement: TLM-06 (BATCHED enum value); pitfall #3 prevention (exhaustive switch must compile before migration).
  </action>
  <verify>
    <automated>npx tsc --noEmit &amp;&amp; grep -q "BATCHED" src/app/\(admin\)/admin/articles/ArticleFilters.tsx &amp;&amp; grep -q "BATCHED" src/app/\(admin\)/admin/articles/ArticleRow.tsx</automated>
  </verify>
  <done>
    TSC clean; STATUSES + STATUS_COLORS both contain BATCHED. Conventional commit: `chore(44-03): prepare enum consumers for BATCHED`.
  </done>
</task>

<task type="auto">
  <name>Task 1: feat(44-03): BATCHED enum migration (DDL-only — Postgres restriction)</name>
  <files>prisma/schema.prisma, prisma/migrations/20260513_phase44_batched_enum/migration.sql</files>
  <action>
    1. **Modify `prisma/schema.prisma`**: in `enum ArticleStatus` (lines 13-22), insert `BATCHED` between `FETCHED` and `WRITTEN`:
       ```
       enum ArticleStatus {
         FETCHED
         BATCHED     // submitted to Anthropic Message Batches API; awaits poll → WRITTEN | REVIEW | ERROR
         TAGGED      // deprecated post-v3.2 (existing comment)
         WRITTEN
         REVIEW
         PUBLISHED
         REJECTED
         ERROR
         FAILED
       }
       ```
       Update the `// deprecated post-v3.2` comment on TAGGED to remain accurate.

    2. **Run `npx prisma migrate dev --name phase44_batched_enum --create-only`**. Verify generated SQL is ONLY:
       ```sql
       ALTER TYPE "ArticleStatus" ADD VALUE 'BATCHED' BEFORE 'WRITTEN';
       ```
       **CRITICAL:** if the generated SQL contains anything else (e.g. data backfill, index re-creation, statement other than `ALTER TYPE`), Postgres will reject deployment due to "unsafe use of new value" (research pitfall #2). Delete the offending statements or split into a separate migration. For Phase 44, no backfill is needed (BATCHED only applies going forward).

    3. **Rename folder if needed** to `20260513_phase44_batched_enum/` (matches the date convention used in this phase).

    4. **Apply locally:** `npx prisma migrate dev` (no `--create-only` flag). Verify success. Run `npx prisma generate`.

    5. **TSC re-check after schema regenerate** to confirm Task 0's enum consumers still type-check.

    Why per requirement: TLM-06 (enum value); research pitfall #2 (Postgres ADD VALUE in own tx).
  </action>
  <verify>
    <automated>npx prisma generate &amp;&amp; npx prisma migrate status 2>&amp;1 | grep -q phase44_batched_enum &amp;&amp; npx tsc --noEmit</automated>
  </verify>
  <done>
    Migration `20260513_phase44_batched_enum` applied. Migration SQL is enum-add ONLY. TSC clean. Conventional commit: `feat(44-03): add BATCHED ArticleStatus enum value`.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: feat(44-03): result-to-merged pure adapter + tests</name>
  <files>src/lib/ai/batches/result-to-merged.ts, src/lib/ai/batches/result-to-merged.test.ts</files>
  <behavior>
    Tests (RED first):
    - Test 1: Given a synthetic `Anthropic.Messages.Message` with a `tool_use` block whose `input` matches the merged-call schema, `resultToMerged(message)` returns a `MergedResult` with bezirkSlugs/isStateWide/mentionsPrivateIndividual/headline/lead/body/seoTitle/metaDescription correctly extracted, and `usage` tokens correctly summed.
    - Test 2: When `usage.cache_read_input_tokens` and `usage.cache_creation_input_tokens` are present, they map to `cachedInputTokens` and `cacheCreationTokens` (cache-aware split per AIPL-05 convention).
    - Test 3: Defensive `isStateWide → bezirkSlugs=[]` guard at the schema boundary (matches merged.ts behavior).
    - Test 4: If the message has NO tool_use block, throws `Error("resultToMerged: no tool_use block in batch response")` (known error case — try/catch in caller).
    - Test 5: If multiple tool_use blocks exist (shouldn't happen with `tool_choice` set), uses the first one (defensive).
  </behavior>
  <action>
    1. **Create `src/lib/ai/batches/result-to-merged.test.ts` FIRST (RED).** Synthesize message objects matching `Anthropic.Messages.Message` shape. No HTTP, fully synthetic. Use the exact `MergedResult` import from `../steps/merged`.

    2. **Create `src/lib/ai/batches/result-to-merged.ts` (GREEN):**
       ```typescript
       import type Anthropic from '@anthropic-ai/sdk'
       import type { MergedResult } from '../steps/merged'

       export function resultToMerged(message: Anthropic.Messages.Message): MergedResult {
         const toolUseBlock = message.content.find((b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use')
         if (!toolUseBlock) {
           throw new Error('resultToMerged: no tool_use block in batch response')
         }
         const input = toolUseBlock.input as {
           bezirkSlugs: string[]
           isStateWide: boolean
           mentionsPrivateIndividual: boolean
           headline: string
           lead: string
           body: string
           seoTitle: string
           metaDescription: string
         }
         // Schema-boundary guard (matches merged.ts)
         const bezirkSlugs = input.isStateWide ? [] : input.bezirkSlugs
         return {
           bezirkSlugs,
           isStateWide: input.isStateWide,
           mentionsPrivateIndividual: input.mentionsPrivateIndividual,
           headline: input.headline,
           lead: input.lead,
           body: input.body,
           seoTitle: input.seoTitle,
           metaDescription: input.metaDescription,
           inputTokens: message.usage.input_tokens,
           cachedInputTokens: message.usage.cache_read_input_tokens ?? 0,
           cacheCreationTokens: message.usage.cache_creation_input_tokens ?? 0,
           outputTokens: message.usage.output_tokens,
         }
       }
       ```
       Pure function. No DI. No try/catch (the one throw is the known error case; caller in poll.ts wraps).

    Why per requirement: TLM-05 (merged-call output schema is shared with batches path — single contract).
  </action>
  <verify>
    <automated>npm test -- batches/result-to-merged.test</automated>
  </verify>
  <done>
    Five tests pass. Conventional commit: `feat(44-03): add result-to-merged adapter`.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: feat(44-03): submitMergedBatch + tests (with mock Anthropic SDK client)</name>
  <files>src/lib/ai/batches/submit.ts, src/lib/ai/batches/submit.test.ts</files>
  <behavior>
    Tests (RED first):
    - Test 1: `submitMergedBatch(mockClient, articles, db)` with 3 FETCHED articles calls `client.messages.batches.create` exactly once, with `requests.length === 3`, each request has `custom_id: 'article-${id}'`, `params.model='claude-haiku-4-5-20251001'`, `params.max_tokens: 1024`, `params.tools[0].name === 'publish_article'`, `params.tool_choice === { type: 'tool', name: 'publish_article' }`.
    - Test 2: `params.system` array has TWO entries: first has `cache_control: { type: 'ephemeral', ttl: '1h' }`, second does not (matches research § Submit a batch).
    - Test 3: After create resolves with `{ id: 'msgbatch_test_123', ... }`, all 3 articles in DB have `status='BATCHED'` and an `errorMessage` (or new dedicated column — see action note) containing the batch id (for poll-side lookup).
    - Test 4: **TLM-07 cap-at-100**: given 105 FETCHED articles, `requests.length === 100` and 5 articles remain in `status='FETCHED'`.
    - Test 5: SDK error during `batches.create` does NOT mark articles as BATCHED (they stay FETCHED so next cron retries); error propagates to caller.
  </behavior>
  <action>
    1. **Create `src/lib/ai/batches/submit.test.ts` FIRST (RED).** Use pglite db setup. Mock Anthropic via plain `vi.fn()` object: `const mockClient = { messages: { batches: { create: vi.fn().mockResolvedValue({ id: 'msgbatch_test_123', processing_status: 'in_progress' }) } } } as unknown as Anthropic`.

    2. **DESIGN DECISION (record in submit.ts top-of-file comment):** Where does `batchId` live on the Article row?
       - **Option A**: Reuse `errorMessage String?` column with prefix `BATCH_ID:msgbatch_...` (no schema change).
       - **Option B**: Add a new `Article.batchId String?` column (schema change in this migration).
       - **Chosen: Option A.** No additional migration; errorMessage is null on BATCHED rows anyway (no error yet). Poll path strips the prefix. **Rationale logged in DECISIONS.md** in this task (append new entry under Phase 44-03 section).

    3. **Create `src/lib/ai/batches/submit.ts` (GREEN):**
       - DI overloads per AGENTS.md duck-typing (`'$connect' in dbOrArticles` discriminator).
       - Function signature: `submitMergedBatch(client: Anthropic, articles: Article[], db: PrismaClient): Promise<string /* batchId */>`. Production overload omits `db` and uses `defaultPrisma`.
       - **Cap at 100** before constructing requests: `const capped = articles.slice(0, 100)`. Articles 101+ stay in FETCHED status (next cron tick re-submits).
       - Build STATIC_PREFIX and DYNAMIC_SUFFIX. Two options:
         - **Reuse from merged.ts**: if `merged.ts` exports `buildSystemPrompt(bezirke, config)` — preferred. Verify by reading merged.ts. If not exported, replicate the prefix verbatim (same 43-01 decision applies: isolation > DRY).
       - For each capped article, build `requests` entry per research § Submit a batch (the verbatim code in interfaces above). Use `cache_control: { type: 'ephemeral', ttl: '1h' }` on the static prefix.
       - `const batch = await client.messages.batches.create({ requests })`.
       - After resolved: update all `capped` articles to `BATCHED` with `errorMessage: \`BATCH_ID:\${batch.id}\``:
         ```typescript
         await db.article.updateMany({
           where: { id: { in: capped.map((a) => a.id) } },
           data: { status: 'BATCHED', errorMessage: `BATCH_ID:${batch.id}` },
         })
         ```
       - Return `batch.id`.
       - **try/catch around `batches.create` only** (known: SDK rate-limit / network / auth failure). On error, rethrow (do NOT mark articles BATCHED on failure — they stay FETCHED).

    4. No new npm deps.

    Why per requirement: TLM-05 (batches default-submit), TLM-07 (cap-at-100), research § Pattern 1 (DI duck-typing).
  </action>
  <verify>
    <automated>npm test -- batches/submit.test</automated>
  </verify>
  <done>
    Five tests pass. DECISIONS.md has the Option A rationale. Conventional commit: `feat(44-03): add submitMergedBatch with cap-at-100 and BATCH_ID tagging`.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: feat(44-03): pollOpenBatches + tests + pipeline flag gate + DECISIONS.md scaffolding</name>
  <files>src/lib/ai/batches/poll.ts, src/lib/ai/batches/poll.test.ts, src/lib/ai/pipeline.ts, src/lib/ai/pipeline.test.ts, src/app/api/cron/route.ts, DECISIONS.md</files>
  <behavior>
    poll.test.ts (RED first):
    - Test 1: With one BATCHED article in DB and mock `batches.list` returning the corresponding batch in `processing_status='ended'`, after `pollOpenBatches(mockClient, db)` the article has `status='WRITTEN'` (succeeded path → resultToMerged → computeFinalStatus → final $transaction with telemetry from 44-01 pricing helper, isBatch=true).
    - Test 2: `errored` result type → `Article.status='ERROR'`, `errorMessage=<batch error message>`, `retryCount` incremented by 1 (matches research § Poll + stream results).
    - Test 3: `expired` and `canceled` result types → same as errored (uniform retry semantics).
    - Test 4: When batch is still `processing_status='in_progress'`, function returns `{ applied: 0, stillProcessing: true }` and DB is untouched.
    - Test 5: aiCostUsd computed with isBatch=true (50% off) and cacheTtl='1h' — verify by mocking pricing helper or by checking final stored value matches `computeCostUsd({...}, isBatch: true, cacheTtl: '1h')`.
    - Test 6: REVIEW path: when `mentionsPrivateIndividual=true` in the tool_use input, finalStatus='REVIEW' (matches computeFinalStatus from pipeline.ts).

    pipeline.test.ts (RED first):
    - Test "AI_USE_BATCHES='true' submits batch and skips per-article loop": with `vi.stubEnv('AI_USE_BATCHES', 'true')`, `processArticles(db)` calls `submitMergedBatch` once, no per-article merged-call calls, FETCHED articles transition to BATCHED.
    - Test "AI_USE_BATCHES='false' uses synchronous merged path verbatim": existing 34/34 tests continue to pass with the flag unset (default false on FAIL verdict) or true (default true on PASS verdict).
  </behavior>
  <action>
    1. **Create `src/lib/ai/batches/poll.test.ts` FIRST (RED).** Mock structure for streaming results:
       ```typescript
       const mockResults = async function* () {
         yield { custom_id: 'article-1', result: { type: 'succeeded', message: { /* synthetic */ } } }
         yield { custom_id: 'article-2', result: { type: 'errored', error: { error: { message: 'rate_limit' } } } }
       }
       const mockClient = {
         messages: {
           batches: {
             list: vi.fn().mockResolvedValue({ data: [{ id: 'msgbatch_test_123', processing_status: 'ended', created_at: '...' }] }),
             retrieve: vi.fn().mockResolvedValue({ id: 'msgbatch_test_123', processing_status: 'ended' }),
             results: vi.fn().mockReturnValue(mockResults()),
           },
         },
       } as unknown as Anthropic
       ```

    2. **Create `src/lib/ai/batches/poll.ts` (GREEN):**
       - DI overloads per AGENTS.md duck-typing.
       - `pollOpenBatches(client: Anthropic, db: PrismaClient): Promise<{ batchesPolled: number; applied: number; stillProcessing: number }>`.
       - **Discover open batches**: find articles in `status='BATCHED'`, extract their `BATCH_ID:msgbatch_*` from `errorMessage`. De-dupe into a Set. (Alternatively: `client.messages.batches.list({ limit: 20 })` and filter — but Anthropic-side might list batches from other applications. Article-side lookup is cleaner.)
       - For each batchId:
         - `const batch = await client.messages.batches.retrieve(batchId)`.
         - If `batch.processing_status !== 'ended'`, increment `stillProcessing` counter and continue.
         - Else stream `client.messages.batches.results(batchId)`:
           ```typescript
           for await (const entry of client.messages.batches.results(batchId)) {
             const articleId = Number(entry.custom_id.replace('article-', ''))
             if (entry.result.type === 'succeeded') {
               const merged = resultToMerged(entry.result.message)
               const finalStatus = computeFinalStatus(merged)  // extract helper from pipeline.ts OR replicate inline
               const aiCostUsd = computeCostUsd({
                 inputTokens: merged.inputTokens,
                 cachedInputTokens: merged.cachedInputTokens,
                 cacheCreationTokens: merged.cacheCreationTokens,
                 outputTokens: merged.outputTokens,
                 model: 'claude-haiku-4-5-20251001',
                 isBatch: true,
                 cacheTtl: '1h',
               })
               // Re-fetch the article to get its sourceId/imageUrl etc.
               const article = await db.article.findUnique({ where: { id: articleId } })
               if (!article) continue
               await db.$transaction([
                 db.article.update({
                   where: { id: articleId },
                   data: {
                     status: finalStatus,
                     isStateWide: merged.isStateWide,
                     title: merged.headline,
                     content: `${merged.lead}\n\n${merged.body}`,
                     seoTitle: merged.seoTitle,
                     metaDescription: merged.metaDescription,
                     errorMessage: null,  // clear the BATCH_ID prefix
                     aiInputTokens: merged.inputTokens + merged.cacheCreationTokens,
                     aiCachedInputTokens: merged.cachedInputTokens,
                     aiOutputTokens: merged.outputTokens,
                     aiCostUsd,
                     aiModel: 'claude-haiku-4-5-20251001',
                     aiProcessedAt: new Date(),
                   },
                 }),
                 // bezirk upserts — same as pipeline.ts (mapped from merged.bezirkSlugs via bezirkBySlug)
               ])
               applied++
             } else {
               // errored | expired | canceled → unified retry semantics
               await db.article.update({
                 where: { id: articleId },
                 data: {
                   status: 'ERROR',
                   errorMessage: entry.result.type === 'errored' ? entry.result.error.error.message : `Batch ${entry.result.type}`,
                   retryCount: { increment: 1 },
                 },
               })
             }
           }
           ```
       - **Map generation block:** intentionally **OUT OF SCOPE** for the poll path in this phase. Document this in poll.ts top-of-file comment: "Map images are generated only on the synchronous path (pipeline.ts) for Phase 44 — adding map gen here doubles the surface area without test infra. Deferred to v3.3 unless ops feedback demands it." A BATCHED→WRITTEN article that lacks a map will be backfilled on next backfill run.
       - **try/catch only around SDK calls** (`batches.retrieve`, `batches.results`). Per-result errors are NOT exceptions — they're typed result.type variants. Per AGENTS.md anti-bloat.

    3. **Modify `src/lib/ai/pipeline.ts`** to read `AI_USE_BATCHES` env (matches Phase 43 `AI_USE_MERGED_CALL` pattern, line ~151):
       ```typescript
       const useBatches = (process.env.AI_USE_BATCHES ?? '<DEFAULT>') === 'true'   // <DEFAULT> per spike verdict
       ```
       Replace `<DEFAULT>` with `'true'` if 44-02 spike PASSED, `'false'` if FAILED. Add a clear comment citing the spike verdict and the date.

       Then, EARLY in the per-article loop (before the merged-call branch):
       ```typescript
       if (useBatches) {
         // BATCHES MODE: do not process per-article. Submit the entire batch
         // and exit; the next cron tick polls.
         const { submitMergedBatch } = await import('./batches/submit')
         const batchId = await submitMergedBatch(anthropicClient, articles, db)
         console.log(`[ai-pipeline] submitted batch=${batchId} n=${articles.length} (next cron polls)`)
         // Close PipelineRun with totals=0 — no tokens consumed YET (batches bill on completion)
         return { articlesProcessed: 0, articlesWritten: 0, totalInputTokens: 0, totalCachedInputTokens: 0, totalOutputTokens: 0 }
       }
       // ... rest of synchronous per-article loop unchanged
       ```
       Note: the dynamic import keeps the synchronous path's bundle clean and avoids circular imports during test.

    4. **Modify `src/app/api/cron/route.ts`** — extend Step 2 (AI section) to poll BEFORE the existing `processArticles` call when `AI_USE_BATCHES` is true:
       ```typescript
       // Step 2: AI + publish pipeline
       try {
         await checkDeadMan()
         const useBatches = (process.env.AI_USE_BATCHES ?? '<DEFAULT>') === 'true'
         if (useBatches) {
           const { pollOpenBatches } = await import('@/lib/ai/batches/poll')
           const Anthropic = (await import('@anthropic-ai/sdk')).default
           const client = new Anthropic({ maxRetries: 2 })
           const pollResult = await pollOpenBatches(client, /* default prisma */)
           log.push(`[ai-batches] polled=${pollResult.batchesPolled} applied=${pollResult.applied} stillProcessing=${pollResult.stillProcessing}`)
         }
         const aiResult = await processArticles()  // also submits a new batch when useBatches
         const pubResult = await publishArticles()
         // ... existing log lines
       } catch (err) { /* existing */ }
       ```
       The `<DEFAULT>` substitution matches pipeline.ts.

    5. **Extend `src/lib/ai/pipeline.test.ts`** with the two flag-gate tests. Use `vi.stubEnv('AI_USE_BATCHES', 'true')` / `'false'`. Reset with `vi.unstubAllEnvs()` in afterEach.

    6. **Insert DECISIONS.md scaffolding entry** — append the following block under "## Decisions" at the top of `DECISIONS.md`. This is the natural home for the env-var-and-tier narrative: it lives where `AI_USE_BATCHES` actually gets set:
       ```markdown
       ### Phase 44-03: AI_USE_BATCHES default + Vercel tier dependency

       **Decision:** Pipeline default-submits to Anthropic Message Batches API when env `AI_USE_BATCHES='true'` (or unset on PASS verdict). Per-article path preserved via `AI_USE_BATCHES='false'`.

       **Rationale:** 50% input + output discount on Haiku 4.5 (TLM-05). Spike verdict (44-02): {PASS|FAIL — fill in from spike results}. Default value: {'true'|'false' — derived from verdict}.

       **Vercel tier:** This plan assumes Pro tier (`vercel.json` sets `maxDuration: 300` on /api/cron). The single-route poll-then-submit design exceeds Hobby tier's 60s function timeout. On Hobby tier, the design must split into /api/cron-poll + /api/cron-submit (deferred; CONTEXT.md says default to single route, so Hobby triggers a re-plan).

       **Operator confirmation (Task 5 hard gate):** TIER_TBD — operator replaces this marker with one of:
       - `CONFIRMED Pro tier ✓` → Task 5 gate passes; plan merges.
       - `CONFIRMED Hobby — split cron required` → Task 5 gate blocks; this plan halts and a new plan (44-03b: split cron routes) is written.

       **Rejected alternatives:** Webhook receiver server (out-of-scope per REQUIREMENTS); admin-UI flag toggle (deferred — env var matches AI_USE_MERGED_CALL precedent); BATCHED migration with DML in same file (Postgres rejects — research pitfall #2).
       ```
       The literal string `TIER_TBD` must appear exactly once on the "Operator confirmation" line — Task 5's verify command greps for the replacement string.

    Why per requirement: TLM-05 (flag), TLM-06 (BATCHED→WRITTEN/REVIEW/ERROR transitions), TLM-07 (errored increments retryCount); env-var-and-tier narrative belongs with the code that reads `AI_USE_BATCHES`.
  </action>
  <verify>
    <automated>npm test -- batches/poll.test pipeline.test &amp;&amp; grep -q "Phase 44-03: AI_USE_BATCHES" DECISIONS.md &amp;&amp; grep -q "TIER_TBD" DECISIONS.md</automated>
  </verify>
  <done>
    All poll.test cases pass + pipeline.test gains two AI_USE_BATCHES cases (all green). `<DEFAULT>` values in pipeline.ts and route.ts match the spike verdict. DECISIONS.md contains the Phase 44-03 entry with the `TIER_TBD` marker awaiting Task 5. Conventional commit: `feat(44-03): wire pollOpenBatches and AI_USE_BATCHES flag into cron pipeline`.
  </done>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 5: chore(44-03): operator confirms Vercel Pro tier in DECISIONS.md</name>
  <files>DECISIONS.md</files>
  <action>
    **THIS IS A BLOCKING HUMAN GATE.** No CLI/API equivalent exists — the operator must open the Vercel dashboard with their billing credentials and verify the project's tier. Only the operator can determine whether the merge proceeds (Pro) or halts and re-plans (Hobby).

    **Rationale:** the single-route `/api/cron` design in Task 4 does poll-then-submit on every cron tick. `vercel.json` already sets `maxDuration: 300` (5 min) on /api/cron, which is allowed on Pro (15-min cap) but rejected on Hobby (60s cap). Polling N open batches × stream-and-apply results easily exceeds 60s under load. A Hobby-tier deployment with the Task 4 changes would silently 504 mid-poll, leaving BATCHED articles stranded.

    **Operator steps:**
    1. Open https://vercel.com/dashboard → select this project → Settings → General → "Plan" / "Tier" section.
    2. Confirm the project is on **Pro** (or Enterprise) tier. If on **Hobby**, STOP — do not proceed; report back and the plan re-spawns as 44-03a (poll-only `/api/cron-poll`) + 44-03b (submit-only `/api/cron-submit`).
    3. Open `DECISIONS.md` at project root. Find the Phase 44-03 entry inserted by Task 4. Locate the line starting with `**Operator confirmation (Task 5 hard gate):** TIER_TBD`.
    4. Replace `TIER_TBD` with EXACTLY ONE of:
       - `CONFIRMED Pro tier ✓` — proceeds with merge.
       - `CONFIRMED Hobby — split cron required` — halts this plan; trigger re-plan.
    5. Commit: `chore(44-03): operator confirms Vercel tier in DECISIONS.md (Pro|Hobby)`.

    **Verify command (informational — operator runs locally to confirm before resume-signal):**
    ```bash
    grep -q "CONFIRMED Pro tier" DECISIONS.md && echo "GATE_PASSED" || echo "GATE_BLOCKED"
    ```
    `GATE_PASSED` → resume the plan. `GATE_BLOCKED` → either the operator hasn't edited DECISIONS.md yet, or the Hobby path was chosen and this plan must halt for re-planning.

    Why per requirement: design assumption from CONTEXT.md (single cron route) must be validated against actual deployment tier before the code merges. Operator-only knowledge (billing dashboard access).
  </action>
  <verify>
    <manual>
      1. `grep -q "CONFIRMED Pro tier" DECISIONS.md && echo "GATE_PASSED" || echo "GATE_BLOCKED"` prints `GATE_PASSED`.
      2. The literal string `TIER_TBD` no longer appears in DECISIONS.md (sanity check that the operator-confirmation line was actually edited): `! grep -q "TIER_TBD" DECISIONS.md`.
      3. If the operator chose the Hobby path instead: `grep -q "CONFIRMED Hobby" DECISIONS.md` returns 0 → this plan HALTS and the orchestrator re-spawns a split-cron-route plan; do NOT proceed with the merge.
    </manual>
  </verify>
  <resume-signal>Operator types "tier confirmed" once DECISIONS.md contains either `CONFIRMED Pro tier ✓` (proceed) or `CONFIRMED Hobby — split cron required` (halt + re-plan).</resume-signal>
  <done>
    DECISIONS.md no longer contains `TIER_TBD`; it contains either `CONFIRMED Pro tier ✓` (plan proceeds to verification) or `CONFIRMED Hobby — split cron required` (plan halts and re-plans). Conventional commit: `chore(44-03): operator confirms Vercel tier in DECISIONS.md`.
  </done>
</task>

</tasks>

<verification>
- Migration `20260513_phase44_batched_enum` applied (enum-only, no DML)
- `npm test -- batches/ pipeline.test` all green
- `npx tsc --noEmit` clean
- DECISIONS.md contains Phase 44-03 entry AND `CONFIRMED Pro tier ✓` (or the plan halted on Hobby and is being re-planned)
- /admin/articles status filter shows "In Bearbeitung" option; rows in BATCHED status render with blue badge
</verification>

<success_criteria>
- TLM-05: `processArticles()` branches on AI_USE_BATCHES; flag flips the transport
- TLM-06: BATCHED enum exists; BATCHED→WRITTEN/REVIEW/ERROR transitions work in poll.ts
- TLM-07: 100-article cap enforced in submit.ts; per-message errored increments retryCount
- Telemetry (from 44-01) still populated on the batched path via resultToMerged + computeCostUsd(isBatch=true, cacheTtl='1h')
- DECISIONS.md has the operator-confirmed Vercel tier line (no remaining `TIER_TBD` marker)
- PROGRESS.md has six commits logged (Tasks 0-5)
</success_criteria>

<output>
After completion, create `.planning/phases/44-cost-telemetry-adapter-hardening/44-03-SUMMARY.md` per `~/.claude/get-shit-done/templates/summary.md`. Include: spike verdict and final `AI_USE_BATCHES` default value chosen; the Option A vs B (errorMessage prefix) decision; the operator-confirmed Vercel tier outcome (Pro or Hobby-triggered-replan); remaining manual op steps (none expected — flag is operator-flippable in Vercel env vars without redeploy).
</output>
