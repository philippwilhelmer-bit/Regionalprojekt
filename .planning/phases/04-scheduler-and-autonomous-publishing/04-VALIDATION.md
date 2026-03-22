---
phase: 4
slug: scheduler-and-autonomous-publishing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^2.1.9 |
| **Config file** | vitest.config.ts (project root) |
| **Quick run command** | `vitest run src/lib/publish/` |
| **Full suite command** | `vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `vitest run src/lib/publish/`
- **After every plan wave:** Run `vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-W0-01 | W0 | 0 | PUB-01 | unit stub | `vitest run src/lib/publish/publish.test.ts` | ❌ W0 | ⬜ pending |
| 4-W0-02 | W0 | 0 | PUB-03 | unit stub | `vitest run src/lib/publish/dead-man.test.ts` | ❌ W0 | ⬜ pending |
| 4-01-01 | 01 | 1 | PUB-01 | unit | `vitest run src/lib/publish/publish.test.ts` | ❌ W0 | ⬜ pending |
| 4-01-02 | 01 | 1 | PUB-01 | unit | `vitest run src/lib/ai/pipeline.test.ts` | ✅ (update) | ⬜ pending |
| 4-01-03 | 01 | 1 | PUB-01 | unit | `vitest run src/lib/ai/pipeline.test.ts` | ✅ (update) | ⬜ pending |
| 4-02-01 | 02 | 1 | PUB-03 | unit | `vitest run src/lib/publish/dead-man.test.ts` | ❌ W0 | ⬜ pending |
| 4-03-01 | 03 | 2 | PUB-02 | manual | N/A — verify ecosystem.config.js cron interval | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/publish/publish.test.ts` — stubs for PUB-01 publish behavior
- [ ] `src/lib/publish/dead-man.test.ts` — stubs for PUB-03 dead-man alert behavior
- [ ] `src/lib/publish/publish.ts` — stub file (publish service)
- [ ] `src/lib/publish/dead-man.ts` — stub file (dead-man check)
- [ ] Prisma schema updated + `prisma generate` run — adds `ERROR`/`FAILED` enum values, `retryCount`, `errorMessage`
- [ ] Migration SQL file: `prisma/migrations/20260322_scheduler/migration.sql`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cron config documents correct interval | PUB-02 | PM2 ecosystem config is declarative, not unit-testable | Read `ecosystem.config.js` — verify `cron_restart` matches desired interval and `autorestart: false` is set |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
