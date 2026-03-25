---
phase: 2
slug: ingestion
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 2.1.9 |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `vitest run src/lib/ingestion` |
| **Full suite command** | `vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `vitest run src/lib/ingestion`
- **After every plan wave:** Run `vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 0 | ING-01 | unit (mock fetch) | `vitest run src/lib/ingestion/adapters/ots-at.test.ts` | ❌ W0 | ⬜ pending |
| 2-01-02 | 01 | 0 | ING-02 | unit (fixture XML) | `vitest run src/lib/ingestion/adapters/rss.test.ts` | ❌ W0 | ⬜ pending |
| 2-01-03 | 01 | 0 | ING-03 | unit (pgLite) | `vitest run src/lib/ingestion/dedup.test.ts` | ❌ W0 | ⬜ pending |
| 2-01-04 | 01 | 0 | ING-04, ING-05 | unit (pgLite) | `vitest run src/lib/ingestion/ingest.test.ts` | ❌ W0 | ⬜ pending |
| 2-01-05 | 01 | 0 | ING-05 | unit | `vitest run src/lib/ingestion/adapters/registry.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/ingestion/adapters/ots-at.test.ts` — stubs for ING-01
- [ ] `src/lib/ingestion/adapters/rss.test.ts` — stubs for ING-02
- [ ] `src/lib/ingestion/dedup.test.ts` — stubs for ING-03
- [ ] `src/lib/ingestion/ingest.test.ts` — stubs for ING-04, ING-05 (partial)
- [ ] `src/lib/ingestion/adapters/registry.test.ts` — stubs for ING-05
- [ ] `src/lib/content/sources.test.ts` — Source DAL functions
- [ ] `test/fixtures/rss-sample.xml` — RSS 2.0 fixture
- [ ] `test/fixtures/atom-sample.xml` — Atom 1.0 fixture
- [ ] Prisma migration: `npx prisma migrate dev --name ingestion` — adds Source, IngestionRun, contentHash

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| OTS.at live fetch returns real press releases | ING-01 | OTS detail endpoint schema is unverified (403-gated docs) | On first implementation, call live API and log raw response; verify field names match adapter mapping |
| Operator alert fires when source goes DOWN | ING-04 | Alert delivery (email/webhook) requires live infrastructure | Manually set healthStatus=DOWN on a source and verify alert fires |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
