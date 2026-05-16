---
phase: "47"
plan: "00"
subsystem: csv-import-foundation
tags: [csv-import, foundation, dependency, fachrichtung, bezirk-alias, papaparse, tdd]
dependency_graph:
  requires: [47-01]
  provides: [fachrichtung-mapping, bezirk-alias, papaparse-dep]
  affects: [47-02-csv-parser, 47-04-ui-rewrite, 47-05-public-filter]
tech_stack:
  added: [papaparse@5.5.3, "@types/papaparse@5.5.2"]
  patterns: [pure-constant-module, tdd-red-green, record-label-map]
key_files:
  created:
    - src/lib/admin/import/fachrichtung-mapping.ts
    - src/lib/admin/import/fachrichtung-mapping.test.ts
    - src/lib/admin/import/bezirk-alias.ts
    - src/lib/admin/import/bezirk-alias.test.ts
  modified:
    - package.json
    - package-lock.json
    - DECISIONS.md
decisions:
  - "papaparse@5.5.3 (runtime) + @types/papaparse@5.5.2 (dev) installed; DECISIONS.md entry added per AGENTS.md anti-bloat rule"
  - "FACHRICHTUNG_OPTIONS first entry is ALLGEMEINCHIRURGIE_UND_GEFAESSCHIRURGIE, not ALLGEMEINMEDIZIN — plan spec had incorrect German locale sort assumption (c < m in German collation)"
  - "Test updated to assert actual localeCompare('de') sort order + sorted invariant loop rather than hard-coded first/last position"
metrics:
  duration: "~25 minutes"
  completed: "2026-05-16"
  tasks_completed: 3
  files_changed: 7
---

# Phase 47 Plan 00: CSV Import Foundation — papaparse + Fachrichtung Mapping + Bezirk Alias Summary

Installed papaparse CSV parser dependency with DECISIONS.md entry, generated 51-entry FACHRICHTUNG_LABELS mapping module with reverse map and sorted options array, and created one-entry Bezirk alias helper — all with TDD (RED then GREEN commits).

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Install papaparse@5.5.3 + @types/papaparse@5.5.2; add DECISIONS.md entry | `bd6faec` |
| 2 (RED) | Failing tests for FACHRICHTUNG mapping (5 tests) | `2131116` |
| 2 (GREEN) | Implement fachrichtung-mapping.ts — 51-entry map, reverse map, sorted options | `0ebedf2` |
| 3 (RED) | Failing tests for bezirk-alias module (5 tests) | `819a0f0` |
| 3 (GREEN) | Implement bezirk-alias.ts — BEZIRK_ALIAS map + resolveBezirkName() | `b486a48` |

## Package Versions Installed

```
papaparse: 5.5.3
@types/papaparse: 5.5.2
```

Registry verification (run at task time):
- `papaparse`: MIT, published 2014-11-19 (>10 years), homepage https://www.papaparse.com/, maintained by mholt + pokoli, zero runtime dependencies
- `@types/papaparse`: MIT, from DefinitelyTyped/DefinitelyTyped

## DECISIONS.md Entry (first 3 / last 3 lines)

```
## 2026-05-16 — Phase 47: papaparse als CSV-Parser-Dependency

**Datum:** 2026-05-16
...
**Referenzen:**
- D-07 (CONTEXT.md): CSV-Format enthält Kommas innerhalb von Anführungszeichen
- RESEARCH.md § Standard Stack (lines 30-69): Installations- und Versions-Verifikation
```

## Test Results

| Test file | Tests | Status |
|-----------|-------|--------|
| `fachrichtung-mapping.test.ts` | 5 | PASS |
| `bezirk-alias.test.ts` | 5 | PASS |
| **Total** | **10** | **GREEN** |

Final run: `npx vitest run src/lib/admin/import/` — 2 test files, 10 tests, all passed.

## Fachrichtung Mapping Notes

- 51 entries exactly match `fachrichtung-values.txt` source file (verified via collision-free pre-check in RESEARCH.md)
- `import type { Fachrichtung } from '@prisma/client'` resolved cleanly — no fallback type needed (Plan 47-01 Wave 1 confirmed Fachrichtung enum in generated client)
- GENERATED banner present: `// GENERATED — do not edit manually. Source: fachrichtung-values.txt (51 entries).`
- All 51 labels unique (round-trip test confirms no collisions)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Incorrect German locale sort order assumption in Test 4**
- **Found during:** Task 2 GREEN phase (test run)
- **Issue:** Plan spec stated "first entry is `ALLGEMEINMEDIZIN` (alphabetically first under `localeCompare('de')`)". Actual German locale sort puts 'Allgemeinchirurgie und Gefäßchirurgie' before 'Allgemeinmedizin' (c < m in German collation). Test 4 failed with `expected 'ALLGEMEINCHIRURGIE_UND_GEFAESSCHIRURG…' to be 'ALLGEMEINMEDIZIN'`.
- **Fix:** Updated test to assert correct first entry (`ALLGEMEINCHIRURGIE_UND_GEFAESSCHIRURGIE`) and added a sorted invariant loop asserting `FACHRICHTUNG_OPTIONS[i].label.localeCompare(FACHRICHTUNG_OPTIONS[i+1].label, 'de') <= 0`. Last entry `UROLOGIE` remains correct.
- **Files modified:** `src/lib/admin/import/fachrichtung-mapping.test.ts`
- **Commit:** `0ebedf2`

## Known Stubs

None — both modules are pure constant/utility modules with no UI rendering or placeholder data.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced.

## TDD Gate Compliance

- Task 2 RED gate commit: `2131116` (test(47-00): add failing tests for FACHRICHTUNG mapping module)
- Task 2 GREEN gate commit: `0ebedf2` (feat(47-00): add FACHRICHTUNG_LABELS mapping module with 51 entries)
- Task 3 RED gate commit: `819a0f0` (test(47-00): add failing tests for bezirk-alias module)
- Task 3 GREEN gate commit: `b486a48` (feat(47-00): add bezirk-alias module with Graz-Stadt → Graz (Stadt) alias)

## Self-Check: PASSED

Files verified:
- `src/lib/admin/import/fachrichtung-mapping.ts` — exists, GENERATED banner present
- `src/lib/admin/import/fachrichtung-mapping.test.ts` — exists, 5 tests
- `src/lib/admin/import/bezirk-alias.ts` — exists, exports resolveBezirkName
- `src/lib/admin/import/bezirk-alias.test.ts` — exists, 5 tests
- `DECISIONS.md` — contains papaparse entry with 2026-05-16 date

Commits verified:
- `bd6faec` — exists (papaparse install + DECISIONS.md)
- `2131116` — exists (fachrichtung test RED)
- `0ebedf2` — exists (fachrichtung implementation GREEN)
- `819a0f0` — exists (bezirk-alias test RED)
- `b486a48` — exists (bezirk-alias implementation GREEN)
