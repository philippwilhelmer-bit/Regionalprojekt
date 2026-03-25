---
phase: 8
slug: per-source-ai-config-wiring
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^2.1.9 |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run src/lib/ai/steps/step2-write-source-override.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/ai/steps/step2-write-source-override.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 8-01-01 | 01 | 0 | AICONF-02 | integration (pgLite + vi.fn) | `npx vitest run src/lib/ai/steps/step2-write-source-override.test.ts` | ❌ W0 | ⬜ pending |
| 8-02-01 | 02 | 1 | AICONF-02 | integration (pgLite + vi.fn) | `npx vitest run src/lib/ai/steps/step2-write-source-override.test.ts` | ❌ W0 | ⬜ pending |
| 8-02-02 | 02 | 1 | AICONF-02 | integration (pgLite + vi.fn) | `npx vitest run` | ❌ W0 | ⬜ pending |
| 8-03-01 | 03 | 2 | Phase 7 SC | manual (doc output) | `npx vitest run` (count capture before writing doc) | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/ai/steps/step2-write-source-override.test.ts` — stub test file with two describe cases for AICONF-02 (sourceId with override → override used; sourceId null → global config used)

*All other test infrastructure exists: vitest, createTestDb, cleanDb, vi.fn client pattern.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 07-VERIFICATION.md documents all 4 Phase 7 success criteria as PASS | Phase 7 SC | Document output, not code behavior | Run `npx vitest run`, capture count, confirm 4 describe blocks present in output, write `07-VERIFICATION.md` with real evidence |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
