---
phase: 25
slug: deployment-verification-closure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 25 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest v2 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 25-01-01 | 01 | 1 | DEPLOY-01 | manual-smoke | `curl -s -o /dev/null -w "%{http_code}" https://regionalprojekt.vercel.app` | N/A | ⬜ pending |
| 25-01-02 | 01 | 1 | DEPLOY-02 | manual-verify | Vercel dashboard: DATABASE_URL contains neon.tech | N/A | ⬜ pending |
| 25-01-03 | 01 | 1 | DEPLOY-03 | unit | `npm test` | ✅ | ⬜ pending |
| 25-01-04 | 01 | 1 | SAFETY-01 | unit | `npm test -- src/components/reader/AdUnit.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Add test case to `src/components/reader/AdUnit.test.tsx` — covers SAFETY-01 test-mode null return

*Existing infrastructure covers all other phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| App serves homepage at public URL | DEPLOY-01 | Requires live deployment access | `curl -s -o /dev/null -w "%{http_code}" https://regionalprojekt.vercel.app` — expect 200 |
| Neon DB active with current schema | DEPLOY-02 | Requires Vercel dashboard access | Check DATABASE_URL env var contains neon.tech, verify 13 Bezirke seeded |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
