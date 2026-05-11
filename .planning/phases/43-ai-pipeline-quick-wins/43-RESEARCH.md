# Phase 43: AI Pipeline Quick Wins — Research

**Researched:** 2026-05-11
**Domain:** Anthropic SDK (tool_use, prompt caching), TypeScript AI pipeline refactoring
**Confidence:** HIGH — spec is fully drafted; research confirms implementation details from live code

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Flag-gated fallback for one milestone: env var `AI_USE_MERGED_CALL`, default `'true'`. Toggle = redeploy (no admin UI, no DB column).
- `pipeline.ts` branches inside the per-article loop on this flag: `'true'` → `runMergedCall`, `'false'` → existing `runStep1Tag` + `runStep2Write` path.
- `pipeline.ts` is modified in place; do NOT extract a `processOneArticle` helper.
- `step1-tag.ts`, `step2-write.ts`, `step1-tag.test.ts`, `step2-write.test.ts`, `step2-write-source-override.test.ts` stay in tree until v3.3 cleanup phase.
- Fixture corpus: 20 fixtures (drafts ship 10 in `43-01-test-fixtures-DRAFT.md`; plan expands to 20).
- Pass bar: all 20 must satisfy `bodyMustContain` / `bodyMustNotContain` / classification invariants. Any single failure blocks cutover.
- Replay harness `scripts/ai-replay-fixtures.ts` runs once, manually, before merging the PR. No CI integration in this phase.
- Pre-merge token baseline: capture `totalInputTokens` / `totalOutputTokens` from `PipelineRun` for ~10 articles before PR merge.
- When `bezirkSlugs=[]` AND `isStateWide=false` → final status = `REVIEW`.
- Ship BOTH AIPL-07 (retry selector includes TAGGED) AND AIPL-10 (one-time SQL `UPDATE article SET status='FETCHED' WHERE status='TAGGED'`).
- One-time SQL is manual via Neon console / psql just before merging the PR.
- `TAGGED` becomes a deprecated enum value; kept in `schema.prisma` with a `// deprecated post-v3.2` comment.
- Single `tool_use` call with `tools: [{name, input_schema}] + tool_choice: {type:'tool', name:'publish_article'}`.
- All-German prompt.
- Combined schema: `{bezirkSlugs, isStateWide, mentionsPrivateIndividual, headline, lead, body, seoTitle, metaDescription}` (8 required fields).
- `max_tokens: 1024`; throw on `stop_reason === 'max_tokens'`.
- System sent as array of content blocks. Static prefix gets `cache_control: {type: 'ephemeral'}`. Dynamic suffix sits after, uncached.
- `isStateWide: boolean` replaces the `'steiermark-weit'` magic slug.
- `hasNamedPerson` → `mentionsPrivateIndividual` with current rules (Phase 45 sharpens).
- Per-source clean extractors: `src/lib/ai/extractors/ots.ts` and `src/lib/ai/extractors/rss.ts`. Default fallback: `[title, content].join('\n\n')`.
- Sum `llmLocationFallback` token usage into PipelineRun `totalInputTokens` / `totalOutputTokens` (AIPL-08).
- Anthropic SDK `maxRetries` set explicitly (AIPL-09).
- PipelineRun token accounting extended to include `cache_creation_input_tokens` (added to `totalInputTokens`) and `cache_read_input_tokens` (new running aggregate). PipelineRun column shape does NOT change.
- Side-by-side replay diff is the cutover gate.

### Claude's Discretion

- The 10 additional fixture topics (corpus expansion from 10 → 20).
- Replay-harness output format.
- Exact wording of the German prompt's static prefix — `43-01-merged-prompt-DRAFT.md` is the starting point.
- Plan breakdown / sequencing within Phase 43.
- Whether to wrap the per-article merged call write in a fresh `db.$transaction` or sequential awaits.
- Whether the `EXTRACTORS` registry pattern matches the existing `adapters/registry.ts` style.
- Replay-harness Anthropic spend budget.

### Deferred Ideas (OUT OF SCOPE)

- `Article.reviewReason` column — schema-free constraint.
- CI integration of the replay harness — Phase 45.
- Partial rollout per source — defer indefinitely.
- Runtime block on rollback while TAGGED rows exist — low-probability.
- Force editor to assign a Bezirk before publishing a no-relevance REVIEW article.
- Bezirk names instead of slugs to the LLM (manifest P3-TP-2) — defer to v3.3.
- Decoupled SEO pass (manifest C3) — defer to v3.3+.
- Source-quality back-feed (manifest C4) — defer.
- `p-limit(4)` concurrency (manifest B6) — Phase 44 fallback.
- Telemetry columns on Article — Phase 44.
- Batches API — Phase 44.
- REVIEW heuristic sharpening (officeholder exclusion) — Phase 45.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AIPL-01 | Single Anthropic call per article returning 8-field structured output via `runMergedCall` | `merged.ts` draft fully specifies the call shape; existing `step1-tag.ts` `buildBezirkContext` is the reuse anchor |
| AIPL-02 | Typed `tools:[{name, input_schema}] + tool_choice` — no `output_config as any` casts | Current `step1-tag.ts:109` and `step2-write.ts:119` both use the `as any` cast; `merged.ts` draft eliminates this |
| AIPL-03 | `max_tokens: 1024`; throw on `stop_reason === 'max_tokens'` | Draft specifies exact throw message; confirmed `step2-write.ts` currently uses `max_tokens: 512` without a guard |
| AIPL-04 | `cache_control: {"type": "ephemeral"}` on the static system prefix | Anthropic SDK `@0.80.0` supports `cache_control` on system content blocks; draft shows the two-block array pattern |
| AIPL-05 | PipelineRun totals include `cache_creation_input_tokens` and `cache_read_input_tokens` | `response.usage.cache_creation_input_tokens` and `cache_read_input_tokens` fields are SDK-typed; `pipeline.ts:124` is the token accumulation site |
| AIPL-06 | Per-source clean extractors — `EMITTENT`, `WEBLINK`, contact metadata never reach the prompt | `ots-at.ts:extractBody()` is the reuse anchor; `rss.ts` `rawPayload: item` / `rawPayload: entry` shapes are the RSS discriminator |
| AIPL-07 | TAGGED status included in AI retry selector | `pipeline.ts:95` currently selects `['FETCHED', 'ERROR']`; change to `['FETCHED', 'ERROR', 'TAGGED']` |
| AIPL-08 | `llmLocationFallback` token usage summed into PipelineRun totals | `locextract.ts:llmLocationFallback()` currently returns `string | null`, NOT token counts — function signature needs to change to return `{location: string | null, inputTokens: number, outputTokens: number}` |
| AIPL-09 | Anthropic SDK `maxRetries` set explicitly | `new Anthropic({maxRetries: 2})` at `pipeline.ts:99` — one-line change at client construction site |
| AIPL-10 | One-time migration converts in-flight `TAGGED` rows to `FETCHED` | Manual SQL: `UPDATE article SET status='FETCHED' WHERE status='TAGGED';` — run via Neon console before deploy |
</phase_requirements>

---

## Summary

Phase 43 is a focused, fully-specified refactoring of `src/lib/ai/pipeline.ts` and its dependencies. The authoritative implementation spec lives in `.planning/drafts/43-01-merged-prompt-DRAFT.md` (call shape, schema, prompt) and `.planning/drafts/43-01-test-fixtures-DRAFT.md` (20 fixtures, replay harness). Research has validated every implementation assumption against the live codebase.

The phase decomposes cleanly into four areas: (1) the merged call itself in `src/lib/ai/steps/merged.ts`, (2) prompt caching via `cache_control` on the static system prefix, (3) per-source clean extractors in `src/lib/ai/extractors/`, and (4) four accounting and orphan fixes in `pipeline.ts`. All changes are schema-free; `prisma db push` must be a no-op throughout.

**One finding not in the draft:** `llmLocationFallback()` in `src/lib/images/locextract.ts` currently returns `string | null`. AIPL-08 (sum those tokens into PipelineRun) requires changing its return type to `{location: string | null, inputTokens: number, outputTokens: number}`. This is a signature change that ripples into `pipeline.ts` and the existing mock setup in `pipeline.test.ts`.

**Primary recommendation:** Implement in four sequential plans matching the TEXT-ENGINE-OPTIMIZATION-PLAN proposal: 43-01 (merged call + fixture corpus), 43-02 (prompt caching), 43-03 (clean extractors), 43-04 (orphan + accounting fixes). The replay harness pre-merge gate belongs at the end of 43-01.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | `^0.80.0` (installed) | Anthropic API client | Already in use; `tool_use` + `cache_control` are both GA in this version |
| `vitest` | `^2.1.9` (installed) | Unit and integration tests | Established test framework; all existing step tests use it |
| `@prisma/client` | `^6.19.2` (installed) | Database access | Already in use; `db.$transaction` pattern established |
| `@electric-sql/pglite` + `pglite-prisma-adapter` | installed | In-process test DB | Already used in `pipeline.test.ts` and `setup-db.ts` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tsx` | `^4.21.0` (installed) | Run TypeScript scripts directly | `scripts/ai-replay-fixtures.ts` — `npx tsx scripts/ai-replay-fixtures.ts` |

### No New Dependencies Required

All Phase 43 changes use existing installed packages. Zero new `npm install` needed.

**Installation:**
```bash
# No new packages — all dependencies already installed
```

---

## Architecture Patterns

### Recommended Project Structure (additions only)

```
src/lib/ai/
├── steps/
│   ├── merged.ts          # NEW — runMergedCall() (replaces step1+step2 on flag path)
│   ├── step1-tag.ts       # KEEP (fallback path, remove in v3.3)
│   └── step2-write.ts     # KEEP (fallback path, remove in v3.3)
├── extractors/
│   ├── index.ts           # NEW — dispatch by ArticleSource enum
│   ├── ots.ts             # NEW — strips EMITTENT/WEBLINK/contact blocks
│   └── rss.ts             # NEW — pulls title + description/content by format
└── pipeline.ts            # MODIFIED in place — flag branch + accounting fixes

src/test/fixtures/
└── ai-merged/             # NEW — 20 fixture JSON files

scripts/
└── ai-replay-fixtures.ts  # NEW — manual pre-merge quality gate
```

### Pattern 1: Flag-Gated Branch in `pipeline.ts`

**What:** `AI_USE_MERGED_CALL` env var (default `'true'`) gates the per-article code path inside the existing `for (const article of articles)` loop.
**When to use:** Everywhere the merged path replaces the two-step path.

```typescript
// pipeline.ts — inside the per-article for loop, after articleText is built
const useMergedCall = (process.env.AI_USE_MERGED_CALL ?? 'true') === 'true'

if (useMergedCall) {
  // AIPL-01 merged path
  const merged = await runMergedCall(anthropicClient, articleText, allBezirke, db, article.sourceId ?? undefined)
  totalInputTokens += merged.inputTokens + merged.cacheCreationTokens
  totalCachedInputTokens += merged.cachedInputTokens
  totalOutputTokens += merged.outputTokens
  // ... db.$transaction([article.update, ...bezirkUpserts])
} else {
  // Existing step1 + step2 path (preserved verbatim)
}
```

### Pattern 2: `tool_use` Structured Output (replaces `output_config as any`)

**What:** Typed Anthropic tool-use path for structured JSON output.
**When to use:** `merged.ts` — the only new LLM call in this phase.

```typescript
// Source: .planning/drafts/43-01-merged-prompt-DRAFT.md
const response = await client.messages.create({
  model: resolvedConfig.modelOverride ?? 'claude-haiku-4-5-20251001',
  max_tokens: 1024,
  system: [
    { type: 'text', text: staticPrefix, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: dynamicSuffix },
  ],
  messages: [{ role: 'user', content: articleText }],
  tools: [{ name: 'publish_article', description: '...', input_schema: MERGED_OUTPUT_SCHEMA }],
  tool_choice: { type: 'tool', name: 'publish_article' },
})

if (response.stop_reason === 'max_tokens') {
  throw new Error('Merged AI call truncated: stop_reason=max_tokens ...')
}

const toolUse = response.content.find((b) => b.type === 'tool_use' && b.name === 'publish_article')
if (!toolUse || toolUse.type !== 'tool_use') {
  throw new Error('No tool_use block named "publish_article" in response')
}
const parsed = toolUse.input as MergedOutputType
```

### Pattern 3: Extractor Registry (mirrors `adapters/registry.ts`)

**What:** `Partial<Record<ArticleSource, ExtractorFn>>` keyed on the same `ArticleSource` enum used by `adapterRegistry`.
**When to use:** `extractors/index.ts` — dispatches to `ots.ts` or `rss.ts` based on `article.source`.

```typescript
// src/lib/ai/extractors/index.ts
import type { ArticleSource } from '@prisma/client'

export type ExtractorFn = (rawPayload: unknown, title?: string, content?: string) => string

export const extractorRegistry: Partial<Record<ArticleSource, ExtractorFn>> = {
  OTS_AT: extractOts,
  RSS: extractRss,
  // MANUAL: intentionally absent — falls through to default
}

export function extractArticleText(
  source: ArticleSource,
  rawPayload: unknown,
  title?: string,
  content?: string,
): string {
  const extractor = extractorRegistry[source]
  if (extractor) return extractor(rawPayload, title, content)
  // Default fallback for unknown/MANUAL sources
  return [title, content].filter(Boolean).join('\n\n')
}
```

### Pattern 4: `llmLocationFallback` Return Type Change (AIPL-08)

**What:** `locextract.ts:llmLocationFallback()` must return token counts in addition to the location string for AIPL-08.
**Impact:** Signature change ripples to `pipeline.ts` (call site at line 179) and `pipeline.test.ts` mock.

```typescript
// BEFORE: src/lib/images/locextract.ts
export async function llmLocationFallback(client: Anthropic, text: string): Promise<string | null>

// AFTER (AIPL-08):
export interface LocationFallbackResult {
  location: string | null
  inputTokens: number
  outputTokens: number
}
export async function llmLocationFallback(client: Anthropic, text: string): Promise<LocationFallbackResult>
```

Pipeline call site change:
```typescript
// pipeline.ts — inside the map try/catch block
const fallbackResult = await llmLocationFallback(anthropicClient, articleContent)
const locationName = extractLocation(articleContent) ?? fallbackResult.location
// Sum into running totals (AIPL-08):
totalInputTokens += fallbackResult.inputTokens
totalOutputTokens += fallbackResult.outputTokens
```

### Pattern 5: `finalStatus` Helper Function

**What:** `computeFinalStatus(merged)` encodes Phase 43's three-way logic cleanly.
**Decision points:**
1. `mentionsPrivateIndividual=true` → `REVIEW`
2. `bezirkSlugs=[]` AND `!isStateWide` (no Steiermark relevance) → `REVIEW`
3. Otherwise → `WRITTEN`

```typescript
function computeFinalStatus(merged: MergedResult): 'WRITTEN' | 'REVIEW' {
  if (merged.mentionsPrivateIndividual) return 'REVIEW'
  if (merged.bezirkSlugs.length === 0 && !merged.isStateWide) return 'REVIEW'
  return 'WRITTEN'
}
```

### Anti-Patterns to Avoid

- **Do not call `JSON.stringify(rawPayload)` as LLM input**: This is the root cause of metadata bleed. Always go through `extractArticleText()`.
- **Do not extract a `processOneArticle()` helper**: Explicitly locked in decisions — `pipeline.ts` is modified in place.
- **Do not change PipelineRun schema columns**: `totalInputTokens` and `totalOutputTokens` keep their column names; the internal accounting changes but the schema does not.
- **Do not set `isStateWide=false` and leave `bezirkSlugs` with the magic string `'steiermark-weit'`**: All magic-slug logic is removed. The defensive guard in `merged.ts` handles model violations.
- **Do not use `as any` or cast `Function` for the merged call**: The `tools + tool_choice` path is natively typed in `@anthropic-ai/sdk@0.80.0`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Structured LLM output | Custom JSON parsing + schema validation | `tools + tool_choice` — `toolUse.input` is already typed | SDK parses the tool block; manual `JSON.parse` on `tool_use.input` is redundant and fragile |
| In-process test DB | Docker or test-specific Prisma instance | `@electric-sql/pglite` + `pglite-prisma-adapter` (already in `setup-db.ts`) | Already fully set up — `createTestDb()` gives a fresh isolated DB per test |
| OTS body extraction | New field-scanning logic | Reuse `extractBody()` from `ots-at.ts` (or inline the 5-field candidate list) | `CANDIDATE_BODY_FIELDS` already handles the uncertainty around OTS field names |

**Key insight:** The replay harness and fixture corpus are the only truly new artifacts — everything else is a targeted modification to existing code.

---

## Common Pitfalls

### Pitfall 1: `llmLocationFallback` Signature Change Breaks the Mock

**What goes wrong:** `pipeline.test.ts` mocks `llmLocationFallback` as `vi.fn().mockResolvedValue(null)` (returning `string | null`). After the AIPL-08 return type change, the mock must return `{location: null, inputTokens: 0, outputTokens: 0}`.
**Why it happens:** The mock is typed to the old signature; TypeScript won't catch this if the mock is `vi.fn()` without explicit typing.
**How to avoid:** Update `pipeline.test.ts` mock in the same plan that changes `locextract.ts`. Check the mock at `pipeline.test.ts:19`: `llmLocationFallback: vi.fn().mockResolvedValue(null)` must become `vi.fn().mockResolvedValue({ location: null, inputTokens: 0, outputTokens: 0 })`.
**Warning signs:** Tests pass but `totalInputTokens` in PipelineRun is not counting location-fallback calls.

### Pitfall 2: `extractLocation` is Called Before `llmLocationFallback` — Token Accounting Order

**What goes wrong:** The map block in `pipeline.ts:175-205` calls `extractLocation(articleContent)` first (synchronous, no tokens), then `llmLocationFallback` only when that returns null. After AIPL-08, the token accumulation must only happen when the fallback is actually called — not on the `extractLocation` path.
**Why it happens:** Naive "always add tokens" placement.
**How to avoid:** Only add `fallbackResult.inputTokens` / `fallbackResult.outputTokens` inside the branch where `llmLocationFallback` was actually invoked.

### Pitfall 3: `TAGGED` Orphan Timing — SQL Must Run Before Deploy

**What goes wrong:** If the one-time SQL runs after the merged-call deploy, the window between deploy and SQL execution will have TAGGED articles already being retried by the new selector (AIPL-07 defense). That's fine — but running SQL after deploy is harmless, while running it before deploy ensures a clean cutover.
**Why it happens:** Deploy order ambiguity.
**How to avoid:** The plan file must explicitly state: SQL first, deploy second. Exact statement: `UPDATE article SET status='FETCHED' WHERE status='TAGGED';` — safe to run while prod is live because FETCHED is the normal entry state.

### Pitfall 4: `cache_control` on Wrong System Block

**What goes wrong:** Applying `cache_control: {type: 'ephemeral'}` to the dynamic suffix instead of the static prefix defeats the entire caching benefit. Cache invalidation fires on every source-specific tone/length change.
**Why it happens:** Block array index off-by-one; suffix content accidentally placed first.
**How to avoid:** Static prefix (role + rules + Bezirk list) is always `system[0]` with `cache_control`. Dynamic suffix is always `system[1]` without `cache_control`. Tests in `merged.test.ts` verify block positions explicitly.

### Pitfall 5: `pipeline.test.ts` Two-Call Assertion Still Passes After Flag Branch

**What goes wrong:** The existing test `TAGGED/WRITTEN/REVIEW articles are NOT reprocessed` creates TAGGED articles and asserts `messages.create` was never called. After Phase 43, TAGGED articles ARE processed (AIPL-07). This test needs to be updated.
**Why it happens:** The test at `pipeline.test.ts:277-298` assumes TAGGED is a terminal non-reprocessed state.
**How to avoid:** Update this test in the plan that implements AIPL-07. New assertion: TAGGED article is picked up and reaches WRITTEN/REVIEW.

### Pitfall 6: `isStateWide=true` with Non-Empty `bezirkSlugs` from the Model

**What goes wrong:** The model occasionally returns `isStateWide: true` alongside non-empty `bezirkSlugs`. Without the defensive guard, both `isStateWide` and Bezirk associations would be written, corrupting the article classification.
**Why it happens:** LLM non-determinism.
**How to avoid:** Apply the guard verbatim from the draft: `const cleanBezirkSlugs = parsed.isStateWide ? [] : parsed.bezirkSlugs`. Log the violation with `console.warn`. Test case 4 in `merged.test.ts` covers this.

### Pitfall 7: `bezirkSlugs` Order in Fixture Assertions

**What goes wrong:** Multi-Bezirk fixtures like `f02` expect `['liezen', 'murau']`, but the model may return them in any order.
**Why it happens:** JSON array order from tool_use output is non-deterministic.
**How to avoid:** Sort both arrays before comparing in the replay harness (already shown in the harness draft: `JSON.stringify([...out.bezirkSlugs].sort()) !== JSON.stringify([...fx.expectedOutput.bezirkSlugs].sort())`). Do the same in `merged.test.ts` assertions for multi-slug cases.

---

## Code Examples

Verified patterns from the live codebase:

### OTS Extractor — Field Names to Strip

```typescript
// From src/lib/ingestion/adapters/ots-at.ts (lines 27-39, 161-167)
// OTS known fields in rawPayload:
//   OTSKEY, TITEL, ZEITSTEMPEL, WEBLINK, UTL, DATUM, ZEIT, EMITTENT
// Body candidates (CANDIDATE_BODY_FIELDS): 'TEXT', 'BODY', 'INHALT', 'text', 'body'

// extractors/ots.ts — what to include vs strip:
// INCLUDE: TITEL (maps to title), body via extractBody() candidate scan
// STRIP: EMITTENT, WEBLINK, ZEITSTEMPEL, OTSKEY, UTL, DATUM, ZEIT
// STRIP: anything matching /Rückfragen & Kontakt/i, /Tel:/, /E-Mail:/, /Pressekontakt/

export function extractOts(rawPayload: unknown): string {
  const detail = rawPayload as Record<string, unknown>
  const title = typeof detail['TITEL'] === 'string' ? detail['TITEL'] : ''
  const body = extractBodyFromOts(detail) // reuse or inline CANDIDATE_BODY_FIELDS scan
  return [title, body].filter(Boolean).join('\n\n')
}
```

### RSS Extractor — Discriminate by Format

```typescript
// From src/lib/ingestion/adapters/rss.ts (lines 44-63, 66-88)
// RSS item shape: { title?, description?, guid?, link?, pubDate?, rawPayload: item }
// Atom entry shape: { title?, summary?, id?, links?, published?, rawPayload: entry }

export function extractRss(rawPayload: unknown): string {
  const item = rawPayload as Record<string, unknown>
  const title = typeof item['title'] === 'string' ? item['title'] : ''
  // description (RSS) or summary (Atom) — try both
  const body =
    (typeof item['description'] === 'string' ? item['description'] : null) ??
    (typeof item['summary'] === 'string' ? item['summary'] : null) ??
    (typeof item['content'] === 'string' ? item['content'] : '')
  return [title, body].filter(Boolean).join('\n\n')
}
```

### Anthropic SDK `maxRetries` (AIPL-09)

```typescript
// src/lib/ai/pipeline.ts — line 99
// BEFORE:
export const _clientFactory = {
  create: (): Anthropic => new Anthropic(),
}
// AFTER (AIPL-09):
export const _clientFactory = {
  create: (): Anthropic => new Anthropic({ maxRetries: 2 }),
}
```

### Retry Selector Change (AIPL-07)

```typescript
// src/lib/ai/pipeline.ts — line 95
// BEFORE:
const articles = await db.article.findMany({
  where: { status: { in: ['FETCHED', 'ERROR'] } },
})
// AFTER (AIPL-07):
const articles = await db.article.findMany({
  where: { status: { in: ['FETCHED', 'ERROR', 'TAGGED'] } },
})
```

### `getResolvedAiConfig` DI Call Pattern

```typescript
// From src/lib/admin/ai-config-dal.ts (getResolvedAiConfig signature)
// In runMergedCall, pass db as first arg (PrismaClient duck-type) + sourceId as second:
const resolvedConfig = await getResolvedAiConfig(db, sourceId ?? undefined)
// NOT: getResolvedAiConfig(sourceId) — that's the production singleton path
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `output_config as any` cast for structured JSON | `tools + tool_choice` typed path | Phase 43 (this phase) | Eliminates runtime cast; TypeScript validates schema shape |
| `'steiermark-weit'` magic slug in LLM output | `isStateWide: boolean` structured field | Phase 43 | Clean schema boundary; no slug-inference logic needed |
| `hasNamedPerson` field name | `mentionsPrivateIndividual` | Phase 43 | Stable name for Phase 45 prompt refinement |
| Two separate Anthropic calls per article | One merged `tool_use` call | Phase 43 | ~50% input token reduction on cache miss; ~75% on cache hit |
| `JSON.stringify(rawPayload)` as LLM input | Per-source clean extractors | Phase 43 | Eliminates metadata bleed (EMITTENT, WEBLINK, contact blocks) |
| TAGGED as intermediate pipeline state | TAGGED deprecated post-v3.2 | Phase 43 | New merged path jumps FETCHED → WRITTEN/REVIEW directly |

**Deprecated / to be removed in v3.3:**
- `step1-tag.ts`, `step2-write.ts`, their test files — kept in tree until flag is dropped.
- `'steiermark-weit'` magic slug in `buildBezirkContext` — gone from `merged.ts`; the string must not appear in the Bezirk list passed to the LLM.
- `TAGGED` enum value — stays in `schema.prisma` with `// deprecated post-v3.2` comment to avoid a migration.

---

## Open Questions

1. **`llmLocationFallback` return type change — how far does the ripple go?**
   - What we know: The function is called in `pipeline.ts:179` and mocked in `pipeline.test.ts:19` and `pipeline.test.ts:32` (the `vi.mock` factory returns `mockResolvedValue(null)`).
   - What's unclear: Are there other callers? `grep -r llmLocationFallback src/` shows only `pipeline.ts` and `locextract.ts`.
   - Recommendation: Change the signature in Plan 43-04. Update all three call sites (definition, `pipeline.ts` call, mock) atomically. TypeScript will catch any missed callers.

2. **`db.$transaction` in the merged call — atomic or sequential awaits?**
   - What we know: The draft shows `db.$transaction([article.update, ...bezirkUpserts])`. The current two-step path already uses `db.$transaction` for the TAGGED write + bezirk upserts.
   - What's unclear: Whether wrapping the final WRITTEN/REVIEW update plus bezirk upserts together in a single transaction is meaningful given the content fields are part of the same update.
   - Recommendation: Use `db.$transaction` matching the draft — it's the established pattern in `pipeline.ts:149` and ensures the article status flip and bezirk associations are atomic.

3. **`f08-bundes-pensionsreform-no-relevance` expected status in Context vs Draft**
   - What we know: CONTEXT.md explicitly states: `bezirkSlugs=[]` AND `isStateWide=false` → `REVIEW` (Phase 43 decision). The draft JSON still shows `expectedFinalStatus: 'WRITTEN'` with a note about "open question 3".
   - What's unclear: Nothing — CONTEXT.md is authoritative (it post-dates the draft).
   - Recommendation: Update `f08` fixture JSON to `expectedFinalStatus: 'REVIEW'` as part of Plan 43-01 (fixture corpus task). This is called out explicitly in CONTEXT.md.

---

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json` — this section is mandatory.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run src/lib/ai/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AIPL-01 | Single `messages.create` call per FETCHED article | integration | `npx vitest run src/lib/ai/pipeline.test.ts` | ✅ (needs update — currently asserts 2 calls) |
| AIPL-01 | `runMergedCall` parses all 8 fields from `tool_use` block | unit | `npx vitest run src/lib/ai/steps/merged.test.ts` | ❌ Wave 0 |
| AIPL-02 | Call uses `tools + tool_choice` with no `output_config` cast | unit | `npx vitest run src/lib/ai/steps/merged.test.ts` | ❌ Wave 0 |
| AIPL-03 | `stop_reason=max_tokens` throws; `max_tokens=1024` in call args | unit | `npx vitest run src/lib/ai/steps/merged.test.ts` | ❌ Wave 0 |
| AIPL-04 | Static prefix block has `cache_control: {type: 'ephemeral'}`; dynamic suffix does not | unit | `npx vitest run src/lib/ai/steps/merged.test.ts` | ❌ Wave 0 |
| AIPL-05 | `cachedInputTokens` and `cacheCreationTokens` returned from `runMergedCall` | unit | `npx vitest run src/lib/ai/steps/merged.test.ts` | ❌ Wave 0 |
| AIPL-05 | PipelineRun `totalInputTokens` includes `cacheCreationTokens` | integration | `npx vitest run src/lib/ai/pipeline.test.ts` | ✅ (needs new test case) |
| AIPL-06 | OTS extractor strips EMITTENT/WEBLINK/contact fields | unit | `npx vitest run src/lib/ai/extractors/` | ❌ Wave 0 |
| AIPL-06 | RSS extractor pulls title + description/summary | unit | `npx vitest run src/lib/ai/extractors/` | ❌ Wave 0 |
| AIPL-06 | `extractArticleText` dispatches by source type; default fallback for MANUAL | unit | `npx vitest run src/lib/ai/extractors/` | ❌ Wave 0 |
| AIPL-07 | TAGGED article is picked up in the next pipeline run | integration | `npx vitest run src/lib/ai/pipeline.test.ts` | ✅ (needs test update — currently asserts TAGGED is NOT picked up) |
| AIPL-08 | `llmLocationFallback` token counts flow into PipelineRun totals | integration | `npx vitest run src/lib/ai/pipeline.test.ts` | ✅ (needs new test case) |
| AIPL-09 | `Anthropic` client constructed with `maxRetries: 2` | unit | inspect `_clientFactory.create` in pipeline unit test | ✅ (existing unit test verifiable) |
| AIPL-10 | Manual SQL — not a code path | manual | N/A | N/A |

### Sampling Rate

- **Per task commit:** `npx vitest run src/lib/ai/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/lib/ai/steps/merged.test.ts` — 11 unit test cases from the draft fixture scaffold (AIPL-01, 02, 03, 04, 05)
- [ ] `src/lib/ai/extractors/ots.ts` — implementation file (no tests exist for extractor layer yet)
- [ ] `src/lib/ai/extractors/rss.ts` — implementation file
- [ ] `src/lib/ai/extractors/index.ts` — dispatch registry
- [ ] `src/lib/ai/extractors/ots.test.ts` — AIPL-06 OTS coverage
- [ ] `src/lib/ai/extractors/rss.test.ts` — AIPL-06 RSS coverage
- [ ] `src/lib/ai/extractors/index.test.ts` — AIPL-06 dispatch + fallback
- [ ] `src/test/fixtures/ai-merged/*.json` — 20 fixture files (10 from draft + 10 to be curated)
- [ ] `scripts/ai-replay-fixtures.ts` — replay harness

**Existing tests that need targeted updates (not new files):**
- [ ] `pipeline.test.ts:277` — `TAGGED/WRITTEN/REVIEW articles are NOT reprocessed` — must flip: TAGGED should now be processed (AIPL-07)
- [ ] `pipeline.test.ts:39–84` — mock factory returns 2 alternating responses; merged path needs a single `tool_use` response builder
- [ ] `pipeline.test.ts:19` — `llmLocationFallback` mock must return `{location: null, inputTokens: 0, outputTokens: 0}` (AIPL-08)

---

## Sources

### Primary (HIGH confidence)

- Live codebase read: `src/lib/ai/pipeline.ts` — integration site, line-by-line confirmed
- Live codebase read: `src/lib/ai/steps/step1-tag.ts` — `buildBezirkContext()` reuse, `as any` cast locations confirmed
- Live codebase read: `src/lib/ai/steps/step2-write.ts` — `max_tokens: 512` (to be bumped), second `as any` cast confirmed
- Live codebase read: `src/lib/images/locextract.ts` — `llmLocationFallback()` return type is `string | null` (AIPL-08 finding)
- Live codebase read: `src/lib/ingestion/adapters/ots-at.ts` — `extractBody()`, field names (`OTSKEY`, `TITEL`, `WEBLINK`, `EMITTENT`, `ZEITSTEMPEL`) confirmed
- Live codebase read: `src/lib/ingestion/adapters/rss.ts` — `rawPayload: item` / `rawPayload: entry` shapes confirmed
- Live codebase read: `src/lib/ingestion/adapters/registry.ts` — registry pattern confirmed (`Partial<Record<ArticleSource, AdapterFn>>`)
- Live codebase read: `src/lib/admin/ai-config-dal.ts` — `getResolvedAiConfig(db, sourceId?)` signature confirmed
- Live codebase read: `prisma/schema.prisma` — `TAGGED` enum, `Article.isStateWide`, `PipelineRun` columns confirmed schema-free
- Live codebase read: `src/lib/ai/pipeline.test.ts` — existing mocks, test assertions, `_clientFactory.create` override pattern confirmed
- Live codebase read: `src/test/setup-db.ts` — `createTestDb()`, `cleanDb()`, Bezirk seed data confirmed
- Spec file: `.planning/drafts/43-01-merged-prompt-DRAFT.md` — authoritative call shape, schema, prompt
- Spec file: `.planning/drafts/43-01-test-fixtures-DRAFT.md` — 10 fixture catalogue, replay harness scaffold
- Config: `.planning/config.json` — `workflow.nyquist_validation: true` confirmed

### Secondary (MEDIUM confidence)

- `package.json` — `@anthropic-ai/sdk@^0.80.0` installed; `cache_control` on system content blocks and `tool_use` + `tool_choice` are both available in this SDK range (confirmed by draft usage patterns and SDK changelog trajectory)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in active use
- Architecture: HIGH — draft specs are authoritative; live code confirmed every integration point
- Pitfalls: HIGH — identified from direct reading of existing tests and code patterns
- AIPL-08 finding (return type change): HIGH — direct code read of `locextract.ts` confirms the current signature

**Research date:** 2026-05-11
**Valid until:** 2026-06-10 (stable domain — Anthropic SDK changes slowly; no external dependencies added)
