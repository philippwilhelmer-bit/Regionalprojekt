---
phase: "47"
plan: "06"
subsystem: integration-gate
tags: [integration, smoke, verification, state-update, phase-closure]
dependency_graph:
  requires: [47-04, 47-05]
  provides: [phase-47-closure, dir-14-dir-31-complete]
  affects: [STATE.md, REQUIREMENTS.md, sitemap.test.ts, doctors-import-actions.ts, admin-aerzte-page]
tech_stack:
  added: []
  patterns: [integration-smoke, sequential-verification-gate]
key_files:
  created:
    - .planning/phases/47-aerzteverzeichnis-vollkatalog-und-csv-import/47-06-SUMMARY.md
  modified:
    - .planning/STATE.md
    - .planning/REQUIREMENTS.md
    - src/lib/reader/sitemap.test.ts
    - src/lib/admin/doctors-import-actions.ts
    - src/app/(admin)/admin/aerzte/page.tsx
decisions:
  - "sitemap.test.ts requires a listDoctors mock — Phase 46-05 added the listDoctors arm to sitemap() but the mock was not added to the older sitemap.test.ts; fix applied as Rule 1 deviation"
  - "maxDuration must be exported from the route segment (page.tsx), not from a 'use server' file — Next.js 15 forbids non-async exports in server action files; moved to admin/aerzte/page.tsx as Rule 1 deviation"
  - "Manual UI smoke (Task 2 checklist, 14 steps) is pending operator — all three automated gates (vitest + tsc + build) pass; smoke flagged in SUMMARY and STATE.md"
  - "bezirke.test.ts CONF-02 (2 tests) and root-layout-adsense.test.ts (1 file) remain failing — both documented pre-existing in STATE.md deferred list; out of scope per AGENTS.md no-scope-creep rule"
metrics:
  duration: "~30 minutes"
  completed: "2026-05-16"
  tasks_completed: 3
  files_changed: 5
---

# Phase 47 Plan 06: Integration Gate + Phase Closure Summary

Final integration check for Phase 47 (aerzteverzeichnis-vollkatalog-und-csv-import). Ran full vitest suite, typecheck, and Next.js build; fixed two integration regressions discovered during the gate; updated STATE.md to record Phase 47 completion and ticked all 18 DIR-14..DIR-31 requirements as Complete in REQUIREMENTS.md.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Full-suite verification (vitest + tsc + build) + two Rule 1 bug fixes | `953e762` |
| 2 | Manual smoke checkpoint — auto-proceeded per CHECKPOINT POLICY (automated gates pass; smoke flagged as pending operator) | _(no commit — checkpoint note)_ |
| 3 | STATE.md + REQUIREMENTS.md Phase 47 closure | `5571b53` |

## Automated Verification Results

### vitest (npm test)

- **Test Files:** 2 failed | 55 passed (57 total)
- **Tests:** 2 failed | 533 passed (535 total)
- **Duration:** ~63s
- **Exit code:** non-zero (due to pre-existing failures only)

**Pre-existing failures (out of scope — documented in STATE.md deferred list):**

| File | Tests | Reason |
|------|-------|--------|
| `src/lib/content/bezirke.test.ts` | 2 | CONF-02 data drift (gemeindeSynonyms empty) |
| `src/app/__tests__/root-layout-adsense.test.ts` | 1 file (0 tests run) | Plus_Jakarta_Sans font mock failure |

Both were failing before Phase 47 started (confirmed via `git stash` + re-run against pre-phase HEAD).

**Phase 47 test files all green:**

| Test file | Tests | Status |
|-----------|-------|--------|
| `doctors.test.ts` | 24 | PASS |
| `doctors-actions.test.ts` | 24 | PASS |
| `doctors-import-actions.test.ts` | 20 | PASS |
| `csv-parser.test.ts` | 15 | PASS |
| `doctor-metadata.test.ts` | 12 | PASS |
| `sitemap.test.ts` | 6 | PASS (after Rule 1 fix) |

### TypeScript (`npx tsc --noEmit`)

Exit code: 2 (pre-existing errors only)

| Error | File | Status |
|-------|------|--------|
| `Cannot find name 'afterEach'` | `map-actions.test.ts:182` | Pre-existing (Phase 43 deferred) |
| `ArrayBuffer / SharedArrayBuffer` type mismatch | `mapgen.test.ts:193` | Pre-existing (post-Node24 issue) |

No new TypeScript errors introduced by Phase 47.

### Next.js build (`npm run build`)

- **Exit code:** 0
- **Output:** `Compiled successfully in 1572ms` / `Generating static pages (16/16)`
- **Route count:** 26 routes (all expected: /aerzte, /admin/aerzte, /admin/aerzte/import, etc.)

## Manual UI Smoke — PENDING OPERATOR

**Status:** NOT executed by this agent (requires live `npm run dev` + browser + DB).

**Checkpoint policy applied:** Per the sequential execution context, since all three automated gates pass, the agent proceeded and writes this SUMMARY noting the smoke as pending.

**Operator action required before merging to remote:**

Run `npm run dev` and execute the 14-step smoke checklist from `47-06-PLAN.md` Task 2:

1. `/admin/aerzte` — counter shows `0 von 0 Ärzte geocoded (0 ausstehend)`; Geocode button disabled; CSV importieren + Neuer Arzt links visible.
2. `/admin/aerzte/import` — h1 "CSV importieren" + upload form present.
3. Upload `test/fixtures/aerzte-sample.csv` — preview: "10 Zeilen: 10 neu, 0 Updates, 0 Konflikte" green chip.
4. Click `Import bestätigen` → `Wirklich importieren` — redirect to `/admin/aerzte?imported=10`; green banner; counter updates to "0 von 10 Ärzte geocoded (10 ausstehend)"; button enabled.
5. Click `Geocode next 200` — wait ~30s for 10 rows; counter updates to "10 von 10 Ärzte geocoded"; button disabled.
6. Edit form for any doctor — `arztNr` filled; Fachrichtung is `<select>` not free-text; `Profil-URL` field present; no Kategorie.
7. `/aerzte` (incognito) — Bezirk chips (13); Fachrichtung datalist input; NO kategorie chips.
8. Type "Aug" in Fachrichtung — native autocomplete shows "Augenheilkunde und Optometrie".
9. Select "Augenheilkunde und Optometrie"; URL → `?fachrichtung=AUGENHEILKUNDE_UND_OPTOMETRIE`; list filters.
10. Clear input — URL drops param; list shows all 10.
11. Doctor detail — address; map pin; "Angaben ohne Gewähr" disclaimer; profilUrl "Profil auf aekstmk.or.at" anchor.
12. View-source of detail — `"@type":"Physician"` present; `"medicalSpecialty"` is German label; `"sameAs"` array if profilUrl set; NO `"Dentist"`.
13. Re-upload same CSV — preview "10 Zeilen: 0 neu, 10 Updates, 0 Konflikte"; commit; geocode counter stays "10 von 10".
14. Edit one fixture row's address; re-upload — counter drops to "9 von 10 (1 ausstehend)"; revert fixture (`git checkout -- test/fixtures/aerzte-sample.csv`).

## Deviations from Plan

### Auto-fixed Issues (Rule 1 — Bug)

**1. [Rule 1 - Bug] `sitemap.test.ts` missing `listDoctors` mock**
- **Found during:** Task 1 — first `npm test` run
- **Issue:** Phase 46-05 added a third `Promise.all` arm (`listDoctors({ limit: 5000 })`) to `sitemap.ts` but did not update `sitemap.test.ts` to mock `listDoctors`. All 6 sitemap tests failed with `ENOTFOUND tenant/user postgres.kehgnseevgwfvrvrwrsz not found` (real DB connection attempted).
- **Fix:** Added `vi.mock('../../lib/content/doctors', () => ({ listDoctors: vi.fn() }))` to `sitemap.test.ts`; added `mockListDoctors.mockResolvedValue([])` to each test; updated URL count assertion from 17 to 18 (the `/aerzte` index entry was also missing from the expected count).
- **Files modified:** `src/lib/reader/sitemap.test.ts`
- **Commit:** `953e762`

**2. [Rule 1 - Bug] `maxDuration = 300` exported from `'use server'` file**
- **Found during:** Task 1 — `npm run build`
- **Issue:** Phase 47-03 placed `export const maxDuration = 300` at the top of `doctors-import-actions.ts` (a `'use server'` file). Next.js 15 forbids non-async exports from server action files — build failed with `Only async functions are allowed to be exported in a "use server" file`.
- **Fix:** Removed `maxDuration` and `export { PREVIEW_CACHE }` from `doctors-import-actions.ts` (both non-async); added `export const maxDuration = 300` to `src/app/(admin)/admin/aerzte/page.tsx` (the correct location per Vercel's route-segment convention). Tests already imported `PREVIEW_CACHE` directly from `./import/preview-cache.ts`.
- **Files modified:** `src/lib/admin/doctors-import-actions.ts`, `src/app/(admin)/admin/aerzte/page.tsx`
- **Commit:** `953e762`

### Out-of-Scope Pre-existing Issues (documented, not fixed)

- `bezirke.test.ts` CONF-02 (2 tests) — gemeindeSynonyms data drift — deferred in Phase 43 deferred-items.md
- `root-layout-adsense.test.ts` — Plus_Jakarta_Sans font mock — deferred in Phase 43 deferred-items.md
- TSC: `map-actions.test.ts afterEach` + `mapgen.test.ts ArrayBuffer` — deferred in Phase 43 deferred-items.md

## STATE.md Changes

| Field | Before | After |
|-------|--------|-------|
| `current_plan` | `1` | `6 (Phase 47 complete)` |
| `status` | `executing` | `complete` |
| `stopped_at` | `Phase 47 context gathered` | `Phase 47 shipped (manual UI smoke pending operator)` |
| `completed_phases` | `7` | `8` |
| `completed_plans` | `21` | `28` |
| `percent` | `68` | `90` |

9 new decision entries appended to the Decisions section. 7 performance metric rows added for Phase 47 P00–P06.

## REQUIREMENTS.MD Changes

All 18 DIR-14..DIR-31 checkboxes flipped from `[ ]` to `[x]`. Traceability table updated from `Pending` to `Complete` (DIR-27 + DIR-28 noted as "manual smoke pending"). Last-updated line updated.

## Known Stubs

None — no placeholder values or unconnected data sources. All Phase 47 data fields are wired from live DB schema. Smoke pending is a **verification gap**, not a stub in the code.

## Threat Flags

None beyond what was in prior plans' STRIDE registers (T-47-05-OPEN-REDIRECT accepted, T-47-06-STATE accepted, T-47-06-SMOKE-FALSE accepted).

## Suggested Next Steps

1. **Manual smoke first** — Run the 14-step checklist above with `npm run dev`; then `git push` to close Phase 47 fully on remote.
2. **Replan Phase 44** — `/gsd:plan-phase 44` (replan 44-01/02/03 with legacy-is-live context; TLM-01..07 telemetry schema + Batches API).
3. **Phase 45** — `/gsd:plan-phase 45` (REVIEW Heuristic & Quality Loop, QUAL-01..10 — not started).
4. **v3.4 bootstrap** — Plan the next milestone after smoke closure; primary candidates: telemetry (Phase 44), quality harness (Phase 45), and/or a new content domain.

## Self-Check

Files verified:
- `.planning/STATE.md` — contains "Phase 47" (28 occurrences); frontmatter shows status=complete, percent=90
- `.planning/REQUIREMENTS.md` — contains "Phase 47" (23 occurrences); all 18 DIR-14..DIR-31 checkboxes are `[x]`
- `src/lib/reader/sitemap.test.ts` — contains `listDoctors` mock; all 6 tests pass
- `src/lib/admin/doctors-import-actions.ts` — no `export const maxDuration`, no `export { PREVIEW_CACHE }`
- `src/app/(admin)/admin/aerzte/page.tsx` — contains `export const maxDuration = 300`
- `47-06-SUMMARY.md` — this file

Commits verified:
- `953e762` — exists (Task 1 — integration fixes)
- `5571b53` — exists (Task 3 — state + requirements update)

## Self-Check: PASSED
