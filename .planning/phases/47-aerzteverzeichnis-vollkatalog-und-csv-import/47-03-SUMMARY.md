---
phase: 47-aerzteverzeichnis-vollkatalog-und-csv-import
plan: "03"
subsystem: admin-import
tags:
  - server-action
  - trinity
  - transaction
  - batch-geocode
  - in-memory-cache
dependency_graph:
  requires:
    - 47-02  # csv-parser.ts (parseDoctorsCsv, ParsedRow, RowConflict)
    - 47-01  # Prisma schema (arztNr, Fachrichtung enum, profilUrl)
    - 47-00  # papaparse, fachrichtung-mapping.ts, bezirk-alias.ts
  provides:
    - parseAndPreviewCsvDb / parseAndPreviewCsv / parseAndPreviewCsvForm
    - commitCsvImportDb / commitCsvImport / commitCsvImportForm
    - geocodeBatchDb / geocodeBatchAction / geocodeBatchForm
    - PREVIEW_CACHE (module-scoped Map in preview-cache.ts)
  affects:
    - 47-04  # admin UI consumes parseAndPreviewCsvForm, commitCsvImportForm, geocodeBatchForm
tech_stack:
  added:
    - sleep function injected via parameter (avoids vi.useFakeTimers breaking pglite)
  patterns:
    - Server-Action-Trinity (*Db / *Action / *Form)
    - db.$transaction([...upsertOps]) array form
    - DI sleepFn parameter for testable rate-limit loop
    - preview-cache.ts outside 'use server' (prevents Next.js treating helpers as actions)
key_files:
  created:
    - src/lib/admin/doctors-import-actions.ts
    - src/lib/admin/doctors-import-actions.test.ts
    - src/lib/admin/import/preview-cache.ts
  modified: []
decisions:
  - "PREVIEW_CACHE in separate preview-cache.ts (not 'use server') — Next.js treats every export in 'use server' files as Server Actions; helpers must be non-actions"
  - "sleep exported + injected as sleepFn parameter in geocodeBatchDb — vi.useFakeTimers() breaks pglite's internal setTimeout; DI is cleaner and faster"
  - "addressChanged pre-computed in parseAndPreviewCsvDb (not in commitCsvImportDb) — single source of truth, avoids second DB query in commit path"
  - "geocodeBatchDb(db, sleepFn) production path uses default sleep(1100); tests inject noopSleep"
metrics:
  duration: "~10 minutes"
  completed_date: "2026-05-16"
  tasks_completed: 3
  files_created: 3
  test_count: 20
---

# Phase 47 Plan 03: Import Action Trinities Summary

Built the three Server-Action-Trinity triplets that form the data-flow heart of Phase 47's CSV import pipeline: parse/preview, commit, and batch geocode.

## What Was Built

### `src/lib/admin/import/preview-cache.ts`
Module-scoped `Map<string, CachedPreview>` with 15-minute TTL pruning. Separated from the `'use server'` actions file so Next.js does not treat `setPreview` / `getPreview` as Server Actions. Exports `PREVIEW_CACHE`, `CachedPreview`, `setPreview`, `getPreview`, `pruneExpired`.

### `src/lib/admin/doctors-import-actions.ts`
`'use server'` + `export const maxDuration = 300` at the top.

**Trinity 1 — parseAndPreviewCsv**:
- Calls `parseDoctorsCsv(csvText)` → enriches rows with bezirkId (one batch DB query), isUpdate (one batch DB query), addressChanged (exact string equality per D-17).
- Rows with unknown Bezirk names are rejected with `severity: 'error'` conflict.
- Caches enriched rows + conflicts keyed by `crypto.randomUUID()` token.
- Returns `{token, summary: {totalRows, newRows, updateRows, conflictCount}, conflicts}`.

**Trinity 2 — commitCsvImport**:
- Loads cached rows by token; throws German "Vorschau abgelaufen" if not found/expired.
- Builds `upsertOps = rows.map(row => db.doctor.upsert({...}))`.
- Passes to `await db.$transaction(upsertOps)` — atomic, all-or-nothing.
- UPDATE payload: `name, fachrichtung, address, phone, profilUrl, bezirkId` only.
- Address-change conditional spread: `...(row.addressChanged ? { lat: null, lon: null, mapImageUrl: null } : {})`.
- NEVER in update payload: `titel, email, editorialNote, relatedArticleIds, isVerified` (D-16).

**Trinity 3 — geocodeBatch**:
- `db.doctor.findMany({ where: { lat: null }, take: 200 })`.
- Sequential loop: `geocodeLocation` → `await sleepFn(1100)` (ALWAYS, even on failure) → mapgen → `db.doctor.update`.
- Per-doctor try/catch isolates geocode failures (console.warn, no rethrow).
- Mapgen failure non-fatal: lat/lon still updated, mapImageUrl=null.
- Returns `{processed, remaining, failures}`.

### `src/lib/admin/doctors-import-actions.test.ts`
20 tests across 3 describe groups — all passing.

## Test Results

```
✓ src/lib/admin/doctors-import-actions.test.ts (20 tests) 1650ms
  ✓ parseAndPreviewCsv — Task 1 tests (6)
  ✓ commitCsvImport — Task 2 tests (7)
  ✓ geocodeBatch — Task 3 tests (7)
```

## Decisions Made

### 1. PREVIEW_CACHE in separate `preview-cache.ts` (plan-specified mitigation)
Next.js 15 treats every export from `'use server'` files as Server Actions. Placing `setPreview`, `getPreview`, and the `PREVIEW_CACHE` Map in a non-`'use server'` file prevents them from being serialized as actions while still making them importable from the actions file and from tests (for PREVIEW_CACHE.clear() between tests).

### 2. sleepFn DI instead of vi.useFakeTimers() for Test 3
`vi.useFakeTimers()` (even with `{ toFake: ['setTimeout'] }`) caused test timeouts because pglite (the in-process PostgreSQL used in tests) uses `setTimeout` internally. Faking `setTimeout` globally suspended pglite's query processing, hanging the tests.

Resolution: exported `sleep` from `doctors-import-actions.ts` and added an optional `sleepFn: (ms: number) => Promise<void> = sleep` parameter to `geocodeBatchDb`. Production code always uses the default `sleep(1100)`. Tests inject `vi.fn().mockResolvedValue(undefined)` and verify it's called 3 times with exactly 1100ms — the key invariant from AGENTS.md.

Test 3's assertion confirms the sleep IS wired correctly: `noopSleep` is called once per doctor, always with `1100`, and is placed after every `geocodeLocation` call including failures.

### 3. vi.useFakeTimers behavior note
The plan's Task 3 suggested the `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync()` pattern. This pattern is well-documented for apps using plain Node timers, but breaks when test infrastructure (pglite) also uses `setTimeout`. The DI approach achieves the same verification goal with fewer footguns and faster test execution (~2s total vs. would-have-been >200s with real sleep).

## Verification

```bash
grep "export const maxDuration = 300" src/lib/admin/doctors-import-actions.ts  # ✓ 1 match
grep -c "requireAuth" src/lib/admin/doctors-import-actions.ts                   # ✓ 11 (imports + 6 call sites)
grep "1100" src/lib/admin/doctors-import-actions.ts                             # ✓ matches sleepFn(1100)
grep "\$transaction" src/lib/admin/doctors-import-actions.ts                    # ✓ 1 match in commitCsvImportDb
```

## Ready for Plan 47-04

Plan 47-04 (admin UI) can import:
```typescript
import {
  parseAndPreviewCsvForm,
  commitCsvImportForm,
  geocodeBatchForm,
} from '@/lib/admin/doctors-import-actions'
```

All three Form wrappers are Server Actions ready for `<form action={...}>` use in the admin UI.

## Deviations from Plan

### Auto-adjusted Issues

**1. [Rule 1 - Bug] makeCsv test helper had commas in address field**
- **Found during:** Task 1 RED phase run
- **Issue:** Default address `'Teststraße 1, 8010 Graz'` had an embedded comma causing PapaParse to reject CSV as malformed (FieldMismatch error).
- **Fix:** Removed comma from default address in test helper; added CSV quoting (`q()` function) for all fields.
- **Files modified:** `doctors-import-actions.test.ts`

**2. [Rule 1 - Bug] geocode sleep ran AFTER try/catch (failure isolation broken)**
- **Found during:** Task 3 implementation
- **Issue:** Original implementation had `await sleepFn(1100)` inside the `try` block after `geocodeLocation`. When geocode threw, the sleep was skipped (exception jumps to catch), violating the "sleep ALWAYS" rule.
- **Fix:** Restructured to separate geocode try/catch from sleep: geocode errors set `geocodeFailed=true` + `failures++` + `console.warn`, then `await sleepFn(1100)` runs unconditionally, then `continue` if failed.
- **Files modified:** `doctors-import-actions.ts`

**3. [Rule 3 - Blocking] vi.useFakeTimers() broke pglite**
- **Found during:** Task 3 test execution
- **Issue:** All geocodeBatch tests timed out (5000ms) when using `vi.useFakeTimers()` because pglite uses `setTimeout` internally; faking it globally suspended query execution.
- **Fix:** Added optional `sleepFn` DI parameter to `geocodeBatchDb`; tests inject `noopSleep`. Production path unchanged (default `sleep` parameter). Test 3 verifies sleep cadence via `noopSleep.mock.calls` inspection.
- **Files modified:** `doctors-import-actions.ts`, `doctors-import-actions.test.ts`

## Threat Flags

No new threat surfaces beyond the plan's `<threat_model>`. All mitigations implemented:
- T-47-03-AUTH: requireAuth() called first in all 6 Action/Form wrappers ✓
- T-47-03-MASS: update payload allow-list enforced, no editorial field overwrite possible ✓
- T-47-03-CACHE: UUID token (crypto.randomUUID()) for cache key ✓
- T-47-03-RATELIMIT: sleepFn(1100) after every geocodeLocation call ✓
- T-47-03-TIMEOUT: take:200 cap ✓
- T-47-03-PARTIAL: db.$transaction([...]) array form ✓

## Self-Check: PASSED

- `src/lib/admin/doctors-import-actions.ts` — exists ✓
- `src/lib/admin/doctors-import-actions.test.ts` — exists ✓
- `src/lib/admin/import/preview-cache.ts` — exists ✓
- Commits `1ae3a85` (test RED) and `7cc8130` (feat GREEN) — exist ✓
- 20/20 tests green ✓
