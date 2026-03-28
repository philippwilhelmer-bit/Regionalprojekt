# Roadmap: Regionalprojekt (Ennstal Aktuell)

## Milestones

- ✅ **v1.0 MVP** — Phases 1-15 (shipped 2026-03-25)
- ✅ **v1.1 Design Overhaul** — Phases 16-20 (shipped 2026-03-26)
- 🚧 **v1.2 Test Deployment** — Phases 21-22 (in progress)

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

### v1.2 Test Deployment (In Progress)

**Milestone Goal:** Deploy a shareable test version on Railway that is clearly marked as non-production and invisible to search engines.

- [ ] **Phase 21: Railway Infrastructure** - Deploy current app to Railway with correct DB isolation, PORT binding, and env var wiring
- [x] **Phase 22: Test Mode Implementation** - Add TESTSEITE banner, noindex meta, robots.txt disallow, sitemap suppression, AdSense gating — all gated by single env var (completed 2026-03-28)

## Phase Details

### Phase 21: Railway Infrastructure
**Goal**: A working Railway deployment of the current app with correct database isolation, PORT configuration, and environment variable wiring verified
**Depends on**: Phase 20
**Requirements**: DEPLOY-01, DEPLOY-02, DEPLOY-03
**Success Criteria** (what must be TRUE):
  1. The Railway service URL loads the homepage without error
  2. Navigating to `/admin` redirects to `/admin/login` (CMS is live)
  3. The Railway PostgreSQL addon is the active database (not a hard-coded connection string)
  4. Prisma migrations have been applied and the schema is current
**Plans:** 1/2 plans executed
Plans:
- [ ] 21-01-PLAN.md — Prepare codebase for Railway (railway.toml, PORT binding, combined cron script)
- [ ] 21-02-PLAN.md — Deploy to Railway and verify live site

### Phase 22: Test Mode Implementation
**Goal**: Every page on the live Railway deployment clearly signals "test site" to visitors and is comprehensively blocked from search engine indexing and crawling
**Depends on**: Phase 21
**Requirements**: SEO-01, SEO-02, SEO-03, TEST-01, TEST-02, SAFETY-01
**Success Criteria** (what must be TRUE):
  1. A visible "TESTSEITE" banner appears on every reader page (homepage, article detail, search)
  2. A visible "TESTSEITE" banner appears on every CMS/admin page
  3. Page source on any reader page contains `<meta name="robots" content="noindex, nofollow">`
  4. `GET /robots.txt` on the Railway URL returns `Disallow: /`
  5. `GET /sitemap.xml` on the Railway URL returns an empty or minimal response with no article URLs
**Plans:** 2/2 plans complete
Plans:
- [ ] 22-01-PLAN.md — Create TestSiteBanner component and wire into both layouts
- [ ] 22-02-PLAN.md — SEO suppression (robots.txt, sitemap, noindex) and AdSense gating

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-15 | v1.0 | 52/52 | Complete | 2026-03-25 |
| 16-20 | v1.1 | 10/10 | Complete | 2026-03-26 |
| 21. Railway Infrastructure | 1/2 | In Progress|  | - |
| 22. Test Mode Implementation | 2/2 | Complete   | 2026-03-28 | - |
