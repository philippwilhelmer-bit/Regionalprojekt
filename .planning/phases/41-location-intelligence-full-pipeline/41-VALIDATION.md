---
phase: 41
slug: location-intelligence-full-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 41 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 41-01-01 | 01 | 1 | MAP-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 41-01-02 | 01 | 1 | MAP-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 41-01-03 | 01 | 1 | CMS-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 41-02-01 | 02 | 2 | INTG-01 | integration | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for location extraction (regex + LLM)
- [ ] Test stubs for geocoding cache
- [ ] Test stubs for pipeline integration

*Existing vitest infrastructure covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Nominatim external API response | MAP-02 | External API rate limits | Verify cached response matches live query for "Graz" |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
