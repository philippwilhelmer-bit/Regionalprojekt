---
phase: 41-location-intelligence-full-pipeline
plan: "01"
subsystem: location-intelligence
tags: [geocoding, regex, llm, nominatim, prisma, tdd]
dependency_graph:
  requires: []
  provides:
    - src/lib/images/locextract.ts
    - src/lib/images/geocode.ts
    - GeocodingCache Prisma model
  affects:
    - Plan 41-02 (pipeline integration reads these exports)
tech_stack:
  added: []
  patterns:
    - Regex with lookahead/lookbehind for non-word-character boundaries
    - Haiku output_config JSON schema (same as step1-tag.ts)
    - Postgres cache-aside with upsert for P2002 race handling
key_files:
  created:
    - src/lib/images/locextract.ts
    - src/lib/images/locextract.test.ts
    - src/lib/images/geocode.ts
    - src/lib/images/geocode.test.ts
  modified:
    - prisma/schema.prisma
decisions:
  - Regex uses lookahead/lookbehind (not \b) to handle place names ending in non-word chars like "Graz (Stadt)"
  - geocode.ts uses upsert (not create+catch) to handle concurrent Nominatim cache writes cleanly
  - GEOCODING_QUERY_OVERRIDE lives in locextract.ts and is imported by geocode.ts to keep all location data in one file
metrics:
  duration: "~20 minutes"
  tasks_completed: 3
  files_created: 4
  files_modified: 1
  tests_added: 25
  completed_date: "2026-04-13"
---

# Phase 41 Plan 01: Location Extraction and Nominatim Geocoding Summary

**One-liner:** Regex + Haiku LLM location extraction with longest-first matching, plus Nominatim geocoding backed by a deduplicated GeocodingCache Postgres table with upsert-based race handling.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | GeocodingCache Prisma model and migration | 29b7894 | prisma/schema.prisma |
| 2 (RED) | Locextract failing tests | 80fbf99 | src/lib/images/locextract.test.ts |
| 2 (GREEN) | Locextract implementation | a97d320 | src/lib/images/locextract.ts |
| 3 (RED) | Geocode failing tests | 2bd555d | src/lib/images/geocode.test.ts |
| 3 (GREEN) | Geocode implementation | c36eff8 | src/lib/images/geocode.ts |

## Decisions Made

1. **Regex boundary handling:** `\b` word boundaries fail for names ending with non-word characters like `)` in "Graz (Stadt)". Solution: use lookbehind `(?<![\w])` at the start and lookahead `(?![\w])` at the end, applied only when the name starts/ends with a word character.

2. **Upsert instead of create+catch for P2002:** The plan mentioned both options. Chose `upsert` with `update: {}` (no-op) over `create` + P2002 try/catch — it is cleaner and atomically handles concurrent serverless bursts without requiring Prisma error code inspection.

3. **GEOCODING_QUERY_OVERRIDE in locextract.ts:** Keeps all Steiermark location domain knowledge in one module. `geocode.ts` imports the map and applies it as a pure transformation before URL construction.

## Verification

```
✓ prisma validate — schema valid
✓ prisma generate — Prisma client regenerated with GeocodingCache type
✓ locextract.test.ts — 17/17 tests passed (MAP-01, CMS-02)
✓ geocode.test.ts — 8/8 tests passed (MAP-02)
✓ combined run — 25/25 tests green
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Regex word boundary failure for "Graz (Stadt)"**
- **Found during:** Task 2 GREEN phase (test failure)
- **Issue:** `\bGraz \(Stadt\)\b` failed to match "Graz (Stadt)" because `)` is not a word character, making the trailing `\b` a zero-width assertion that never satisfies at end-of-string after a non-word char.
- **Fix:** Replaced `\b` with lookahead/lookbehind: leading `(?<![\w])` when name starts with word char, trailing `(?![\w])` when name ends with word char; names ending with non-word chars (like `)`) get a lookahead that permits end-of-string or whitespace.
- **Files modified:** src/lib/images/locextract.ts
- **Commit:** a97d320

## Self-Check: PASSED
