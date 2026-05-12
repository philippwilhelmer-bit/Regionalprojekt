---
phase: 44-cost-telemetry-adapter-hardening
plan: 44-01
type: execute
wave: 1
depends_on: []
files_modified:
  - prisma/schema.prisma
  - prisma/migrations/20260512_phase44_telemetry/migration.sql
  - src/lib/ai/pricing.ts
  - src/lib/ai/pricing.test.ts
  - src/lib/ai/pipeline.ts
  - src/lib/ai/pipeline.test.ts
  - src/lib/admin/cost-format.ts
  - src/lib/admin/cost-format.test.ts
  - src/lib/admin/cost-dal.ts
  - src/lib/admin/cost-dal.test.ts
  - src/lib/admin/articles-actions.ts
  - src/lib/admin/articles-actions.test.ts
  - src/app/(admin)/admin/articles/page.tsx
  - src/app/(admin)/admin/articles/ArticleRow.tsx
  - src/app/(admin)/admin/cost/page.tsx
  - src/app/(admin)/layout.tsx
  - PROGRESS.md
autonomous: true
requirements: [TLM-01, TLM-02, TLM-03, TLM-04]

must_haves:
  truths:
    - "Every WRITTEN or PUBLISHED article produced after this phase has aiInputTokens, aiOutputTokens, aiCostUsd, and aiModel populated (NULL only on pre-v3.2 rows)"
    - "Admin can open the articles list, sort by aiCostUsd descending, and read the source name next to each cost figure"
  artifacts:
    - path: "prisma/migrations/20260512_phase44_telemetry/migration.sql"
      provides: "Schema delta: Article.aiInputTokens/aiCachedInputTokens/aiOutputTokens/aiCostUsd Decimal(10,6)/aiModel/aiProcessedAt + PipelineRun.totalCachedInputTokens"
      contains: "ALTER TABLE \"Article\""
    - path: "src/lib/ai/pricing.ts"
      provides: "Pure computeCostUsd helper, Haiku 4.5 rates incl. cache-read/write modifiers + batch discount"
      exports: ["computeCostUsd", "HAIKU_4_5_PER_M"]
    - path: "src/lib/admin/cost-format.ts"
      provides: "formatEur + getEurPerUsd (hybrid: hardcoded constant + opportunistic frankfurter.dev refresh)"
      exports: ["formatEur", "getEurPerUsd", "HARDCODED_EUR_PER_USD"]
    - path: "src/lib/admin/cost-dal.ts"
      provides: "getCostAggregates DAL for /admin/cost page"
      exports: ["getCostAggregates"]
    - path: "src/app/(admin)/admin/cost/page.tsx"
      provides: "Per-source + per-day aggregate page with totals strip"
      min_lines: 40
  key_links:
    - from: "src/lib/ai/pipeline.ts"
      to: "src/lib/ai/pricing.ts"
      via: "computeCostUsd called once before final $transaction; result written into article.update data block (single update, all six telemetry columns)"
      pattern: "computeCostUsd\\("
    - from: "src/lib/admin/articles-actions.ts"
      to: "Article.aiCostUsd (Prisma orderBy)"
      via: "listArticlesAdmin opts.sortBy === 'cost' switches orderBy to [{ aiCostUsd: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }]"
      pattern: "sortBy.*cost"
    - from: "src/app/(admin)/admin/articles/page.tsx"
      to: "src/app/(admin)/admin/articles/ArticleRow.tsx"
      via: "?sort=cost URL param read in page.tsx → passed to listArticlesAdmin → Kosten cell rendered by ArticleRow between Quelle and Datum; aiCostUsd Decimal → .toNumber() at Server→Client boundary"
      pattern: "sort.*cost|Kosten"
    - from: "src/app/(admin)/layout.tsx"
      to: "/admin/cost"
      via: "navItems append { href: '/admin/cost', label: 'Kosten' }"
      pattern: "/admin/cost"
---

> **⚠️ DEFERRED — 2026-05-12 (post v3.2 merged-call closure)**
>
> This plan was drafted on the assumption that the merged single-call AI path
> (Phase 43) is the live production path. As of 2026-05-12 the merged path is
> rolled back to legacy (`AI_USE_MERGED_CALL=false` on Vercel, see DECISIONS.md
> closure entry 2026-05-12). Executing this plan as drafted would leave every
> production article's `aiCostUsd` NULL (line 256: "Telemetry only on merged
> path. The legacy two-step path … does NOT populate telemetry.") — the
> `/admin/cost` page would render empty.
>
> **Action before executing:** re-plan via `/gsd:plan-phase` with the
> legacy-is-live context so telemetry covers both paths (legacy
> `step1.inputTokens + step2.inputTokens` + output tokens, no cache-read
> tokens on legacy). The rest of the plan (admin UI, cost-format, cost-dal,
> EUR FX helper) is reusable.
>
> Do NOT run `/gsd:execute-phase 44` against this plan as drafted.

---

<objective>
Add per-article AI cost telemetry: six new nullable columns on Article + one new column on PipelineRun, populated atomically inside the merged-call final $transaction in pipeline.ts. Surface cost in the admin UI as a sortable Kosten column on /admin/articles plus a dedicated /admin/cost aggregate page with per-source and per-day breakdowns.

Purpose: Without per-article cost data, the operator cannot see which sources/articles dominate the AI bill, and cannot make cost-quality tradeoffs. Telemetry is also the prerequisite for v3.3 cost-aware circuit-breaker work (AIPL-FUTURE-05).

Output: Schema migration + pure pricing helper + cost-format helper + cost-dal + sortable articles list + /admin/cost page. No batches code (that's 44-03). No ingest changes (that's 44-04).
</objective>

<execution_context>
@/Users/philipp/.claude/get-shit-done/workflows/execute-plan.md
@/Users/philipp/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/44-cost-telemetry-adapter-hardening/44-CONTEXT.md
@.planning/phases/44-cost-telemetry-adapter-hardening/44-RESEARCH.md
@.planning/phases/44-cost-telemetry-adapter-hardening/44-VALIDATION.md
@AGENTS.md
@prisma/schema.prisma
@src/lib/ai/pipeline.ts
@src/lib/ai/steps/merged.ts
@src/lib/admin/articles-actions.ts
@src/app/(admin)/admin/articles/page.tsx
@src/app/(admin)/admin/articles/ArticleRow.tsx
@src/app/(admin)/layout.tsx

<interfaces>
<!-- Key types/contracts executor needs. Extracted from codebase. -->

From src/lib/ai/steps/merged.ts (Phase 43 — interface this plan reads from):
```typescript
export interface MergedResult {
  bezirkSlugs: string[]
  isStateWide: boolean
  mentionsPrivateIndividual: boolean
  headline: string
  lead: string
  body: string
  seoTitle: string
  metaDescription: string
  inputTokens: number          // fresh input
  cachedInputTokens: number    // cache reads
  cacheCreationTokens: number  // cache writes
  outputTokens: number
}
```

From src/lib/ai/pipeline.ts (Phase 43 — final $transaction at lines 253-275 is where telemetry columns get written):
```typescript
export interface ProcessResult {
  articlesProcessed: number
  articlesWritten: number
  totalInputTokens: number
  totalCachedInputTokens: number   // Phase 43 left this in-memory; this plan persists it
  totalOutputTokens: number
}
// DI pattern (replicate verbatim in any new module that touches db):
//   if (clientOrX !== null && typeof clientOrX === 'object' && '$connect' in clientOrX) { db = clientOrX } else { db = defaultPrisma }
```

From src/lib/admin/articles-actions.ts:43-51 (extend this interface):
```typescript
export interface ListArticlesAdminOptions {
  bezirkId?: number
  sourceType?: ArticleSource
  status?: ArticleStatus | ArticleStatus[]
  fromDate?: Date
  toDate?: Date
  limit?: number
  offset?: number
  // NEW (this plan):
  sortBy?: 'date' | 'cost'
}
```

Haiku 4.5 pricing constants (from research § Pricing helper, USD per 1M tokens; numbers verified 2026-05-12):
```
input:        $1.00 / 1M
cacheRead:    $0.10 / 1M       (90% off input — applies to cachedInputTokens)
cacheWrite5m: $1.25 / 1M       (1.25× input)
cacheWrite1h: $2.00 / 1M       (2.0× input)
output:       $5.00 / 1M
batchDiscount: 0.5  (50% off ALL fields when isBatch=true)
```

EUR FX (hybrid strategy):
```
HARDCODED_EUR_PER_USD = 0.92   // ECB indicative 2026-05-12, in src/lib/admin/cost-format.ts
Refresh URL: https://api.frankfurter.dev/v2/rates?base=USD&quotes=EUR
Refresh timeout: 3s AbortController; on failure → fallback to hardcoded constant
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: feat(44-01): schema migration + pure pricing helper</name>
  <files>prisma/schema.prisma, prisma/migrations/20260512_phase44_telemetry/migration.sql, src/lib/ai/pricing.ts, src/lib/ai/pricing.test.ts</files>
  <behavior>
    Pricing helper unit tests (table-driven, RED first):
    - Test 1: 1000 input + 0 cache + 500 output Haiku non-batch → 0.001 × 1.00 + 0.0005 × 5.00 = 0.0035 USD (returned as Decimal('0.003500'))
    - Test 2: same inputs with isBatch=true → 0.5 × 0.0035 = 0.00175 USD
    - Test 3: 1000 cachedInputTokens (cache read) at 0.10/M → 0.0001 USD
    - Test 4: 1000 cacheCreationTokens with cacheTtl='5m' at 1.25/M → 0.00125 USD; with '1h' at 2.00/M → 0.002 USD
    - Test 5: unknown model logs console.warn (vi.spyOn) and uses Haiku rates anyway
    - Test 6: result is a Decimal instance (instanceof Decimal from @prisma/client/runtime/library)
    - Test 7: result fixed to 6 decimal places (matches Decimal(10,6) column precision)
  </behavior>
  <action>
    1. **Add Article telemetry columns to prisma/schema.prisma**: append inside `model Article { ... }`:
       ```
       aiInputTokens         Int?
       aiCachedInputTokens   Int?
       aiOutputTokens        Int?
       aiCostUsd             Decimal? @db.Decimal(10, 6)
       aiModel               String?
       aiProcessedAt         DateTime?
       ```
       Add inside `model PipelineRun { ... }`:
       ```
       totalCachedInputTokens Int?
       ```
       All nullable so existing rows remain valid (per REQUIREMENTS: backfill explicitly out of scope, NULL = "pre-telemetry").

    2. **Run `npx prisma migrate dev --name phase44_telemetry --create-only`** to generate the migration folder, then verify the generated `prisma/migrations/20260512_phase44_telemetry/migration.sql` is ALTER-only (no DROP, no DML). If timestamp differs, rename folder to `20260512_phase44_telemetry`. Then `npx prisma migrate dev` (apply) and `npx prisma generate`.

    3. **Create `src/lib/ai/pricing.test.ts` FIRST (RED).** Table-driven test covering all seven behaviors above. Import Decimal from `@prisma/client/runtime/library`. Use `vi.spyOn(console, 'warn').mockImplementation(() => {})` for Test 5.

    4. **Create `src/lib/ai/pricing.ts` to pass tests (GREEN):**
       - Export `HAIKU_4_5_PER_M` constants (input 1.00, cacheRead 0.10, cacheWrite5m 1.25, cacheWrite1h 2.00, output 5.00 — USD per million tokens).
       - Export `interface PricingInput { inputTokens, cachedInputTokens, cacheCreationTokens, outputTokens, model, isBatch, cacheTtl: '5m' | '1h' }`.
       - Export `computeCostUsd(p: PricingInput): Decimal`. Math: `(input × 1.00 + cachedInput × 0.10 + cacheCreation × writeRate + output × 5.00) / 1_000_000`, then × 0.5 if isBatch, then `new Decimal(final.toFixed(6))`.
       - `if (!p.model.includes('haiku')) console.warn(\`[pricing] Unknown model \${p.model}, using Haiku 4.5 rates\`)` — only known case (model mismatch), do NOT wrap rest in try/catch (AGENTS.md anti-bloat rule).
       - No new npm deps. Use Decimal directly from `@prisma/client/runtime/library` (already bundled).

    5. **Pure function, no DI.** Pricing helper does not touch DB.

    Why per requirement: TLM-01 (schema), TLM-02 (cost math is prerequisite for populating aiCostUsd in Task 2).
  </action>
  <verify>
    <automated>npx prisma generate &amp;&amp; npm test -- pricing.test</automated>
  </verify>
  <done>
    Migration file `prisma/migrations/20260512_phase44_telemetry/migration.sql` applied (visible in `npx prisma migrate status`). Article model has six new nullable telemetry columns + PipelineRun has totalCachedInputTokens. `src/lib/ai/pricing.test.ts` passes all seven cases. computeCostUsd returns Decimal at 6dp precision. Conventional commit message: `feat(44-01): add article telemetry schema + pricing helper`.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: feat(44-01): populate telemetry in pipeline final $transaction + persist totalCachedInputTokens</name>
  <files>src/lib/ai/pipeline.ts, src/lib/ai/pipeline.test.ts</files>
  <behavior>
    Add pipeline test cases (extend existing src/lib/ai/pipeline.test.ts):
    - Test "populates telemetry on WRITTEN": after merged-call mock returns {inputTokens:500, cachedInputTokens:200, cacheCreationTokens:100, outputTokens:300}, the updated Article row has aiInputTokens=600 (input + cacheCreation per AIPL-05 convention), aiCachedInputTokens=200, aiOutputTokens=300, aiCostUsd ≈ computeCostUsd({...}, isBatch:false, cacheTtl:'5m'), aiModel='claude-haiku-4-5-20251001' (or resolvedConfig.modelOverride), aiProcessedAt is a Date.
    - Test "populates telemetry on REVIEW": same expectations when finalStatus='REVIEW' (mentionsPrivateIndividual=true).
    - Test "persists totalCachedInputTokens to PipelineRun": after run, db.pipelineRun.findUnique({where:{id:run.id}}).totalCachedInputTokens equals sum of cachedInputTokens across all articles processed in run.
    - Test "telemetry columns NOT set on ERROR path": if merged-call throws, Article.aiCostUsd remains null (no partial write).
  </behavior>
  <action>
    1. **Extend `src/lib/ai/pipeline.test.ts` FIRST (RED)** with the four behavior assertions above. The merged-call mock pattern already exists in the file (Phase 43 added it) — copy that shape. Use pglite db setup from `src/test/setup-db.ts`. Assert via `db.article.findUnique({where:{id}})` and `db.pipelineRun.findUnique({where:{id:run.id}})`.

    2. **Modify `src/lib/ai/pipeline.ts` final $transaction block (lines 253-275 of current file — re-read to confirm line numbers before editing).** Add six columns to the single existing `article.update` data block (no second update):
       ```typescript
       // Compute cost BEFORE the $transaction call:
       const resolvedModel = /* read from resolvedConfig.modelOverride or runMergedCall — see merged.ts; default 'claude-haiku-4-5-20251001' */
       const aiCostUsd = computeCostUsd({
         inputTokens: merged.inputTokens,
         cachedInputTokens: merged.cachedInputTokens,
         cacheCreationTokens: merged.cacheCreationTokens,
         outputTokens: merged.outputTokens,
         model: resolvedModel,
         isBatch: false,                    // 44-03 will introduce true for batch path
         cacheTtl: '5m',                    // merged.ts uses default 5min cache; 44-03 switches to '1h' for batches
       })
       // Then inside the existing db.article.update data block, add:
       aiInputTokens:        merged.inputTokens + merged.cacheCreationTokens,  // AIPL-05 convention: fresh + cache writes
       aiCachedInputTokens:  merged.cachedInputTokens,
       aiOutputTokens:       merged.outputTokens,
       aiCostUsd,                          // Decimal
       aiModel:              resolvedModel,
       aiProcessedAt:        new Date(),
       ```
       Import `computeCostUsd` from `../pricing` (relative path).

    3. **Persist totalCachedInputTokens to PipelineRun:** modify the `pipelineRun.update` call at lines 418-427 (re-read for line numbers) to add `totalCachedInputTokens` alongside the existing fields. The variable is already tracked in-memory (`totalCachedInputTokens += merged.cachedInputTokens` at line ~187 — Phase 43 already does this).

    4. **Telemetry only on merged path.** The legacy two-step path at lines 281-411 does NOT populate telemetry. Comment confirms: legacy path is deprecated post-v3.3.

    5. **Resolve model name:** read from `resolvedConfig` if available (see merged.ts for how it computes the effective config from AiSourceConfig + AiConfig). Fallback: `'claude-haiku-4-5-20251001'`. If merged.ts already exposes `resolvedConfig.modelOverride`, use that. Otherwise hardcode the default (single-model project today).

    6. **Per-article try/catch (lines ~393-411) stays as-is.** On error the Article.update happens via a separate path that does NOT set telemetry columns — correct (telemetry only on success).

    7. **No new npm deps.** No JSX changes here.

    Why per requirement: TLM-02 (populate six columns), Open Question #4 resolution (persist totalCachedInputTokens — research recommends YES).
  </action>
  <verify>
    <automated>npm test -- pipeline.test</automated>
  </verify>
  <done>
    `npm test -- pipeline.test` passes all four new cases plus the existing 34/34 from Phase 43. Article rows after merged-call have all six telemetry columns set. PipelineRun row has totalCachedInputTokens persisted. Conventional commit: `feat(44-01): populate article cost telemetry in pipeline transaction`.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: feat(44-01): cost-format + cost-dal helpers (pure + pglite)</name>
  <files>src/lib/admin/cost-format.ts, src/lib/admin/cost-format.test.ts, src/lib/admin/cost-dal.ts, src/lib/admin/cost-dal.test.ts</files>
  <behavior>
    cost-format.test.ts (pure unit, RED first):
    - Test 1: `formatEur(null, 0.92, 'precise')` → '—'
    - Test 2: `formatEur(undefined, 0.92, 'display')` → '—'
    - Test 3: `formatEur(0.0012, 0.92, 'precise')` → matches /€\s?0,0011/ (de-AT locale, 4 decimals, USD × 0.92)
    - Test 4: `formatEur(1.234, 0.92, 'display')` → matches /€\s?1,14/ (2 decimals)
    - Test 5: `getEurPerUsd()` with `vi.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ rates: { EUR: 0.91 } }) } as any)` → returns 0.91
    - Test 6: `getEurPerUsd()` with fetch throwing → returns HARDCODED_EUR_PER_USD (0.92)
    - Test 7: `getEurPerUsd()` with fetch returning `{ ok: false }` → returns 0.92
    - Test 8: `getEurPerUsd()` with fetch timeout (vi.useFakeTimers + advance 3001ms) → returns 0.92

    cost-dal.test.ts (pglite integration, RED first):
    - Test 1: `getCostAggregates(db, {})` returns `{ perSource: [], perDay: [] }` on empty DB
    - Test 2: 3 Articles in 2 sources with aiCostUsd set → perSource has 2 entries summing correctly, articleCount accurate
    - Test 3: NULL aiCostUsd articles are excluded from sums (Prisma _sum naturally ignores NULL)
    - Test 4: perDay returns one row per distinct day in window (default last 30d), sorted date desc
    - Test 5: Sources without name field render with URL-host fallback (e.g. 'ots.at') in sourceLabel
  </behavior>
  <action>
    1. **Create `src/lib/admin/cost-format.test.ts` FIRST (RED)** with eight cases above. Use `vi.spyOn(global, 'fetch')`. For timeout test, mock fetch to reject with AbortError via `new Promise((_, reject) => setTimeout(() => reject(new Error('aborted')), 5000))` and use `vi.useFakeTimers` / `vi.advanceTimersByTime(3001)`.

    2. **Create `src/lib/admin/cost-format.ts` (GREEN):**
       ```typescript
       export const HARDCODED_EUR_PER_USD = 0.92  // ECB indicative 2026-05-12
       const EUR_PRECISE = new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 4, maximumFractionDigits: 4 })
       const EUR_DISPLAY = new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })

       export function formatEur(usd: number | null | undefined, eurPerUsd: number, mode: 'precise' | 'display'): string {
         if (usd == null) return '—'
         return (mode === 'precise' ? EUR_PRECISE : EUR_DISPLAY).format(usd * eurPerUsd)
       }

       export async function getEurPerUsd(): Promise<number> {
         const ctrl = new AbortController()
         const t = setTimeout(() => ctrl.abort(), 3_000)
         try {
           const res = await fetch('https://api.frankfurter.dev/v2/rates?base=USD&quotes=EUR', { signal: ctrl.signal })
           if (!res.ok) return HARDCODED_EUR_PER_USD
           const data = await res.json() as { rates?: { EUR?: number } }
           return data.rates?.EUR ?? HARDCODED_EUR_PER_USD
         } catch {
           return HARDCODED_EUR_PER_USD
         } finally {
           clearTimeout(t)
         }
       }
       ```
       This try/catch is permitted under AGENTS.md because the error case is known (network failure / parse failure / abort). DO NOT also try/catch around `setTimeout` or `clearTimeout` — those don't throw.

    3. **Create `src/lib/admin/cost-dal.test.ts` FIRST (RED)** with five pglite cases above. Use `createTestDb()` from `src/test/setup-db.ts`. Insert Source rows via `db.source.create({...})`, Article rows via `db.article.create({ data: { source: 'OTS_AT', sourceId, status: 'WRITTEN', aiCostUsd: new Decimal('0.001234') } })`.

    4. **Create `src/lib/admin/cost-dal.ts` (GREEN):**
       ```typescript
       // Standard DI overloads (per AGENTS.md duck-typing pattern):
       export async function getCostAggregates(opts?: GetCostAggregatesOptions): Promise<CostAggregates>
       export async function getCostAggregates(db: PrismaClient, opts?: GetCostAggregatesOptions): Promise<CostAggregates>
       export async function getCostAggregates(dbOrOpts?: ...) { ... duck-type via '$connect' in dbOrOpts ... }

       export interface GetCostAggregatesOptions {
         windowDays?: number   // default 30
       }
       export interface CostAggregates {
         perSource: Array<{ sourceId: number | null; sourceLabel: string; totalUsd: number; articleCount: number }>
         perDay:    Array<{ date: string; totalUsd: number; articleCount: number }>
         totals:    { last24h: number; last7d: number; last30d: number }
       }
       ```
       Implementation:
       - `perSource`: `db.article.groupBy({ by: ['sourceId'], where: { aiProcessedAt: { gte: windowStart } }, _sum: { aiCostUsd: true }, _count: { _all: true } })`. Then look up each Source via `db.source.findMany({ where: { id: { in: ids } } })` to map sourceId → URL host (use `new URL(source.url).host` as sourceLabel; fallback to `source.type`).
       - `perDay`: use `db.$queryRaw` (Prisma groupBy doesn't support DATE_TRUNC). SQL:
         ```sql
         SELECT DATE_TRUNC('day', "aiProcessedAt")::date AS date,
                COALESCE(SUM("aiCostUsd"), 0)::float8 AS "totalUsd",
                COUNT(*)::int AS "articleCount"
         FROM "Article"
         WHERE "aiProcessedAt" >= $1
         GROUP BY DATE_TRUNC('day', "aiProcessedAt")
         ORDER BY date DESC
         ```
       - `totals`: three `db.article.aggregate({ _sum: { aiCostUsd: true }, where: { aiProcessedAt: { gte: ... } } })` queries (24h, 7d, 30d windows). Defensive `result._sum.aiCostUsd ?? new Decimal(0)` (research pitfall #9). Return `.toNumber()` so Server→Client boundary stays clean.
       - **CRITICAL: Always convert Decimal to number with `.toNumber()` before returning** (research pitfall #1: Decimal does NOT cross Server→Client boundary).

    5. No new npm deps.

    Why per requirement: TLM-03b (formatEur is the pure helper that replaces a JSX-test; no RTL needed per AGENTS.md anti-bloat); TLM-04 (cost-dal aggregates).
  </action>
  <verify>
    <automated>npm test -- cost-format.test cost-dal.test</automated>
  </verify>
  <done>
    Both test files green. `formatEur` returns valid de-AT EUR strings; `getEurPerUsd` falls back to hardcoded constant on failure. `getCostAggregates` returns serializable shapes (no Decimal in the output). Conventional commit: `feat(44-01): add cost-format and cost-dal helpers`.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: feat(44-01): sortable Kosten column on /admin/articles + listArticlesAdmin sortBy</name>
  <files>src/lib/admin/articles-actions.ts, src/lib/admin/articles-actions.test.ts, src/app/(admin)/admin/articles/page.tsx, src/app/(admin)/admin/articles/ArticleRow.tsx</files>
  <behavior>
    Extend src/lib/admin/articles-actions.test.ts:
    - Test "sortBy cost orders by aiCostUsd desc with nulls last": insert 3 Articles with aiCostUsd 0.01/0.001/null → `listArticlesAdmin(db, { sortBy: 'cost' })` returns the 0.01 article first, 0.001 second, null last.
    - Test "sortBy default falls back to publishedAt desc": no sortBy → existing orderBy preserved.
    - Test "sortBy date is identical to no sortBy": explicit `sortBy: 'date'` matches default behavior.
  </behavior>
  <action>
    1. **Extend articles-actions.test.ts FIRST (RED)** with three assertions above. Use pglite db. Three Articles with distinct aiCostUsd (including null). Assert returned order.

    2. **Modify `src/lib/admin/articles-actions.ts`:**
       - Add `sortBy?: 'date' | 'cost'` to `ListArticlesAdminOptions` (line ~50).
       - Destructure `sortBy` in `listArticlesAdmin` body (around line ~200).
       - Switch orderBy:
         ```typescript
         const orderBy =
           opts.sortBy === 'cost'
             ? [{ aiCostUsd: { sort: 'desc' as const, nulls: 'last' as const } }, { id: 'desc' as const }]
             : [{ publishedAt: 'desc' as const }, { createdAt: 'desc' as const }]
         ```
       - Replace existing `orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }]` at line ~223 with the variable.

    3. **Modify `src/app/(admin)/admin/articles/page.tsx`:**
       - Add `sort?: string` to `SearchParams` interface (line ~12).
       - After awaiting `searchParams`, compute `const sortBy: 'cost' | 'date' = params.sort === 'cost' ? 'cost' : 'date'`.
       - Pass `sortBy` to `listArticlesAdmin({...})` call (line ~37).
       - **Add Kosten <th> between Quelle and Datum** (line ~95):
         ```tsx
         <th className="px-4 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wide font-label">
           <Link href={`?${buildSortQuery(params, sortBy === 'cost' ? 'date' : 'cost')}`} className="hover:underline">
             Kosten {sortBy === 'cost' ? '↓' : ''}
           </Link>
         </th>
         ```
       - Add tiny pure helper `buildSortQuery(params, nextSort)` inside this file (no separate module) that constructs the URLSearchParams with the new `sort` value (and preserves all other filters, mirrors existing `buildPageUrl` at line ~52).
       - Fetch EUR rate: `const eurPerUsd = await getEurPerUsd()` (top of function, parallel with `listArticlesAdmin` via Promise.all — extend the existing Promise.all). Pass to `<ArticleRow eurPerUsd={eurPerUsd} ... />`.
       - **CRITICAL Decimal serialization:** when passing articles to ArticleRow (Client Component), the `aiCostUsd Decimal` must be converted. Define inline at the map step: `articles.map((a) => <ArticleRow key={a.id} article={{...a, aiCostUsd: a.aiCostUsd?.toNumber() ?? null}} eurPerUsd={eurPerUsd} />)`. Research pitfall #1 — Decimal CANNOT cross Server→Client.

    4. **Modify `src/app/(admin)/admin/articles/ArticleRow.tsx`:**
       - Update `ArticleRowProps` to `{ article: ArticleWithBezirke & { aiCostUsd: number | null }, eurPerUsd: number }`. (Or: define a new local type `ArticleAdminListItem = Omit<ArticleWithBezirke, 'aiCostUsd'> & { aiCostUsd: number | null }`.)
       - Import `formatEur` from `@/lib/admin/cost-format`.
       - Insert a new `<td>` between Quelle and Datum (after line ~80, before line ~81):
         ```tsx
         <td className="px-4 py-3 text-sm text-ink-muted tabular-nums">
           {formatEur(article.aiCostUsd, eurPerUsd, 'precise')}
         </td>
         ```
       - Reuse Wurzelwelt tokens (`text-ink-muted`, etc.) — no new design tokens.

    5. **Type update for ArticleWithBezirke:** check `src/lib/content/articles.ts` — Prisma regenerates the type after `prisma generate` in Task 1, so the new aiCostUsd field is automatically on `ArticleWithBezirke`. Confirm by running `npx tsc --noEmit` after editing.

    6. No new npm deps.

    Why per requirement: TLM-03 (Kosten column + sort param + source attribution); TLM-03b (Decimal→number boundary).
  </action>
  <verify>
    <automated>npm test -- articles-actions.test &amp;&amp; npx tsc --noEmit</automated>
  </verify>
  <done>
    `articles-actions.test` passes new sortBy cases. `npx tsc --noEmit` clean. Visit `/admin/articles` locally: Kosten column appears between Quelle and Datum, clicking header sets `?sort=cost`, articles re-order by cost desc, NULL costs sink to bottom. No Decimal-serialization errors in console. Conventional commit: `feat(44-01): add sortable Kosten column to admin articles`.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 5: feat(44-01): /admin/cost page + nav entry</name>
  <files>src/app/(admin)/admin/cost/page.tsx, src/app/(admin)/layout.tsx</files>
  <behavior>
    No new test file — `getCostAggregates` is unit-tested in Task 3; this task is layout/composition only (manually verified per VALIDATION.md Manual-Only #2). `npx tsc --noEmit` must pass.
  </behavior>
  <action>
    1. **Create `src/app/(admin)/admin/cost/page.tsx`** as an async Server Component:
       ```tsx
       import { getCostAggregates } from '@/lib/admin/cost-dal'
       import { formatEur, getEurPerUsd } from '@/lib/admin/cost-format'

       export const dynamic = 'force-dynamic'   // per AGENTS.md: any page that reads DB

       export default async function CostPage() {
         const [aggregates, eurPerUsd] = await Promise.all([
           getCostAggregates({ windowDays: 30 }),   // production overload, no db arg
           getEurPerUsd(),
         ])

         return (
           <div>
             <h1 className="text-2xl font-bold text-ink font-headline mb-6">Kosten</h1>

             {/* Totals strip */}
             <div className="grid grid-cols-3 gap-4 mb-8">
               <TotalCard label="Heute" usd={aggregates.totals.last24h} eurPerUsd={eurPerUsd} />
               <TotalCard label="Letzte 7 Tage" usd={aggregates.totals.last7d} eurPerUsd={eurPerUsd} />
               <TotalCard label="Letzte 30 Tage" usd={aggregates.totals.last30d} eurPerUsd={eurPerUsd} />
             </div>

             {/* Per-source table */}
             <section className="bg-surface-elevated rounded-sm p-4 mb-6">
               <h2 className="text-lg font-semibold text-ink mb-3">Pro Quelle</h2>
               <table className="w-full text-left">
                 <thead className="bg-surface">
                   <tr>
                     <th className="px-3 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wide font-label">Quelle</th>
                     <th className="px-3 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wide font-label">Artikel</th>
                     <th className="px-3 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wide font-label text-right">Kosten</th>
                   </tr>
                 </thead>
                 <tbody>
                   {aggregates.perSource.map((row) => (
                     <tr key={row.sourceId ?? 'unknown'} className="border-b border-surface">
                       <td className="px-3 py-2 text-sm text-ink">{row.sourceLabel}</td>
                       <td className="px-3 py-2 text-sm text-ink-muted">{row.articleCount}</td>
                       <td className="px-3 py-2 text-sm text-ink-muted tabular-nums text-right">{formatEur(row.totalUsd, eurPerUsd, 'display')}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </section>

             {/* Per-day table */}
             <section className="bg-surface-elevated rounded-sm p-4">
               <h2 className="text-lg font-semibold text-ink mb-3">Letzte 30 Tage</h2>
               <table className="w-full text-left">
                 <thead className="bg-surface">
                   <tr>
                     <th className="px-3 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wide font-label">Datum</th>
                     <th className="px-3 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wide font-label">Artikel</th>
                     <th className="px-3 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wide font-label text-right">Kosten</th>
                   </tr>
                 </thead>
                 <tbody>
                   {aggregates.perDay.map((row) => (
                     <tr key={row.date} className="border-b border-surface">
                       <td className="px-3 py-2 text-sm text-ink">{new Date(row.date).toLocaleDateString('de-AT')}</td>
                       <td className="px-3 py-2 text-sm text-ink-muted">{row.articleCount}</td>
                       <td className="px-3 py-2 text-sm text-ink-muted tabular-nums text-right">{formatEur(row.totalUsd, eurPerUsd, 'display')}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </section>
           </div>
         )
       }

       function TotalCard({ label, usd, eurPerUsd }: { label: string; usd: number; eurPerUsd: number }) {
         return (
           <div className="bg-surface-elevated rounded-sm p-4">
             <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide font-label mb-2">{label}</p>
             <p className="text-2xl font-headline text-ink tabular-nums">{formatEur(usd, eurPerUsd, 'display')}</p>
           </div>
         )
       }
       ```
       Reuse existing Wurzelwelt/Archivist tokens (bg-surface, text-ink, font-headline) — no new design tokens, no new fonts.

    2. **Modify `src/app/(admin)/layout.tsx`** (line 8): append to `navItems`:
       ```typescript
       { href: '/admin/cost', label: 'Kosten' },
       ```

    3. **Auth:** the route is under `(admin)` group, which already gates via `verifySessionCookie` in layout.tsx (line 18). No additional auth check needed. CONTEXT.md confirms: page is read-only, no Server Action surface, no new auth pattern. AGENTS.md Auth rule satisfied (cookie-based + auth-node import already on layout).

    4. No JSX testing (per AGENTS.md anti-bloat: no @testing-library/react). Manual verification per VALIDATION.md Manual-Only #2.

    5. No new npm deps.

    Why per requirement: TLM-04 (per-source/per-day aggregates page); operator-visible "view per-source / per-day cost aggregates".
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
    <manual>Run `npm run dev`, navigate to /admin/cost. Confirm: (a) totals strip shows three cards (Heute / Letzte 7 Tage / Letzte 30 Tage); (b) Pro Quelle table renders one row per active source with URL-host label, article count, EUR total; (c) Letzte 30 Tage table renders one row per day in descending date order; (d) navigating from /admin/articles, the "Kosten" link appears in the sidebar nav. (Operator sign-off in PROGRESS.md.)</manual>
  </verify>
  <done>
    /admin/cost renders without runtime errors. Nav entry visible. TSC clean. Conventional commit: `feat(44-01): add admin cost page and nav entry`.
  </done>
</task>

</tasks>

<verification>
After all tasks: full suite `npm test` green AND `npx tsc --noEmit` clean AND `npx prisma migrate status` shows phase44_telemetry applied. Manual smoke per Task 5 manual block. PROGRESS.md updated with all commits.
</verification>

<success_criteria>
- Migration `20260512_phase44_telemetry` applied; Article has six telemetry columns, PipelineRun has totalCachedInputTokens
- `npm test -- pricing.test cost-format.test cost-dal.test pipeline.test articles-actions.test` all green
- /admin/articles renders Kosten column between Quelle and Datum; ?sort=cost re-orders by aiCostUsd desc nulls last
- /admin/cost renders per-source + per-day aggregate tables + totals strip
- No Decimal-serialization errors in browser console
- PROGRESS.md has five commits logged
</success_criteria>

<output>
After completion, create `.planning/phases/44-cost-telemetry-adapter-hardening/44-01-SUMMARY.md` per `~/.claude/get-shit-done/templates/summary.md`. Include in SUMMARY: confirmed pricing constants (Haiku 4.5 rates as of 2026-05-12), the resolved-config plumbing chosen for `aiModel`, and any DECISIONS.md entry triggered (none expected — no new npm deps).
</output>
