---
phase: 10
slug: config-branding-wiring
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 2.1.9 |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npx vitest run src/lib/reader/rss.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/reader/rss.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | CONF-01 | build | `npx tsc --noEmit` | ✅ tsconfig.json | ⬜ pending |
| 10-01-02 | 01 | 1 | CONF-01 | build | `npx tsc --noEmit` | ✅ tsconfig.json | ⬜ pending |
| 10-01-03 | 01 | 1 | READ-06 | unit | `npx vitest run src/lib/reader/rss.test.ts` | ✅ | ⬜ pending |
| 10-01-04 | 01 | 1 | CONF-01 | build | `npx tsc --noEmit` | ✅ tsconfig.json | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/reader/rss.test.ts` — add `expect(xml).toContain(config.siteName)` assertion for READ-06 feed title branding (one-line addition to existing file)

*All other test infrastructure already exists — no new files or framework installs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Changing `siteName` in `bundesland.config.ts` propagates to all four UI locations | CONF-01 | Full propagation requires visual inspection of dev server | 1. Change `siteName` in `bundesland.config.ts` to a test value 2. Run `npx next dev` 3. Verify header, page title, RSS feed title, admin login heading all show test value 4. Revert change |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
