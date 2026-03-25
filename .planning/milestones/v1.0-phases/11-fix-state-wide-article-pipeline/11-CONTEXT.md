# Phase 11: Fix State-Wide Article Pipeline - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix the broken `isStateWide` mapping so that when `step1-tag.ts` returns `bezirkSlugs: ['steiermark-weit']`, `pipeline.ts` sets `Article.isStateWide=true` in the database — causing state-wide articles to appear in all per-Bezirk feeds and RSS feeds. Also fix `listArticlesReader` so state-wide articles appear in the personalized homepage feed, and deliver a manual backfill script for existing affected records. No new features — this is a bug fix with targeted data repair.

</domain>

<decisions>
## Implementation Decisions

### Pipeline isStateWide mapping
- Detect `'steiermark-weit'` in `step1.bezirkSlugs` in `pipeline.ts`
- When detected: set `Article.isStateWide = true` in the DB (in the same transaction as the `TAGGED` status update)
- `steiermark-weit` wins — do NOT write `ArticleBezirk` rows for it; ignore any co-returned Bezirk slugs
- Log a `console.warn` when `'steiermark-weit'` appears alongside other slugs (e.g. `['steiermark-weit', 'liezen']`) — aids prompt debugging

### Step1 prompt tightening
- Update the `buildSystemPrompt()` in `step1-tag.ts` to explicitly state: do not return other slugs alongside `steiermark-weit`
- This reduces ambiguity in model output and is consistent with the existing "not specific to any Bezirk" wording

### Reader feed fix (listArticlesReader)
- Add `isStateWide: true` OR clause to `listArticlesReader` in `articles.ts`
- Only apply the OR when `bezirkIds` is non-empty (guard matches the existing empty-IN guard pattern)
- When `bezirkIds` is empty/undefined, all published articles are already returned — no change needed for that path
- The `/api/reader/articles` route delegates to `listArticlesReader`, so this fix is inherited automatically — no separate route change needed

### Backfill script
- Include a one-time manual script (e.g. `src/scripts/backfill-state-wide.ts`) following the `ingest-run.ts` / `ai-run.ts` CLI pattern
- Identifies: articles with **no `ArticleBezirk` rows** AND **status in `PUBLISHED`, `WRITTEN`, `REVIEW`**
- Sets `isStateWide = true` on those articles
- Must be run manually by the operator after reviewing candidates — not auto-run on deploy

### Claude's Discretion
- Exact transaction structure for setting `isStateWide` alongside `TAGGED` status update
- Script output format (count of affected rows, dry-run flag if helpful)
- Test scenario details and coverage breadth

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/ai/pipeline.ts` — orchestrator that maps `bezirkSlugs` to DB rows; the fix is here (detect `steiermark-weit`, set `isStateWide`)
- `src/lib/ai/steps/step1-tag.ts` — `buildSystemPrompt()` needs prompt tightening; `Step1Result.bezirkSlugs` is the signal to check
- `src/lib/content/articles.ts` — `listArticlesReader` needs the `isStateWide` OR clause; `getArticlesByBezirk` already handles this correctly with `OR [{ isStateWide: true }]`
- `src/app/rss/[slug]/route.ts` — RSS route calls `getArticlesByBezirk` which already has the OR clause; no change needed here
- `src/scripts/ingest-run.ts` and `src/scripts/ai-run.ts` — pattern for the backfill script CLI structure

### Established Patterns
- TypeScript overloads with `$connect` duck-typing for DI (required for vitest; used in all DAL functions)
- `$transaction([...])` for multi-row atomic writes (used in pipeline step 5d for `TAGGED` + `ArticleBezirk` creation)
- `console.warn/error` structured logging (no external alerting services)
- `it.todo()` wave-0 stubs for test scaffolding before implementation files exist

### Integration Points
- `pipeline.ts` step 5c–5d: the `bezirkSlugs` loop is where `steiermark-weit` detection must be inserted
- `articles.ts` `listArticlesReader`: WHERE clause needs `OR [{ isStateWide: true }]` guard when `bezirkIds` is non-empty
- `Article.isStateWide Boolean @default(false)` — field already exists in the schema; no migration needed
- Backfill script reads from `db.article.findMany({ where: { bezirke: { none: {} }, status: { in: ['PUBLISHED','WRITTEN','REVIEW'] } } })`

</code_context>

<specifics>
## Specific Ideas

- No specific design references — this is a targeted bug fix
- The fix in `pipeline.ts` is minimal: a conditional check before the `bezirkSlugs.map(...)` call
- The backfill logic (`bezirke: { none: {} }`) is already expressible in Prisma without raw SQL

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-fix-state-wide-article-pipeline*
*Context gathered: 2026-03-25*
