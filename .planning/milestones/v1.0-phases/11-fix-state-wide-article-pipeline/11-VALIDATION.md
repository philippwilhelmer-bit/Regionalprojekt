---
phase: 11
slug: fix-state-wide-article-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (confirmed, all 192 tests pass) |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run src/lib/ai/pipeline.test.ts src/lib/content/articles.test.ts src/lib/ai/steps/step1-tag.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds (quick), ~30 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/ai/pipeline.test.ts src/lib/content/articles.test.ts src/lib/ai/steps/step1-tag.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green (192+ tests)
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 0 | AI-02, READ-06 | unit | `npx vitest run src/lib/ai/pipeline.test.ts src/lib/content/articles.test.ts src/lib/ai/steps/step1-tag.test.ts` | ✅ (extend) | ⬜ pending |
| 11-01-02 | 01 | 1 | AI-02 | integration | `npx vitest run src/lib/ai/pipeline.test.ts` | ✅ (extend) | ⬜ pending |
| 11-01-03 | 01 | 1 | AI-02 | unit | `npx vitest run src/lib/ai/steps/step1-tag.test.ts` | ✅ (extend) | ⬜ pending |
| 11-01-04 | 01 | 1 | READ-06 | integration | `npx vitest run src/lib/content/articles.test.ts` | ✅ (extend) | ⬜ pending |
| 11-01-05 | 01 | 2 | AI-02, READ-06 | integration | `npx vitest run` | ✅ (extend) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/ai/pipeline.test.ts` — add `it.todo()` stubs for:
  - "sets isStateWide=true when step1 returns steiermark-weit"
  - "creates no ArticleBezirk rows for state-wide article"
  - "logs console.warn when steiermark-weit co-returned with other slugs"
- [ ] `src/lib/content/articles.test.ts` — add `it.todo()` stubs for:
  - "listArticlesReader includes isStateWide articles when bezirkIds filter active"
  - "listArticlesReader excludes non-matching non-state-wide articles"
- [ ] `src/lib/ai/steps/step1-tag.test.ts` — add `it.todo()` stub for:
  - "system prompt contains steiermark-weit exclusivity instruction"

*All test files already exist; only todo stubs need adding.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Backfill script identifies correct articles | AI-02 | Requires reviewing candidate articles in real DB before committing | Run `npx tsx src/scripts/backfill-state-wide.ts --dry-run`, verify output matches expected affected articles |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
