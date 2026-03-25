---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (Wave 0 installs) |
| **Config file** | `vitest.config.ts` — does not exist yet, Wave 0 creates it |
| **Quick run command** | `npx vitest run src/lib/content/` |
| **Full suite command** | `npx vitest run && npx tsc --noEmit` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/content/`
- **After every plan wave:** Run `npx vitest run && npx tsc --noEmit`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | CONF-02 | integration | `npx vitest run src/lib/content/bezirke.test.ts` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 0 | CONF-01 | integration | `npx vitest run prisma/seed.test.ts` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 0 | CONF-01, AD-02 | unit | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 1-01-04 | 01 | 1 | CONF-02 | integration | `npx vitest run src/lib/content/bezirke.test.ts` | ❌ W0 | ⬜ pending |
| 1-01-05 | 01 | 1 | CONF-01 | integration | `npx vitest run prisma/seed.test.ts` | ❌ W0 | ⬜ pending |
| 1-01-06 | 01 | 2 | CONF-02 | integration | `npx vitest run src/lib/content/` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — Vitest configuration with pgLite setup
- [ ] `src/lib/content/bezirke.test.ts` — stub tests for CONF-02 (all 13 Bezirke queryable, slug/name/synonyms)
- [ ] `prisma/seed.test.ts` — stub tests for CONF-01 (config-driven seeding produces correct regions)
- [ ] `src/test/setup-db.ts` — shared pgLite + Prisma test utility (apply migrations, clean between tests)
- [ ] Install dev deps: `@electric-sql/pglite pglite-prisma-adapter vitest @vitest/coverage-v8`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Prisma Studio shows seeded Bezirk data correctly | CONF-02 | Visual verification of seed quality | Run `npx prisma studio`, navigate to Bezirk table, confirm all 13 rows with correct data |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
