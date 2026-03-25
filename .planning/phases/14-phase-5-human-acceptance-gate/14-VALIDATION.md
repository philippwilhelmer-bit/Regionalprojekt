---
phase: 14
slug: phase-5-human-acceptance-gate
status: draft
nyquist_compliant: false
wave_0_complete: true
created: 2026-03-25
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (existing) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `bun run vitest run --reporter=verbose` |
| **Full suite command** | `bun run vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** No automated sampling — this is a manual walkthrough phase
- **After every plan wave:** Confirm all 7 tests recorded in 14-SIGN-OFF.md before committing
- **Before `/gsd:verify-work`:** Both `05-VERIFICATION.md` updated and `14-SIGN-OFF.md` created
- **Max feedback latency:** N/A (manual verification with user confirmation)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | CMS-01 | manual | n/a — browser + DB | n/a | ⬜ pending |
| 14-01-02 | 01 | 1 | CMS-02 | manual | n/a — browser + DB | n/a | ⬜ pending |
| 14-01-03 | 01 | 1 | CMS-03 | manual | n/a — browser + DB | n/a | ⬜ pending |
| 14-01-04 | 01 | 1 | CMS-04 | manual | n/a — browser + DB | n/a | ⬜ pending |
| 14-01-05 | 01 | 1 | AICONF-01 | manual | n/a — browser + pipeline | n/a | ⬜ pending |
| 14-01-06 | 01 | 1 | AICONF-02 | manual | n/a — browser + DB | n/a | ⬜ pending |
| 14-01-07 | 01 | 1 | AICONF-03 | manual | n/a — covered by 05/06 | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test files needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Auth gate redirect | CMS-01..04 | Requires browser session + cookie handling | Navigate to /admin/articles without session; confirm redirect to /admin/login |
| Manual article creation | CMS-01 | Requires form submit in browser | Fill and submit /admin/articles/new; confirm MANUAL/PUBLISHED in DB |
| Article list filter under load | CMS-02 | Requires 200+ articles + browser performance | Seed 200+ articles; use Bezirk/source/status filters; confirm < 10s |
| Exception queue approve/reject | CMS-03 | Requires browser button click + visual confirmation | Click Genehmigen/Ablehnen; confirm status transitions in DB |
| Source CRUD + disable | CMS-04 | Requires form interaction in browser | Add RSS source; confirm healthStatus=OK; disable; confirm enabled=false |
| AI Config tone change | AICONF-01 | Requires pipeline run with actual API call | Change tone to Formell; trigger pipeline; verify prompt uses updated tone |
| Per-source AI override | AICONF-02 | Requires browser interaction + DB verification | Create override; confirm AiSourceConfig row; delete; confirm global defaults restored |

**Justification for all-manual:** Phase 14 exclusively tests full-stack integration (running Next.js server + live PostgreSQL + browser session + Anthropic API). The 36 automated tests in Phase 5 already cover all DB-layer logic. These 7 flows require human-in-the-loop verification by design.

---

## Validation Sign-Off

- [x] All tasks have manual verification instructions (no automated tests applicable)
- [x] Sampling continuity: N/A — sequential manual walkthrough, each test verified before proceeding
- [x] Wave 0 covers all MISSING references: no new test files needed
- [x] No watch-mode flags
- [x] Feedback latency: immediate (human confirmation per step)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
