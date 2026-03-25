---
phase: 12
slug: config-driven-region-list-rss-feature-flag
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run prisma/seed.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run prisma/seed.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 0 | CONF-01 | unit | `npx vitest run src/app/rss` | ❌ W0 | ⬜ pending |
| 12-01-02 | 01 | 0 | CONF-01 | unit | `npx vitest run prisma/seed.test.ts` | ✅ update | ⬜ pending |
| 12-02-01 | 02 | 1 | CONF-01 | unit | `npx vitest run prisma/seed.test.ts` | ✅ update | ⬜ pending |
| 12-02-02 | 02 | 1 | CONF-01 | build | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 12-03-01 | 03 | 2 | CONF-01 | unit | `npx vitest run` | ✅ | ⬜ pending |
| 12-03-02 | 03 | 2 | CONF-01 | build | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 12-04-01 | 04 | 3 | CONF-01 | unit | `npx vitest run src/app/rss` | ✅ after W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/app/rss/[slug]/route.test.ts` — covers RSS feature flag: `rss: false` → 404; `rss: true` → existing behavior. Uses `vi.mock('@/../bundesland.config')` to exercise both branches.
- [ ] `prisma/seed.test.ts` — update existing test: replace `steiermarkBezirke`-based assertion with `config.regions`-based assertion.

*No new test infrastructure needed — `vitest.config.ts` and `setup-db.ts` are already in place.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Header slug→name lookup renders correct names from prop | CONF-01 | UI rendering requires browser | Load home page, open region selector, verify all 13 Bezirk names appear correctly |
| Adding a new region to `bundesland.config.ts` + re-seeding updates UI without code changes | CONF-01 | Multi-step deployment flow | Edit `config.regions`, run seed, reload page, verify new region appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
