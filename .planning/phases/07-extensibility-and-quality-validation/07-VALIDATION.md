---
phase: 7
slug: extensibility-and-quality-validation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^2.1.9 |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run src/test/validation.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/test/validation.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 7-01-01 | 01 | 0 | ING-02 | setup | `npx vitest run src/test/validation.test.ts` | ❌ W0 | ⬜ pending |
| 7-01-02 | 01 | 0 | ING-03 | setup | `npx vitest run src/test/validation.test.ts` | ❌ W0 | ⬜ pending |
| 7-02-01 | 02 | 1 | ING-02 | integration | `npx vitest run src/test/validation.test.ts` | ❌ W0 | ⬜ pending |
| 7-02-02 | 02 | 1 | ING-03 | integration | `npx vitest run src/test/validation.test.ts` | ❌ W0 | ⬜ pending |
| 7-03-01 | 03 | 1 | SC-3 | integration | `npx vitest run src/test/validation.test.ts` | ❌ W0 | ⬜ pending |
| 7-04-01 | 04 | 1 | SC-4 | integration | `npx vitest run src/test/validation.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/test/validation.test.ts` — stubs for ING-02, ING-03, and all 4 success criteria
- [ ] `src/test/fixtures/orf-steiermark.rss.xml` — recorded real ORF Steiermark RSS fixture
- [ ] `seedBulkArticles()` in `src/test/setup-db.ts` — needed for Criterion 4 performance dataset

*No framework install needed — vitest already configured and working.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
