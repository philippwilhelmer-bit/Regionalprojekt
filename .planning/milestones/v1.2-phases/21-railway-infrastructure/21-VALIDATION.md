---
phase: 21
slug: railway-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest v2 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green + all manual verifications passed
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 21-01-01 | 01 | 1 | DEPLOY-01 | unit regression | `npm test` | ✅ | ⬜ pending |
| 21-01-02 | 01 | 1 | DEPLOY-02 | unit regression | `npm test` | ✅ | ⬜ pending |
| 21-01-03 | 01 | 1 | DEPLOY-03 | unit regression | `npm test` | ✅ | ⬜ pending |
| 21-01-04 | 01 | 1 | DEPLOY-01 | smoke (manual) | Manual: open Railway URL | N/A | ⬜ pending |
| 21-01-05 | 01 | 1 | DEPLOY-01 | smoke (manual) | Manual: visit `/admin` | N/A | ⬜ pending |
| 21-01-06 | 01 | 1 | DEPLOY-02 | smoke (manual) | Manual: check Railway Variables | N/A | ⬜ pending |
| 21-01-07 | 01 | 1 | DEPLOY-02 | smoke (manual) | Manual: `railway run npx prisma migrate status` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test files needed — Phase 21 is infrastructure/configuration work. The existing Vitest unit suite runs as a regression gate.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Railway service URL loads homepage | DEPLOY-01 | Requires live Railway deployment | Open `https://*.up.railway.app` in browser, verify 200 response |
| `/admin` redirects to `/admin/login` | DEPLOY-01 | Requires live Railway deployment | Navigate to `/admin`, confirm redirect to login page |
| PostgreSQL addon is active database | DEPLOY-02 | Railway Variables UI verification | Check Railway dashboard Variables tab shows `${{Postgres.DATABASE_URL}}` reference |
| Prisma migrations applied & current | DEPLOY-02 | Requires live Railway + database | Run `railway run npx prisma migrate status`, verify no pending migrations |
| `NEXT_PUBLIC_IS_TEST_SITE=true` set | DEPLOY-03 | Railway Variables UI verification | Check Railway dashboard Variables tab for the env var |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
