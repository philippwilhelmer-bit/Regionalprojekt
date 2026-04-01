---
phase: 35
slug: homepage-feature-components
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 35 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (config: `vitest.config.ts`) |
| **Config file** | `vitest.config.ts` at project root |
| **Quick run command** | `npx vitest run src/lib/content/articles.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/content/articles.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 35-01-01 | 01 | 1 | HOME-01 | manual | manual-only — no component test infra | N/A | ⬜ pending |
| 35-01-02 | 01 | 1 | HOME-02 | manual | manual-only — no component test infra | N/A | ⬜ pending |
| 35-02-01 | 02 | 1 | HOME-05 | unit | `npx vitest run src/lib/content/articles.test.ts` | ❌ W0 | ⬜ pending |
| 35-03-01 | 03 | 2 | HOME-03 | manual | manual-only (requires network + Next.js server) | N/A | ⬜ pending |
| 35-03-02 | 03 | 2 | HOME-04 | manual | manual-only — no component test infra | N/A | ⬜ pending |
| 35-04-01 | 04 | 2 | HOME-06 | manual | manual inspection | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/content/articles.test.ts` — add test for `listGrueneWocheArticles()` covering: returns only PUBLISHED+theme='gruene_woche', returns empty array when none exist, ordering by publishedAt DESC

*All other HOME requirements are UI-only and covered by manual visual inspection — no unit test infrastructure for component rendering exists in this project.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| HeroArticle renders CTA button | HOME-01 | No component test infra | Visit homepage, verify "VOLLSTANDIGEN ARTIKEL LESEN" button visible on hero gradient, click navigates to article |
| MascotGreeting renders tonal box | HOME-02 | No component test infra | Visit homepage, verify "Wurzel sagt..." box uses Archivist tokens, no speech bubble tail |
| Weather widget shows conditions | HOME-03 | Requires network + server | Visit homepage with Bezirk selected, verify temperature and weather conditions display |
| Frag den Wurzelmann card | HOME-04 | No component test infra | Visit homepage, verify dark green card visible, click opens region selector |
| Archivist background alternation | HOME-06 | Visual inspection | Visit homepage, verify sections alternate Archivist palette backgrounds |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
