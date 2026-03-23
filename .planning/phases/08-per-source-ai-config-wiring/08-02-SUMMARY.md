---
phase: 08-per-source-ai-config-wiring
plan: "02"
subsystem: ai-pipeline
tags: [tdd, ai-config, per-source, pipeline, ingestion, AICONF-02]
dependency_graph:
  requires: [08-01]
  provides: [AICONF-02]
  affects: [src/lib/ai/steps/step2-write.ts, src/lib/ai/pipeline.ts, src/lib/ingestion/ingest.ts]
tech_stack:
  added: []
  patterns: [getResolvedAiConfig DI overload, optional 5th param additive extension]
key_files:
  created:
    - src/lib/ai/steps/step2-write-source-override.test.ts
  modified:
    - src/lib/ai/steps/step2-write.ts
    - src/lib/ai/pipeline.ts
    - src/lib/ingestion/ingest.ts
    - src/lib/ai/steps/step2-write.test.ts
decisions:
  - "step2-write.ts uses conditional call: getResolvedAiConfig(db, sourceId) when db injected, getResolvedAiConfig(sourceId as unknown as number) for production singleton path — production always passes db from pipeline.ts so the else branch is a safety fallback only"
  - "step2-write.test.ts mock DB extended with aiSourceConfig.findFirst returning null — getResolvedAiConfig now queries aiSourceConfig in addition to aiConfig"
metrics:
  duration: "~15 minutes"
  completed: "2026-03-23"
  tasks_completed: 2
  files_changed: 5
---

# Phase 08 Plan 02: Per-Source AI Config Wiring Summary

Per-source AI config override wired end-to-end: `Article.sourceId` set in ingestion, passed through pipeline, used by `runStep2Write` via `getResolvedAiConfig` — closes AICONF-02.

## Objective

Wire `Article.sourceId` through the full ingestion and pipeline path so that per-source AI config overrides actually affect article generation.

## Tasks Completed

| Task | Type | Commit | Files |
|------|------|--------|-------|
| RED: failing override tests | test | c98881c | step2-write-source-override.test.ts |
| GREEN: source file changes | feat | 1e4e299 | step2-write.ts, pipeline.ts, ingest.ts, step2-write.test.ts |

## What Was Built

### RED Phase
Implemented two integration tests in `step2-write-source-override.test.ts` using a real pgLite DB:
- Case 1: Creates a Source + AiSourceConfig with `modelOverride='claude-opus-4-5'`, calls `runStep2Write(..., db, src.id)`, asserts `messages.create` called with `model: 'claude-opus-4-5'`
- Case 2: No AiSourceConfig, calls `runStep2Write(..., db, undefined)`, asserts `messages.create` called with `model: 'claude-haiku-4-5-20251001'` (global default)

Case 1 failed as expected (step2-write still used old `getAiConfig` path). Case 2 passed (fallback already worked).

### GREEN Phase

Three source file changes:

**ingest.ts**: Added `sourceId: src.id` to `article.create()` data object — Article rows now record their Source FK at ingestion time.

**step2-write.ts**:
- Added optional `sourceId?: number` as 5th parameter
- Replaced `getAiConfig` import + manual `ResolvedAiConfig` construction with single `getResolvedAiConfig(db, sourceId ?? undefined)` call
- Removed `TODO(Phase 7)` comment

**pipeline.ts**: Added `article.sourceId ?? undefined` as 5th argument to `runStep2Write` call.

**step2-write.test.ts** (deviation, Rule 2): Added `aiSourceConfig: { findFirst: vi.fn().mockResolvedValue(null) }` to the mock DB — `getResolvedAiConfig` now queries `aiSourceConfig` in addition to `aiConfig`.

## Verification Results

```
npx vitest run src/lib/ai/steps/step2-write-source-override.test.ts  → 2/2 passed
npx vitest run                                                         → 185/185 passed
npx tsc --noEmit                                                       → exit 0
grep "TODO" step2-write.ts                                             → NOT FOUND
grep "getResolvedAiConfig" step2-write.ts                              → FOUND
grep "sourceId" ingest.ts                                              → FOUND
grep "article.sourceId" pipeline.ts                                    → FOUND
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing stub] Added aiSourceConfig mock to step2-write.test.ts**
- **Found during:** GREEN phase implementation
- **Issue:** `getResolvedAiConfig` calls `aiSourceConfig.findFirst` in addition to `aiConfig.findFirst`. The existing mock DB only had `aiConfig` stub — would have caused runtime error when tests ran against the updated implementation.
- **Fix:** Added `aiSourceConfig: { findFirst: vi.fn().mockResolvedValue(null) }` to `makeMockDb()` return object.
- **Files modified:** `src/lib/ai/steps/step2-write.test.ts`
- **Commit:** 1e4e299

## Self-Check: PASSED

- FOUND: src/lib/ai/steps/step2-write-source-override.test.ts
- FOUND: src/lib/ai/steps/step2-write.ts
- FOUND: src/lib/ai/pipeline.ts
- FOUND: src/lib/ingestion/ingest.ts
- FOUND commit c98881c (test RED phase)
- FOUND commit 1e4e299 (feat GREEN phase)
