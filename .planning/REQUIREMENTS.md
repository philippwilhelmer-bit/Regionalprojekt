# Requirements: Regionalprojekt (Wurzelwelt) — v3.2 Text Engine Optimization

**Defined:** 2026-05-10
**Core Value:** Steiermark residents get relevant, hyperlocal news for their Bezirk — automatically, without an editorial team needed to run it.

## v1 Requirements

Requirements for milestone v3.2. Each maps to a roadmap phase. v1 here means "this milestone's committed scope" — the project itself is well past v1.0 (six prior milestones shipped: v1.0, v1.1, v1.2, v2.0, v3.0, v3.1).

### AI Pipeline (AIPL)

Single merged structured-output AI call replacing the two-step Tag+Write path, with prompt caching, clean source extraction, and orphan/accounting fixes.

- [x] **AIPL-01**: System calls Anthropic exactly once per article in the AI pipeline, returning `{bezirkSlugs, isStateWide, mentionsPrivateIndividual, headline, lead, body, seoTitle, metaDescription}` in a single structured-output response (`runWriteAndTag`)
- [x] **AIPL-02**: System uses typed `tools:[{name, input_schema}] + tool_choice` for structured output (no `output_config as any` casts)
- [x] **AIPL-03**: System sets `max_tokens: 1024` for the merged call and throws on `stop_reason === 'max_tokens'` (no silent truncation)
- [x] **AIPL-04**: System applies `cache_control: {"type": "ephemeral"}` to the static system prefix (Bezirk list + tone/length/styleNotes block)
- [x] **AIPL-05**: PipelineRun token totals include `cache_creation_input_tokens` and `cache_read_input_tokens` from the Anthropic usage response
- [x] **AIPL-06**: System uses per-source clean extractors (`extractors/ots.ts`, `extractors/rss.ts`) instead of `JSON.stringify(rawPayload)` when building LLM input — `EMITTENT`, `WEBLINK`, and contact metadata never reach the prompt
- [x] **AIPL-07**: System includes `TAGGED` status in the AI retry selector so a crash mid-pipeline does not strand articles
- [x] **AIPL-08**: System sums `llmLocationFallback` token usage into PipelineRun `totalInputTokens` / `totalOutputTokens`
- [x] **AIPL-09**: System sets the Anthropic SDK `maxRetries` explicitly so SDK-level transient retries do not inflate `Article.retryCount`
- [x] **AIPL-10**: One-time migration converts in-flight `TAGGED` rows back to `FETCHED` on first deploy of the merged pipeline

### Cost Telemetry (TLM)

Per-article AI cost observability and Message Batches API integration for the 50% discount.

- [ ] **TLM-01**: `Article` model has `aiInputTokens Int?`, `aiCachedInputTokens Int?`, `aiOutputTokens Int?`, `aiCostUsd Decimal(10,6)?`, `aiModel String?`, `aiProcessedAt DateTime?` columns
- [ ] **TLM-02**: Pipeline populates all six telemetry columns on every `WRITTEN` / `PUBLISHED` article going forward
- [ ] **TLM-03**: Admin can sort the articles list by `aiCostUsd` descending and see source attribution for each article
- [ ] **TLM-04**: Admin can view per-source / per-day cost aggregates
- [ ] **TLM-05**: Pipeline default-submits articles via Anthropic Message Batches API; per-article path remains available behind a feature flag for emergency fallback
- [ ] **TLM-06**: New `BATCHED` enum value sits between `FETCHED` and `WRITTEN`; batch poll/webhook transitions `BATCHED → WRITTEN | REVIEW | ERROR`
- [ ] **TLM-07**: Batch size capped at 100 articles per pipeline run; per-message batch errors set `Article.status = 'ERROR'` with the batch result's error message

### Ingestion Hardening (INGEST)

Tighter HTTP behavior, fewer DB roundtrips, transactional health updates.

- [x] **INGEST-01**: OTS adapter dedupes new items with a single `findMany({where: {source, externalId: {in: keys}}})` (not N sequential `findFirst` calls)
- [x] **INGEST-02**: Every external `fetch()` in ingestion adapters uses `AbortController` with a 10s timeout
- [x] **INGEST-03**: `Source` model has `lastFetchedAt DateTime?` cursor; OTS adapter uses it to compute the `von=` parameter (typically dropping the lookback window from 24h to ~15–30 min)
- [x] **INGEST-04**: `Source` model has `etag String?` and `lastModified String?` columns; RSS adapter sends `If-None-Match` / `If-Modified-Since` and short-circuits on HTTP 304 without re-parsing the body
- [x] **INGEST-05**: `IngestionRun.update` and `Source.consecutiveFailures` / `Source.healthStatus` updates are wrapped in a single `db.$transaction` so a crash between them never leaves them divergent

### Quality & Eval (QUAL)

Sharper REVIEW heuristic, structured state-wide signaling, offline quality scoring, and an A/B prompt eval harness.

- [ ] **QUAL-01**: Merged-call output schema includes `mentionsPrivateIndividual: boolean` (replacing `hasNamedPerson`); finalStatus selector uses it: `mentionsPrivateIndividual ? 'REVIEW' : 'WRITTEN'`
- [ ] **QUAL-02**: Prompt explicitly excludes officeholders mentioned in their official capacity (Bürgermeister, Landesrat, Geschäftsführer eines genannten Unternehmens, Sportler im Wettkampfbericht) from `mentionsPrivateIndividual`
- [ ] **QUAL-03**: Admin has an opt-in button to re-evaluate the historical REVIEW backlog with the new prompt (one-shot script, not automatic)
- [ ] **QUAL-04**: Merged-call output schema includes `isStateWide: boolean`; pipeline drops the `'steiermark-weit'` magic slug and the warning-on-mix code path
- [ ] **QUAL-05**: New `ArticleQualityScore` table with `score Int (0-100)`, `rubricVersion String`, `notes String?`, `articleId`, `scoredAt`
- [ ] **QUAL-06**: Pipeline samples 5% of WRITTEN/PUBLISHED articles and scores them with Haiku against a written rubric (German fluency, lead-summarises-body, no leaked source metadata, headline hook quality)
- [ ] **QUAL-07**: Admin dashboard shows rolling 7-day quality score per source
- [ ] **QUAL-08**: New `PromptEvalRun` table stores eval runs with diff summary
- [ ] **QUAL-09**: Frozen 50-article fixture exists and is checked into the repo
- [ ] **QUAL-10**: Eval harness runs a candidate prompt against the fixture in under 5 minutes and produces a side-by-side diff report

### Directory Expansion (DIR) — v3.3 Phase 46 + Phase 47

Public doctor directory under `/aerzte` with editorial CRUD, Nominatim geocoding, static map pins, JSON-LD, and phase-local design tokens. Phase 46 shipped the editorial CRUD baseline. Phase 47 extends with bulk CSV import + 51-value Fachrichtung enum + admin-triggered batch geocoder.

- [x] **DIR-01**: `Doctor` Prisma model with `id`, `publicId` (nanoid via `@default(nanoid())`, unique), `name`, `titel?`, `kategorie` (DoctorKategorie enum), `fachrichtung?`, `address`, `lat?`, `lon?`, `bezirkId` FK to Bezirk, `email?`, `website?`, `phone?`, `editorialNote?`, `relatedArticleIds String[]` default `[]`, `mapImageUrl?`, `isVerified Boolean` default `false`, timestamps; indexes on `bezirkId`, `kategorie`, `(isVerified, name)`
- [x] **DIR-02**: `DoctorKategorie` enum: `ALLGEMEINMEDIZIN`, `FACHARZT`, `ZAHNARZT`
- [x] **DIR-03**: DAL `src/lib/content/doctors.ts` exports `listDoctors`, `getDoctorByPublicId`, `getDoctorById` — overloaded for duck-typed DI, ordering verified-first then name-ASC, filter support for bezirkId/bezirkSlug/kategorie/fachrichtung/isVerified/limit/offset
- [x] **DIR-04**: Server-Action-Trinity in `src/lib/admin/doctors-actions.ts`: pure `*Db` (no auth), `*Action` (requireAuth + delegate), `*Form` (FormData parser + revalidate/redirect) — for `create`, `update`, `softDelete`, `toggleVerified`
- [x] **DIR-05**: `createDoctor` / `updateDoctor` Server Action geocodes `address` via existing `geocodeLocation()` — single Nominatim call per save, no sleep needed; failure persists row with `lat/lon=null` and surfaces non-blocking admin warning
- [x] **DIR-06**: Admin pages `/admin/aerzte` (list with filters + "Neu" link), `/admin/aerzte/new`, `/admin/aerzte/[id]/edit` — mirror `/admin/articles` patterns
- [x] **DIR-07**: Public `/aerzte` list page, Server Component, `dynamic = 'force-dynamic'`, query-param filters bezirk/kategorie/fachrichtung; "Mein Bezirk" auto-prefill from `bezirk_selection` localStorage convention (client-island reads, server reads query param)
- [x] **DIR-08**: Public `/aerzte/[publicId]/[slug]` detail page with `permanentRedirect` slug canonicalization via `slugify()` from `lib/reader/slug`
- [x] **DIR-09**: Doctor map asset generated at admin save via `generateMapImage(lat, lon, name, doctorId, locType, { pathPrefix: 'doctor' })`; persisted as `mapImageUrl`; failure logs warn but does not block save
- [x] **DIR-10**: Detail page emits JSON-LD: `@type: 'Physician'` for ALLGEMEINMEDIZIN+FACHARZT, `@type: 'Dentist'` for ZAHNARZT, with `address: PostalAddress`, optional `geo: GeoCoordinates`, optional `medicalSpecialty` for FACHARZT
- [x] **DIR-11**: `src/app/sitemap.ts` includes `/aerzte` index + all `/aerzte/{publicId}/{slug}` URLs (priority 0.7, weekly); bounded `take: 5000`
- [x] **DIR-12**: `LodenAppBar` desktop + mobile drawer gain "Ärzte" link; `Footer` "Rubriken" column gains "Ärzteverzeichnis"; "Angaben ohne Gewähr" disclaimer rendered in detail-page footer
- [x] **DIR-13**: Phase-local CSS tokens added to `src/app/globals.css @theme` under `--color-dir-*` / `--radius-dir-*` / `--spacing-dir-*` namespace — full DESIGN.md YAML token set, additive only, no master-token edits

#### Phase 47: Vollkatalog + CSV-Import (extends DIR baseline)

Minted 2026-05-16 by planner. Each DIR-NN maps to a CONTEXT.md decision D-XX and a VALIDATION.md R-XX.

- [ ] **DIR-14** (D-01): `Doctor.arztNr String @unique` added; required column; natural key for CSV upsert. Existing seed/test rows wiped via TRUNCATE in migration (D-12). Maps R-01.
- [ ] **DIR-15** (D-02): `Doctor.website` renamed to `Doctor.profilUrl`; all client consumers (admin form, detail link, JSON-LD `sameAs`) updated in the same commit. Maps R-02.
- [ ] **DIR-16** (D-03): `Doctor.kategorie` column AND `DoctorKategorie` enum dropped entirely. All `kategorie` references removed from DAL filter, admin form, list chip, sitemap, JSON-LD branch. `@@index([kategorie])` replaced with `@@index([fachrichtung])`. Maps R-03.
- [ ] **DIR-17** (D-04, D-05): `Doctor.fachrichtung String?` migrated to `Fachrichtung NOT NULL` closed Prisma enum with 51 values; enum identifiers derived from German labels via documented transform (uppercase, Ä→AE/Ö→OE/Ü→UE/ß→SS, space/dash→_, strip .,()); `FACHRICHTUNG_LABELS: Record<Fachrichtung, string>` exported as single source of truth. Maps R-04.
- [ ] **DIR-18** (D-06, D-07): CSV parser enforces exact header `Bezirk,Fachrichtung,Name,Adresse,Telefonnummer,ArztNr,ProfilURL`; UTF-8 with BOM stripped; multi-line CSV-quoted values supported via real CSV library (papaparse). Maps R-05.
- [ ] **DIR-19** (D-08): CSV parser rejects rows missing any required field (Bezirk, Fachrichtung, Name, Adresse, ArztNr); empty Telefonnummer/ProfilURL → null in DB. Maps R-06.
- [ ] **DIR-20** (D-10): Bezirk lookup uses explicit alias map (`"Graz-Stadt" → "Graz (Stadt)"`); unknown Bezirk values reject the row with actionable German error. Maps R-07.
- [ ] **DIR-21** (D-11): Unknown Fachrichtung values reject the row; enum treated as exhaustive. Maps R-08.
- [ ] **DIR-22** (D-12): Migration includes `TRUNCATE TABLE "Doctor" RESTART IDENTITY` before schema mutations; pglite test DB applies migration sequence cleanly. Maps R-09.
- [ ] **DIR-23** (D-14, D-16): `commitCsvImportAction` performs upserts inside a single `db.$transaction([...])`; upsert keyed on `arztNr`; CSV-driven fields overwrite, editorial fields (`titel`, `email`, `editorialNote`, `relatedArticleIds`, `isVerified`, `mapImageUrl`) NEVER touched by update payload. Maps R-10.
- [ ] **DIR-24** (D-17): Address-change detection per row — if `input.address !== existing.address`, update payload sets `lat: null, lon: null, mapImageUrl: null` so batch geocoder re-runs; exact string equality (no trim/lowercase). Maps R-11.
- [ ] **DIR-25** (D-18): Within-batch duplicate `arztNr` resolved last-write-wins; flagged as warning (not row rejection) in dry-run conflicts table. Maps R-12.
- [ ] **DIR-26** (D-19, D-20, D-21): No synchronous geocoding during import; no background cron geocoder; admin-triggered `geocodeBatchAction` processes up to 200 unmapped doctors per click, sequential with `await sleep(1100)`, runs under Vercel 5-min cap (`maxDuration = 300`). Maps R-13.
- [ ] **DIR-27** (D-22): `/admin/aerzte` page renders progress counter "X von Y Ärzte geocoded (Z ausstehend)" reading live DB count. Maps R-14 (manual smoke).
- [ ] **DIR-28** (D-25, D-26): `/aerzte` list filter UI drops 3-chip kategorie selector; adds searchable Fachrichtung input paired with HTML5 `<datalist>` over 51 enum values; URL param `?fachrichtung=ENUM_ID` round-trippable. Maps R-15 (manual smoke).
- [ ] **DIR-29** (D-27, D-28): Detail page JSON-LD always emits `@type: 'Physician'` (Dentist branch deleted); `medicalSpecialty` populated from `FACHRICHTUNG_LABELS[doctor.fachrichtung]`; `profilUrl` rendered as detail-page link and JSON-LD `sameAs` when present. Maps R-16, R-17.
- [ ] **DIR-30** (D-13, D-30): Admin route `/admin/aerzte/import` ships RSC page with file upload form, dry-run preview (summary + collapsible conflicts table), commit button; 10-row test fixture `test/fixtures/aerzte-sample.csv` covers 4 Bezirke (incl. Graz-Stadt alias) and 5 Fachrichtungen (incl. multi-line "Hals-, Nasen- und Ohrenheilkunde"). Maps R-18.
- [ ] **DIR-31** (D-31, D-32): Existing Phase 46 tests in `doctors.test.ts` + `doctors-actions.test.ts` updated: factories add `arztNr`, replace `kategorie` with `fachrichtung` enum value; new tests for csv-parser, bezirk-alias, fachrichtung-mapping, doctors-import-actions cover all D-31 cases (header validation, alias-map, enum coverage, dry-run conflicts, upsert editorial preservation, address-change re-geocode trigger, sleep timing via `vi.useFakeTimers`).

## v2 Requirements

Deferred to future milestones (v3.3+). Tracked but not in v3.2 roadmap.

### AI Pipeline

- **AIPL-FUTURE-01**: Decouple rewrite from SEO — Haiku rewrite, then deterministic SEO pass with cached LLM only when length budget violated (manifest C3)
- **AIPL-FUTURE-02**: Source-quality signals fed back to Step 1 prompt as soft hints (manifest C4) — needs cost-telemetry data first
- **AIPL-FUTURE-03**: Send LLM human-language Bezirk names; map name→slug in code (manifest P3-TP-2)
- **AIPL-FUTURE-04**: Consolidate prompt language (Step 1 in German, matching Step 2) — superseded if merged-call ships in German anyway

### Circuit Breaker

- **AIPL-FUTURE-05**: Replace binary daily circuit-breaker with rolling 1h budget + per-source caps + soft halt mode (highest-priority sources only) (manifest P2-CC-1)

### Concurrency Fallback

- **AIPL-FUTURE-06**: Add `p-limit(4)` concurrency on the per-article path — only if Batches API latency proves unfit for the cron cadence (manifest B6)

## Out of Scope

Explicitly excluded from v3.2. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| New ingestion sources | v3.2 is engine optimization, not source expansion. |
| Frontend / reader UI changes | Backend-only milestone. Reader experience already shipped in v3.0/v3.1. |
| New ad placements or SEO surface changes | Out of scope for engine optimization. |
| C3 deterministic SEO pass | Strategic / lower priority; deferred to v3.3+. |
| C4 source-quality back-feed | Needs telemetry data first; deferred. |
| Migration of all historical pre-v3.2 articles to populate telemetry columns | Backfilled rows have `aiCostUsd = NULL` (interpreted as "unknown — pre-telemetry"). |
| Batches API webhook server | Polling is sufficient for the cron cadence; webhook adds infra surface. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AIPL-01 | Phase 43 | Complete |
| AIPL-02 | Phase 43 | Complete |
| AIPL-03 | Phase 43 | Complete |
| AIPL-04 | Phase 43 | Complete |
| AIPL-05 | Phase 43 | Complete |
| AIPL-06 | Phase 43 | Complete |
| AIPL-07 | Phase 43 | Complete |
| AIPL-08 | Phase 43 | Complete |
| AIPL-09 | Phase 43 | Complete |
| AIPL-10 | Phase 43 | Complete |
| TLM-01 | Phase 44 | Pending |
| TLM-02 | Phase 44 | Pending |
| TLM-03 | Phase 44 | Pending |
| TLM-04 | Phase 44 | Pending |
| TLM-05 | Phase 44 | Pending |
| TLM-06 | Phase 44 | Pending |
| TLM-07 | Phase 44 | Pending |
| INGEST-01 | Phase 44 | Complete |
| INGEST-02 | Phase 44 | Complete |
| INGEST-03 | Phase 44 | Complete |
| INGEST-04 | Phase 44 | Complete |
| INGEST-05 | Phase 44 | Complete |
| QUAL-01 | Phase 45 | Pending |
| QUAL-02 | Phase 45 | Pending |
| QUAL-03 | Phase 45 | Pending |
| QUAL-04 | Phase 45 | Pending |
| QUAL-05 | Phase 45 | Pending |
| QUAL-06 | Phase 45 | Pending |
| QUAL-07 | Phase 45 | Pending |
| QUAL-08 | Phase 45 | Pending |
| QUAL-09 | Phase 45 | Pending |
| QUAL-10 | Phase 45 | Pending |
| DIR-01 | Phase 46 | Complete |
| DIR-02 | Phase 46 | Complete |
| DIR-03 | Phase 46 | Complete |
| DIR-04 | Phase 46 | Complete |
| DIR-05 | Phase 46 | Complete |
| DIR-06 | Phase 46 | Complete |
| DIR-07 | Phase 46 | Complete |
| DIR-08 | Phase 46 | Complete |
| DIR-09 | Phase 46 | Complete |
| DIR-10 | Phase 46 | Complete |
| DIR-11 | Phase 46 | Complete |
| DIR-12 | Phase 46 | Complete |
| DIR-13 | Phase 46 | Complete |
| DIR-14 | Phase 47 | Pending |
| DIR-15 | Phase 47 | Pending |
| DIR-16 | Phase 47 | Pending |
| DIR-17 | Phase 47 | Pending |
| DIR-18 | Phase 47 | Pending |
| DIR-19 | Phase 47 | Pending |
| DIR-20 | Phase 47 | Pending |
| DIR-21 | Phase 47 | Pending |
| DIR-22 | Phase 47 | Pending |
| DIR-23 | Phase 47 | Pending |
| DIR-24 | Phase 47 | Pending |
| DIR-25 | Phase 47 | Pending |
| DIR-26 | Phase 47 | Pending |
| DIR-27 | Phase 47 | Pending |
| DIR-28 | Phase 47 | Pending |
| DIR-29 | Phase 47 | Pending |
| DIR-30 | Phase 47 | Pending |
| DIR-31 | Phase 47 | Pending |

**Coverage:**
- v3.2 requirements: 32 total
- Mapped to phases: 32
- Unmapped: 0 ✓
- v3.3 requirements: 31 total (13 Phase 46 + 18 Phase 47) — Mapped to phases: 31 — Unmapped: 0 ✓

---
*Requirements defined: 2026-05-10*
*Last updated: 2026-05-16 — DIR-14..DIR-31 minted for v3.3 Phase 47 by planner*
