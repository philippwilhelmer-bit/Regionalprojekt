---
phase: 40
slug: tile-pipeline-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 40 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/lib/images/mapgen.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/images/mapgen.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 40-01-01 | 01 | 0 | MAP-03..08 | unit stubs | `npx vitest run src/lib/images/mapgen.test.ts` | ❌ W0 | ⬜ pending |
| 40-02-01 | 02 | 1 | MAP-03 | unit | `npx vitest run src/lib/images/mapgen.test.ts` | ❌ W0 | ⬜ pending |
| 40-02-02 | 02 | 1 | MAP-04 | unit | `npx vitest run src/lib/images/mapgen.test.ts` | ❌ W0 | ⬜ pending |
| 40-02-03 | 02 | 1 | MAP-05 | unit | `npx vitest run src/lib/images/mapgen.test.ts` | ❌ W0 | ⬜ pending |
| 40-03-01 | 03 | 1 | MAP-06 | unit | `npx vitest run src/lib/images/mapgen.test.ts` | ❌ W0 | ⬜ pending |
| 40-03-02 | 03 | 1 | MAP-07 | unit | `npx vitest run src/lib/images/mapgen.test.ts` | ❌ W0 | ⬜ pending |
| 40-04-01 | 04 | 2 | MAP-08, INTG-02 | unit | `npx vitest run src/lib/images/mapgen.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/images/mapgen.test.ts` — test stubs for MAP-03 through MAP-08, INTG-02
- [ ] `sharp@0.33.5` — must be in dependencies (+ `@img/sharp-linux-x64: 0.33.5` in optionalDependencies)
- [ ] `@vercel/blob` — must be in dependencies
- [ ] `BLOB_READ_WRITE_TOKEN` — must be set in `.env.local` for local dev

**Test mocking approach (consistent with pipeline.test.ts pattern):**
- Mock `fetch` with `vi.fn()` returning fake tile buffers (e.g., 256x256 gray PNG)
- Mock `@vercel/blob` `put` with `vi.fn()` returning `{ url: 'https://blob.example.com/maps/article-1.jpg' }`
- Do not mock `sharp` — run it for real in tests (fast; no Vercel constraint in test env)

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Attribution visible at thumbnail size | MAP-07 | Visual inspection | Generate image, view at 300px wide, confirm "© basemap.at" readable |
| Tile stitching produces correct geography | MAP-03 | Visual inspection | Generate Graz image (47.07N, 15.43E), confirm city center visible |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
