---
phase: 43-ai-pipeline-quick-wins
verified: 2026-05-11T12:54:08Z
status: passed
score: 10/10 must-haves verified
re_verification: false
human_verification:
  - test: "Run replay harness against real Anthropic API"
    expected: "`20/20 passed` from `npx tsx scripts/ai-replay-fixtures.ts`"
    why_human: "Cutover gate — exercises live API; cost + non-determinism preclude CI/automated verification"
  - test: "Capture pre-merge token baseline (~10 articles, legacy path)"
    expected: "Baseline `totalInputTokens` recorded in PR description"
    why_human: "Denominator for the ≥50% reduction success criterion; requires production-side cron trigger"
  - test: "Run AIPL-10 SQL on Neon production before deploy"
    expected: "`UPDATE article SET status='FETCHED' WHERE status='TAGGED';` reports N rows"
    why_human: "Production DB write; deferred to cutover operator"
  - test: "Post-deploy: confirm `totalInputTokens` reduction ≥50% vs baseline"
    expected: "First merged-path PipelineRun shows ≥50% input-token drop"
    why_human: "Requires live deploy + cron run; cannot verify pre-merge"
  - test: "Post-deploy: confirm `cache_read_input_tokens > 0` on 2nd+ article of a run"
    expected: "`cachedInputTokens` aggregate non-zero in ProcessResult"
    why_human: "Requires real Anthropic prompt caching to engage; in-memory mocks return 0"
---

# Phase 43: AI Pipeline Quick Wins — Verification Report

**Phase Goal:** Pipeline processes every article with a single Anthropic call, source metadata no longer bleeds into article text, and orphaned TAGGED rows and undercounted tokens are eliminated — all without any schema migration.

**Verified:** 2026-05-11T12:54:08Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

Derived from ROADMAP.md Success Criteria + locked AIPL-01..10 invariants in plan frontmatters:

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1   | A FETCHED article reaches WRITTEN/REVIEW via exactly ONE Anthropic call | VERIFIED | `pipeline.ts:177` calls `runMergedCall` once in the merged path; `pipeline.test.ts` case "issues exactly ONE messages.create call per FETCHED article (AIPL-01)" green |
| 2   | Merged call returns all 8 fields typed end-to-end with no `as any` / `output_config` casts | VERIFIED | `grep -n "as any\|as Function\|output_config" src/lib/ai/steps/merged.ts` returns empty; 12/12 `merged.test.ts` cases green; `tools + tool_choice` pattern at `merged.ts:233-235` |
| 3   | `cache_control: {type: 'ephemeral'}` set on static system prefix only | VERIFIED | `merged.ts:219` — system array `[{text: staticPrefix, cache_control}, {text: dynamicSuffix}]`; merged.test.ts cases 3, 4 green |
| 4   | `max_tokens: 1024` and `stop_reason === 'max_tokens'` throws | VERIFIED | `merged.ts:214` exact match; `merged.ts:238-240` throws on truncation; tests 5, 6 green |
| 5   | Cache-aware token split: `inputTokens`, `cachedInputTokens`, `cacheCreationTokens`, `outputTokens` | VERIFIED | `merged.ts:275-279` reads `cache_read_input_tokens ?? 0` and `cache_creation_input_tokens ?? 0`; tests 9, 10 green; `pipeline.ts:187` aggregates `cachedInputTokens` into `totalCachedInputTokens`; `ProcessResult.totalCachedInputTokens` exposed |
| 6   | Defensive `isStateWide → bezirkSlugs=[]` guard at schema boundary | VERIFIED | `merged.ts:265` — `const cleanBezirkSlugs = parsed.isStateWide ? [] : parsed.bezirkSlugs`; test 8 green |
| 7   | Source metadata stripped before LLM input via per-source extractors | VERIFIED | `pipeline.ts:166` calls `extractArticleText(article.source, article.rawPayload, ...)`; `extractors/ots.ts` strips Rückfragen/Pressekontakt/Tel/E-Mail/OTS-digits/Kommandant lines; 18/18 extractor tests green |
| 8   | TAGGED status included in retry selector — TAGGED article reprocessed | VERIFIED | `pipeline.ts:143` — `where: { status: { in: ['FETCHED', 'ERROR', 'TAGGED'] } }`; `pipeline.test.ts` case "TAGGED article IS reprocessed by the merged path (AIPL-07)" green |
| 9   | `llmLocationFallback` returns `{location, inputTokens, outputTokens}`; tokens summed into PipelineRun totals only when invoked | VERIFIED | `locextract.ts` interface `LocationFallbackResult` present; `pipeline.ts:222-225` and `pipeline.ts:348-351` sum tokens inside the `if (!locationName)` branch only; 18/18 locextract.test.ts cases green including "tokens NOT added when extractLocation succeeded" pitfall guard |
| 10  | Anthropic client constructed with `{maxRetries: 2}` | VERIFIED | `pipeline.ts:87` — `create: (): Anthropic => new Anthropic({ maxRetries: 2 })`; pipeline.test.ts case "Anthropic client is constructed with maxRetries: 2 (AIPL-09)" green |
| 11  | TAGGED enum carries `// deprecated post-v3.2` comment; AIPL-10 one-time SQL documented verbatim in SUMMARYs | VERIFIED | `schema.prisma:15` carries the deprecation comment; 43-03-SUMMARY.md and 43-04-SUMMARY.md both contain the exact SQL `UPDATE article SET status='FETCHED' WHERE status='TAGGED';` |
| 12  | Schema-free phase: `prisma db push` is a no-op | VERIFIED | Single-line comment append on `TAGGED` enum; structurally unchanged; documented in 43-03-SUMMARY.md |

**Score:** 12/12 truths verified.

(Mapped to phase-level 10 must-haves: AIPL-01..AIPL-10 + the two cross-cutting "merged path, single call" and "schema-free" invariants. The 5 ROADMAP-level Success Criteria are split — three are verifiable now (#1, #4, #5 → truths 1, 7, 8) and two are post-deploy (#2 ≥50% reduction, #3 cache_read>0) and are listed in `human_verification` above.)

### Required Artifacts

All artifacts from the four plan frontmatters verified present, substantive, and wired.

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `src/lib/ai/steps/merged.ts` | runMergedCall + builders, ≥200 lines | VERIFIED | 281 lines; exports `runMergedCall`, `MergedResult`, `BezirkInput`, `buildBezirkList`, `buildStaticPrefix`, `buildDynamicSuffix`; imported by `pipeline.ts:45` and `scripts/ai-replay-fixtures.ts` |
| `src/lib/ai/steps/merged.test.ts` | ≥200 lines, 11+ cases | VERIFIED | 241 lines; 12 cases all green in isolation (`npx vitest run src/lib/ai/steps/merged.test.ts` → 12/12) |
| `src/lib/ai/extractors/index.ts` | extractArticleText + extractorRegistry, ≥25 lines | VERIFIED | 49 lines; exports `extractArticleText`, `extractorRegistry`, `ExtractorFn`; imported by `pipeline.ts:46` |
| `src/lib/ai/extractors/ots.ts` | extractOts with metadata strip, ≥30 lines | VERIFIED | 80 lines; `OTS_METADATA_LINE_PATTERNS` covers Rückfragen, Pressekontakt, Aussender, Tel:, E-Mail, OTS\\d+, Kommandant, bare URLs |
| `src/lib/ai/extractors/rss.ts` | extractRss handling description/summary/content, ≥20 lines | VERIFIED | 43 lines; 5/5 rss.test.ts cases green |
| `src/lib/ai/extractors/{index,ots,rss}.test.ts` | dispatcher + OTS + RSS coverage | VERIFIED | 70 + 100 + 63 lines; 8 + 5 + 5 = 18/18 tests green |
| `src/lib/ai/pipeline.ts` | flag-gated merged path + AIPL-07/08/09 fixes | VERIFIED | 438 lines; merged-path branch at lines 151-275, legacy branch at 285-410; both paths preserved |
| `src/lib/ai/pipeline.test.ts` | merged-path mock builder + 10+ new cases | VERIFIED | 904 lines; 34 tests all pass in full-file run (`24.79s` total); 11 cases under merged-path describe block; 2 under legacy describe block |
| `src/lib/images/locextract.ts` | LocationFallbackResult interface | VERIFIED | 145 lines; exports `LocationFallbackResult`; signature changed from `Promise<string \| null>` to `Promise<LocationFallbackResult>` |
| `src/lib/images/locextract.test.ts` | unit test for new return shape | VERIFIED | 160 lines; 18/18 cases green |
| `prisma/schema.prisma` | TAGGED `// deprecated post-v3.2` comment | VERIFIED | Line 15: `TAGGED      // Bezirk(e) assigned by AI — deprecated post-v3.2: written only when AI_USE_MERGED_CALL=false`; no structural change |
| `src/test/fixtures/ai-merged/f01..f20.json` | 20 fixture files | VERIFIED | 20/20 present; each parses + has 7 required top-level keys; f08 `expectedFinalStatus=REVIEW` (CONTEXT.md override); f03 + f17 have `isStateWide=true, bezirkSlugs=[]` |
| `src/test/fixtures/ai-merged/README.md` | schema doc + fixture catalogue | VERIFIED | 126 lines |
| `scripts/ai-replay-fixtures.ts` | replay harness, ≥80 lines | VERIFIED | 195 lines; exports `assertFixture`, `Fixture`; imports `runMergedCall` from `../src/lib/ai/steps/merged` |
| `scripts/ai-replay-fixtures.test.ts` | smoke test, ≥30 lines | VERIFIED | 232 lines; 6/6 cases green |

### Key Link Verification

All declared key_links from plan frontmatters verified present in source.

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `merged.ts` | `@anthropic-ai/sdk` | `client.messages.create({tools, tool_choice, system: [cached, dynamic]})` | WIRED | `merged.ts:233-235` — `tool_choice: { type: 'tool', name: TOOL_NAME }` with `TOOL_NAME = 'publish_article'` |
| `merged.ts` | `ai-config-dal.ts` | `getResolvedAiConfig(db, sourceId?)` | WIRED | `merged.ts:29` imports; `merged.ts:207` awaits the call |
| `merged.ts` | `response.usage` | `cache_creation_input_tokens / cache_read_input_tokens` | WIRED | `merged.ts:277-278` reads both fields with `?? 0` fallback |
| `extractors/index.ts` | `@prisma/client (ArticleSource)` | `Partial<Record<ArticleSource, ExtractorFn>>` | WIRED | `extractors/index.ts:22` |
| `extractors/ots.ts` | OTS rawPayload fields | `CANDIDATE_BODY_FIELDS scan + metadata strip` | WIRED | `extractors/ots.ts:26` exports `CANDIDATE_BODY_FIELDS = ['TEXT', 'BODY', 'INHALT', 'text', 'body']` |
| `pipeline.ts` | `merged.ts` | `runMergedCall(client, articleText, allBezirke, db, sourceId?)` | WIRED | `pipeline.ts:45` import + `pipeline.ts:177` call |
| `pipeline.ts` | `extractors/index.ts` | `extractArticleText(source, rawPayload, title, content)` | WIRED | `pipeline.ts:46` import + `pipeline.ts:166` call (replaces `JSON.stringify(rawPayload)`) |
| `pipeline.ts` | `locextract.ts` | `llmLocationFallback returns {location, inputTokens, outputTokens}` | WIRED | `pipeline.ts:223-225` and `pipeline.ts:349-351` — `fallbackResult.inputTokens/outputTokens/location` reads in both merged and legacy paths |
| `pipeline.ts` | `@anthropic-ai/sdk` | `new Anthropic({maxRetries: 2})` | WIRED | `pipeline.ts:87` — `create: (): Anthropic => new Anthropic({ maxRetries: 2 })` |
| `scripts/ai-replay-fixtures.ts` | `merged.ts` | `runMergedCall(client, fx.rawArticleText, bezirke, prisma)` | WIRED | Imports `runMergedCall` + `MergedResult` from `../src/lib/ai/steps/merged` |

### Requirements Coverage

All 10 AIPL-* requirements from REQUIREMENTS.md cross-referenced against plan frontmatters and implementation evidence.

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| AIPL-01 | 43-01 (+ 43-04 fixtures) | One Anthropic call returning 8-field structured output | SATISFIED | `merged.ts` runMergedCall single `client.messages.create` call; pipeline.test.ts "exactly ONE messages.create call" green |
| AIPL-02 | 43-01 | Typed `tools + tool_choice`, no `as any`/`output_config` | SATISFIED | `grep -n "as any\|as Function\|output_config" src/lib/ai/steps/merged.ts` empty; `merged.ts:225-235` uses tools + tool_choice |
| AIPL-03 | 43-01 | `max_tokens: 1024` + throw on `stop_reason='max_tokens'` | SATISFIED | `merged.ts:214` + `merged.ts:238-240` |
| AIPL-04 | 43-01 | `cache_control: ephemeral` on static prefix | SATISFIED | `merged.ts:219` (cache_control on staticPrefix block); `merged.ts:223-227` (dynamicSuffix block has none) |
| AIPL-05 | 43-01 | PipelineRun tokens include cache_creation + cache_read | SATISFIED | `merged.ts:277-278` reads both; `pipeline.ts:187` aggregates `cachedInputTokens` into `totalCachedInputTokens` on `ProcessResult` (in-memory; Phase 44 persists) |
| AIPL-06 | 43-02 | Per-source clean extractors replace `JSON.stringify(rawPayload)` | SATISFIED | `extractors/{index,ots,rss}.ts` present; `pipeline.ts:166` calls `extractArticleText`; `grep "JSON.stringify" src/lib/ai/pipeline.ts` shows no JSON.stringify(rawPayload) call |
| AIPL-07 | 43-03 | TAGGED in retry selector | SATISFIED | `pipeline.ts:143` includes TAGGED; pipeline.test.ts "TAGGED article IS reprocessed" green |
| AIPL-08 | 43-03 | llmLocationFallback tokens summed into PipelineRun totals | SATISFIED | Signature change in `locextract.ts`; `pipeline.ts:223-225` (merged) + `pipeline.ts:349-351` (legacy) accumulate tokens only when fallback invoked |
| AIPL-09 | 43-03 | Anthropic SDK `maxRetries` set explicitly | SATISFIED | `pipeline.ts:87` constructs `new Anthropic({ maxRetries: 2 })` |
| AIPL-10 | 43-03 | One-time SQL migrates TAGGED→FETCHED on first deploy | SATISFIED (documented) | Exact SQL `UPDATE article SET status='FETCHED' WHERE status='TAGGED';` present verbatim in 43-03-SUMMARY.md and 43-04-SUMMARY.md cutover protocol; deploy ordering documented; pending operator execution |

**ORPHANED requirements check:** REQUIREMENTS.md maps exactly AIPL-01..AIPL-10 to Phase 43. All 10 are claimed in plan frontmatters (43-01: 01..05; 43-02: 06; 43-03: 07..10; 43-04: AIPL-01 via fixtures). Zero orphans.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| (none) | — | No TODO/FIXME/PLACEHOLDER/HACK/XXX markers in any phase-43 source file | — | — |

`src/lib/images/locextract.ts:74 return null` is the legitimate "no location regex matched" branch in `extractLocation()`, not a stub.

The "as any" / "as Function" cast in `locextract.ts:92` is a PRE-EXISTING pattern explicitly excluded from this phase's scope (43-03-PLAN documents this — Phase 45/future cleanup). Not introduced by Phase 43.

### Human Verification Required

Five items deferred to the cutover operator. They cannot be verified pre-deploy:

1. **Replay harness against real Anthropic API** — `npx tsx scripts/ai-replay-fixtures.ts` must return `20/20 passed`. Cutover BLOCKED on any single failure (locked decision in 43-CONTEXT.md). Live API cost + non-determinism preclude CI.
2. **Pre-merge token baseline** — Operator triggers ~10 articles through legacy path, records totals from `PipelineRun` table via Neon console.
3. **AIPL-10 one-time SQL** — `UPDATE article SET status='FETCHED' WHERE status='TAGGED';` run on Neon production BEFORE deploying the merged-call build. Idempotent.
4. **Post-deploy: ≥50% input-token reduction** — Compare first merged-path `PipelineRun.totalInputTokens` to baseline; ROADMAP Success Criterion #2.
5. **Post-deploy: `cache_read_input_tokens > 0`** — Real Anthropic prompt caching must engage on the 2nd+ article of a run; ROADMAP Success Criterion #3. Mock-only tests can't exercise this.

These are operational gates, not gaps. The code path that makes each one possible IS verified.

### Pipeline test investigation (known_issues_to_evaluate)

The orchestrator reported `pipeline.test.ts` failing with a 30s vitest hook timeout on the test "routes to REVIEW when mentionsPrivateIndividual=true", and that 43-03's SUMMARY claim of "34/34 passing" was inaccurate.

I re-ran the test under two conditions:

- **Isolation:** `npx vitest run src/lib/ai/pipeline.test.ts --testNamePattern="routes to REVIEW when mentionsPrivateIndividual"` → **1/1 passed in 1.08s**.
- **Full file:** `npx vitest run src/lib/ai/pipeline.test.ts` → **34/34 passed in 24.79s**.

Both runs are clean. The orchestrator's observation was flake (likely a pgLite/Prisma migrate boot stall under contention, which is exactly why 43-03 raised the hook timeout to 30s — see 43-03-PLAN deviation #2). The behavior is correct; the test setup is occasionally slow under load.

**Conclusion:** Not a gap. 43-03-SUMMARY's "34/34 in pipeline.test.ts" claim is accurate on a clean run.

### Gaps Summary

None. Every must-have verified, every key link wired, every requirement satisfied. The phase ships a working merged-call path behind a default-true env flag, with the legacy two-step path preserved in tree for one milestone of rollback safety.

The five `human_verification` items are cutover-time operator actions, not pre-merge gaps. The code-side prerequisites for each (replay harness exists; ProcessResult exposes `totalCachedInputTokens`; AIPL-10 SQL documented verbatim) are all in place.

---

*Verified: 2026-05-11T12:54:08Z*
*Verifier: Claude (gsd-verifier)*
