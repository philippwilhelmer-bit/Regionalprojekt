---
phase: 13
slug: production-readiness-impressum-cms-error-count
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run src/lib/admin/sources-actions.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/admin/sources-actions.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green + `npm run typecheck` passes
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | READ-05 | typecheck | `npm run typecheck` | N/A | ⬜ pending |
| 13-01-02 | 01 | 1 | READ-05 | typecheck | `npm run typecheck` | N/A | ⬜ pending |
| 13-01-03 | 01 | 1 | READ-05 | typecheck | `npm run typecheck` | N/A | ⬜ pending |
| 13-01-04 | 01 | 1 | CMS-04 | unit | `npx vitest run src/lib/admin/sources-actions.test.ts` | ✅ (needs update) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. `sources-actions.test.ts` exists and covers `listSourcesAdmin`. It requires a content update (not creation) to reflect the new `sourceId`-based behavior.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Impressum page renders config values without `[BRACKET]` placeholders | READ-05 | Static Server Component, no runtime test infrastructure | Load `/impressum` in browser after `next dev` or `next build`; verify no `[TELEFON]`, `[UNTERNEHMENSGEGENSTAND]`, `[BLATTLINIE]`, or `[DATENSCHUTZ_EMAIL]` visible |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
