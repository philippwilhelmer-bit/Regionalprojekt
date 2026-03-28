---
phase: 23
slug: deployment-verification
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 23 — Validation Strategy

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
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 23-01-01 | 01 | 1 | DEPLOY-03 | manual | Vercel dashboard: set NEXT_PUBLIC_BASE_URL | N/A | ⬜ pending |
| 23-01-02 | 01 | 1 | DEPLOY-01 | manual | `curl -s -o /dev/null -w "%{http_code}" https://regionalprojekt.vercel.app` | N/A | ⬜ pending |
| 23-01-03 | 01 | 1 | DEPLOY-01 | manual | `curl -s -o /dev/null -w "%{url_effective}" -L https://regionalprojekt.vercel.app/admin` | N/A | ⬜ pending |
| 23-01-04 | 01 | 1 | DEPLOY-02 | manual | Vercel dashboard: verify Neon DATABASE_URL | N/A | ⬜ pending |
| 23-01-05 | 01 | 1 | DEPLOY-03 | manual | Vercel dashboard: verify NEXT_PUBLIC_BASE_URL set | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

No new test files needed — this phase makes no code changes. All verification is manual against the live Vercel deployment.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live URL returns 200 | DEPLOY-01 | Requires live Vercel deployment | Open https://regionalprojekt.vercel.app in browser, verify homepage loads |
| `/admin` redirects to `/admin/login` | DEPLOY-01 | Requires live deployment + incognito session | Open incognito, navigate to /admin, verify redirect to /admin/login |
| Neon PostgreSQL is active DB | DEPLOY-02 | Requires Vercel dashboard access | Check Vercel Settings → Environment Variables → DATABASE_URL contains neon.tech |
| Prisma schema is current | DEPLOY-02 | Requires live data verification | Verify homepage shows 13 Bezirke in region selector |
| NEXT_PUBLIC_BASE_URL set | DEPLOY-03 | Requires Vercel dashboard access | Check Vercel Settings → Environment Variables → NEXT_PUBLIC_BASE_URL is set |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
