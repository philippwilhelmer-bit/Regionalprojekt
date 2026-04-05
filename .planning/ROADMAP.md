# Roadmap: Regionalprojekt (Wurzelwelt)

## Milestones

- ✅ **v1.0 MVP** — Phases 1-15 (shipped 2026-03-25)
- ✅ **v1.1 Design Overhaul** — Phases 16-20 (shipped 2026-03-26)
- ✅ **v1.2 Test Deployment** — Phases 21-25 (shipped 2026-03-28)
- ✅ **v2.0 Wurzelwelt Rebrand** — Phases 26-32 (shipped 2026-03-30)
- ✅ **v3.0 The Modern Archivist** — Phases 33-39 (shipped 2026-04-05)
- 🚧 **v3.1 Basemap Article Images** — Phases 40-42 (in progress)

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

### 🚧 v3.1 Basemap Article Images (In Progress)

**Milestone Goal:** Replace gradient fallbacks with auto-generated basemap.at map images for article headers, using location extraction from article text.

#### Phase 40: Tile Pipeline Infrastructure
- [ ] **Phase 40: Tile Pipeline Infrastructure** - sharp pin, Blob storage, tile fetch, stitching, attribution, graceful fallback, pipeline isolation

#### Phase 41: Location Intelligence and Full Pipeline
- [ ] **Phase 41: Location Intelligence and Full Pipeline** - Regex and LLM location extraction, Nominatim geocoding with Postgres cache, zoom/layer selection, end-to-end cron integration

#### Phase 42: On-Demand Route, CMS Picker, and Backfill
- [ ] **Phase 42: On-Demand Route, CMS Picker, and Backfill** - API route, CMS map picker tab, bulk backfill action

## Phase Details

### Phase 40: Tile Pipeline Infrastructure
**Goal**: Map images can be generated for any lat/lon coordinate, stored in Vercel Blob, and written to Article.imageUrl — with attribution on every image and pipeline failures never blocking article publication
**Depends on**: Phase 39 (v3.0 complete)
**Requirements**: MAP-03, MAP-04, MAP-05, MAP-06, MAP-07, MAP-08, INTG-02
**Success Criteria** (what must be TRUE):
  1. Given a lat/lon coordinate, the system fetches a 3x3 tile grid from basemap.at and composites it into a 1200x630px JPEG with "© basemap.at" text overlay
  2. The generated image is stored in Vercel Blob and its URL is written to Article.imageUrl with Article.imageCredit set to "© basemap.at"
  3. Zoom level is auto-selected based on result type (city→12, town→13, village→14, street→15) and map layer is selected by article topic keywords (greyscale default, terrain for nature)
  4. When tile fetching, compositing, or Blob upload throws any error, the article publishes normally with imageUrl null and the existing gradient fallback renders unchanged
  5. A Vercel deployment smoke test confirms the sharp linux-x64 binary loads and produces a valid image for Graz coordinates (47.07N, 15.43E)
**Plans**: TBD

### Phase 41: Location Intelligence and Full Pipeline
**Goal**: Newly ingested articles automatically receive map images based on location extracted from their text, with Nominatim results cached in Postgres to prevent rate-limit bans
**Depends on**: Phase 40
**Requirements**: MAP-01, MAP-02, CMS-02, INTG-01
**Success Criteria** (what must be TRUE):
  1. After cron ingestion completes, articles containing recognizable Austrian place names (Bezirk names or Steiermark city list) have imageUrl populated with a map image
  2. Each unique normalized place name is geocoded via Nominatim at most once — subsequent articles with the same location read from the Postgres cache with no external API call
  3. When regex finds no location and the article has meaningful geographic content, the LLM fallback extracts a place name and the pipeline proceeds to geocoding
  4. When no location can be extracted by either method, the article publishes with imageUrl null — no error is thrown and no article status is affected
**Plans**: TBD

### Phase 42: On-Demand Route, CMS Picker, and Backfill
**Goal**: Editors can manually generate or replace map images for any article, and existing articles without images can be backfilled in bulk
**Depends on**: Phase 41
**Requirements**: INTG-03, INTG-04, CMS-01
**Success Criteria** (what must be TRUE):
  1. Calling GET /api/map-image/[articleId] generates a map image for the article (or returns the existing URL if already set) and writes the result to Article.imageUrl
  2. In the article edit page, the "Karte" tab shows the current map image preview and a "Karte generieren" button — clicking it generates a new image and saves it without leaving the edit page
  3. The CMS backfill action processes all articles with imageUrl null in batches of 10 with 1100ms delay between geocoding calls, and progress is visible in console logs
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-15 | v1.0 | 52/52 | Complete | 2026-03-25 |
| 16-20 | v1.1 | 10/10 | Complete | 2026-03-26 |
| 21-25 | v1.2 | 7/7 | Complete | 2026-03-28 |
| 26-32 | v2.0 | 11/11 | Complete | 2026-03-30 |
| 33-39 | v3.0 | 12/12 + 2 quick | Complete | 2026-04-05 |
| 40. Tile Pipeline Infrastructure | v3.1 | 0/TBD | Not started | - |
| 41. Location Intelligence and Full Pipeline | v3.1 | 0/TBD | Not started | - |
| 42. On-Demand Route, CMS Picker, and Backfill | v3.1 | 0/TBD | Not started | - |
