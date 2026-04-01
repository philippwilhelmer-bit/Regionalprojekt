---
phase: 34
slug: shell-components
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 34 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x (installed, vitest.config.ts present) |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green + manual iOS Safari inspection
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 34-01-01 | 01 | 1 | SHEL-01 | static grep | `grep -n "bg-glass-nav\|backdrop-blur" src/components/reader/WurzelNavBar.tsx` | ✅ Wave 0 grep | ⬜ pending |
| 34-01-02 | 01 | 1 | SHEL-01 | static grep | `grep -n "border-t\|bg-aged-wood" src/components/reader/WurzelNavBar.tsx` | ✅ Wave 0 grep | ⬜ pending |
| 34-01-03 | 01 | 1 | SHEL-02 | static grep | `grep -n "auto_stories\|forest\|face_5\|book_2" src/components/reader/WurzelNavBar.tsx` | ✅ Wave 0 grep | ⬜ pending |
| 34-01-04 | 01 | 1 | SHEL-02 | static grep | `grep -n "FILL\|fontVariation\|icon-filled" src/components/reader/WurzelNavBar.tsx` | ✅ Wave 0 grep | ⬜ pending |
| 34-02-01 | 02 | 1 | SHEL-03 | static grep | `grep -n "bg-ink" src/components/reader/Footer.tsx` | ✅ Wave 0 grep | ⬜ pending |
| 34-02-02 | 02 | 1 | SHEL-03 | static grep | `grep -n "impressum\|kontakt\|Impressum\|Kontakt" src/components/reader/Footer.tsx` | ✅ Wave 0 grep | ⬜ pending |
| 34-03-01 | 03 | 2 | SHEL-04 | static grep | `grep -n "menu\|hamburger\|md:hidden" src/components/reader/WurzelAppBar.tsx` | ✅ Wave 0 grep | ⬜ pending |
| 34-03-02 | 03 | 2 | SHEL-04 | static grep | `grep -n "font-headline italic\|text-left" src/components/reader/WurzelAppBar.tsx` | ✅ Wave 0 grep | ⬜ pending |
| 34-03-03 | 03 | 2 | SHEL-05 | static grep | `grep -n "hidden md:flex\|md:hidden" src/components/reader/WurzelAppBar.tsx` | ✅ Wave 0 grep | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. No new test files needed. The phase modifies existing components; no new testable logic is introduced.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Glassmorphic nav renders correctly on iOS Safari | SHEL-01 | `-webkit-backdrop-filter` rendering cannot be verified in jsdom | Open app on iOS Safari device/simulator, verify frosted-glass effect is visible and nav is not invisible |
| Frosted-glass blur effect visible | SHEL-01 | Visual CSS rendering | Inspect nav in browser DevTools, confirm backdrop-blur-md applies |
| Active indicator top-border styling | SHEL-01 | Visual styling | Navigate between tabs, verify top-border appears on active tab |
| Icon fill/outlined toggle on active state | SHEL-02 | Visual rendering of font-variation-settings | Navigate between tabs, verify active icon is filled, inactive icons are outlined |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
