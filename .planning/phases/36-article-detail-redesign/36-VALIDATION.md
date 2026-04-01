---
phase: 36
slug: article-detail-redesign
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-01
---

# Phase 36 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 36-01-T0 | 01 | 1 | ARTC-01,02,04 | unit (RED) | `npx vitest run src/app/__tests__/article-detail.test.ts` | ❌ W0 | ⬜ pending |
| 36-01-T1 | 01 | 1 | ARTC-01,02,04 | unit (GREEN) | `npx vitest run src/app/__tests__/article-detail.test.ts` | ✅ | ⬜ pending |
| 36-02-T1 | 02 | 2 | ARTC-03 | unit | `npx vitest run` | ✅ | ⬜ pending |
| 36-02-T2 | 02 | 2 | ARTC-01,02,03,04 | checkpoint | Human visual verify | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drop cap renders on first paragraph | ARTC-01 | CSS ::first-letter visual styling — no DOM assertion covers float layout | Open article page, verify large initial letter floats left in Firefox, Chrome, Safari |
| Blockquotes render with serif italic + dividers | ARTC-02 | Visual typography distinction requires human eye | Add blockquote content, verify large serif italic rendering with tonal dividers |
| Sticky sidebar on desktop, horizontal strip on mobile | ARTC-03 | Responsive layout + sticky positioning is visual | Check desktop sidebar sticks on scroll; resize to mobile, verify horizontal metadata strip |
| Archival header — title overlaps hero image | ARTC-04 | Overlap positioning is visual | Open article, verify title text overlaps bottom of hero image area |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
