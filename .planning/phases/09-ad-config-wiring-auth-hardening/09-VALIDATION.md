---
phase: 9
slug: ad-config-wiring-auth-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npx vitest run src/lib/admin/ src/components/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/admin/ src/components/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 9-01-01 | 01 | 0 | AD-02 | unit stub | `npx vitest run src/components/reader/AdUnit.test.tsx` | ❌ W0 | ⬜ pending |
| 9-01-02 | 01 | 0 | (auth) | unit stub | `npx vitest run src/lib/admin/auth-node.test.ts` | ❌ W0 | ⬜ pending |
| 9-01-03 | 01 | 1 | AD-02 | unit | `npx vitest run src/components/reader/AdUnit.test.tsx` | ❌ W0 | ⬜ pending |
| 9-02-01 | 02 | 1 | (auth) | unit | `npx vitest run src/lib/admin/auth-node.test.ts` | ❌ W0 | ⬜ pending |
| 9-03-01 | 03 | 1 | (impressum) | manual | build + load `/impressum` page | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/reader/AdUnit.test.tsx` — stubs for AD-02 (features.ads gate, per-zone enabled gate, envVar resolution)
- [ ] `src/lib/admin/auth-node.test.ts` — stubs for requireAuth() redirect behavior (mock `next/headers` cookies, mock `next/navigation` redirect)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Impressum page renders publisherName, address, email from config | AD-02 / success criteria 4 | Visual text replacement — no component boundary to unit test | Run `next build && next start`, load `/impressum`, verify publisher name, address, and email match `bundesland.config.ts` values |
| JSON-LD `publisher.name` wired to config | AD-02 | JSON-LD is inline script in page HTML, not a testable component | Inspect page source on article detail page, verify `publisher.name` matches `config.branding.impressum.publisherName` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
