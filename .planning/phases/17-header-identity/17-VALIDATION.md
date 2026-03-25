---
phase: 17
slug: header-identity
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (^2.x) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 1 | HDR-01 | manual-only | visual inspection | N/A | ⬜ pending |
| 17-01-02 | 01 | 1 | HDR-02 | manual-only | visual inspection | N/A | ⬜ pending |
| 17-01-03 | 01 | 1 | HDR-03 | unit | `npx vitest run src/components/reader/Header.test.tsx` | ❌ W0 | ⬜ pending |
| 17-01-04 | 01 | 1 | HDR-04 | manual-only | visual inspection | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/reader/Header.test.tsx` — stubs for HDR-03 label logic (requires either extracting label logic to pure function, or adding `environment: 'jsdom'` override in test file)

*All other HDR requirements are purely visual — no automated test appropriate.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Identity stripe renders 4px (2px white + 2px green) full-width at top | HDR-01 | Purely visual CSS rendering | Inspect header in browser; verify stripe is visible, 4px total, edge-to-edge |
| Header shows dark green bg with italic serif brand name | HDR-02 | Visual styling verification | Inspect header; verify bg-styrian-green, "RegionalNews" in italic Newsreader font |
| Search icon renders at 40% opacity, not clickable | HDR-04 | Visual disabled state | Verify search icon visible but dimmed; click does nothing |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
