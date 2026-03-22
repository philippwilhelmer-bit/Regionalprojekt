---
phase: 05-editorial-cms
plan: 04
subsystem: database
tags: [prisma, vitest, tdd, server-actions, dal, source-management, ai-config]

# Dependency graph
requires:
  - phase: 05-01
    provides: AiConfig, AiSourceConfig, PipelineConfig Prisma models; Wave 0 test stubs; cleanDb() with FK-safe order

provides:
  - createSourceDb/updateSourceDb/listSourcesAdmin Server Actions with health dashboard data (CMS-04)
  - getAiConfig/upsertAiConfig global singleton DAL with find-or-create (AICONF-01)
  - getResolvedAiConfig merging per-source overrides onto global defaults (AICONF-02)
  - upsertAiSourceConfig/deleteAiSourceConfig per-source override management (AICONF-02)
  - getPipelineConfig/upsertPipelineConfig singleton DAL with defaults maxRetryCount=3 deadManThresholdHours=6 (AICONF-03)
  - ai-config-actions.ts and pipeline-config-actions.ts thin Server Action stubs for Plans 06/07

affects: [05-05, 06-editorial-cms, 07-pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Duck-typed DI overload ($connect check) for all DAL functions — consistent with established pattern"
    - "Singleton find-or-create: findFirst then create if null — used for AiConfig and PipelineConfig"
    - "Articles reference source TYPE not source ID (no FK) — FAILED+ERROR count per source is approximate for multi-source same-type"
    - "Server Action wrappers call *Db functions using default singleton; *Db functions accept injectable PrismaClient"

key-files:
  created:
    - src/lib/admin/sources-actions.ts
    - src/lib/admin/ai-config-dal.ts
    - src/lib/admin/pipeline-config-dal.ts
    - src/lib/admin/ai-config-actions.ts
    - src/lib/admin/pipeline-config-actions.ts
  modified:
    - src/lib/admin/sources-actions.test.ts
    - src/lib/admin/ai-config-dal.test.ts

key-decisions:
  - "listSourcesAdmin includes source type in FAILED+ERROR article count — Articles reference source TYPE not source ID (no FK), so multi-source same-type counts are approximate; documented in code comment"
  - "IngestionRun.startedAt used as createdAt in SourceAdminRow.latestRun — no separate createdAt field on IngestionRun"
  - "upsertAiSourceConfig uses Prisma upsert on sourceId @unique — single DB call, atomic, no findFirst+update race"
  - "getResolvedAiConfig calls getAiConfig (find-or-create) as dependency — avoids duplicating singleton logic"

patterns-established:
  - "DAL functions with DB DI overload: (db?: PrismaClient) or (db: PrismaClient, data: T) via duck-typing '$connect' check"
  - "Singleton find-or-create: findFirst(); if (existing) return existing; return create({data: defaults})"
  - "Server Action stub pattern: 'use server' file re-exporting DAL calls with no injected DB — wired to UI forms later"

requirements-completed: [CMS-04, AICONF-01, AICONF-02, AICONF-03]

# Metrics
duration: 20min
completed: 2026-03-22
---

# Phase 5 Plan 04: Sources + AI Config + Pipeline Config Summary

**Source management Server Actions (CMS-04) and AI/pipeline config DAL layer (AICONF-01/02/03) implemented with TDD — 22 tests GREEN covering createSource, updateSource, listSourcesAdmin health dashboard, getAiConfig/upsertAiConfig singleton, getResolvedAiConfig per-source merge, and getPipelineConfig singleton**

## Performance

- **Duration:** 20 min
- **Started:** 2026-03-22T12:55:00Z
- **Completed:** 2026-03-22T13:15:00Z
- **Tasks:** 2 (RED + GREEN)
- **Files modified:** 7

## Accomplishments

- sources-actions.ts: createSourceDb (healthFailureThreshold=3 default), updateSourceDb, listSourcesAdmin with per-source health badge, latest IngestionRun stats, and FAILED+ERROR article count
- ai-config-dal.ts: getAiConfig/upsertAiConfig global singleton, getResolvedAiConfig merging NULL-aware per-source overrides onto global defaults, upsertAiSourceConfig/deleteAiSourceConfig
- pipeline-config-dal.ts: getPipelineConfig/upsertPipelineConfig singleton with maxRetryCount=3 and deadManThresholdHours=6 defaults
- Thin Server Action stub files created (ai-config-actions.ts, pipeline-config-actions.ts) for Plans 06/07 wiring
- Full test suite: 22 plan-target tests GREEN; 3 pre-existing timeout flakes in unrelated test files (not caused by this plan)

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — failing tests for sources-actions, ai-config-dal, pipeline-config-dal** - `0fd17b8` (test)
2. **Task 2: GREEN — implement sources-actions, ai-config-dal, pipeline-config-dal** - `e69dfd1` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/lib/admin/sources-actions.ts` — createSourceDb, updateSourceDb, listSourcesAdmin with health dashboard enrichment; createSource, updateSource Server Action wrappers
- `src/lib/admin/ai-config-dal.ts` — getAiConfig, upsertAiConfig, getResolvedAiConfig, upsertAiSourceConfig, deleteAiSourceConfig; ResolvedAiConfig interface exported
- `src/lib/admin/pipeline-config-dal.ts` — getPipelineConfig, upsertPipelineConfig with singleton find-or-create
- `src/lib/admin/ai-config-actions.ts` — Thin 'use server' wrapper re-exporting ai-config-dal functions (stub for Plan 06/07)
- `src/lib/admin/pipeline-config-actions.ts` — Thin 'use server' wrapper re-exporting pipeline-config-dal functions (stub for Plan 06/07)
- `src/lib/admin/sources-actions.test.ts` — 6 tests for CMS-04 (was Wave 0 stubs, now fully implemented)
- `src/lib/admin/ai-config-dal.test.ts` — 16 tests for AICONF-01/02/03 + pipeline integration stub (was Wave 0 stubs, now fully implemented)

## Decisions Made

- `listSourcesAdmin` uses `IngestionRun.startedAt` as the `createdAt` field in `SourceAdminRow.latestRun` — IngestionRun has no separate `createdAt` field; `startedAt` is semantically equivalent
- `listSourcesAdmin` FAILED+ERROR count filters by source `type` not source `id` — Articles have no FK to Source (they store the ArticleSource enum); documented as approximate for multi-source same-type configurations
- `getResolvedAiConfig` calls `getAiConfig(client)` internally — reuses singleton logic without duplication; passes injected client through
- `upsertAiSourceConfig` uses Prisma's native `upsert` on `sourceId @unique` — single atomic DB call, avoids race conditions in findFirst+update pattern

## Deviations from Plan

None - plan executed exactly as written. All 5 files specified in the plan's `<files>` block were created. Thin Server Action stub files (ai-config-actions.ts, pipeline-config-actions.ts) were included per `<implementation>` section.

## Issues Encountered

The full test suite has 3 pre-existing flaky timeout failures in unrelated test files (`articles-actions.test.ts`, `pipeline.test.ts`, `dead-man.test.ts`). These time out in `beforeAll` hooks and are not caused by any changes in this plan — they also failed in the plan 03 baseline (139 total tests). The plan's own 22 target tests all pass cleanly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CMS-04 source management Server Actions are ready for UI integration in Plan 06
- AICONF-01/02/03 DAL layer is the integration point for Plan 05 (pipeline integration reads AiConfig)
- PipelineConfig singleton ready — Plan 05 pipeline.ts can call getPipelineConfig() to replace MAX_RETRY_COUNT and DEAD_MAN_THRESHOLD_HOURS module-level constants
- All 22 tests GREEN; TypeScript: 0 errors

## Self-Check: PASSED

All 5 required implementation files exist and confirmed committed at e69dfd1. RED test commit at 0fd17b8 confirmed in git log. 22 tests GREEN in target files.

---
*Phase: 05-editorial-cms*
*Completed: 2026-03-22*
