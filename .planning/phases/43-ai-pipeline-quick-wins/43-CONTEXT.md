# Phase 43: AI Pipeline Quick Wins - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the dual `step1-tag` + `step2-write` Anthropic flow in `src/lib/ai/pipeline.ts` with a single structured-output (`tool_use`) call (`runMergedCall`), enable prompt caching on the static system prefix (role + rules + Bezirk list), strip source metadata from LLM input via per-source clean extractors, and fix the two accounting bugs (map-LLM tokens uncounted, SDK retries inflating `Article.retryCount`) plus the TAGGED orphan state. Schema-free: `prisma db push` must be a no-op. Telemetry columns (Phase 44), Batches API (Phase 44), and REVIEW heuristic sharpening (Phase 45) are explicitly out of scope.

Bundles manifest items A1, A2, A3, A6, A7, A8. Covers requirements AIPL-01 through AIPL-10.

</domain>

<decisions>
## Implementation Decisions

### Cutover & Rollback

- Flag-gated fallback for one milestone: env var `AI_USE_MERGED_CALL`, default `'true'`. Toggle = redeploy (no admin UI, no DB column).
- `pipeline.ts` branches inside the per-article loop on this flag: `'true'` → `runMergedCall`, `'false'` → existing `runStep1Tag` + `runStep2Write` path.
- `pipeline.ts` is modified in place; do **not** extract a `processOneArticle` helper.
- `step1-tag.ts`, `step2-write.ts`, `step1-tag.test.ts`, `step2-write.test.ts`, `step2-write-source-override.test.ts` stay in tree until v3.3 cleanup phase (single coordinated removal when the flag is dropped).

### Quality Gate & Baseline (pre-cutover)

- Fixture corpus: **20 fixtures** (drafts ship 10 in `43-01-test-fixtures-DRAFT.md`; the plan expands to 20 covering edge cases like long-form articles, mixed-Bezirk, contact-block-heavy OTS, multi-paragraph leads, synonym disambiguation).
- Pass bar: **all 20 must satisfy `bodyMustContain` / `bodyMustNotContain` / classification invariants**. Any single failure blocks cutover.
- Replay harness `scripts/ai-replay-fixtures.ts` runs **once, manually, before merging the PR**. Output pasted into PR description and into the plan file. No CI integration in this phase (Phase 45 territory).
- Pre-merge token baseline: trigger one or two real cron runs on production against the **current two-step pipeline**, capture `totalInputTokens` / `totalOutputTokens` from `PipelineRun` for ~10 articles, paste numbers into the plan file as the baseline for Success Criterion 2 (≥50% input-token reduction).

### LLM Output for No-Steiermark Articles (resolves draft Q3)

- When `bezirkSlugs=[]` AND `isStateWide=false` (article has no Steiermark relevance) → final status = `REVIEW`.
- Reuse the existing REVIEW path — **no new column** (`reviewReason` declined, schema-free constraint). Editor reads the body to know why.
- If BOTH `mentionsPrivateIndividual=true` AND no-regional-relevance → still `REVIEW`. Single status, no priority encoding, no log differentiation.
- Fixture `f08-bundes-pensionsreform-no-relevance.json` updated: `expectedFinalStatus: 'REVIEW'` (was `WRITTEN` in draft), with a note explaining the Phase 43 decision.
- Editor approving a REVIEW article with no Bezirk → publishes globally with no Bezirk badge. Reuses existing state-wide rendering pattern from v3.0. No CMS change needed (no forced Bezirk assignment).

### TAGGED Orphan Migration

- Ship BOTH AIPL-07 (retry selector includes TAGGED) and AIPL-10 (one-time SQL `UPDATE article SET status='FETCHED' WHERE status='TAGGED'`). Defense in depth.
- One-time SQL is **manual via Neon console / psql** just before merging the PR. Exact SQL block written into the plan file. No code path, no idempotent admin route.
- After cutover: `TAGGED` becomes a deprecated enum value, kept in `schema.prisma` to avoid a migration. Add a `// deprecated post-v3.2` comment on the enum value.
- Rollback case: if the flag flips back to `'false'`, the two-step path still writes TAGGED; the retry-selector inclusion ensures crash recovery still works. No runtime block on rollback, no TAGGED-count gate.

### Locked from drafts and prior phases (carrying forward, do not re-decide)

- Single `tool_use` call with `tools: [{name, input_schema}] + tool_choice: {type:'tool', name:'publish_article'}` — drops the `output_config as any` cast (P2-TP-5).
- All-German prompt (resolves P3-TP-1).
- Combined schema: `{bezirkSlugs, isStateWide, mentionsPrivateIndividual, headline, lead, body, seoTitle, metaDescription}` (8 required fields).
- `max_tokens: 1024`; throw on `stop_reason === 'max_tokens'`.
- System sent as array of content blocks. Static prefix (role + rules + Bezirk list) gets `cache_control: {type: 'ephemeral'}`. Dynamic suffix (tone/length/styleNotes from `getResolvedAiConfig`) sits after, uncached.
- `isStateWide: boolean` replaces the `'steiermark-weit'` magic slug at the prompt/code boundary. The magic slug itself is removed from `prisma/seed-data/bezirke.ts` if present, and dropped from the `BEZIRK_LIST` passed to the LLM. Defensive guard in code: if model returns `isStateWide=true` with non-empty `bezirkSlugs`, prefer `isStateWide` and clear slugs (with `console.warn`).
- `hasNamedPerson` → `mentionsPrivateIndividual` with **current rules** (real, living, named individual). Officeholder sharpening explicitly deferred to Phase 45 (fixture `f05-officeholder-eroeffnung` is the regression marker — its expected output flips in Phase 45).
- Per-source clean extractors: `src/lib/ai/extractors/ots.ts` (pulls `TITEL` + body via existing `extractBody`, drops `EMITTENT`/`WEBLINK`/`Rückfragen`/contact-block fragments) and `src/lib/ai/extractors/rss.ts` (pulls title + description/content). Default fallback for unknown source types: `[title, content].join('\n\n')`.
- Sum `llmLocationFallback` token usage into PipelineRun `totalInputTokens` / `totalOutputTokens` (AIPL-08, fixes P2-CC-3).
- Anthropic SDK `maxRetries` set explicitly (e.g. `new Anthropic({maxRetries: 2})`) so SDK transient retries don't inflate `Article.retryCount` (AIPL-09).
- PipelineRun token accounting extended to include `cache_creation_input_tokens` (added to `totalInputTokens`) and `cache_read_input_tokens` (new running aggregate exposed via `usage.cache_read_input_tokens ?? 0`). The PipelineRun column shape itself does NOT change (Phase 44 territory) — `totalInputTokens` keeps its meaning by including cache writes; cache reads are surfaced via the return type for downstream telemetry.
- Side-by-side replay diff is the cutover gate, not a side test.

### Claude's Discretion

- The 10 additional fixture topics (the corpus expansion from 10 → 20). Claude curates from production archive: long-form articles, mixed-Bezirk, contact-block-heavy OTS, multi-paragraph leads, synonym disambiguation, etc.
- Replay-harness output format (markdown table, plain text, JSON — whatever is most readable in the PR).
- Exact wording of the German prompt's static prefix — draft `43-01-merged-prompt-DRAFT.md` is the starting point; minor refinements during planning/research are fine.
- Plan breakdown / sequencing within Phase 43 (the `TEXT-ENGINE-OPTIMIZATION-PLAN.md` proposes four plans 43-01..43-04 — final breakdown is the planner's call).
- Whether to wrap the per-article merged call write in a fresh `db.$transaction` or sequential awaits (draft sketch shows transactional — confirm during planning).
- Whether the `EXTRACTORS` registry pattern matches the existing `adapters/registry.ts` style (likely yes for consistency).
- Replay-harness Anthropic spend budget. The 20-fixture run is one-shot and cheap; no cap needed unless iterating heavily.

</decisions>

<specifics>
## Specific Ideas

- **The authoritative implementation spec is already drafted.** `.planning/drafts/43-01-merged-prompt-DRAFT.md` contains the merged-call schema, full German prompt, call shape (target file `src/lib/ai/steps/merged.ts`), pipeline integration diff, test list, and impact estimate. `.planning/drafts/43-01-test-fixtures-DRAFT.md` contains the 10-fixture catalogue, fixture JSON shape, replay-harness scaffold (`scripts/ai-replay-fixtures.ts`), and the cross-phase fixture role table. Planner and researcher should treat these as the spec, not as draft commentary.
- Manifest item bundling per `.planning/TEXT-ENGINE-OPTIMIZATION-PLAN.md` Phase 43 section: A1 (merge), A2 (cache), A3 (clean extractors), A6 (max_tokens=1024), A7 (map-LLM tokens), A8 (TAGGED in retry selector).
- Phase 43 must remain schema-free: `prisma db push` is a no-op. Anything that needs `Article` columns belongs in Phase 44.
- The two open questions in `43-01-merged-prompt-DRAFT.md` that were deferred:
  - Q2 (bezirk *names* instead of slugs to the LLM): out of scope, defer to v3.3.
  - Q4 (cache-write vs cache-read pricing split): the draft's current approach (cache writes folded into `totalInputTokens`, cache reads exposed separately for Phase 44 telemetry) stands.
- Cost expectation per draft impact table: ~50% input-token reduction on cache miss, ~75% on cache hit (cache-hit dominates in steady state because one cron run typically processes 5–30 articles within seconds, well inside the 5-minute ephemeral cache TTL).

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets

- `src/lib/ai/pipeline.ts` — orchestrator with the per-article for-loop (`for (const article of articles)` at line 107); modified in place. `_clientFactory.create` at lines 48–50 is the test-overridable Anthropic factory; the merged call uses the same factory pattern.
- `src/lib/ai/steps/step1-tag.ts:51-77` — `buildBezirkContext()` produces the `slug (name): synonym1, ...` line format the new `buildBezirkList` in `merged.ts` will replicate; reuse the logic verbatim, just rename and host in `merged.ts`.
- `src/lib/admin/ai-config-dal.ts` — `getResolvedAiConfig(db, sourceId?)` returns `{tone, articleLength, styleNotes, modelOverride}` after merging `AiSourceConfig` overrides onto global `AiConfig`. Drives the dynamic suffix.
- `src/lib/admin/pipeline-config-dal.ts` — `getPipelineConfig(db)` returns `{maxRetryCount, deadManThresholdHours}`. Available pattern if a config-driven flag were ever wanted (we picked env var instead).
- `src/lib/ingestion/adapters/ots-at.ts:80-109` — existing `extractBody()` walks `CANDIDATE_BODY_FIELDS`. The new `extractors/ots.ts` can call into this or duplicate the small candidate list. `OTSKEY`, `TITEL`, `WEBLINK`, `ZEITSTEMPEL` are the real OTS field names visible at lines 161–167.
- `src/lib/ingestion/adapters/rss.ts` — `rawPayload: item` (line 61) and `rawPayload: entry` (line 84) are the two RSS payload shapes. The new `extractors/rss.ts` discriminates between them.
- `src/lib/ai/circuit-breaker.ts` and the `PipelineRun` row written at `pipeline.ts:88-91` and closed at `pipeline.ts:242-251` — token-accounting touchpoints. Adding cache_creation_input_tokens into `totalInputTokens` is a one-line change at line 124 (and the merged-call equivalent).
- `src/lib/images/locextract.ts` — `llmLocationFallback(anthropicClient, text)` already returns `{location, inputTokens, outputTokens}` (verify shape during planning); AIPL-08 sums these into `totalInputTokens`/`totalOutputTokens` at the pipeline level, around `pipeline.ts:179`.
- `prisma/schema.prisma:15` — `TAGGED` enum value already exists; stays. Line 61 — `Article.isStateWide` boolean already exists; the merged call simply writes it directly instead of inferring from a magic slug.

### Established Patterns

- **DI via `$connect` duck-typing** (`pipeline.ts:67-73`, `ots-at.ts:120-122`) — `runMergedCall` follows the same pattern: accept optional `PrismaClient`, fall back to singleton. Tests inject a mocked client.
- **Anthropic mocking pattern** (`step1-tag.test.ts`, `step2-write.test.ts`) — `vi.fn().mockResolvedValue` on `client.messages.create`. `merged.test.ts` mirrors this; new `makeToolUseBlock(input)` helper for `tool_use` content blocks.
- **Per-article try/catch with retryCount** (`pipeline.ts:107-238`) — already increments `retryCount`, transitions ERROR ↔ FAILED at `maxRetryCount`. Merged path slots into the same try block; the AIPL-09 SDK-retries fix lives at the Anthropic-client construction site, not in this loop.
- **Map block isolated by inner try/catch** (`pipeline.ts:174-205`) — never affects article status. Preserved as-is; AIPL-08 only adds token accounting around the existing `llmLocationFallback` call.
- **No-line architectural rule (visual)** — not relevant; backend-only milestone.
- **`as any` already in two places** (`step1-tag.ts:109`, `step2-write.ts:119`) — both vanish with the typed `tools` path.

### Integration Points

- `pipeline.ts:107-238` — entire per-article loop is the integration site. New code replaces lines ~110–219 when flag is on.
- `pipeline.ts:124-125` (Step 1 token sum) and `pipeline.ts:169-170` (Step 2 token sum) collapse into one merged-call sum.
- `pipeline.ts:128-134` — `'steiermark-weit'` warning logic deleted; replaced by the defensive `isStateWide ? [] : bezirkSlugs` guard.
- `pipeline.ts:208` — `finalStatus = step1.hasNamedPerson ? 'REVIEW' : 'WRITTEN'` becomes `finalStatus = computeFinalStatus(merged)` where the helper encodes: (a) `mentionsPrivateIndividual` → REVIEW; (b) empty `bezirkSlugs` + `!isStateWide` → REVIEW (Phase 43 decision); (c) otherwise WRITTEN.
- `src/lib/ai/steps/merged.ts` — new file, target of all the merged-call code per the draft.
- `src/lib/ai/extractors/ots.ts`, `src/lib/ai/extractors/rss.ts`, plus a tiny `src/lib/ai/extractors/index.ts` (registry-style dispatcher keyed off `Source` type or `article.source`) — new files, wired in at the article-text-build site in `pipeline.ts:110-120`.
- `src/test/fixtures/ai-merged/*.json` — 20 fixture files (10 drafted + 10 curated during the plan).
- `scripts/ai-replay-fixtures.ts` — new script, run manually before cutover.
- `prisma/schema.prisma` — only edit is a `// deprecated post-v3.2: written only when AI_USE_MERGED_CALL=false` comment on the `TAGGED` enum value. No structural change.
- One-time SQL `UPDATE article SET status='FETCHED' WHERE status='TAGGED';` documented in `43-XX-PLAN.md` and run manually against Neon prod just before the deploy.

</code_context>

<deferred>
## Deferred Ideas

- **`Article.reviewReason` column** — adds editor clarity for why an article is in REVIEW. Declined for Phase 43 (schema-free constraint). Reconsider in Phase 45 if editor demand emerges during the REVIEW-queue cleanup work.
- **CI integration of the replay harness** — Phase 45 (eval-harness scope, QUAL-08/QUAL-10).
- **Partial rollout per source** (some sources on merged, others on two-step) — not requested. Defer indefinitely; the env-var binary flag is sufficient.
- **Runtime block on rollback while TAGGED rows exist** — low-probability scenario. Defer; ops can resolve manually via psql if it ever matters.
- **Force editor to assign a Bezirk before publishing a no-relevance REVIEW article** — declined. Auto-publishes globally is sufficient.
- **Bezirk *names* instead of *slugs* to the LLM** (manifest P3-TP-2, draft Q2) — defer to v3.3.
- **Decoupled SEO pass with cached LLM** (manifest C3) — defer to v3.3+.
- **Source-quality back-feed to Step 1 prompt** (manifest C4) — defer; needs Phase 44 telemetry data first.
- **`p-limit(4)` concurrency on the per-article path** (manifest B6) — kept as the Phase 44 fallback if Batches API latency proves unfit; not part of Phase 43.

</deferred>

---

*Phase: 43-ai-pipeline-quick-wins*
*Context gathered: 2026-05-11*
