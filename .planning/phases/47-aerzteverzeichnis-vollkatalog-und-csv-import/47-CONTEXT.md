# Phase 47: Aerzteverzeichnis Vollkatalog und CSV-Import — Context

**Gathered:** 2026-05-16
**Status:** Ready for planning
**Milestone:** v3.3 Directory Expansion (extends Phase 46)

## Phase Boundary

Extend the live Ärzteverzeichnis (shipped in Phase 46) with the data shape and bulk-import pipeline needed to seed Steiermark-wide content from the Ärztekammer Steiermark merged CSV (3,577 rows, 13 Bezirke, 51 Fachrichtungen — no dentists). Adds two schema fields (`arztNr`, rename `website` → `profilUrl`), promotes `fachrichtung` from free-text to closed Prisma enum (51 values), removes the now-unused `kategorie` enum, and ships an admin CSV upload route with dry-run preview, upsert-on-arztNr semantics, and an admin-triggered batch geocoder that fits inside the Vercel 5-min serverless cap.

**In scope:**
- Prisma migration: add `arztNr String @unique`, rename `website` → `profilUrl`, drop `kategorie` column + `DoctorKategorie` enum, change `fachrichtung` from `String?` to a new required `Fachrichtung` enum with 51 values
- DAL + Server-Action-Trinity updates in `src/lib/content/doctors.ts` + `src/lib/admin/doctors-actions.ts` to reflect the new schema (filter by `fachrichtung` enum, no more `kategorie` filter)
- Admin route `/admin/aerzte/import` — CSV file upload, dry-run preview (summary + conflicts table), commit
- CSV parser + validator: enforces header order, validates Fachrichtung enum + Bezirk name with explicit `"Graz-Stadt"` → `graz` alias, dedupes on `arztNr` within batch, treats Telefonnummer/ProfilURL as optional
- Upsert pipeline: keyed on `arztNr`; CSV-driven fields (`name`, `fachrichtung`, `address`, `phone`, `bezirkId`, `profilUrl`) always overwrite; editorial fields (`titel`, `email`, `editorialNote`, `relatedArticleIds`, `isVerified`, `mapImageUrl`, `lat`, `lon`) are NEVER touched by import
- Address-change detection: if `address` differs from existing row, null out `lat`/`lon`/`mapImageUrl` so the batch geocoder re-runs them
- Admin batch geocoder: `/admin/aerzte/geocode-batch` Server Action processes up to 200 unmapped doctors per click (200 × 1.1s = 3.7 min, safe under 5-min Vercel cap); displays "X / Y doctors geocoded (Z pending)" counter on `/admin/aerzte`
- Frontend `/aerzte` filter UI: replace 3-chip `kategorie` filter with searchable `<select>` (HTML5 datalist) over the 51 Fachrichtungen; keep Bezirk filter unchanged
- JSON-LD on detail page: drop the `Dentist` branch (no ZAHNARZT in data) — always emit `@type: 'Physician'` with `medicalSpecialty` populated from the Fachrichtung enum display label
- Backfill: existing Phase 46 Doctor rows (test/seed data) get `arztNr` assigned manually OR migration drops them — see decision D-12
- Tests: pglite import smoke (10-row fixture from sample), enum coverage, alias-map coverage, dry-run conflict reporting, upsert preserves editorial fields

**Out of scope (deferred):**
- The 5 originally-deferred Phase 46 fields (`öffnungszeiten`, `sprachen[]`, `kassen[]`, `barrierefrei`, `neuePatienten`) — confirmed dropped, not coming back this phase
- CSV export (round-trip workflow) — admin-only data flow; CSV is import-only
- Re-importing changed Bezirk names — Bezirk table is treated as a fixed seed
- Apotheken / Zahnärzte / other directory types (Apotheken still deferred per Phase 46)
- Adding Zahnheilkunde back as a Fachrichtung enum value (CSV has zero entries; can be added when a dentist dataset arrives)
- Background-cron geocoder — Vercel Hobby is capped at 1 cron/day (already used for ingest); admin-triggered batches replace it
- Lazy geocode-on-detail-view fallback — detail page degrades gracefully (no map pin) per Phase 46 D-08 instead
- Multi-Bezirk doctors — single `bezirkId` per row, same as Phase 46
- Editing Fachrichtung enum values via UI — code-only change

<decisions>
## Implementation Decisions

### Schema Changes
- **D-01:** Add `arztNr String @unique` to `Doctor`. Required. Used as the natural key for CSV upsert. Existing seed/test rows backfilled via migration (see D-12).
- **D-02:** Rename `website String?` → `profilUrl String?`. Migration: `ALTER COLUMN`. All consumers (admin form field, detail page link, JSON-LD `sameAs`) renamed in same commit.
- **D-03:** Drop `kategorie DoctorKategorie` column and the `DoctorKategorie` enum (`ALLGEMEINMEDIZIN | FACHARZT | ZAHNARZT`) entirely. Migration removes the column and drops the enum type. Code: remove all `kategorie` references (filter, form field, JSON-LD branch, sitemap, list page chip). The Phase 46 `@@index([kategorie])` is replaced with `@@index([fachrichtung])`.
- **D-04:** Change `fachrichtung String?` → `fachrichtung Fachrichtung NOT NULL` where `Fachrichtung` is a new closed Prisma enum with 51 values (one per distinct value in the source CSV — list in D-05). Migration: enum DDL first, then `ALTER COLUMN ... SET NOT NULL USING fachrichtung::Fachrichtung`. Existing rows must already have valid values OR be deleted first (see D-12).
- **D-05:** Fachrichtung enum identifiers are derived from the German labels via a stable transform (uppercase, replace `Ä→AE`, `Ö→OE`, `Ü→UE`, `ß→SS`, ` ` and `-` → `_`, strip `.`, `,`, `(`, `)`). Display labels live in a TypeScript constant map `FACHRICHTUNG_LABELS: Record<Fachrichtung, string>`. The 51 values (with their CSV row counts) are recorded in this phase's RESEARCH.md / planner reads them from `.planning/phases/47-.../fachrichtung-values.txt` — write that file alongside this CONTEXT.md before planning.

### CSV Format
- **D-06:** CSV header is exact-match required: `Bezirk,Fachrichtung,Name,Adresse,Telefonnummer,ArztNr,ProfilURL`. Any missing or reordered column rejects the entire upload (fail-fast in dry-run).
- **D-07:** Encoding: UTF-8 only. BOM tolerated and stripped. Multi-line CSV-quoted values supported (the source CSV uses them for `"Hals-, Nasen- und Ohrenheilkunde"`-style commas). Parser: standard CSV library, not split-on-comma.
- **D-08:** Required-vs-optional per row: `Bezirk`, `Fachrichtung`, `Name`, `Adresse`, `ArztNr` are required and reject the row if empty. `Telefonnummer`, `ProfilURL` are optional → empty cell = `null` in DB.
- **D-09:** `Name` is stored as a single string (`"Last, First"` format from CSV preserved as-is). No split into `surname`/`firstname`. Display uses the raw value everywhere. JSON-LD `name` field gets the raw string; `givenName`/`familyName` are NOT emitted (out of scope).
- **D-10:** Bezirk lookup uses an explicit alias map for the one mismatch `{ "Graz-Stadt": "graz" }` plus exact-name lookup against `Bezirk.name` for the other 12. Unknown Bezirk values reject the row in dry-run with an actionable error message.
- **D-11:** Fachrichtung values are validated against the enum. Unknown values reject the row. The enum list is treated as exhaustive — if a future CSV has new values, that's a separate phase (add enum value via migration, update label map).
- **D-12:** Backfill strategy for existing Phase 46 seed/test Doctor rows: WIPE-AND-RELOAD. Phase 46 shipped with placeholder/test data only — no production-critical rows. The Prisma migration includes a `TRUNCATE TABLE "Doctor" RESTART IDENTITY CASCADE` step before the schema changes apply, so the schema migration succeeds cleanly and the CSV import becomes the first real data load. Phase 46's `doctors.test.ts` fixtures get updated to include `arztNr` and use the new `Fachrichtung` enum values.

### CSV Import Pipeline
- **D-13:** Admin route `/admin/aerzte/import` — Server Component page with a file upload form (`<input type=file accept=".csv">`) and submit button. Server Action `parseAndPreviewCsv(formData)` parses + validates + returns a structured preview object (no DB writes). Result renders below the form: summary line ("3,577 rows: 3,500 new, 50 updates, 27 conflicts") + collapsible conflicts table (line-by-line errors only, not all rows).
- **D-14:** "Commit Import" button posts to a second Server Action `commitCsvImport(parsedRows)` that performs the upserts inside a single Prisma transaction. Rows that failed dry-run validation are SKIPPED (never re-validated). Returns final counts; redirect to `/admin/aerzte?imported=N`.
- **D-15:** Dry-run preview holds parsed rows in a server-side cache (in-memory or Vercel KV — planner decides) keyed by a session token returned to the client. Commit re-loads from cache by token. Cache TTL: 15 min. If commit arrives after expiry, user re-uploads. Alternative considered: re-parse on commit (idempotent, no cache) — planner picks based on Vercel function timing constraints.
- **D-16:** Upsert semantics: match existing Doctor on `arztNr`. If match → UPDATE only CSV-driven fields (`name`, `fachrichtung`, `address`, `phone`, `bezirkId`, `profilUrl`). If no match → INSERT new row with CSV fields + nullable defaults for editorial fields. Editorial fields (`titel`, `email`, `editorialNote`, `relatedArticleIds`, `isVerified`, `mapImageUrl`) are NEVER overwritten by import — `update` payloads explicitly exclude them.
- **D-17:** Address-change-triggers-re-geocode: if updating an existing row and `input.address !== existing.address`, the UPDATE payload sets `lat: null, lon: null, mapImageUrl: null`. The next batch geocoder run picks them up. Mirrors Phase 46 D-31 pattern (avoid gratuitous Nominatim hits on non-address edits).
- **D-18:** Within-batch dedupe: if two CSV rows share the same `arztNr`, the LATER row wins (last-write-wins). Dry-run flags this as a warning in the conflicts table (not a row-level rejection).

### Bulk Geocoding (Vercel Hobby Constraint)
- **D-19:** NO synchronous geocoding during CSV import. All 3,577 rows insert with `lat = null, lon = null, mapImageUrl = null`. Import completes in seconds, not hours.
- **D-20:** NO background cron-driven geocoder. Vercel Hobby = 1 cron/day cap and it's already consumed by ingest. Adding more cron requires Pro plan (out of scope per project constraints).
- **D-21:** Admin-triggered batch geocoder: button on `/admin/aerzte` labeled "Geocode next 200 (~4 min)". Server Action `geocodeBatchAction(batchSize=200)` queries `WHERE lat IS NULL LIMIT 200`, processes sequentially with `await sleep(1100)` between calls (reuses Phase 46's pattern), updates each row inline (lat/lon + generateMapImage). Returns count processed + remaining. Runs within Vercel's 5-min serverless cap (200 × 1.1s = 220s = 3.7 min).
- **D-22:** Progress counter on `/admin/aerzte` page header: "X von Y Ärzte geocoded (Z ausstehend)". Read via `SELECT COUNT(*) WHERE lat IS NOT NULL` + total count. Editor clicks the batch button repeatedly across days until done (18 clicks at 200/batch for 3,577 rows). Acceptable per project policy: one-time seeding burden, not recurring.
- **D-23:** Detail page degradation: existing Phase 46 behavior preserved — when `lat IS NULL`, the detail page renders address-only with no map pin and no JSON-LD `geo` block. No lazy on-demand geocoding (rejected: causes surprising request latency + unbounded concurrency).
- **D-24:** Geocoding errors during batch (Nominatim 4xx/5xx, no result): row stays at `lat = null`, an `errorMessage` column is NOT added (out of scope — Phase 46 doesn't have one for Doctor either). Failures are silently skipped; the editor sees the pending count stay non-zero and can re-click. Operational visibility comes from server logs only.

### Frontend Impact
- **D-25:** `/aerzte` list page filter UI: drop the 3-chip `kategorie` selector entirely. Add a single searchable Fachrichtung selector (HTML5 `<datalist>` paired with `<input type=text>`, no JS framework). Bezirk filter chips unchanged. Submitting the form re-renders the Server Component with query-param filter (`?fachrichtung=ALLGEMEINMEDIZIN`).
- **D-26:** Filter values in URL use the enum identifier (e.g. `?fachrichtung=AUGENHEILKUNDE_UND_OPTOMETRIE`) for round-trippability; display uses the label map. The DAL filter signature changes from `kategorie?: DoctorKategorie | fachrichtung?: string` to `fachrichtung?: Fachrichtung` (single field).
- **D-27:** Detail page JSON-LD: always `@type: 'Physician'`. The Phase 46 conditional `kategorie === 'ZAHNARZT' ? 'Dentist' : 'Physician'` branch is deleted. `medicalSpecialty` populated from `FACHRICHTUNG_LABELS[doctor.fachrichtung]` (German label, not enum identifier).
- **D-28:** ProfilURL: detail page renders as `<a href={doctor.profilUrl} rel="noopener noreferrer">Profil auf aekstmk.or.at</a>` when present. JSON-LD `sameAs: [doctor.profilUrl]` when present (replaces the Phase 46 `website` mapping).
- **D-29:** Sitemap `src/app/sitemap.ts` already includes `/aerzte/{publicId}/{slug}` per Phase 46. Existing logic stays; only the per-row data shape changes.

### Test Strategy
- **D-30:** Test fixture: trim source CSV to a 10-row representative sample covering 4 Bezirke (Graz-Stadt for the alias case, Murtal, Liezen, Weiz) and 5 Fachrichtungen (incl. one multi-line-quoted value like "Hals-, Nasen- und Ohrenheilkunde"). Live at `test/fixtures/aerzte-sample.csv`.
- **D-31:** Tests: CSV parser unit tests (header validation, encoding, multi-line values, empty optional fields, type coercion), Bezirk alias-map coverage, Fachrichtung enum coverage (every value in fixture maps successfully), dry-run conflict detection (invalid Bezirk, invalid Fachrichtung, missing required cell, dupe arztNr within batch), upsert preserves editorial fields (insert a doctor with editorialNote/isVerified, re-import same arztNr with different name → assert editorial fields unchanged), address-change re-geocode trigger (assert lat/lon set null on address diff), batch geocoder respects sleep timing (mock geocodeLocation, assert call gap ≥ 1100ms — or use vi.useFakeTimers).
- **D-32:** Existing Phase 46 tests in `doctors.test.ts` and `doctors-actions.test.ts` need updates: add `arztNr` to all test factories, replace `kategorie` with `fachrichtung` enum value. Existing 6-plan Phase 46 test patterns (positional `mock.calls[N][i]` for PrismaClient mocks) carry forward.

### Claude's Discretion
- Specific UI layout of the import preview (table density, color-coding of conflicts, etc.) — apply Phase 46 admin styling (`--*-dir-*` tokens already in `globals.css`)
- Exact wording of admin-facing error messages — match the German tone established in Phase 46 admin pages
- Whether to use Vercel KV or in-memory cache for dry-run preview state in D-15 — planner picks based on whether KV is already provisioned (check `vercel.json` / env)
- Exact transform for Fachrichtung enum identifier generation in D-05 — pick one and document it as a pure function in `src/lib/admin/import/fachrichtung-mapping.ts`
- Whether the admin batch geocoder button is a `<form>` POST or a Server Action via inline form — both work; pick the simpler one

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Conventions (MANDATORY)
- `AGENTS.md` — Server-Action-Trinity, DI duck-typing rule, Nominatim 1 req/s, error-handling, scratchpad workflow. Every action/DAL change MUST follow these patterns.
- `CLAUDE.md` — Aliases `AGENTS.md` (single source of truth)

### Phase 46 (Direct Predecessor — IDENTICAL DOMAIN)
- `.planning/phases/46-aerzteverzeichnis/46-CONTEXT.md` — All Phase 46 decisions (DAL pattern, Trinity, Nominatim helper, two-phase create, design tokens, JSON-LD shape, sitemap, filter UI, disclaimer)
- `.planning/phases/46-aerzteverzeichnis/46-VERIFICATION.md` — What was actually shipped + verified
- `.planning/phases/46-aerzteverzeichnis/DESIGN.md` — Phase-local design tokens (`--*-dir-*`)
- `.planning/phases/46-aerzteverzeichnis/46-00-SUMMARY.md` through `46-05-SUMMARY.md` — Specific implementation notes from each plan

### Phase 46 Code (DIRECT REFACTOR TARGETS)
- `prisma/schema.prisma` — `Doctor` model and `DoctorKategorie` enum (both modified in Phase 47)
- `prisma/migrations/20260515_phase46_doctors/migration.sql` — Phase 46 baseline migration
- `src/lib/content/doctors.ts` — DAL: `listDoctors`, `getDoctorByPublicId`, `getDoctorById` (filter signature changes)
- `src/lib/admin/doctors-actions.ts` — Server-Action-Trinity for create/update/softDelete/toggleVerified
- `src/app/(admin)/admin/aerzte/page.tsx` + `DoctorRow.tsx` + `DoctorFilters.tsx` + `DoctorForm.tsx` — Admin list, row, filters, shared form (all touched)
- `src/app/(admin)/admin/aerzte/new/page.tsx` + `[id]/edit/page.tsx` — Admin create/edit routes
- `src/app/(public)/aerzte/page.tsx` — Public list page with filter chips (Fachrichtung filter UI rewritten)
- `src/app/(public)/aerzte/[publicId]/[slug]/page.tsx` — Public detail page (JSON-LD branch removal, ProfilURL rename)
- `src/app/sitemap.ts` — `buildDoctorSitemapEntries` (no structural change, but data shape changes)

### Shared Helpers (REUSED — DO NOT DUPLICATE)
- `src/lib/images/geocode.ts` — `geocodeLocation(address)`; Nominatim 1 req/s convention enforced via `await sleep(1100)` in batch loops
- `src/lib/images/mapgen.ts` — `generateMapImage(lat, lon, name, doctorId, locType, { pathPrefix: 'doctor' })`; pattern: D-30/D-31 from Phase 46
- `src/lib/reader/slug.ts` — `slugify()` for canonical URL slugs
- `src/lib/admin/auth-node.ts` — `requireAuth()` for Server Actions
- `prisma/seed.ts` + `bundesland.config.ts` — Bezirk seed source (13 entries; `Graz (Stadt)` = slug `graz`, the alias source for D-10)

### REQUIREMENTS.md
- `.planning/REQUIREMENTS.md` — DIR-01 through DIR-13 are shipped (Phase 46). Phase 47 mints new requirements DIR-14..DIR-NN during planning (planner mints exact numbers).

### Source Data (External — NOT in repo)
- `/Users/philipp/Downloads/aerzte_steiermark_merged - aerzte_steiermark_merged.csv.csv` — The 3,577-row source CSV. Copy a 10-row representative sample into `test/fixtures/aerzte-sample.csv` during planning per D-30. The full file does NOT enter the repo.
- ProfilURL pattern: `https://www.aekstmk.or.at/aerztesuche-46?arztnr={ArztNr}` — Ärztekammer Steiermark profile pages; canonical doctor profile destination.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Phase 46 Server-Action-Trinity** in `src/lib/admin/doctors-actions.ts`: extend with `createDoctorFromCsvRow`, `upsertDoctorFromCsvRow` following the same `*Db / *Action / *Form` triplet shape
- **`geocodeLocation`** from `src/lib/images/geocode.ts`: drop-in for batch geocoder; sleep timing is the consumer's responsibility (Phase 46 already enforces in `map-actions.ts`)
- **`generateMapImage`** from `src/lib/images/mapgen.ts`: called inline after each successful geocode in the batch loop; `pathPrefix: 'doctor'` keyed on `doctor.id` (Phase 46 D-30)
- **`requireAuth`** from `src/lib/admin/auth-node.ts`: gate all import + batch-geocode actions
- **pglite test infrastructure** under `src/lib/content/doctors.test.ts`: duck-typed `db` parameter pattern, positional `mock.calls[N][i]` assertions (Phase 46 D-32 — `toHaveBeenCalledWith(prismaClient, ...)` blows the stack)
- **HTML5 `<details>`/`<summary>`** two-step disclosure pattern (Phase 46 D-43): reuse for the "Commit Import" destructive confirm without adding a client boundary

### Established Patterns
- **DAL DI via duck-typing**: `'$connect' in clientOrOptions` (AGENTS.md). Every DAL/action function in Phase 47 follows this.
- **Two-phase create** (insert null-geo → geocode → update): Phase 46 D-29 pattern. Phase 47 splits this across import (insert null-geo) and batch geocoder (geocode + update), so the pattern is preserved but operationally separated.
- **Server-Action-Trinity**: `xxxDb(db, input)` pure → `xxxAction(input)` Auth wrapper → `xxxForm(formData)` FormData parser. All new actions follow this.
- **Phase-local design tokens** (`--*-dir-*`): the import preview UI inherits these (don't add new tokens unless DESIGN.md updates required — likely none).
- **`export const dynamic = 'force-dynamic'`** on every route that reads the DB (admin/import + admin/aerzte page).

### Integration Points
- **Prisma migration ordering**: TRUNCATE → CREATE enum Fachrichtung → ALTER TABLE Doctor (add arztNr, rename website→profilUrl, drop kategorie column, alter fachrichtung type) → DROP TYPE DoctorKategorie → CREATE INDEX (fachrichtung, isVerified). All in a single migration file `prisma/migrations/<timestamp>_phase47_csv_schema/migration.sql`. Local `prisma migrate dev`, then commit.
- **Admin layout already gates `/admin/*`**: `/admin/aerzte/import` does NOT call `requireAuth()` in the page itself (Phase 46 D-40); the Server Actions inside DO call `requireAuth()`.
- **Build script**: STATE.md pending todo notes that `prisma migrate deploy` is NOT in the Vercel `"build"` script. This phase's migration needs manual `prisma migrate deploy` on deploy day OR the build-script edit happens first (planner decides; this is one of the cross-phase pending todos).
- **`/aerzte` URL stability**: existing public URLs `/aerzte/{publicId}/{slug}` keep working — `publicId` is unchanged. Sitemap entries don't need 301s.

</code_context>

<specifics>
## Specific Ideas

- Source CSV is `/Users/philipp/Downloads/aerzte_steiermark_merged - aerzte_steiermark_merged.csv.csv` — 3,577 rows, encoding UTF-8 verified, header confirmed as `Bezirk,Fachrichtung,Name,Adresse,Telefonnummer,ArztNr,ProfilURL`
- Ärztekammer Steiermark profile URL pattern `https://www.aekstmk.or.at/aerztesuche-46?arztnr={ArztNr}` — ArztNr is embedded in URL, validates the choice of arztNr as natural key
- The 13 Bezirke in CSV vs DB seed: 12 match exactly, 1 mismatch (`"Graz-Stadt"` in CSV vs `"Graz (Stadt)"` in DB seed). Handled via D-10 alias map — no DB-side rename.
- No dentists in source data → ZAHNARZT branch removal is safe and not a regression
- Distinct Fachrichtung counts span 1 to 1,250 — long tail. Searchable dropdown D-25 is the right UX (chips would have 12 huge + 39 tiny)
- The 51 Fachrichtungen distinct value list (with row counts) is captured separately in `.planning/phases/47-aerzteverzeichnis-vollkatalog-und-csv-import/fachrichtung-values.txt` (written alongside this CONTEXT.md)

</specifics>

<deferred>
## Deferred Ideas

- **CSV export** — bidirectional editor workflow (export → edit in spreadsheet → re-import). Could be Phase 48 if editor demand surfaces.
- **Bezirk-table edits via UI** — would be a separate admin domain entirely; Bezirke remain a config-driven seed
- **Bulk delete via CSV** — only insert/update supported here; delete stays single-row in admin
- **Adding `Zahnheilkunde` and other future Fachrichtung values** — when a dentist or other dataset arrives, add the enum value(s) + label-map entries via a small follow-up phase
- **Re-evaluating Vercel plan upgrade** — Pro plan enables additional cron jobs, which would unlock background-driven geocoding (current carry-over concern from v3.2 STATE.md)
- **Adding `errorMessage` / `geocodingAttempts` columns to `Doctor`** — operational telemetry for geocoder retries. Not needed for MVP; logs suffice.
- **The 5 originally-deferred Phase 46 fields** (`öffnungszeiten`, `sprachen[]`, `kassen[]`, `barrierefrei`, `neuePatienten`) — explicitly out of scope and not coming back. If editorial team requests them later, that's a new phase.
- **API endpoint for programmatic doctor data access** — public JSON API for third-party consumers. Out of scope; JSON-LD on detail pages is the structured-data export.

</deferred>

---

*Phase: 47-aerzteverzeichnis-vollkatalog-und-csv-import*
*Context gathered: 2026-05-16*
