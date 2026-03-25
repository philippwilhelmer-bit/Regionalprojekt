# Phase 11: Fix State-Wide Article Pipeline - Research

**Researched:** 2026-03-25
**Domain:** AI pipeline bug fix — `isStateWide` mapping, reader feed query, backfill script
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Pipeline isStateWide mapping**
- Detect `'steiermark-weit'` in `step1.bezirkSlugs` in `pipeline.ts`
- When detected: set `Article.isStateWide = true` in the DB (in the same transaction as the `TAGGED` status update)
- `steiermark-weit` wins — do NOT write `ArticleBezirk` rows for it; ignore any co-returned Bezirk slugs
- Log a `console.warn` when `'steiermark-weit'` appears alongside other slugs (e.g. `['steiermark-weit', 'liezen']`) — aids prompt debugging

**Step1 prompt tightening**
- Update the `buildSystemPrompt()` in `step1-tag.ts` to explicitly state: do not return other slugs alongside `steiermark-weit`
- This reduces ambiguity in model output and is consistent with the existing "not specific to any Bezirk" wording

**Reader feed fix (listArticlesReader)**
- Add `isStateWide: true` OR clause to `listArticlesReader` in `articles.ts`
- Only apply the OR when `bezirkIds` is non-empty (guard matches the existing empty-IN guard pattern)
- When `bezirkIds` is empty/undefined, all published articles are already returned — no change needed for that path
- The `/api/reader/articles` route delegates to `listArticlesReader`, so this fix is inherited automatically — no separate route change needed

**Backfill script**
- Include a one-time manual script (e.g. `src/scripts/backfill-state-wide.ts`) following the `ingest-run.ts` / `ai-run.ts` CLI pattern
- Identifies: articles with **no `ArticleBezirk` rows** AND **status in `PUBLISHED`, `WRITTEN`, `REVIEW`**
- Sets `isStateWide = true` on those articles
- Must be run manually by the operator after reviewing candidates — not auto-run on deploy

### Claude's Discretion
- Exact transaction structure for setting `isStateWide` alongside `TAGGED` status update
- Script output format (count of affected rows, dry-run flag if helpful)
- Test scenario details and coverage breadth

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AI-02 | System automatically tags each article with the relevant Bezirk(e) | The `steiermark-weit` slug returned by Step 1 is currently ignored in pipeline.ts step 5c-5d; setting `isStateWide=true` in the same transaction closes the gap |
| READ-06 | Each Bezirk has its own subscribable RSS feed for readers | `getArticlesByBezirk()` already has the `OR [{ isStateWide: true }]` clause; the only gap is that no articles ever have `isStateWide=true` because the pipeline never sets it |
</phase_requirements>

---

## Summary

Phase 11 is a focused bug fix across three files plus a standalone backfill script. No schema migration is needed — `Article.isStateWide Boolean @default(false)` already exists. The root cause is a two-part gap: (1) `pipeline.ts` step 5c silently drops the `steiermark-weit` slug because `bezirkBySlug.get('steiermark-weit')` returns `undefined` (no Bezirk row with that slug), so no `isStateWide=true` is ever written; (2) `listArticlesReader` has no `isStateWide` OR branch, so even if the flag were set correctly, state-wide articles would still not appear in personalized Bezirk feeds.

The fix path is fully mapped by the existing code: insert a `bezirkSlugs.includes('steiermark-weit')` check before the slug-to-ID mapping loop in `pipeline.ts`; when true, set `isStateWide=true` in the `$transaction` and skip all `ArticleBezirk` creation; add a parallel `OR [{ isStateWide: true }]` branch to `listArticlesReader` behind the existing non-empty `bezirkIds` guard; tighten the Step 1 system prompt to make the exclusive-or rule explicit; and ship a `backfill-state-wide.ts` CLI script following the `ai-run.ts` pattern.

The test suite is 192 tests, all green. Tests for both `pipeline.ts` and `articles.ts` already exist and follow established patterns; new tests for the state-wide path slot directly into those files.

**Primary recommendation:** Make the four targeted edits (pipeline.ts, step1-tag.ts, articles.ts, new backfill script) in separate wave tasks so each diff stays small and reviewable. Wave 0 stubs all new test cases with `it.todo()`.

---

## Standard Stack

### Core (all confirmed by direct code inspection — HIGH confidence)

| Library / Tool | Version | Purpose | Why Standard |
|----------------|---------|---------|--------------|
| Prisma ORM | (existing, v6) | DB access, `$transaction`, `Article.update` | Project-wide DAL pattern |
| vitest | (existing) | Unit + integration tests | All 27 test files already use it |
| pgLite + pglite-prisma-adapter | (existing, v0.6.1) | In-process test DB | Established in Phase 1; all pipeline tests use it |
| TypeScript | (existing) | Codebase language | Mandatory |

### Supporting

| Library | Purpose | When to Use |
|---------|---------|-------------|
| `node:process` (Bun-compatible) | `process.exit(1)` in backfill script | Same as ai-run.ts pattern |

### Alternatives Considered

None — this is a bug fix; the stack is fully determined.

**Installation:** No new packages required.

---

## Architecture Patterns

### Relevant Project Structure

```
src/
├── lib/
│   ├── ai/
│   │   ├── pipeline.ts            # EDIT: steps 5c-5d — steiermark-weit detection
│   │   ├── pipeline.test.ts       # EDIT: add state-wide test cases
│   │   └── steps/
│   │       ├── step1-tag.ts       # EDIT: buildSystemPrompt() prompt tightening
│   │       └── step1-tag.test.ts  # EDIT: add prompt-content assertion
│   └── content/
│       ├── articles.ts            # EDIT: listArticlesReader — isStateWide OR clause
│       └── articles.test.ts       # EDIT: add state-wide reader feed test cases
└── scripts/
    └── backfill-state-wide.ts     # NEW: one-time repair script
```

### Pattern 1: `steiermark-weit` Detection in pipeline.ts (step 5c-5d)

**What:** Replace the raw `bezirkSlugs.map(slug => bezirkBySlug.get(slug))` loop with an explicit check first.
**When to use:** Every article processed — the check is cheap (array includes).

Current code (step 5c-5d, lines 125-144 of pipeline.ts):
```typescript
// 5c. Map bezirkSlugs → Bezirk IDs
const matchedBezirke = step1.bezirkSlugs
  .map((slug) => bezirkBySlug.get(slug))
  .filter((b): b is NonNullable<typeof b> => b !== undefined)

// 5d. Write TAGGED status + ArticleBezirk rows in a single transaction
await db.$transaction([
  db.article.update({
    where: { id: article.id },
    data: { status: 'TAGGED' },
  }),
  ...matchedBezirke.map((bezirk) =>
    db.articleBezirk.upsert({ ... })
  ),
])
```

Required replacement (Claude's discretion on exact structure):
```typescript
// 5c. Detect steiermark-weit before slug→ID mapping
const isStateWide = step1.bezirkSlugs.includes('steiermark-weit')

if (isStateWide && step1.bezirkSlugs.length > 1) {
  console.warn(
    `[ai-pipeline] article id=${article.id} — 'steiermark-weit' returned alongside other slugs: ${step1.bezirkSlugs.join(', ')} — check Step 1 prompt`
  )
}

// 5d. Write TAGGED status + isStateWide flag (and optionally ArticleBezirk rows)
if (isStateWide) {
  await db.$transaction([
    db.article.update({
      where: { id: article.id },
      data: { status: 'TAGGED', isStateWide: true },
    }),
    // No ArticleBezirk rows — steiermark-weit wins
  ])
} else {
  const matchedBezirke = step1.bezirkSlugs
    .map((slug) => bezirkBySlug.get(slug))
    .filter((b): b is NonNullable<typeof b> => b !== undefined)

  await db.$transaction([
    db.article.update({
      where: { id: article.id },
      data: { status: 'TAGGED' },
    }),
    ...matchedBezirke.map((bezirk) =>
      db.articleBezirk.upsert({ ... })
    ),
  ])
}
```

Note on `$transaction([])` with empty array: Prisma accepts an empty array — but since the state-wide branch always has at least the `article.update`, this is not a concern.

### Pattern 2: `listArticlesReader` — isStateWide OR clause

**What:** When `bezirkIds` is non-empty, add `{ isStateWide: true }` as an OR alternative.
**When to use:** Applied only in the non-empty guard, matching the existing pattern.

Current code (articles.ts lines 166-186):
```typescript
return db.article.findMany({
  where: {
    status: 'PUBLISHED',
    ...(bezirkIds !== undefined && bezirkIds.length > 0
      ? { bezirke: { some: { bezirkId: { in: bezirkIds } } } }
      : {}),
  },
  ...
})
```

Required replacement:
```typescript
return db.article.findMany({
  where: {
    status: 'PUBLISHED',
    ...(bezirkIds !== undefined && bezirkIds.length > 0
      ? {
          OR: [
            { bezirke: { some: { bezirkId: { in: bezirkIds } } } },
            { isStateWide: true },
          ],
        }
      : {}),
  },
  ...
})
```

This exactly mirrors the pattern already used in `getArticlesByBezirk()` (lines 224-231 of articles.ts).

### Pattern 3: Step 1 Prompt Tightening

Current prompt instruction (step1-tag.ts line 68):
```
Return 'steiermark-weit' if the article is state-wide and not specific to any Bezirk.
```

Add explicit exclusivity rule after this line:
```
When returning 'steiermark-weit', do not include any other Bezirk slugs — it is exclusive.
```

### Pattern 4: Backfill Script CLI Structure

Follows `ai-run.ts` exactly:
```typescript
// src/scripts/backfill-state-wide.ts
import { prisma } from '../lib/prisma'

async function main(): Promise<void> {
  const candidates = await prisma.article.findMany({
    where: {
      bezirke: { none: {} },
      status: { in: ['PUBLISHED', 'WRITTEN', 'REVIEW'] },
    },
    select: { id: true, title: true, status: true },
  })

  console.log(`[backfill] Found ${candidates.length} candidate(s)`)
  // Optional dry-run: if (process.argv.includes('--dry-run')) { ... }

  const result = await prisma.article.updateMany({
    where: { id: { in: candidates.map((a) => a.id) } },
    data: { isStateWide: true },
  })

  console.log(`[backfill] Updated ${result.count} article(s) → isStateWide=true`)
}

if ((import.meta as any).main) {
  main().catch((err) => {
    console.error('[backfill] Fatal:', err)
    process.exit(1)
  })
}
```

### Anti-Patterns to Avoid

- **Writing `ArticleBezirk` rows for `steiermark-weit`:** There is no Bezirk row with slug `steiermark-weit` — the map lookup returns `undefined` and the filter discards it silently today. The fix must add the explicit check BEFORE the map, not rely on the undefined-filter.
- **Applying the `isStateWide` OR to the empty-bezirkIds path:** When no Bezirk filter is active, all PUBLISHED articles are returned anyway — adding the OR there is harmless but redundant and would mask a logic error.
- **Running `$transaction([])` with an empty array without the article.update:** Always include the `article.update` in every branch; never create a transaction with zero operations.
- **Auto-running the backfill on deploy:** The script must be gated by `(import.meta as any).main` and invoked manually. Auto-running it would silently corrupt articles that legitimately have no Bezirk (e.g. articles in FETCHED/TAGGED state mid-pipeline).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic multi-row DB update | Custom try/catch + individual updates | Prisma `$transaction([...])` | Already established; rollback on failure |
| Slug-to-boolean detection | Regex or string parsing | `Array.prototype.includes('steiermark-weit')` | One-liner, type-safe |
| Bulk update of affected articles | Row-by-row loop in backfill | Prisma `updateMany` | Single DB round-trip |

---

## Common Pitfalls

### Pitfall 1: `steiermark-weit` Not in `bezirkBySlug` Map
**What goes wrong:** The `bezirkBySlug` map is built from `db.bezirk.findMany()`. There is no Bezirk row with slug `steiermark-weit` in the database — it is a sentinel value the AI model returns. The current code's `bezirkBySlug.get('steiermark-weit')` returns `undefined`, which is filtered out, producing zero ArticleBezirk rows and leaving `isStateWide` as `false`.
**Why it happens:** The slug is a special case agreed in the prompt but has no corresponding DB record.
**How to avoid:** The explicit `includes('steiermark-weit')` check must come BEFORE the `bezirkBySlug.get()` map call. The non-state-wide branch should filter the slugs to only non-sentinel values before mapping.
**Warning signs:** Articles with `bezirke: { none: {} }` and status WRITTEN/PUBLISHED — these are the backfill candidates.

### Pitfall 2: `isStateWide` OR Causes Duplicate Results
**What goes wrong:** If a state-wide article somehow also has an `ArticleBezirk` row (possible via the CMS or a race), it could appear twice in Prisma results.
**Why it happens:** Prisma `OR` with `findMany` does not deduplicate — same row matching both arms of an OR returns once (Postgres handles this at SQL level with OR predicate). This is not actually a problem in PostgreSQL/Prisma.
**Confirmed safe:** The `getArticlesByBezirk()` function already uses this exact `OR` pattern (lines 224-231 of articles.ts) and all its tests pass.

### Pitfall 3: Backfill Identifying Non-State-Wide Articles as Candidates
**What goes wrong:** Articles legitimately mid-pipeline (FETCHED, TAGGED) have no `ArticleBezirk` rows yet — they must not be backfilled.
**How to avoid:** The `status: { in: ['PUBLISHED', 'WRITTEN', 'REVIEW'] }` guard in the backfill query correctly excludes FETCHED/TAGGED/ERROR/FAILED articles.

### Pitfall 4: `$transaction([])` With Only One Operation (article.update)
**What goes wrong:** The state-wide branch creates a `$transaction` with only the `article.update`. Prisma's `$transaction([...])` accepts an array of one — this is valid.
**Confirmed safe:** Prisma docs confirm `$transaction` with a single operation is permitted.

---

## Code Examples

### Current `getArticlesByBezirk` OR Pattern (already correct — model for `listArticlesReader`)
```typescript
// Source: src/lib/content/articles.ts lines 224-231
return db.article.findMany({
  where: {
    OR: [
      { bezirke: { some: { bezirkId: bezirk.id } } },
      { isStateWide: true },
    ],
  },
  ...
})
```

### Existing `$transaction` in pipeline.ts (step 5d — lines 130-144)
```typescript
// Source: src/lib/ai/pipeline.ts lines 130-144
await db.$transaction([
  db.article.update({
    where: { id: article.id },
    data: { status: 'TAGGED' },
  }),
  ...matchedBezirke.map((bezirk) =>
    db.articleBezirk.upsert({
      where: { articleId_bezirkId: { articleId: article.id, bezirkId: bezirk.id } },
      create: { articleId: article.id, bezirkId: bezirk.id, taggedAt: new Date() },
      update: { taggedAt: new Date() },
    })
  ),
])
```

### Pipeline Test Mock Pattern (for new state-wide test)
```typescript
// Source: src/lib/ai/pipeline.test.ts — existing helper
function makeStep1Response(bezirkSlugs: string[], hasNamedPerson: boolean) {
  return {
    content: [{ type: 'text', text: JSON.stringify({ bezirkSlugs, hasNamedPerson }) }],
    usage: { input_tokens: 100, output_tokens: 50 },
  }
}
// New test call:
_clientFactory.create = () => makeMockAnthropicClient(
  makeStep1Response(['steiermark-weit'], false)
) as any
```

### Backfill Query Pattern (Prisma relation-filter)
```typescript
// Source: confirmed pattern — CONTEXT.md code_context, line 65
await prisma.article.findMany({
  where: {
    bezirke: { none: {} },
    status: { in: ['PUBLISHED', 'WRITTEN', 'REVIEW'] },
  },
})
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `steiermark-weit` slug silently dropped by undefined-filter | Explicit `includes()` check sets `isStateWide=true` | State-wide articles propagate to all feeds |
| `listArticlesReader` has no `isStateWide` branch | OR clause added matching `getArticlesByBezirk` | Personalized homepage shows state-wide content |

---

## Open Questions

1. **`$transaction([singleOperation])` edge case**
   - What we know: Prisma accepts arrays of any length including one in `$transaction`
   - What's unclear: Whether wrapping a single update in `$transaction` adds overhead vs a bare `update`
   - Recommendation: Use `$transaction` for consistency with the existing step 5d pattern, even when the state-wide branch has only one operation. Alternatively, use a bare `db.article.update()` with both `status` and `isStateWide` fields — simpler and the transaction wrapping is unnecessary when there is only one write. Claude's discretion.

2. **Backfill dry-run flag**
   - What we know: `ai-run.ts` has no dry-run; `ingest-run.ts` has no dry-run
   - What's unclear: Whether the operator wants to preview candidates before committing
   - Recommendation: Add `--dry-run` flag that prints candidates and count without updating. Low implementation cost, high operator value.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest (confirmed, all 192 tests pass) |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run src/lib/ai/pipeline.test.ts src/lib/content/articles.test.ts src/lib/ai/steps/step1-tag.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AI-02 | `pipeline.ts` sets `isStateWide=true` when step1 returns `['steiermark-weit']` | integration | `npx vitest run src/lib/ai/pipeline.test.ts` | ✅ (extend) |
| AI-02 | No `ArticleBezirk` rows created for state-wide articles | integration | `npx vitest run src/lib/ai/pipeline.test.ts` | ✅ (extend) |
| AI-02 | Per-Bezirk articles unaffected by state-wide path | integration | `npx vitest run src/lib/ai/pipeline.test.ts` | ✅ (existing pass) |
| AI-02 | `console.warn` fires when `steiermark-weit` co-returned with other slugs | integration | `npx vitest run src/lib/ai/pipeline.test.ts` | ✅ (extend) |
| AI-02 | `buildSystemPrompt()` prompt contains exclusivity instruction | unit | `npx vitest run src/lib/ai/steps/step1-tag.test.ts` | ✅ (extend) |
| READ-06 | `listArticlesReader` returns state-wide articles when `bezirkIds` filter is active | integration | `npx vitest run src/lib/content/articles.test.ts` | ✅ (extend) |
| READ-06 | `listArticlesReader` does not double-return state-wide articles when `bezirkIds` empty | integration | `npx vitest run src/lib/content/articles.test.ts` | ✅ (existing pass) |
| READ-06 | RSS feed (`getArticlesByBezirk`) already returns state-wide — no regression | integration | `npx vitest run src/lib/content/articles.test.ts` | ✅ (existing pass) |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/ai/pipeline.test.ts src/lib/content/articles.test.ts src/lib/ai/steps/step1-tag.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green (192+ tests) before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/ai/pipeline.test.ts` — add `it.todo()` stubs for: "sets isStateWide=true when step1 returns steiermark-weit", "creates no ArticleBezirk rows for state-wide article", "logs console.warn when steiermark-weit co-returned with other slugs"
- [ ] `src/lib/content/articles.test.ts` — add `it.todo()` stubs for: "listArticlesReader includes isStateWide articles when bezirkIds filter active", "listArticlesReader excludes non-matching non-state-wide articles"
- [ ] `src/lib/ai/steps/step1-tag.test.ts` — add `it.todo()` stub for: "system prompt contains steiermark-weit exclusivity instruction"

---

## Sources

### Primary (HIGH confidence — direct code inspection)
- `src/lib/ai/pipeline.ts` — full source read; step 5c-5d logic confirmed
- `src/lib/ai/steps/step1-tag.ts` — full source read; `buildSystemPrompt()` wording confirmed
- `src/lib/content/articles.ts` — full source read; `listArticlesReader` and `getArticlesByBezirk` confirmed
- `src/lib/ai/pipeline.test.ts` — full source read; mock patterns and test structure confirmed
- `src/lib/content/articles.test.ts` — full source read; existing state-wide test for `getArticlesByBezirk` confirmed
- `src/test/setup-db.ts` — full source read; `createTestDb()`, `cleanDb()` patterns confirmed
- `prisma/schema.prisma` — `Article.isStateWide Boolean @default(false)` confirmed present, no migration needed
- Test suite execution — 192/192 tests pass (green baseline confirmed)

### Secondary (HIGH confidence)
- `src/scripts/ai-run.ts` — backfill script pattern source

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all tools confirmed by code inspection
- Architecture: HIGH — all change sites located, existing patterns for each edit confirmed in code
- Pitfalls: HIGH — root cause traced to specific line (`bezirkBySlug.get('steiermark-weit')` → undefined), confirmed by reading the actual loop
- Test patterns: HIGH — test infrastructure inspected, 192 tests pass, existing mock helpers reusable

**Research date:** 2026-03-25
**Valid until:** Stable (schema, DAL patterns, test infrastructure do not change within this phase)
