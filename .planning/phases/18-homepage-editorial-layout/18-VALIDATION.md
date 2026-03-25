---
phase: 18
slug: homepage-editorial-layout
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/test/articles-phase18.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/test/articles-phase18.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 18-01-01 | 01 | 1 | HOME-01 | unit | `npx vitest run src/test/articles-phase18.test.ts` | ❌ W0 | ⬜ pending |
| 18-01-02 | 01 | 1 | HOME-02 | unit | `npx vitest run src/test/articles-phase18.test.ts` | ❌ W0 | ⬜ pending |
| 18-01-03 | 01 | 1 | HOME-03 | unit | `npx vitest run src/test/articles-phase18.test.ts` | ❌ W0 | ⬜ pending |
| 18-01-04 | 01 | 1 | HOME-04 | unit | `npx vitest run src/test/articles-phase18.test.ts` | ❌ W0 | ⬜ pending |
| 18-xx-xx | xx | x | HOME-04 | manual | N/A | manual-only | ⬜ pending |
| 18-xx-xx | xx | x | HOME-01 | manual | N/A | manual-only | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/test/articles-phase18.test.ts` — stubs for HOME-01 (getFeaturedArticle), HOME-02 (getPinnedArticles), HOME-03 (groupByBezirk util), HOME-04 (hasEilmeldung)
- [ ] Prisma migration must exist before tests run — `createTestDb()` in `setup-db.ts` auto-loads all migration SQL from disk

*Existing `setup-db.ts` and `validation.test.ts` infrastructure is fully compatible — no changes to shared test utilities needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hero visible without scrolling on mobile | HOME-01 | Full-bleed visual layout requires browser rendering | Load homepage on mobile viewport, verify hero fills screen above fold |
| Banner absent when no Eilmeldung flagged | HOME-04 | Sticky banner positioning requires browser rendering | Ensure no articles have isEilmeldung=true, verify banner element is not in DOM |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
