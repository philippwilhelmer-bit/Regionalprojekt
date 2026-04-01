---
phase: 33
slug: color-token-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 33 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x (installed, vitest.config.ts present) |
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
| 33-01-01 | 01 | 1 | TOKN-01 | manual-only | Visual inspection of globals.css @theme block | N/A | ⬜ pending |
| 33-01-02 | 01 | 1 | TOKN-04 | static grep | `grep "spacing-gutter\|spacing-vertical" src/app/globals.css` | N/A | ⬜ pending |
| 33-01-03 | 01 | 1 | TOKN-05 | static grep | `grep "glass-" src/app/globals.css` | N/A | ⬜ pending |
| 33-01-04 | 01 | 1 | TOKN-06 | static grep | `grep "shadow-" src/app/globals.css \| grep "color-mix"` | N/A | ⬜ pending |
| 33-02-01 | 02 | 2 | TOKN-02 | static grep | `grep -r "border-b\|border-t\|border-l\|border-r" src/components/reader/ --include="*.tsx"` | N/A | ⬜ pending |
| 33-02-02 | 02 | 2 | TOKN-03 | static grep | `grep -r "rounded-xl\|rounded-full\|rounded-lg\|rounded-2xl" src/components/reader/ --include="*.tsx"` | N/A | ⬜ pending |
| 33-02-03 | 02 | 2 | TOKN-06 | static grep | `grep -r "rgba(0,0,0\|rgb(0 0 0" src/components/reader/ --include="*.tsx"` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

No new test files needed — TOKN-01 through TOKN-06 are CSS/visual requirements validated via static grep commands and visual browser inspection. The existing Vitest suite (AdUnit.test.tsx, app/__tests__/) must remain green throughout.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ~30 named tokens in @theme covering Ink/Parchment/Slate/Aged Wood palette | TOKN-01 | Token naming and palette coverage requires human review | Inspect globals.css @theme block — count tokens, verify palette names |
| Spacing tokens have correct values (gutter: 1rem, vertical: 1.7rem, section: 4rem) | TOKN-04 | Exact values need visual confirmation | Inspect globals.css @theme — verify --spacing-gutter: 1rem, --spacing-vertical: 1.7rem, --spacing-section: 4rem |
| No visible borders for section separation | TOKN-02 | Visual rendering requires browser | Build site, browse reader pages — no visible border lines between sections |
| Tonal background shifts provide adequate separation | TOKN-02 | Aesthetic judgment | Browse reader pages — sections must be visually distinct via background tones |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
