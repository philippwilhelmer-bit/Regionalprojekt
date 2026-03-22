---
phase: 5
slug: editorial-cms
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 2.1.9 |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run --reporter=verbose src/lib/admin/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/admin/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 5-W0-01 | Wave 0 | 0 | CMS-01, CMS-02 | unit | `npx vitest run src/lib/admin/articles-actions.test.ts` | ❌ W0 | ⬜ pending |
| 5-W0-02 | Wave 0 | 0 | CMS-03 | unit | `npx vitest run src/lib/admin/exceptions-actions.test.ts` | ❌ W0 | ⬜ pending |
| 5-W0-03 | Wave 0 | 0 | CMS-04 | unit | `npx vitest run src/lib/admin/sources-actions.test.ts` | ❌ W0 | ⬜ pending |
| 5-W0-04 | Wave 0 | 0 | AICONF-01, AICONF-02, AICONF-03 | unit | `npx vitest run src/lib/admin/ai-config-dal.test.ts` | ❌ W0 | ⬜ pending |
| 5-CMS-01 | TBD | 1 | CMS-01 | unit | `npx vitest run src/lib/admin/articles-actions.test.ts -t "createManualArticle"` | ❌ W0 | ⬜ pending |
| 5-CMS-02 | TBD | 1 | CMS-02 | unit | `npx vitest run src/lib/admin/articles-actions.test.ts -t "curation"` | ❌ W0 | ⬜ pending |
| 5-CMS-03 | TBD | 1 | CMS-03 | unit | `npx vitest run src/lib/admin/exceptions-actions.test.ts` | ❌ W0 | ⬜ pending |
| 5-CMS-04 | TBD | 2 | CMS-04 | unit | `npx vitest run src/lib/admin/sources-actions.test.ts` | ❌ W0 | ⬜ pending |
| 5-AICONF-01 | TBD | 2 | AICONF-01 | unit | `npx vitest run src/lib/admin/ai-config-dal.test.ts -t "global"` | ❌ W0 | ⬜ pending |
| 5-AICONF-02 | TBD | 2 | AICONF-02 | unit | `npx vitest run src/lib/admin/ai-config-dal.test.ts -t "per-source"` | ❌ W0 | ⬜ pending |
| 5-AICONF-03 | TBD | 2 | AICONF-03 | unit | `npx vitest run src/lib/ai/pipeline.test.ts -t "reads AiConfig"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/admin/articles-actions.test.ts` — stubs for CMS-01, CMS-02
- [ ] `src/lib/admin/exceptions-actions.test.ts` — stubs for CMS-03
- [ ] `src/lib/admin/sources-actions.test.ts` — stubs for CMS-04
- [ ] `src/lib/admin/ai-config-dal.test.ts` — stubs for AICONF-01, AICONF-02, AICONF-03
- [ ] `prisma/migrations/20260322_phase5/migration.sql` — schema migration (AiConfig, AiSourceConfig, PipelineConfig tables + enums)
- [ ] `src/test/setup-db.ts` update — add AiSourceConfig, AiConfig, PipelineConfig to cleanDb()

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Admin route protection redirects unauthenticated users | CMS-01 | Middleware/cookie behaviour requires browser session | Open `/admin` without cookie, verify redirect to `/login` |
| Article list filters 200+ articles under 10 seconds | CMS-04 | Performance SLA requires realistic data volume | Seed 200+ articles, apply filter combinations, measure response time |
| AI config changes take effect on next ingestion cycle | AICONF-03 | Requires full pipeline run with DB state | Update AiConfig, trigger ingestion, verify pipeline uses new settings |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
