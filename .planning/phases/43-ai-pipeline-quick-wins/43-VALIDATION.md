---
phase: 43
slug: ai-pipeline-quick-wins
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-11
---

# Phase 43 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `43-RESEARCH.md` → "Validation Architecture" section.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npx vitest run src/lib/ai/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~20 seconds (quick) / ~90 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/ai/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Requirement Verification Map

> Filled in per-task once PLAN.md files exist. Requirement-level rows below are the contract every task must satisfy.

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| AIPL-01 | Single `messages.create` call per FETCHED article | integration | `npx vitest run src/lib/ai/pipeline.test.ts` | ✅ (needs update — currently asserts 2 calls) | ⬜ pending |
| AIPL-01 | `runMergedCall` parses all 8 fields from `tool_use` block | unit | `npx vitest run src/lib/ai/steps/merged.test.ts` | ❌ W0 | ⬜ pending |
| AIPL-02 | Call uses `tools + tool_choice` with no `output_config` cast | unit | `npx vitest run src/lib/ai/steps/merged.test.ts` | ❌ W0 | ⬜ pending |
| AIPL-03 | `stop_reason=max_tokens` throws; `max_tokens=1024` in call args | unit | `npx vitest run src/lib/ai/steps/merged.test.ts` | ❌ W0 | ⬜ pending |
| AIPL-04 | Static prefix has `cache_control: {type: 'ephemeral'}`; dynamic suffix does not | unit | `npx vitest run src/lib/ai/steps/merged.test.ts` | ❌ W0 | ⬜ pending |
| AIPL-05 | `cachedInputTokens` and `cacheCreationTokens` returned from `runMergedCall` | unit | `npx vitest run src/lib/ai/steps/merged.test.ts` | ❌ W0 | ⬜ pending |
| AIPL-05 | PipelineRun `totalInputTokens` includes `cacheCreationTokens` | integration | `npx vitest run src/lib/ai/pipeline.test.ts` | ✅ (needs new case) | ⬜ pending |
| AIPL-06 | OTS extractor strips EMITTENT/WEBLINK/contact fields | unit | `npx vitest run src/lib/ai/extractors/` | ❌ W0 | ⬜ pending |
| AIPL-06 | RSS extractor pulls title + description/summary | unit | `npx vitest run src/lib/ai/extractors/` | ❌ W0 | ⬜ pending |
| AIPL-06 | `extractArticleText` dispatches by source type; default fallback for MANUAL | unit | `npx vitest run src/lib/ai/extractors/` | ❌ W0 | ⬜ pending |
| AIPL-07 | TAGGED article is picked up in the next pipeline run | integration | `npx vitest run src/lib/ai/pipeline.test.ts` | ✅ (needs flip — currently asserts NOT picked up) | ⬜ pending |
| AIPL-08 | `llmLocationFallback` token counts flow into PipelineRun totals | integration | `npx vitest run src/lib/ai/pipeline.test.ts` | ✅ (needs new case) | ⬜ pending |
| AIPL-09 | `Anthropic` client constructed with `maxRetries: 2` | unit | inspect `_clientFactory.create` in pipeline unit test | ✅ (verifiable) | ⬜ pending |
| AIPL-10 | Manual SQL — see "Manual-Only Verifications" | manual | N/A | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

New files (must exist before later waves can verify):

- [ ] `src/lib/ai/steps/merged.test.ts` — unit cases for AIPL-01/02/03/04/05
- [ ] `src/lib/ai/extractors/ots.ts` + `ots.test.ts` — AIPL-06 OTS coverage
- [ ] `src/lib/ai/extractors/rss.ts` + `rss.test.ts` — AIPL-06 RSS coverage
- [ ] `src/lib/ai/extractors/index.ts` + `index.test.ts` — AIPL-06 dispatch + fallback
- [ ] `src/test/fixtures/ai-merged/*.json` — fixture corpus (≥10 from draft, expanded toward 20)
- [ ] `scripts/ai-replay-fixtures.ts` — replay harness

Existing files (must be updated, not created):

- [ ] `pipeline.test.ts:277` — flip `TAGGED NOT reprocessed` → `TAGGED reprocessed` (AIPL-07)
- [ ] `pipeline.test.ts:39–84` — mock factory: collapse two alternating responses into one `tool_use` builder
- [ ] `pipeline.test.ts:19` — `llmLocationFallback` mock returns `{location, inputTokens, outputTokens}` shape (AIPL-08)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Orphaned TAGGED rows cleanup | AIPL-10 | One-off operational SQL, not a code path | Run the cleanup SQL on staging, confirm row count drops to 0 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
