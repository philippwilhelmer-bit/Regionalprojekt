---
phase: 47
slug: aerzteverzeichnis-vollkatalog-und-csv-import
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-16
---

# Phase 47 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `47-RESEARCH.md § Validation Architecture` (lines 755–818).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/lib/admin/import/` (per-file scope) |
| **Full suite command** | `npm test` (= `vitest run`) |
| **Estimated runtime** | ~30–45 seconds (scoped); ~3–5 min (full) |
| **Test DB** | pglite (in-process, migrations loaded via `src/test/setup-db.ts`) |

---

## Sampling Rate

- **After every task commit:** Run scoped vitest (e.g. `npx vitest run src/lib/admin/import/`) plus `npx tsc --noEmit`
- **After every plan wave:** Run `npm test` (full suite) + `npx tsc --noEmit`
- **Before `/gsd:verify-work`:** Full suite must be green; manual smoke on `/admin/aerzte/import` end-to-end (upload 10-row fixture → preview → commit → verify rows in DB → run batch geocoder → verify lat/lon populated)
- **Max feedback latency:** 45 seconds (scoped); 5 minutes (wave gate)

---

## Per-Task Verification Map

> Phase 47 requirement IDs are TBD — the planner will mint DIR-14..DIR-NN. Rows below use provisional `R-XX` placeholders mirroring `47-RESEARCH.md § Phase Requirements → Test Map`. Planner replaces them with minted IDs before sign-off.

| Prov-Req | Decision | Behavior | Test Type | Automated Command | File Exists |
|----------|----------|----------|-----------|-------------------|-------------|
| R-01 | D-01 | `Doctor.arztNr` unique + required at Prisma level | unit (pglite) | `npx vitest run src/lib/content/doctors.test.ts -t "arztNr"` | ❌ W0 |
| R-02 | D-02 | `Doctor.profilUrl` accepted; `website` removed from clients | unit (pglite) | `npx vitest run src/lib/content/doctors.test.ts -t "profilUrl"` | ❌ W0 |
| R-03 | D-03 | `kategorie` removed from DAL filter signature + Doctor model | unit (negative) | `npx vitest run src/lib/content/doctors.test.ts -t "kategorie"` (expect 0 references) | ❌ W0 |
| R-04 | D-04, D-05 | `Fachrichtung` enum round-trips 51 values; identifier transform is unique | unit (pglite) | `npx vitest run src/lib/admin/import/fachrichtung-mapping.test.ts` | ❌ W0 |
| R-05 | D-06, D-07 | CSV parser rejects bad header; accepts BOM; supports multi-line quoted values | unit | `npx vitest run src/lib/admin/import/csv-parser.test.ts -t "header|BOM|multi-line"` | ❌ W0 |
| R-06 | D-08 | Required fields enforced (Bezirk, Fachrichtung, Name, Adresse, ArztNr) | unit | `npx vitest run src/lib/admin/import/csv-parser.test.ts -t "required"` | ❌ W0 |
| R-07 | D-10 | `"Graz-Stadt"` alias resolves to canonical Bezirk; other 12 names pass through | unit | `npx vitest run src/lib/admin/import/bezirk-alias.test.ts` | ❌ W0 |
| R-08 | D-11 | Unknown Fachrichtung value rejects row with actionable error | unit | `npx vitest run src/lib/admin/import/csv-parser.test.ts -t "unknown Fachrichtung"` | ❌ W0 |
| R-09 | D-12 | TRUNCATE-then-enum migration applies cleanly; pglite test loader succeeds | smoke (vitest startup) | `npx vitest run src/lib/content/doctors.test.ts` | ✅ infra exists |
| R-10 | D-14, D-16 | `commitCsvImportAction` upserts inside `db.$transaction`; editorial fields preserved | integration (pglite + vi.mock) | `npx vitest run src/lib/admin/doctors-import-actions.test.ts -t "preserves editorial"` | ❌ W0 |
| R-11 | D-17 | Address-change triggers `lat/lon/mapImageUrl := null` on update | integration (pglite) | `npx vitest run src/lib/admin/doctors-import-actions.test.ts -t "address change"` | ❌ W0 |
| R-12 | D-18 | Within-batch duplicate `arztNr`: later wins; flagged as warning in dry-run | unit | `npx vitest run src/lib/admin/import/csv-parser.test.ts -t "dedupe"` | ❌ W0 |
| R-13 | D-21 | `geocodeBatchAction` respects `await sleep(1100)` between Nominatim calls | unit (vi.useFakeTimers) | `npx vitest run src/lib/admin/doctors-import-actions.test.ts -t "sleep"` | ❌ W0 |
| R-14 | D-22 | Counter "X von Y Ärzte geocoded (Z ausstehend)" matches DB state | manual smoke | manual — `/admin/aerzte` render check after import + batch run | manual-only |
| R-15 | D-25 | `/aerzte` filter UI renders `<datalist>` with 51 Fachrichtung options | manual smoke | manual — visual check; native browser autocomplete | manual-only |
| R-16 | D-27 | JSON-LD always `@type: 'Physician'`; `medicalSpecialty` = German label | unit | `npx vitest run src/lib/reader/doctor-metadata.test.ts -t "Physician|medicalSpecialty"` | ❌ W0 update |
| R-17 | D-28 | `profilUrl` rendered as JSON-LD `sameAs` when present | unit | `npx vitest run src/lib/reader/doctor-metadata.test.ts -t "profilUrl|sameAs"` | ❌ W0 update |
| R-18 | D-30 | 10-row fixture parses cleanly; covers Graz-Stadt alias + multi-line quoted value | integration | `npx vitest run src/lib/admin/import/csv-parser.test.ts -t "fixture"` | ❌ W0 |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

> "Wave 0" = files/scaffolds the planner must create or update before any test in §Per-Task Verification Map can run. Derived from `47-RESEARCH.md § Wave 0 Gaps`.

**New files (planner creates):**
- [ ] `src/lib/admin/import/fachrichtung-mapping.ts` — generated 51-entry `FACHRICHTUNG_LABELS` map + reverse lookup + sorted options
- [ ] `src/lib/admin/import/fachrichtung-mapping.test.ts` — round-trip + label uniqueness + count = 51
- [ ] `src/lib/admin/import/bezirk-alias.ts` — alias map `{"Graz-Stadt":"graz"}` + `resolveBezirkName` helper
- [ ] `src/lib/admin/import/bezirk-alias.test.ts` — Graz-Stadt case + passthrough case
- [ ] `src/lib/admin/import/csv-parser.ts` — papaparse wrapper + row validator
- [ ] `src/lib/admin/import/csv-parser.test.ts` — header/BOM/multi-line/required/dupe/unknown-enum cases
- [ ] `src/lib/admin/doctors-import-actions.ts` — `parseAndPreviewCsvAction`, `commitCsvImportAction`, `geocodeBatchAction` + in-memory cache
- [ ] `src/lib/admin/doctors-import-actions.test.ts` — preserves editorial fields, transaction atomicity, address-change geo-clearing, sleep timing
- [ ] `test/fixtures/aerzte-sample.csv` — 10-row fixture covering 4 Bezirke (incl. Graz-Stadt) + 5 Fachrichtungen (incl. one comma-in-quotes "Hals-, Nasen- und Ohrenheilkunde")
- [ ] `prisma/migrations/<ts>_phase47_csv_schema/migration.sql` — hand-authored migration (timestamp ≥ `20260516`, see RESEARCH § Pattern 4)
- [ ] `src/app/(admin)/admin/aerzte/import/page.tsx` + `ImportPreview.tsx`
- [ ] `scripts/generate-fachrichtung-mapping.ts` (optional one-off codegen)

**Files to update:**
- [ ] `prisma/schema.prisma` — add `arztNr String @unique`, rename `website → profilUrl`, drop `kategorie` + `DoctorKategorie` enum, change `fachrichtung` to required `Fachrichtung` enum
- [ ] `src/lib/content/doctors.ts` — drop kategorie filter, change `fachrichtung` signature to `Fachrichtung` enum
- [ ] `src/lib/content/doctors.test.ts` — replace kategorie tests with fachrichtung-enum tests; add arztNr + profilUrl tests
- [ ] `src/lib/admin/doctors-actions.ts` — drop kategorie, rename website→profilUrl, change fachrichtung to enum
- [ ] `src/lib/admin/doctors-actions.test.ts` — update test factories per D-32
- [ ] `src/lib/reader/doctor-metadata.ts` + test — remove ZAHNARZT/Dentist branch; rename website→profilUrl; populate `medicalSpecialty` from `FACHRICHTUNG_LABELS`
- [ ] `src/app/(public)/aerzte/page.tsx` + `DoctorPublicFilters.tsx` — drop kategorie chip filter, add datalist
- [ ] `src/app/(admin)/admin/aerzte/page.tsx` + `DoctorFilters.tsx` + `DoctorRow.tsx` + `DoctorForm.tsx` — drop kategorie, add Fachrichtung select, add "Geocode next 200" button + progress counter
- [ ] `package.json` — add `papaparse` (DECISIONS.md entry required per AGENTS.md anti-bloat rule)

---

## Manual-Only Verifications

| Behavior | Prov-Req | Why Manual | Test Instructions |
|----------|----------|------------|-------------------|
| `/aerzte` datalist filter UX | R-15 (D-25) | Native browser autocomplete; no React-DOM test harness configured in project | Visit `/aerzte` in Chrome + Firefox, type "Aug" in Fachrichtung input, confirm autocomplete shows "Augenheilkunde und Optometrie". Submit form, confirm URL becomes `?fachrichtung=AUGENHEILKUNDE_UND_OPTOMETRIE` and list filters correctly. |
| `/admin/aerzte` geocoder progress counter | R-14 (D-22) | Counter reads live DB state; assertion against live values is brittle in unit test | After CSV import + first batch run, visit `/admin/aerzte`, confirm header shows "X von Y Ärzte geocoded (Z ausstehend)" with X+Z = Y. |
| `/admin/aerzte/import` end-to-end | R-10, R-11, R-18 (D-13..D-17, D-30) | Validates Server Action chain + cache TTL + transaction semantics through real HTTP boundary | Upload `test/fixtures/aerzte-sample.csv` → confirm preview summary ("10 rows: 10 new, 0 updates, 0 conflicts") → click "Commit Import" → confirm redirect `/admin/aerzte?imported=10` → confirm 10 rows in DB with `lat IS NULL`. Re-import same CSV → confirm "10 updates, 0 new". Edit one fixture row's address externally → re-import → confirm that row's `lat`/`lon` are null. |
| Batch geocoder under Vercel timeout | R-13 (D-21) | Real Vercel function timing; mock test only proves sleep cadence | Deploy to Vercel preview; click "Geocode next 200"; confirm completion before 5-min cap; confirm 200 rows updated. |

---

## Validation Sign-Off

- [ ] All R-IDs mapped to a real DIR-NN minted by planner
- [ ] All tasks have automated verify OR explicit Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all `❌ W0` references in §Per-Task Verification Map
- [ ] No watch-mode flags (`--watch`) in any task command
- [ ] Feedback latency < 45s per task
- [ ] `nyquist_compliant: true` set in frontmatter after planner + checker pass

**Approval:** pending
