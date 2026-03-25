# Phase 8: Phase 7 Verification + Per-Source AI Config Wiring - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Two tasks in one phase: (1) formally document that Phase 7's 4 validation criteria are satisfied — producing `07-VERIFICATION.md` in the Phase 7 directory — and (2) wire the per-source AI config override into the article generation pipeline by adding `Article.sourceId` FK and making `runStep2Write()` call `getResolvedAiConfig(db, sourceId)`. No new UI, no new features beyond AICONF-02.

</domain>

<decisions>
## Implementation Decisions

### Verification document (07-VERIFICATION.md)
- **Format:** Checklist + evidence — each of the 4 Phase 7 success criteria listed as ✓ PASS with a one-line evidence note
- **Test reference:** Each criterion references the exact `describe()` block name from `src/test/validation.test.ts` (e.g. `describe("Criterion 1: Adapter Extensibility")`)
- **Test count:** Include exact count from running vitest before writing the doc (e.g. "183/183 tests green (vitest, 2026-03-23)")
- **Phase 8 executor runs tests first:** `npx vitest run` → capture result → write verification doc with real evidence
- **Caveats section titled "Known Limitations"** — honest record of what was not proven (e.g. OTS prompt wording untested against real OTS data)
- **Location:** `.planning/phases/07-extensibility-and-quality-validation/07-VERIFICATION.md` — in the Phase 7 directory, consistent with per-phase artifact convention
- **Audience:** Internal project record — technical, terse tone fine

### Article.sourceId schema
- **Add `Article.sourceId Int?`** — nullable FK to `Source` table with full Prisma relation
- **onDelete: SetNull** — if a Source is deleted from admin, its articles lose sourceId and fall through to global AI config
- **Add reverse relation `Source.articles Article[]`** on Source model — idiomatic Prisma, consistent with existing `runs` and `aiSourceConfig` relations
- **Add `@@index([sourceId])`** in Prisma schema — consistent with existing index patterns, enables future queries
- **Keep `Article.source ArticleSource` enum** alongside the new FK — enum used in existing queries and admin display; removing it is out of scope for Phase 8
- **Migration:** Hand-crafted SQL (established pgLite pattern), timestamp-prefixed directory name for correct sort order, standard non-deferrable FK — no special handling needed
- **No backfill** — existing articles stay `sourceId = NULL`, fall through to global AI config at pipeline time (they're already PUBLISHED anyway)
- **`cleanDb()` needs no change** — it deletes Article rows entirely; onDelete: SetNull only fires on Source deletion, not Article deletion

### Ingestion wiring (ingest.ts)
- **Set `Article.sourceId = source.id` on `article.create()`** — ingest.ts already iterates over Source rows and has `source.id` available; pass it as `sourceId` when creating new Article rows
- **Set on create only, not update** — sourceId is established when the article is first fetched; retries don't change the source
- **Existing ingest tests unchanged** — `Article.sourceId` is nullable, existing `article.create()` calls without `sourceId` still compile

### Pipeline wiring (pipeline.ts + runStep2Write)
- **Add optional 5th parameter:** `runStep2Write(client, articleText, bezirkNames, db?, sourceId?)`
- **pipeline.ts reads `article.sourceId`** from the already-fetched Article row and passes it to `runStep2Write`
- **`runStep2Write` calls `getResolvedAiConfig(db, sourceId ?? undefined)`** instead of `getAiConfig(db)` — NULL sourceId falls through to global AiConfig naturally (existing `getResolvedAiConfig` behavior)
- **Remove the TODO comment** in `step2-write.ts` (`// TODO(Phase 7): pass sourceId...`) — it will be resolved in this phase
- **Pipeline-internal only** — sourceId not exposed in admin list queries or reader queries

### Per-source override test
- **New file:** `src/lib/ai/steps/step2-write-source-override.test.ts` (or similar — Claude's discretion on exact name)
- **Two test cases:** (1) sourceId with AiSourceConfig override → override config used; (2) sourceId = null → global config used
- **Uses real pgLite DB** via `createTestDb()` and `cleanDb()` from `src/test/setup-db.ts`
- **Fake Anthropic client** with `messages.create = vi.fn()` returning a canned response
- **Assert with `expect.objectContaining({ model: '...' })`** — not exact call match
- **Source row created inline** — minimal `db.source.create()`, not seedSources()
- **Existing `step2-write.test.ts` unchanged** — no edits to existing passing tests

### Claude's Discretion
- Exact migration file timestamp and directory name
- Whether `prisma generate` is run as a separate step or chained after migration SQL
- Exact canned response shape for the fake Anthropic client in tests
- Whether the new test file also tests `buildSystemPrompt()` behavior with different tones (out of scope unless trivial)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/admin/ai-config-dal.ts` — `getResolvedAiConfig(db, sourceId)` already implemented and tested; this phase just calls it from `runStep2Write`
- `src/lib/ai/steps/step2-write.ts` — `runStep2Write(client, text, bezirkNames, db?)` — add `sourceId?` as 5th param; replace `getAiConfig(db)` with `getResolvedAiConfig(db, sourceId ?? undefined)`
- `src/lib/ai/pipeline.ts` — `processArticles()` fetches Article rows; `article.sourceId` will be available after schema change
- `src/test/setup-db.ts` — `createTestDb()` + `cleanDb()` — new override test imports these; `createTestDb()` will pick up the new migration automatically via sorted scan

### Established Patterns
- TypeScript DI overloads + `$connect` duck-typing — all modified functions must follow this
- Hand-crafted migration SQL + `prisma generate` — no live Postgres server needed
- Fake Anthropic client with `vi.fn()` for messages.create — already used in `step2-write.test.ts`
- `expect.objectContaining({...})` for partial assertion — used in circuit-breaker and dead-man tests

### Integration Points
- `ingest.ts` → sets `Article.sourceId` on create → `pipeline.ts` reads it → passes to `runStep2Write` → `getResolvedAiConfig` → per-source override applied
- `07-VERIFICATION.md` written after running `npx vitest run` — references exact test output
- New migration SQL must be applied in `createTestDb()` sorted scan before new tests can use `Article.sourceId`

</code_context>

<specifics>
## Specific Ideas

- The TODO comment to remove: `// TODO(Phase 7): pass sourceId to getResolvedAiConfig for per-source prompt overrides`
- The `getResolvedAiConfig` signature already handles the nullable case: `getResolvedAiConfig(dbOrSourceId, sourceId?)` — passing `undefined` as sourceId returns global config
- The verification doc checklist should be scannable at a glance: each line = one criterion = one ✓ PASS + evidence note + Known Limitations section at the end

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-per-source-ai-config-wiring*
*Context gathered: 2026-03-23*
