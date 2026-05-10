---
phase: 41-location-intelligence-full-pipeline
plan: "02"
subsystem: pipeline-integration
tags: [pipeline, location-intelligence, tdd, map-generation, intg-01]
dependency_graph:
  requires:
    - src/lib/images/locextract.ts
    - src/lib/images/geocode.ts
    - src/lib/images/mapgen.ts
  provides:
    - Map generation integrated into cron pipeline
  affects:
    - src/lib/ai/pipeline.ts (modified — map block after step2)
tech_stack:
  added: []
  patterns:
    - Inner try/catch for error isolation (map errors never block publication)
    - Module-level vi.mock in vitest for dependency injection in integration tests
    - TDD RED/GREEN cycle with module mocking
key_files:
  created: []
  modified:
    - src/lib/ai/pipeline.ts
    - src/lib/ai/pipeline.test.ts
decisions:
  - Map generation block uses inner try/catch separate from per-article catch to guarantee map errors never increment retryCount or change article status
  - article.imageUrl guard checks the article object loaded at loop start — Unsplash images set before pipeline runs are preserved
  - Separate db.article.update for imageUrl/imageCredit (not merged into status update) to avoid silent overwrite risk
metrics:
  duration: "~15 minutes"
  tasks_completed: 1
  files_created: 0
  files_modified: 2
  tests_added: 5
  completed_date: "2026-04-13"
---

# Phase 41 Plan 02: Pipeline Map Generation Integration Summary

**One-liner:** Wired extractLocation, llmLocationFallback, geocodeLocation, and generateMapImage into the cron pipeline after step2, with inner try/catch error isolation and imageUrl guard to preserve manually-set Unsplash images.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Failing tests for INTG-01 map generation | 6c9db68 | src/lib/ai/pipeline.test.ts |
| 1 (GREEN) | Wire map generation into pipeline.ts | e1d0e06 | src/lib/ai/pipeline.ts |

## Decisions Made

1. **Inner try/catch for map block:** The map generation block is wrapped in its own `try/catch` SEPARATE from the per-article `try/catch`. This ensures that any map error (geocoding timeout, tile fetch failure, blob upload failure) does NOT increment `retryCount` or change `article.status`. Article publication is never blocked by map failure.

2. **Separate db.article.update for imageUrl/imageCredit:** The existing status update at line ~210 writes `status`, `title`, `content`, `seoTitle`, `metaDescription` — it does not include `imageUrl` or `imageCredit`. A separate `db.article.update` for image fields ensures no silent overwrite of a successfully generated map URL.

3. **article.imageUrl guard:** The `if (!article.imageUrl)` check uses the article object loaded at the start of the loop iteration. If an Unsplash image was manually set before the cron run, map generation is skipped entirely.

## Verification

```
vitest run src/lib/images/locextract.test.ts src/lib/images/geocode.test.ts src/lib/ai/pipeline.test.ts
Test Files  3 passed (3)
      Tests  49 passed (49)

Structural checks:
- grep "map skipped" pipeline.ts → FOUND at line 202
- grep "!article.imageUrl" pipeline.ts → FOUND at line 174
- Final status update data payload: status, title, content, seoTitle, metaDescription (NO imageUrl) → CONFIRMED
```

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED
