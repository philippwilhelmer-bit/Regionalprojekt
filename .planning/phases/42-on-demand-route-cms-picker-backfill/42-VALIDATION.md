---
phase: 42
slug: on-demand-route-cms-picker-backfill
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 42 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/lib/admin/map-actions.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/admin/map-actions.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 42-01-01 | 01 | 0 | INTG-03 | unit | `npx vitest run src/app/api/admin/generate-map/route.test.ts` | ❌ W0 | ⬜ pending |
| 42-01-02 | 01 | 0 | INTG-04 | unit | `npx vitest run src/lib/admin/map-actions.test.ts` | ❌ W0 | ⬜ pending |
| 42-02-01 | 02 | 1 | INTG-03 | unit | `npx vitest run src/app/api/admin/generate-map/route.test.ts` | ❌ W0 | ⬜ pending |
| 42-02-02 | 02 | 1 | INTG-03 | unit | `npx vitest run src/app/api/admin/generate-map/route.test.ts` | ❌ W0 | ⬜ pending |
| 42-02-03 | 02 | 1 | INTG-03 | unit | `npx vitest run src/app/api/admin/generate-map/route.test.ts` | ❌ W0 | ⬜ pending |
| 42-03-01 | 03 | 1 | INTG-04 | unit | `npx vitest run src/lib/admin/map-actions.test.ts` | ❌ W0 | ⬜ pending |
| 42-03-02 | 03 | 1 | INTG-04 | unit | `npx vitest run src/lib/admin/map-actions.test.ts` | ❌ W0 | ⬜ pending |
| 42-03-03 | 03 | 1 | INTG-04 | unit | `npx vitest run src/lib/admin/map-actions.test.ts` | ❌ W0 | ⬜ pending |
| 42-04-01 | 04 | 2 | CMS-01 | manual | open `/admin/articles/{id}/edit`, verify Karte tab shows image | — | ⬜ pending |
| 42-04-02 | 04 | 2 | CMS-01 | manual | click "Karte generieren", verify image appears | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/app/api/admin/generate-map/route.test.ts` — stubs for INTG-03 route auth, 422 cases, success path
- [ ] `src/lib/admin/map-actions.test.ts` — stubs for INTG-04 `backfillMapImages` (pglite + vi.mock for mapgen/geocode/locextract)
- [ ] `src/app/api/admin/generate-map/route.ts` — empty route file (Wave 0 creates, Wave 1 implements)
- [ ] `src/lib/admin/map-actions.ts` — empty Server Actions file (Wave 0 creates, Wave 1 implements)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| MapPicker renders current map image when imageCredit is '© basemap.at' | CMS-01 | UI component requires browser rendering | Open `/admin/articles/{id}/edit`, verify Karte tab shows image |
| MapPicker generate button calls `generateMapForArticle` and updates displayed image | CMS-01 | UI interaction + visual verification | Click "Karte generieren", verify image appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
