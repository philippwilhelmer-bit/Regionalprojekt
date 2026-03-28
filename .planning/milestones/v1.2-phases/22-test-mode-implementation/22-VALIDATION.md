---
phase: 22
slug: test-mode-implementation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 2.1.9 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~80 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 80 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 22-01-01 | 01 | 1 | TEST-01 | unit | `npx vitest run src/test/test-mode` | ❌ W0 | ⬜ pending |
| 22-01-02 | 01 | 1 | TEST-02 | unit | `npx vitest run src/test/test-mode` | ❌ W0 | ⬜ pending |
| 22-01-03 | 01 | 1 | SEO-01 | unit | `npx vitest run src/test/test-mode` | ❌ W0 | ⬜ pending |
| 22-01-04 | 01 | 1 | SEO-02 | unit | `npx vitest run src/app/robots` | ❌ W0 | ⬜ pending |
| 22-01-05 | 01 | 1 | SEO-03 | unit | `npx vitest run src/app/sitemap` | ❌ W0 | ⬜ pending |
| 22-01-06 | 01 | 1 | SAFETY-01 | unit | `npx vitest run src/test/test-mode` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for TESTSEITE banner rendering (TEST-01, TEST-02)
- [ ] Test stubs for noindex meta tag (SEO-01)
- [ ] Test stubs for robots.txt disallow (SEO-02)
- [ ] Test stubs for sitemap suppression (SEO-03)
- [ ] Test stubs for AdSense gating (SAFETY-01)

*Existing vitest infrastructure covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Banner visually visible | TEST-01 | Visual appearance | Load homepage, verify yellow banner at top |
| Banner on admin pages | TEST-02 | Visual appearance | Load /admin/articles, verify banner |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 80s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
