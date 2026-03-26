---
phase: 20
slug: search-categories
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/lib/content/articles.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/content/articles.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 20-01-01 | 01 | 1 | SRCH-01 | unit | `npx vitest run src/lib/content/articles.test.ts` | ❌ W0 | ⬜ pending |
| 20-01-02 | 01 | 1 | SRCH-02 | unit | `npx vitest run src/lib/content/articles.test.ts` | ❌ W0 | ⬜ pending |
| 20-01-03 | 01 | 1 | SRCH-03 | unit | `npx vitest run src/lib/content/articles.test.ts` | ❌ W0 | ⬜ pending |
| 20-01-04 | 01 | 1 | SRCH-04 | unit | `npx vitest run src/lib/content/articles.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/content/articles.test.ts` — add `listArticlesForSearch()` test cases (file exists, new tests needed)
- [ ] Optionally extract filter logic to pure function for unit testability

*Existing infrastructure covers test framework and config.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Serif search input renders with correct font | SRCH-01 | Visual styling | Open `/suche`, verify Newsreader font on input |
| Pill horizontal scroll on mobile | SRCH-02 | Touch interaction | Open on mobile viewport, swipe pills |
| Category grid hover states | SRCH-03 | Visual interaction | Hover over grid cards, verify border/color change |
| Empfohlene section visibility toggle | SRCH-04 | UI state transition | Type query, verify section hides; clear, verify it returns |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
