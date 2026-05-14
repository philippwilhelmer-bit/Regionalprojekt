# Roadmap: Regionalprojekt (Wurzelwelt)

## Milestones

- ✅ **v1.0 MVP** — Phases 1-15 (shipped 2026-03-25)
- ✅ **v1.1 Design Overhaul** — Phases 16-20 (shipped 2026-03-26)
- ✅ **v1.2 Test Deployment** — Phases 21-25 (shipped 2026-03-28)
- ✅ **v2.0 Wurzelwelt Rebrand** — Phases 26-32 (shipped 2026-03-30)
- ✅ **v3.0 The Modern Archivist** — Phases 33-39 (shipped 2026-04-05)
- ✅ **v3.1 Basemap Article Images** — Phases 40-42 (shipped 2026-05-10)
- 🔄 **v3.2 Text Engine Optimization** — Phases 43-45 (43 complete, 44 partial, 45 not started — PARKED 2026-05-14)
- 🔄 **v3.3 Directory Expansion** — Phase 46 (Ärzteverzeichnis — in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-15) — SHIPPED 2026-03-25</summary>

- [x] **Phase 1: Foundation** - Project scaffolding, DB, config-driven Bundesland
- [x] **Phase 2: Ingestion** - OTS.at + RSS adapters, deduplication, source management
- [x] **Phase 3: AI Pipeline** - German article generation, Bezirk tagging, exception queue
- [x] **Phase 4: Scheduler and Autonomous Publishing** - Cron loop, dead-man monitor, auto-publish
- [x] **Phase 5: Editorial CMS** - Full CRUD, exception inbox, source UI, AI config UI
- [x] **Phase 6: Reader Frontend** - Mein Bezirk, article pages, RSS feeds, SEO/JSON-LD
- [x] **Phase 7: Extensibility and Quality Validation** - ORF RSS adapter, integration tests
- [x] **Phase 8: Per-Source AI Config Wiring** - Per-source AI override UI + persistence
- [x] **Phase 9: Ad Config Wiring + Auth Hardening** - AdSense zones, HMAC hardening
- [x] **Phase 10: Wire Config Site Name into UI** - Config-driven site name display
- [x] **Phase 11: Fix State-Wide Article Pipeline** - State-wide ingestion correctness
- [x] **Phase 12: Config-Driven Region List + RSS Feature Flag** - Region list from config
- [x] **Phase 13: Production Readiness** - Impressum, OTS credentials, deploy checklist
- [x] **Phase 14: Phase 5 Human Acceptance Gate** - CMS manual acceptance verification
- [x] **Phase 15: Tech Debt Cleanup** - Dead code removal, lint, test coverage gaps

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 Design Overhaul (Phases 16-20) — SHIPPED 2026-03-26</summary>

- [x] **Phase 16: Design System Foundation** - Fonts, color tokens, icons, border radius (completed 2026-03-25)
- [x] **Phase 17: Header & Identity** - Styrian stripe, dark green header, serif branding, location badge (completed 2026-03-25)
- [x] **Phase 18: Homepage Editorial Layout** - Hero article, top-stories scroller, topic sections, Eilmeldung banner (completed 2026-03-25)
- [x] **Phase 19: Article Detail & Bottom Navigation** - Editorial typography, bottom nav restyling (completed 2026-03-25)
- [x] **Phase 20: Search & Categories** - Search input, trending pills, category grid, recommended articles (completed 2026-03-26)

Full details: `.planning/milestones/v1.1-ROADMAP.md`

</details>

<details>
<summary>✅ v1.2 Test Deployment (Phases 21-25) — SHIPPED 2026-03-28</summary>

- [x] **Phase 21: Railway Infrastructure** - Vercel + Neon deployment (deviated from Railway), cron via /api/cron (completed 2026-03-27)
- [x] **Phase 22: Test Mode Implementation** - TESTSEITE banner, noindex meta, robots.txt, sitemap suppression, AdSense gating (completed 2026-03-28)
- [x] **Phase 23: Deployment Verification** - Verified live Vercel+Neon, set NEXT_PUBLIC_BASE_URL (completed 2026-03-28)
- [x] **Phase 24: Admin Login Banner Fix** - TESTSEITE banner on /admin/login (completed 2026-03-28)
- [x] **Phase 25: Deployment Verification & Requirements Closure** - AdUnit guard, VERIFICATION.md, all 9/9 requirements closed (completed 2026-03-28)

Full details: `.planning/milestones/v1.2-ROADMAP.md`

</details>

<details>
<summary>✅ v2.0 Wurzelwelt Rebrand (Phases 26-32) — SHIPPED 2026-03-30</summary>

- [x] **Phase 26: Design System & Brand Foundation** - New color palette, typography, icons, spacing, naming, mascot asset (completed 2026-03-28)
- [x] **Phase 27: App Chrome** - WurzelAppBar and WurzelNavBar replacing current header and bottom nav (completed 2026-03-28)
- [x] **Phase 28: Homepage Components** - MascotGreeting, Topmeldung, RegionalEditorialCard, Mein Bezirk section, tonal section separation (completed 2026-03-29)
- [x] **Phase 29: Article Detail** - Article detail page restyled with new palette, typography, and spacing (completed 2026-03-30)
- [x] **Phase 30: CMS Admin Restyling** - Admin pages restyled with Wurzelwelt brand tokens (completed 2026-03-30)
- [x] **Phase 31: Icon & Token Consistency Fix** - Fix icon class mismatch, replace residual zinc tokens, fix stale test mock (completed 2026-03-30)
- [x] **Phase 32: Phase 28 Verification** - Independent verification of all Phase 28 homepage components (completed 2026-03-30)

Full details: `.planning/milestones/v2.0-ROADMAP.md`

</details>

<details>
<summary>✅ v3.0 The Modern Archivist (Phases 33-39) — SHIPPED 2026-04-05</summary>

- [x] **Phase 33: Color Token Foundation** (3/3 plans) — completed 2026-04-01
- [x] **Phase 34: Shell Components** (2/2 plans) — completed 2026-04-01
- [x] **Phase 35: Homepage Feature Components** (3/3 plans) — completed 2026-04-01
- [x] **Phase 36: Article Detail Redesign** (2/2 plans) — completed 2026-04-01
- [x] **Phase 37: Search and CMS Refresh** (2/2 plans) — completed 2026-04-01
- [x] **Phase 38: Documentation & Frontmatter Fixes** (quick task) — completed 2026-04-05
- [x] **Phase 39: Shell Polish** (quick task) — completed 2026-04-05

Full details: `.planning/milestones/v3.0-ROADMAP.md`

</details>

<details>
<summary>✅ v3.1 Basemap Article Images (Phases 40-42) — SHIPPED 2026-05-10</summary>

- [x] **Phase 40: Tile Pipeline Infrastructure** (2/2 plans) — sharp pin, Blob storage, tile fetch, stitching, attribution, graceful fallback (completed 2026-04-13)
- [x] **Phase 41: Location Intelligence and Full Pipeline** (2/2 plans) — Regex + LLM location extraction, Nominatim geocoding with Postgres cache, cron integration (completed 2026-04-13)
- [x] **Phase 42: On-Demand Route, CMS Picker, and Backfill** (2/2 plans) — API route, CMS map picker tab, bulk backfill action (completed 2026-05-10)

Full details: `.planning/milestones/v3.1-ROADMAP.md`

</details>

<details open>
<summary>🔄 v3.2 Text Engine Optimization (Phases 43-45) — IN PROGRESS</summary>

- [x] **Phase 43: AI Pipeline Quick Wins** - Merged single-call pipeline, prompt caching, clean source extractors, orphan and accounting fixes (no schema changes) (completed 2026-05-11)
- [ ] **Phase 44: Cost Telemetry & Adapter Hardening** - Per-article cost columns, Message Batches API, adapter timeout/dedup/cursor/conditional-GET hardening
- [ ] **Phase 45: REVIEW Heuristic & Quality Loop** - Sharper private-individual detection, quality scoring, prompt eval harness, structured state-wide boolean

</details>

<details open>
<summary>🔄 v3.3 Directory Expansion (Phase 46) — IN PROGRESS</summary>

- [ ] **Phase 46: Ärzteverzeichnis (Doctor Directory)** — Editorial CRUD-pflegte Liste aller Allgemeinmediziner / Fachärzte / Zahnärzte mit Bezirk-Filter, Detail-Pages mit Map-Pin (Nominatim-geocoded), editorial notes + verifizierungs-badge + manuelle Artikel-Cross-Links. Eigenständige Route `/aerzte` + Admin-CRUD unter `/admin/aerzte`. Neue Design-Tokens additiv, phase-local (Master DESIGN.md unangetastet).

Full details: `.planning/phases/46-aerzteverzeichnis/46-CONTEXT.md` + phase-local DESIGN.md

</details>

## Phase Details

### Phase 43: AI Pipeline Quick Wins

**Goal:** Pipeline processes every article with a single Anthropic call, source metadata no longer bleeds into article text, and orphaned TAGGED rows and undercounted tokens are eliminated — all without any schema migration.

**Depends on:** Phase 42 (v3.1 complete)

**Requirements:** AIPL-01, AIPL-02, AIPL-03, AIPL-04, AIPL-05, AIPL-06, AIPL-07, AIPL-08, AIPL-09, AIPL-10

**Success Criteria** (what must be TRUE):
1. A FETCHED article reaches WRITTEN or REVIEW status via exactly one Anthropic API call (verifiable by mock or log inspection — no step1-tag + step2-write sequence)
2. Total `inputTokens` in PipelineRun drops by at least 50% compared to the pre-merge baseline on an equivalent article set
3. `cache_read_input_tokens > 0` appears in PipelineRun on the second article of a run that shares a system prefix
4. Published article text contains no occurrences of source-system strings such as `EMITTENT`, `WEBLINK`, or OTS contact-block fragments across a 50-article sample
5. A TAGGED article is picked up and processed on the next pipeline run (does not strand indefinitely)

**Plans:** 4/4 plans complete

Plans:
- [x] 43-01-PLAN.md — Merged AI call (`runMergedCall`) + unit suite — single `tool_use` call, `cache_control` on static prefix, `max_tokens: 1024`, cache-aware token split, `isStateWide` defensive guard (AIPL-01..05)
- [x] 43-02-PLAN.md — Per-source clean extractors (`extractors/ots.ts`, `extractors/rss.ts`, `extractors/index.ts`) — strip OTS metadata + dispatch by `ArticleSource` enum (AIPL-06)
- [x] 43-03-PLAN.md — Pipeline integration — flag-gated merged branch, TAGGED retry selector, `llmLocationFallback` signature change + token accounting, Anthropic `maxRetries: 2`, TAGGED enum deprecation comment, AIPL-10 SQL doc (AIPL-07..10)
- [x] 43-04-PLAN.md — 20-fixture corpus + `scripts/ai-replay-fixtures.ts` replay harness + smoke test + cutover protocol SUMMARY (verifies AIPL-01)

**Risk:** Merged prompt may regress article quality vs two specialized prompts. Mitigation: side-by-side eval on a 20-article fixture before the merged call goes to production. Keep the two-step path behind a flag for one milestone as fallback.

---

### Phase 44: Cost Telemetry & Adapter Hardening

**Goal:** Every processed article carries its AI cost in the database, the Message Batches API provides the 50% discount by default, and ingestion adapters no longer stall, over-query, or lose health state on crash.

**Depends on:** Phase 43 (merged-call shape is the interface into which telemetry and batching plug)

**Requirements:** TLM-01, TLM-02, TLM-03, TLM-04, TLM-05, TLM-06, TLM-07, INGEST-01, INGEST-02, INGEST-03, INGEST-04, INGEST-05

**Success Criteria** (what must be TRUE):
1. Every WRITTEN or PUBLISHED article produced after this phase has `aiInputTokens`, `aiOutputTokens`, `aiCostUsd`, and `aiModel` populated (NULL only on pre-v3.2 rows)
2. Admin can open the articles list, sort by `aiCostUsd` descending, and read the source name next to each cost figure
3. The pipeline submits articles to the Anthropic Message Batches API by default; switching to per-article mode requires only toggling a feature flag
4. The OTS adapter issues at most one DB query to check for duplicate external IDs regardless of list size
5. An unchanged RSS feed returns HTTP 304 and the adapter skips body parsing entirely (verifiable by log or test)
6. A process kill between `IngestionRun.update` and `Source.healthStatus` update leaves both fields consistent on the next read

**Plans:** 1/4 plans executed

**Risk:** Message Batches API response latency (minutes to hours) may exceed the 15-minute cron window. Spike-test batch round-trip time before committing; if latency is unfit, fall back to `p-limit(4)` concurrency on the per-article path (AIPL-FUTURE-06). The per-article fallback flag (TLM-05) is preserved regardless.

**Ordering note within phase:** TLM-01–04 (schema + telemetry population + admin views) should be implemented and verified before TLM-05–07 (Batches API + BATCHED status), so telemetry instrumentation is already in place when the async batch path is wired.

---

### Phase 45: REVIEW Heuristic & Quality Loop

**Goal:** The REVIEW queue reflects genuine privacy risk rather than officeholder mentions, a quality score baseline is established for every source, and future prompt changes can be evaluated safely against a frozen fixture before reaching production.

**Depends on:** Phase 43 (merged-call output schema carries `mentionsPrivateIndividual` and `isStateWide`), Phase 44 (telemetry columns enable quality regression detection by cost)

**Requirements:** QUAL-01, QUAL-02, QUAL-03, QUAL-04, QUAL-05, QUAL-06, QUAL-07, QUAL-08, QUAL-09, QUAL-10

**Success Criteria** (what must be TRUE):
1. A replay of the last 200 REVIEW-status articles against the new prompt reclassifies at least 60% as WRITTEN (officeholder-only mentions no longer trigger REVIEW)
2. The admin can trigger the historical REVIEW re-evaluation via a button in the CMS — it does not run automatically
3. The string `'steiermark-weit'` appears in zero source files and zero database rows after this phase
4. Rolling 7-day quality scores per source are visible in the admin dashboard
5. The prompt eval harness runs the candidate prompt against the frozen 50-article fixture and produces a side-by-side diff report in under 5 minutes

**Plans:** TBD

**Risk:** Re-classifying historical REVIEW rows is irreversible if the new heuristic is wrong. Mitigation: make it opt-in via the admin button (QUAL-03), not automatic. Run the eval harness against the fixture first to confirm the new prompt's reclassification rate before triggering the backlog sweep.

---

### Phase 46: Ärzteverzeichnis (Doctor Directory)

**Goal:** Loden & Leute serves a public doctor directory under `/aerzte` where Steiermark residents can browse Allgemeinmediziner, Fachärzte and Zahnärzte filtered by Bezirk and Fachrichtung. Each entry has a Nominatim-geocoded detail page with optional editorial notes, manual article cross-links, and a verification badge. Editorial team owns the data through an admin CRUD under `/admin/aerzte`. New design tokens are introduced phase-local in `globals.css` without touching the rest of the site.

**Depends on:** None (orthogonal to v3.2 — does not touch Article table or AI pipeline)

**Requirements:** DIR-01, DIR-02, DIR-03, DIR-04, DIR-05, DIR-06, DIR-07, DIR-08, DIR-09, DIR-10, DIR-11, DIR-12, DIR-13

(IDs to be minted in `.planning/REQUIREMENTS.md` as part of Plan 01 Task 1.4.)

**Success Criteria** (what must be TRUE):
1. A public-facing list at `/aerzte` shows all `Doctor` rows filterable by Bezirk and Kategorie (Allgemeinmedizin / Facharzt / Zahnarzt) and Fachrichtung
2. Each `Doctor` has a public detail page at `/aerzte/{publicId}/{slug}` with canonical slug redirect, address, optional map pin (when Nominatim succeeded), editorial note (rendered Markdown), and "Mehr zum Thema" article cross-links
3. Admin can create / edit / delete / verify-toggle a doctor entry from `/admin/aerzte` using the project's Server-Action-Trinity pattern (Db / Action / Form)
4. Nominatim geocoding runs synchronously on save (single call per save, rate-limit safe); when it fails, the entry is saved with `lat=null,lon=null` and the admin sees a non-blocking warning
5. The site continues to pass typecheck and the existing test suite — Doctor schema is additive (new table, no Article-table changes)
6. The new design tokens introduced for the directory live in `globals.css` under a namespace prefix; no live token semantics changed
7. `sitemap.ts` includes all `Doctor` detail URLs; SEO emits `Physician` (or `Dentist`) JSON-LD per detail page

**Plans:** 2/6 plans executed

Plans:
- [ ] 46-00-PLAN.md — Foundation prep: parameterize `mapgen.ts` Blob path prefix + add `--dir-*` design tokens to `globals.css` (DIR-09 prep, DIR-13)
- [ ] 46-01-PLAN.md — Prisma `Doctor` model + additive migration + DAL `doctors.ts` with overload + duck-typed DI + DAL pglite tests + `REQUIREMENTS.md` DIR-01..13 backfill (DIR-01, DIR-02, DIR-03)
- [ ] 46-02-PLAN.md — Server-Action-Trinity `doctors-actions.ts`: pure `*Db` + `*Action` (auth + two-phase create with geocode + mapgen) + `*Form` wrappers; vi.mock'd tests for happy + failure paths (DIR-04, DIR-05, DIR-09)
- [ ] 46-03-PLAN.md — Admin CRUD UI: `/admin/aerzte` list with filter chips, `/admin/aerzte/new`, `/admin/aerzte/[id]/edit`, row component with toggle-verified + delete forms (DIR-06)
- [ ] 46-04-PLAN.md — Public pages: `/aerzte` list + filter chips + `/aerzte/[publicId]/[slug]` detail with slug canonicalization, JSON-LD (Physician/Dentist), static map display, related-articles cross-links, `Angaben ohne Gewähr` disclaimer (DIR-07, DIR-08, DIR-10)
- [ ] 46-05-PLAN.md — Sitemap inclusion, AppBar + Footer nav-link "Ärzte", end-to-end integration smoke checkpoint (DIR-11, DIR-12)

**Wave structure:**
- Wave 1: 46-00, 46-01 (parallel — different files)
- Wave 2: 46-02 (depends on 00+01), 46-04 (depends on 01)
- Wave 3: 46-03 (depends on 02)
- Wave 4: 46-05 (depends on 03+04)

**Risk:** Manual data pflege at scale is unsustainable beyond a few hundred entries (Steiermark has ~2000+ active doctors). Mitigation: MVP launch covers Graz + 2-3 angrenzende Bezirke; growth is operator-driven, not feature-driven. Verification-badge is a signal not a guarantee — clear disclaimer in detail-page footer is mandatory ("Angaben ohne Gewähr").

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-15 | v1.0 | 52/52 | Complete | 2026-03-25 |
| 16-20 | v1.1 | 10/10 | Complete | 2026-03-26 |
| 21-25 | v1.2 | 7/7 | Complete | 2026-03-28 |
| 26-32 | v2.0 | 11/11 | Complete | 2026-03-30 |
| 33-39 | v3.0 | 12/12 + 2 quick | Complete | 2026-04-05 |
| 40-42 | v3.1 | 6/6 | Complete | 2026-05-10 |
| 43 | 4/4 | Complete    | 2026-05-11 | - |
| 44 | 1/4 | In Progress|  | - |
| 45 | v3.2 | 0/TBD | Not started | - |
| 46 | 2/6 | In Progress|  | - |
