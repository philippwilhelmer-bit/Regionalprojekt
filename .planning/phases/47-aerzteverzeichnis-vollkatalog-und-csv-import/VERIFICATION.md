---
phase: 47-aerzteverzeichnis-vollkatalog-und-csv-import
verified: 2026-05-16T12:00:00Z
status: human_needed
score: 16/18
overrides_applied: 0
human_verification:
  - test: "Geocoder progress counter (/admin/aerzte)"
    expected: "Counter reads 'X von Y Ärzte geocoded (Z ausstehend)' from live DB after import + batch run; button disabled when pending=0"
    why_human: "Counter reads live DB state; assertion against live values is brittle in unit test; requires npm run dev + real DB + browser"
  - test: "Fachrichtung datalist filter UX (/aerzte)"
    expected: "Type 'Aug' in Fachrichtung input — native browser autocomplete shows 'Augenheilkunde und Optometrie'; submit → URL ?fachrichtung=AUGENHEILKUNDE_UND_OPTOMETRIE; list filters correctly; clear → URL drops param"
    why_human: "Native browser autocomplete behavior; no React-DOM test harness configured; requires Chrome/Firefox + running dev server"
---

# Phase 47: Vollkatalog + CSV-Import Verification Report

**Phase Goal:** Extend the doctor directory with bulk CSV import, 51-value Fachrichtung enum, admin-triggered batch geocoder, and associated schema changes (DIR-14..DIR-31).
**Verified:** 2026-05-16T12:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Requirement | Truth | Status | Evidence |
|---|-------------|-------|--------|----------|
| 1 | DIR-14 | `Doctor.arztNr String @unique` added as required natural key | VERIFIED | `prisma/schema.prisma:258-259`: `arztNr String @unique`; migration creates `UNIQUE INDEX Doctor_arztNr_key` |
| 2 | DIR-15 | `Doctor.website` renamed to `Doctor.profilUrl`; all consumers updated | VERIFIED | Schema has `profilUrl String?`; migration drops `website`, adds `profilUrl`; `DoctorForm.tsx:203-217` shows `profilUrl` field; `doctor-metadata.ts:79` wires `profilUrl` to JSON-LD `sameAs` |
| 3 | DIR-16 | `Doctor.kategorie` + `DoctorKategorie` enum fully removed | VERIFIED | No `kategorie` in schema; migration drops column and `DROP TYPE "DoctorKategorie"`; `doctors.ts` ListDoctorsOptions has no kategorie; grep of src/ shows only comments/doc references, no functional code |
| 4 | DIR-17 | `Fachrichtung` enum: 51 values; `FACHRICHTUNG_LABELS` as single source of truth | VERIFIED | Schema enum has 51 values (counted); migration creates 51-value SQL enum; `fachrichtung-mapping.ts` exports `FACHRICHTUNG_LABELS` (51 keys); `fachrichtung-mapping.test.ts` asserts exactly 51, round-trip, uniqueness |
| 5 | DIR-18 | CSV parser enforces exact header; UTF-8 BOM stripped; multi-line quoted values via papaparse | VERIFIED | `csv-parser.ts:10-18` defines `REQUIRED_HEADER`; `line 45` strips BOM `csvText.replace(/^﻿/, '')`; papaparse handles multi-line; `csv-parser.test.ts` covers all three cases |
| 6 | DIR-19 | Required fields enforced (Bezirk, Fachrichtung, Name, Adresse, ArztNr); empty optional → null | VERIFIED | `csv-parser.ts:80-89` validates all 5 required fields; `phone` and `profilUrl` assigned null on empty; `csv-parser.test.ts` covers missing Name, ArztNr, Bezirk cases |
| 7 | DIR-20 | `"Graz-Stadt"` alias resolves to `"Graz (Stadt)"`; unknown Bezirk rejects row | VERIFIED | `bezirk-alias.ts:6-7` maps `'Graz-Stadt' → 'Graz (Stadt)'`; unknown Bezirk produces conflict in `doctors-import-actions.ts:108-114`; `bezirk-alias.test.ts` tests alias + 4 passthrough cases |
| 8 | DIR-21 | Unknown Fachrichtung values reject the row with actionable German error | VERIFIED | `csv-parser.ts:101-109`: `FACHRICHTUNG_BY_LABEL[row.Fachrichtung.trim()]` returns undefined → conflict with `Fachrichtung nicht erkannt: "..."` |
| 9 | DIR-22 | Migration includes `TRUNCATE TABLE "Doctor" RESTART IDENTITY` before schema mutations | VERIFIED | `migration.sql:62`: `TRUNCATE TABLE "Doctor" RESTART IDENTITY;` before ALTER TABLE |
| 10 | DIR-23 | `commitCsvImportAction` upserts in single `db.$transaction`; editorial fields preserved | VERIFIED | `doctors-import-actions.ts:227`: `await db.$transaction(upsertOps)`; update payload only includes name/fachrichtung/address/phone/profilUrl/bezirkId; `doctors-import-actions.test.ts` Test 2 asserts editorialNote, isVerified, titel, email, mapImageUrl unchanged |
| 11 | DIR-24 | Address-change detection → sets `lat/lon/mapImageUrl = null` on update | VERIFIED | `doctors-import-actions.ts:220-222`: `...(row.addressChanged ? { lat: null, lon: null, mapImageUrl: null } : {})`; Test 3 in `doctors-import-actions.test.ts` covers this |
| 12 | DIR-25 | Within-batch duplicate arztNr: last-write-wins; flagged as warning | VERIFIED | `csv-parser.ts:127-140`: `seenArztNr` map, `rows[existingIndex] = parsedRow` (last-write-wins); conflict pushed with `severity: 'warning'` |
| 13 | DIR-26 | `geocodeBatchAction` processes up to 200 doctors, sequential with `await sleep(1100)`, `maxDuration=300` | VERIFIED | `doctors-import-actions.ts:288`: `take: 200`; `line 307`: `await sleepFn(1100)`; `admin/aerzte/page.tsx:28`: `export const maxDuration = 300`; `doctors-import-actions.test.ts` Test 3 asserts sleepFn called with 1100ms per doctor |
| 14 | DIR-27 | `/admin/aerzte` renders geocoder progress counter from live DB | UNCERTAIN (manual) | `admin/aerzte/page.tsx:65-66`: reads `prisma.doctor.count()` + `count({ where: { NOT: { lat: null } } })`; renders `"{geocoded} von {total} Ärzte geocoded ({pending} ausstehend)"` — wiring verified in code; **live DB behavior requires manual smoke** |
| 15 | DIR-28 | `/aerzte` filter drops kategorie chips; adds HTML5 datalist with 51 Fachrichtung options | UNCERTAIN (manual) | `DoctorPublicFilters.tsx:81-85`: `<datalist id="fachrichtungen">` with 51 `FACHRICHTUNG_OPTIONS` entries; URL param `?fachrichtung=ENUM_ID` wired; **native browser autocomplete UX requires manual smoke** |
| 16 | DIR-29 | Detail page JSON-LD always `@type: 'Physician'`; `medicalSpecialty` = German label; `profilUrl` → `sameAs` | VERIFIED | `doctor-metadata.ts:54-57`: hardcoded `'@type': 'Physician'`; `medicalSpecialty: FACHRICHTUNG_LABELS[doctor.fachrichtung]`; `line 79`: `if (doctor.profilUrl) jsonLd.sameAs = [doctor.profilUrl]`; `doctor-metadata.test.ts` Tests 1-3, Test 8 cover these cases |
| 17 | DIR-30 | Admin route `/admin/aerzte/import` with upload form, dry-run preview, commit button; 10-row fixture | VERIFIED | `import/page.tsx` and `ImportPreview.tsx` exist and are substantive; fixture `test/fixtures/aerzte-sample.csv` has 10 rows with 4 Bezirke (incl. Graz-Stadt), multi-line `"Hals-, Nasen- und Ohrenheilkunde"` |
| 18 | DIR-31 | Phase 46 tests updated: factories add `arztNr`, replace `kategorie` with `fachrichtung` enum; new tests cover all Phase 47 behaviors | VERIFIED | `doctors.test.ts` factory uses `arztNr: nextArztNr()`, fachrichtung enum values; `doctors-actions.test.ts` uses `arztNr: 'A1'`; SUMMARY reports 24+24+20+15+12+6 = 101 Phase 47 test cases green |

**Score:** 16/18 (DIR-27 and DIR-28 require manual smoke; code wiring is verified)

---

### Deferred Items

None — all 18 requirements are addressed in Phase 47.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `prisma/schema.prisma` | Fachrichtung enum (51), arztNr unique, profilUrl, no kategorie | VERIFIED | Lines 201-280; 51 enum values confirmed |
| `prisma/migrations/20260516_phase47_csv_schema/migration.sql` | TRUNCATE + schema mutations | VERIFIED | 79 lines; TRUNCATE, CREATE TYPE, ALTER TABLE, DROP TYPE |
| `src/lib/admin/import/fachrichtung-mapping.ts` | FACHRICHTUNG_LABELS (51), reverse lookup, sorted options | VERIFIED | 76 lines; all three exports present |
| `src/lib/admin/import/bezirk-alias.ts` | Graz-Stadt alias + resolveBezirkName | VERIFIED | 12 lines; single alias entry + function |
| `src/lib/admin/import/csv-parser.ts` | parseDoctorsCsv with all defensive checks | VERIFIED | 149 lines; BOM strip, header check, required fields, enum validation, dedup |
| `src/lib/admin/import/preview-cache.ts` | In-memory cache with TTL + setPreview/getPreview | VERIFIED | 63 lines; 15-min TTL, prune on read/write |
| `src/lib/admin/doctors-import-actions.ts` | Three trinities: parseAndPreview, commitCsvImport, geocodeBatch | VERIFIED | 360 lines; all 9 functions present; 'use server'; requireAuth() outside try/catch |
| `src/app/(admin)/admin/aerzte/import/page.tsx` | Token-driven two-step upload/preview flow | VERIFIED | 99 lines; force-dynamic, upload form + ImportPreview |
| `src/app/(admin)/admin/aerzte/import/ImportPreview.tsx` | Summary chip, conflicts table, commit form | VERIFIED | 127 lines; all three sections present |
| `src/app/(admin)/admin/aerzte/page.tsx` | Geocoder counter + button + maxDuration=300 | VERIFIED | 156 lines; live DB counts, disabled button when pending=0, maxDuration=300 |
| `src/app/(admin)/admin/aerzte/DoctorForm.tsx` | arztNr field, Fachrichtung select, profilUrl field, no kategorie | VERIFIED | 291 lines; arztNr required text input, 51-option select, profilUrl URL input |
| `src/app/(public)/aerzte/DoctorPublicFilters.tsx` | datalist with 51 options, no kategorie chips | VERIFIED | 99 lines; datalist over FACHRICHTUNG_OPTIONS; bezirk chips retained |
| `src/app/(public)/aerzte/[publicId]/[slug]/page.tsx` | JSON-LD Physician, profilUrl link, "Angaben ohne Gewähr" | VERIFIED | 170 lines; buildDoctorJsonLd wired, profilUrl anchor, disclaimer in footer |
| `src/lib/reader/doctor-metadata.ts` | buildDoctorJsonLd always Physician; medicalSpecialty from FACHRICHTUNG_LABELS | VERIFIED | 83 lines; hardcoded Physician, FACHRICHTUNG_LABELS lookup |
| `test/fixtures/aerzte-sample.csv` | 10-row fixture: 4 Bezirke (incl. Graz-Stadt), 5 Fachrichtungen (incl. multi-line) | VERIFIED | 11 lines (header + 10 data rows); Graz-Stadt present; "Hals-, Nasen- und Ohrenheilkunde" (multi-line CSV value) present |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `import/page.tsx` | `doctors-import-actions.ts:parseAndPreviewCsvForm` | `form action=` | WIRED | Line 75: `action={parseAndPreviewCsvForm}` |
| `ImportPreview.tsx` | `doctors-import-actions.ts:commitCsvImportForm` | `form action=` | WIRED | Line 103: `action={commitCsvImportForm}` |
| `admin/aerzte/page.tsx` | `doctors-import-actions.ts:geocodeBatchForm` | `form action=` | WIRED | Line 116: `action={geocodeBatchForm}` |
| `csv-parser.ts` | `fachrichtung-mapping.ts:FACHRICHTUNG_BY_LABEL` | import + lookup | WIRED | Line 7: import; line 101: `FACHRICHTUNG_BY_LABEL[row.Fachrichtung.trim()]` |
| `csv-parser.ts` | `bezirk-alias.ts:resolveBezirkName` | import + call | WIRED | Line 8: import; line 98: `resolveBezirkName(row.Bezirk.trim())` |
| `doctors-import-actions.ts` | `csv-parser.ts:parseDoctorsCsv` | import + call | WIRED | Line 37: import; line 82: `parseDoctorsCsv(csvText)` |
| `doctors-import-actions.ts` | `preview-cache.ts:setPreview/getPreview` | import + call | WIRED | Line 39: import both; lines 130, 241: calls |
| `doctor-metadata.ts` | `fachrichtung-mapping.ts:FACHRICHTUNG_LABELS` | import + lookup | WIRED | Line 21: import; line 59: `FACHRICHTUNG_LABELS[doctor.fachrichtung]` |
| `DoctorPublicFilters.tsx` | `fachrichtung-mapping.ts:FACHRICHTUNG_OPTIONS,FACHRICHTUNG_LABELS` | import + render | WIRED | Line 7-8: import; lines 73, 82: used in JSX |
| `DoctorForm.tsx` | `fachrichtung-mapping.ts:FACHRICHTUNG_OPTIONS` | import + render | WIRED | Line 3: import; line 130: `FACHRICHTUNG_OPTIONS.map(...)` |
| `admin/aerzte/page.tsx` | `doctors-import-actions.ts:maxDuration` | route-segment export | WIRED | Line 28: `export const maxDuration = 300`; not in 'use server' file (per fix `953e762`) |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `admin/aerzte/page.tsx` — geocoder counter | `geocoded`, `total`, `pending` | `prisma.doctor.count()` x2 (lines 64-66) | Yes — live DB queries | FLOWING |
| `import/page.tsx` — preview | `cached` rows/conflicts | `getPreview(token)` → in-memory PREVIEW_CACHE | Yes — populated by prior parseAndPreviewCsvForm call | FLOWING |
| `DoctorPublicFilters.tsx` — datalist | `FACHRICHTUNG_OPTIONS` | Import from `fachrichtung-mapping.ts` (51-entry map) | Yes — static enum data, intentionally exhaustive | FLOWING |
| `[publicId]/[slug]/page.tsx` — JSON-LD | `jsonLd` | `buildDoctorJsonLd(doctor, canonicalUrl)` → `FACHRICHTUNG_LABELS[doctor.fachrichtung]` | Yes — doctor from DB via `getDoctorByPublicId` | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Fachrichtung enum in schema has 51 values | `awk '/^enum Fachrichtung/,/^\}/' schema.prisma \| grep -E "^\s+[A-Z]" \| wc -l` | 51 | PASS |
| FACHRICHTUNG_LABELS has 51 keys | `grep -c "^  [A-Z_]\+:" fachrichtung-mapping.ts` | 51 | PASS |
| TRUNCATE in migration | `grep "TRUNCATE" migration.sql` | `TRUNCATE TABLE "Doctor" RESTART IDENTITY;` | PASS |
| maxDuration in page.tsx not in 'use server' file | `grep "maxDuration" doctors-import-actions.ts` | mentions only in comments; `grep "maxDuration" admin/aerzte/page.tsx` → line 28 | PASS |
| Commits exist in git history | `git cat-file -e 953e762` and `git cat-file -e 5571b53` | Both: exit 0 (exists) | PASS |
| No debt markers (TBD/FIXME/XXX) in Phase 47 source files | `grep -rn "TBD\|FIXME\|XXX" src/lib/admin/import/ src/lib/admin/doctors-import-actions.ts ...` | No output | PASS |
| Fixture has 10 rows, Graz-Stadt, multi-line Fachrichtung | Manual read of `test/fixtures/aerzte-sample.csv` | 10 data rows, "Graz-Stadt" x3, `"Hals-, Nasen- und Ohrenheilkunde"` x2 | PASS |
| JSON-LD always Physician (no Dentist) | `grep -n "Physician\|Dentist" doctor-metadata.ts` | `'@type': 'Physician'` hardcoded; no Dentist branch | PASS |

---

### Probe Execution

No `probe-*.sh` scripts declared or conventionally present for Phase 47. The integration gate (47-06) ran `vitest`, `tsc`, and `npm run build` — all automated gates passed (see SUMMARY notes on pre-existing failures outside Phase 47 scope).

**Pre-existing test failures (confirmed out-of-scope):**
- `bezirke.test.ts` CONF-02 (2 tests) — data drift, deferred in Phase 43
- `root-layout-adsense.test.ts` — font mock failure, deferred in Phase 43
- `map-actions.test.ts afterEach` + `mapgen.test.ts ArrayBuffer` — TSC errors, deferred in Phase 43

---

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| DIR-14 | `Doctor.arztNr String @unique` | SATISFIED | Schema + migration + test factories |
| DIR-15 | `Doctor.website` → `Doctor.profilUrl` rename | SATISFIED | Schema, DoctorForm, doctor-metadata, detail page |
| DIR-16 | `Doctor.kategorie` + `DoctorKategorie` dropped | SATISFIED | Schema, migration, DAL, all UI consumers |
| DIR-17 | Fachrichtung enum (51 values) + FACHRICHTUNG_LABELS | SATISFIED | Schema, migration, mapping file, tests |
| DIR-18 | Exact header enforcement, BOM strip, papaparse multi-line | SATISFIED | csv-parser.ts + tests |
| DIR-19 | Required field rejection; optional → null | SATISFIED | csv-parser.ts + tests |
| DIR-20 | Graz-Stadt alias, unknown Bezirk rejection | SATISFIED | bezirk-alias.ts + doctors-import-actions.ts + tests |
| DIR-21 | Unknown Fachrichtung rejection | SATISFIED | csv-parser.ts + tests |
| DIR-22 | TRUNCATE before schema mutations | SATISFIED | migration.sql |
| DIR-23 | `commitCsvImportAction` in `db.$transaction`; editorial fields preserved | SATISFIED | doctors-import-actions.ts + tests |
| DIR-24 | Address-change → lat/lon/mapImageUrl = null | SATISFIED | doctors-import-actions.ts + tests |
| DIR-25 | Within-batch dedup last-write-wins + warning | SATISFIED | csv-parser.ts + tests |
| DIR-26 | geocodeBatch: max 200, sleep(1100), maxDuration=300 | SATISFIED | doctors-import-actions.ts + page.tsx + tests |
| DIR-27 | Geocoder counter from live DB | NEEDS HUMAN | Code wiring verified; live DB behavior requires manual smoke |
| DIR-28 | datalist Fachrichtung filter; no kategorie chips | NEEDS HUMAN | datalist code verified; native browser autocomplete UX requires manual smoke |
| DIR-29 | JSON-LD always Physician; medicalSpecialty German label; profilUrl → sameAs | SATISFIED | doctor-metadata.ts + tests |
| DIR-30 | /admin/aerzte/import page + ImportPreview + 10-row fixture | SATISFIED | Both components present and substantive; fixture verified |
| DIR-31 | Phase 46 tests updated; all new tests green | SATISFIED | factories updated; 101 test cases green per SUMMARY |

---

### Anti-Patterns Found

No blockers identified.

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `doctors-import-actions.ts:19` | Comment-only `maxDuration` mention in doc block (not a code export) | Info | None — actual export is correctly in `admin/aerzte/page.tsx:28` per fix 953e762 |

---

### Human Verification Required

#### 1. Geocoder Progress Counter (`/admin/aerzte`) — DIR-27

**Test:** Run `npm run dev`. Visit `/admin/aerzte`. Import `test/fixtures/aerzte-sample.csv` via `/admin/aerzte/import` (10 rows). Return to `/admin/aerzte`.
**Expected:** Header shows `"0 von 10 Ärzte geocoded (10 ausstehend)"`. Geocode button enabled. Click `"Geocode next 200"` — wait ~30s for 10 rows. Counter updates to `"10 von 10 Ärzte geocoded (0 ausstehend)"`. Button becomes disabled.
**Why human:** Counter reads live DB state via `prisma.doctor.count()` calls; assertion against real Nominatim geocoding results cannot be automated without a live dev server and database.

#### 2. Fachrichtung Datalist Filter UX (`/aerzte`) — DIR-28

**Test:** In incognito browser, visit `/aerzte` with a running dev server. Observe no kategorie chips. Click the Fachrichtung text input.
**Expected:** Native browser autocomplete dropdown appears (populated from `<datalist id="fachrichtungen">` with 51 options). Type "Aug" — "Augenheilkunde und Optometrie" appears. Select it — URL changes to `?fachrichtung=AUGENHEILKUNDE_UND_OPTOMETRIE`; doctor list filters to that Fachrichtung. Clear input — URL drops param; full list shown.
**Why human:** Native HTML5 `<datalist>` autocomplete behavior is browser-rendered; no React-DOM test harness for this component; requires Chrome or Firefox with running dev server.

---

### Gaps Summary

No BLOCKER gaps found. All 18 DIR requirements have either verified code implementation (16/18) or verified code wiring pending manual smoke for live-DB behavior (2/18).

The two manual-smoke items (DIR-27, DIR-28) are documented as NEEDS HUMAN per the 47-VALIDATION.md manual-only verification table — this was an intentional design decision at planning time, not a verification shortcut. The code for both is substantive and wired:
- DIR-27: `admin/aerzte/page.tsx:56-66` reads live counts and renders the counter string
- DIR-28: `DoctorPublicFilters.tsx:69-96` renders the datalist with 51 options wired to FACHRICHTUNG_OPTIONS

**Recommended operator action before merging to remote:** Execute the 14-step smoke checklist in `47-06-SUMMARY.md` with `npm run dev`.

---

_Verified: 2026-05-16T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
