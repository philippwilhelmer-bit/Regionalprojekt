---
phase: 3
slug: ai-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 2.1.9 |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run src/lib/ai/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/ai/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 0 | AI-01, AI-02, AI-03, AI-04, SEO-02 | unit stubs | `npx vitest run src/lib/ai/` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 1 | AI-02 | unit | `npx vitest run src/lib/ai/steps/step1-tag.test.ts -t "writes ArticleBezirk"` | ❌ W0 | ⬜ pending |
| 3-01-03 | 01 | 1 | AI-01, AI-02 | unit | `npx vitest run src/lib/ai/pipeline.test.ts -t "TAGGED"` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 1 | AI-01, SEO-02 | unit | `npx vitest run src/lib/ai/steps/step2-write.test.ts` | ❌ W0 | ⬜ pending |
| 3-02-02 | 02 | 1 | AI-01 | unit | `npx vitest run src/lib/ai/pipeline.test.ts -t "advances FETCHED"` | ❌ W0 | ⬜ pending |
| 3-03-01 | 03 | 1 | AI-03 | unit | `npx vitest run src/lib/ai/pipeline.test.ts -t "REVIEW"` | ❌ W0 | ⬜ pending |
| 3-04-01 | 04 | 1 | AI-04 | unit | `npx vitest run src/lib/ai/circuit-breaker.test.ts` | ❌ W0 | ⬜ pending |
| 3-04-02 | 04 | 1 | AI-04 | unit | `npx vitest run src/lib/ai/circuit-breaker.test.ts -t "console.warn"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/ai/pipeline.test.ts` — stubs for AI-01, AI-02, AI-03, SEO-02 integration
- [ ] `src/lib/ai/steps/step1-tag.test.ts` — stubs for AI-02 (Step 1 structured output parsing)
- [ ] `src/lib/ai/steps/step2-write.test.ts` — stubs for AI-01, SEO-02 (Step 2 structured output parsing)
- [ ] `src/lib/ai/circuit-breaker.test.ts` — stubs for AI-04
- [ ] New Prisma migration adding `Article.seoTitle String?` and `PipelineRun` model
- [ ] `cleanDb()` update in `src/test/setup-db.ts` to include `db.pipelineRun.deleteMany()`
- [ ] `npm install @anthropic-ai/sdk` — SDK not yet in `package.json`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| German-language output quality | AI-01 | Prompt wording is LOW confidence; real OTS content validation deferred to Phase 7 | Inspect generated article text for correct Hochdeutsch |
| Console alert visible to operator | AI-04 | Requires simulated threshold breach in a running process | Run `scripts/ai-run.ts` with low threshold; verify `console.warn` appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
