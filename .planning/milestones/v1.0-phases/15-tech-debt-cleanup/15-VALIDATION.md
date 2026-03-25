---
phase: 15
slug: tech-debt-cleanup
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (existing, `vitest.config.ts`) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/lib/content/articles.test.ts src/lib/content/sources.test.ts src/lib/admin/login-action.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/content/articles.test.ts src/lib/content/sources.test.ts src/lib/admin/login-action.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | READ-06 | unit | `npx vitest run src/lib/content/articles.test.ts` | ✅ (new test case needed) | ⬜ pending |
| 15-01-02 | 01 | 1 | READ-06 | integration | `npx vitest run src/app/rss/[slug]/route.test.ts` | ✅ | ⬜ pending |
| 15-01-03 | 01 | 1 | — | unit | `npx vitest run src/lib/admin/login-action.test.ts` | ❌ W0 | ⬜ pending |
| 15-01-04 | 01 | 1 | — | unit | `npx vitest run src/lib/admin/login-action.test.ts` | ❌ W0 | ⬜ pending |
| 15-01-05 | 01 | 1 | — | code inspection | N/A — deletion verified by grep | ✅ | ⬜ pending |
| 15-01-06 | 01 | 1 | — | unit | `npx vitest run src/lib/content/sources.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/admin/login-action.test.ts` — stubs for ADMIN_PASSWORD split (missing env var + wrong password cases); no test file exists for loginAction yet

*Existing infrastructure covers all other phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| LogoutButton visible in admin header | — | Visual/layout check | Navigate to /admin, verify "Abmelden" button in top-right of header |
| Logout redirects to /admin/login | — | Full browser flow | Click "Abmelden", verify redirect to login page and session cleared |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
