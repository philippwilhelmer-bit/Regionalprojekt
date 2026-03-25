---
phase: 19
slug: article-detail-bottom-navigation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npm run typecheck` |
| **Full suite command** | `npm test && npm run typecheck` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run typecheck`
- **After every plan wave:** Run `npm test && npm run typecheck`
- **Before `/gsd:verify-work`:** `npm run build` must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 19-01-01 | 01 | 1 | ART-01 | manual-only | `npm run typecheck` | N/A | ⬜ pending |
| 19-01-02 | 01 | 1 | ART-02 | manual-only | `npm run typecheck` | N/A | ⬜ pending |
| 19-02-01 | 02 | 1 | NAV-01 | manual-only | `npm run typecheck` | N/A | ⬜ pending |
| 19-02-02 | 02 | 1 | NAV-02 | manual-only | `npm run typecheck` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. No new test files needed — this phase is pure visual restyling with no new business logic.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Newsreader headline, Inter body rendered | ART-01 | Visual CSS — no DOM testing framework | Open article page, inspect headline uses Newsreader serif, body uses Inter |
| Cream background, sage text palette | ART-02 | Visual CSS | Verify article page background is #fbfaee, text uses sage tones |
| Cream nav background, four Material Symbols icons | NAV-01 | Visual CSS | Inspect bottom nav has cream bg, four icons rendered via Material Symbols |
| Active pill on correct item per route | NAV-02 | Requires browser routing (usePathname) | Navigate between routes, verify green pill appears on correct nav item |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
