---
phase: 47-aerzteverzeichnis-vollkatalog-und-csv-import
plan: "02"
subsystem: csv-import-parser
tags: [csv, parser, papaparse, validation, fixture, tdd]
completed: "2026-05-16T15:23:31Z"
duration: ~18min
tasks_completed: 3
files_created: 3
files_modified: 0

dependency_graph:
  requires:
    - 47-00 (FACHRICHTUNG_BY_LABEL, resolveBezirkName)
    - 47-01 (Fachrichtung enum in @prisma/client)
  provides:
    - parseDoctorsCsv (pure function)
    - ParsedRow, RowConflict, ParseResult interfaces
    - test/fixtures/aerzte-sample.csv fixture
  affects:
    - 47-03 (doctors-import-actions.ts calls parseDoctorsCsv)

tech_stack:
  added: []
  patterns:
    - pure-helper module (no DI, no DB, no auth) — dedup.ts convention
    - papaparse with header:true + dynamicTyping:false (D-07 D-11 pitfalls)
    - per-row conflict accumulation — errors never thrown for data issues

key_files:
  created:
    - src/lib/admin/import/csv-parser.ts
    - src/lib/admin/import/csv-parser.test.ts
    - test/fixtures/aerzte-sample.csv
  modified: []

decisions:
  - papaparse was listed in package.json but not installed in the worktree; ran npm install in main repo root to sync node_modules
  - BOM regex uses literal U+FEFF in source (auto-verified works correctly via node test)
  - csv-parser does NOT validate Bezirk against DB (passthrough) — per plan spec, 47-03 does the DB lookup
  - Test 7 (Bezirk passthrough) explicitly documents that unknown Bezirk names pass through this layer
  - 15 individual it() tests written (plan specified 10 test cases; some cases have multiple assertions split into separate its for clarity)
---

# Phase 47 Plan 02: CSV Parser + Fixture Summary

**One-liner:** Pure papaparse-based CSV parser with per-row conflict accumulation, BOM stripping, Fachrichtung enum validation, Bezirk alias resolution, and last-write-wins batch dedupe.

## Test Results

15 tests, all passing:

```
✓ src/lib/admin/import/csv-parser.test.ts (15 tests) 6ms
Test Files  1 passed (1)
     Tests  15 passed (15)
```

| Test Group | Tests | Covers |
|---|---|---|
| header | 3 | D-06 exact-match, wrong header throws German error, fewer columns |
| BOM | 1 | D-07 BOM strip, alias resolution after BOM removal |
| multi-line quoted | 1 | D-07/D-30 "Hals-, Nasen- und Ohrenheilkunde" → HALS_NASEN_UND_OHRENHEILKUNDE |
| required fields | 3 | D-08 Name/ArztNr/Bezirk missing → severity:error conflict, arztNr:null when ArztNr empty |
| unknown Fachrichtung | 1 | D-11 unknown label rejected with severity:error |
| Bezirk passthrough | 2 | D-10 known name unchanged; unknown name passes through (DB validates in 47-03) |
| dedupe | 1 | D-18 last-write-wins, single severity:warning conflict |
| fixture | 1 | D-30 10 rows, 0 conflicts, Graz (Stadt) alias + HALS_NASEN_UND_OHRENHEILKUNDE spot checks |
| optional cells | 2 | D-08 empty Telefonnummer → null, empty ProfilURL → null |

## Fixture Details

`test/fixtures/aerzte-sample.csv`: 11 lines (1 header + 10 data rows)

**4 Bezirke:** Graz-Stadt (3 rows, alias case), Murtal (3 rows), Liezen (2 rows), Weiz (2 rows)

**5 Fachrichtungen:**
- Allgemeinmedizin (3 rows)
- Innere Medizin (2 rows)
- Augenheilkunde und Optometrie (2 rows)
- Hals-, Nasen- und Ohrenheilkunde (2 rows — the multi-line-quoted edge case)
- Orthopädie und Traumatologie (1 row)

**Nullable fields:** 2 rows with empty Telefonnummer (rows A0004, A0006), 3 rows with empty ProfilURL (rows A0003, A0005, A0006)

## Papaparse Observations

- `skipEmptyLines: 'greedy'` did not fire on the sample fixture (all rows are non-empty). It is present as a defensive measure for real-world CSVs with trailing blank lines.
- `dynamicTyping: false` confirmed essential: without it, ArztNr values like "A0001" would remain strings, but numeric ArztNr values in the real dataset (e.g., plain integers) would silently coerce to numbers, breaking the `string` contract.
- Quoted fields (`"Graz-Stadt"`, `"Hals-, Nasen- und Ohrenheilkunde"`) parse correctly without triggering `Quotes` or `FieldMismatch` errors.

## Plan 47-03 Integration Confirmation

`parseDoctorsCsv` is a pure function: no DB, no auth, no Next.js runtime dependencies. Plan 47-03 (`doctors-import-actions.ts`) can import it directly:

```typescript
import { parseDoctorsCsv } from '@/lib/admin/import/csv-parser'
const { rows, conflicts } = parseDoctorsCsv(csvText)
// rows[].bezirkName → DB lookup for bezirkId happens in 47-03
// rows[].fachrichtung → already a validated Fachrichtung enum value
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] papaparse not installed in worktree**
- **Found during:** Task 2 (tsc --noEmit returned "Cannot find module 'papaparse'")
- **Issue:** papaparse was in package.json (added by 47-00) but `node_modules` was not synced to the worktree
- **Fix:** Ran `npm install` in the main repo root; node_modules is shared across worktrees via symlink
- **Files modified:** None (package.json was already correct)
- **Commit:** N/A (no code change needed)

## Known Stubs

None — all data is wired and functional. The fixture produces real parsed output consumed directly by the test suite.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. `csv-parser.ts` is a pure in-memory transform (string → struct). The trust boundary (uploaded CSV bytes → parser) is covered by T-47-02-CSV and T-47-02-QUOTE in the plan's threat model. Both mitigations are implemented:
- T-47-02-CSV: strict header match + per-row required field validation + FACHRICHTUNG_BY_LABEL allow-list
- T-47-02-QUOTE: explicit Papa.errors filter for Quotes/FieldMismatch with fail-fast throw

## Self-Check: PASSED

- [x] `test/fixtures/aerzte-sample.csv` exists: FOUND
- [x] `src/lib/admin/import/csv-parser.ts` exists: FOUND
- [x] `src/lib/admin/import/csv-parser.test.ts` exists: FOUND
- [x] Commit 9d43c92 (fixture): FOUND
- [x] Commit 308991d (csv-parser.ts): FOUND
- [x] Commit afd8f54 (csv-parser.test.ts): FOUND
- [x] 15 tests passing: VERIFIED
- [x] tsc --noEmit: no csv-parser errors
