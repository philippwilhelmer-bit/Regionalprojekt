# Roadmap: Regionalprojekt (Ennstal Aktuell)

## Overview

Build an autonomous AI-powered regional news platform covering all Bezirke of Steiermark. The platform ingests press wire and RSS content, generates German-language articles via AI, and publishes without human intervention. Readers personalize their feed by Bezirk; editors can curate at any time. The build order follows the strict dependency chain: schema and data model first, ingestion second, AI pipeline third, scheduler fourth — every subsequent component (CMS, reader frontend, extensibility validation) depends on a working pipeline.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - DB schema, Bezirk data model, and content data access layer (completed 2026-03-21)
- [x] **Phase 2: Ingestion** - Source adapter interface, OTS.at adapter, RSS adapter, deduplication, and feed health monitoring (completed 2026-03-21)
- [x] **Phase 3: AI Pipeline** - Bezirk tagger, article writer, named-person exception queue, and cost circuit-breaker (completed 2026-03-22)
- [x] **Phase 4: Scheduler and Autonomous Publishing** - Cron scheduler, automated ingestion-to-publish loop, and dead-man monitoring (completed 2026-03-22)
- [x] **Phase 5: Editorial CMS** - Authenticated admin interface, article CRUD, exception queue inbox, and source management (completed 2026-03-22)
- [x] **Phase 6: Reader Frontend** - "Mein Bezirk" selector, Bezirk-filtered feed, article detail pages, RSS feeds per Bezirk, and Impressum (completed 2026-03-22)
- [x] **Phase 7: Extensibility and Quality Validation** - Second RSS adapter, end-to-end deduplication test, alert chain verification (completed 2026-03-23)

## Phase Details

### Phase 1: Foundation
**Goal**: The data layer that every other component depends on exists and is correct — schema locked, all 13 Steiermark Bezirke seeded, Bundesland config structure defined (including ad placement zones), and a type-safe content access layer ready to serve pipeline, CMS, and frontend
**Depends on**: Nothing (first phase)
**Requirements**: CONF-01, CONF-02, AD-02
**Success Criteria** (what must be TRUE):
  1. Running `prisma migrate deploy` against a fresh database produces all tables with correct indexes and foreign keys — no errors
  2. All 13 Steiermark Bezirke (12 Bezirke + Graz) are queryable from the database with their canonical IDs, names, and Gemeinde synonym lists
  3. The content data access layer (`content/articles.ts`, `content/bezirke.ts`) returns typed results for article and Bezirk queries without raw SQL outside the layer
  4. Changing the Bundesland config file and re-seeding produces a different set of regions — no core code changes required
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md — Project scaffold: Next.js 15 + Prisma v6 init, Vitest + pgLite setup, RED stub tests
- [ ] 01-02-PLAN.md — Schema + config: Prisma schema migration, BundeslandConfig type, Steiermark bundesland.config.ts
- [ ] 01-03-PLAN.md — Seed + DAL: Bezirk seed data, config-driven seed script, bezirke.ts and articles.ts content access layer

### Phase 2: Ingestion
**Goal**: Raw content flows reliably from OTS.at and RSS sources into the database, with duplicates blocked before they reach the AI pipeline and operators alerted on source failures
**Depends on**: Phase 1
**Requirements**: ING-01, ING-02, ING-03, ING-04, ING-05
**Success Criteria** (what must be TRUE):
  1. New OTS.at press releases appear in the ingestion queue within one polling cycle — source, external ID, and raw payload stored
  2. A generic RSS feed can be added by registering a new adapter config entry; no changes to core ingestion logic required
  3. Submitting the same article via two different sources results in exactly one database record — content fingerprinting blocks the duplicate
  4. When OTS.at returns an error or goes silent, an operator alert fires and the failed source is visible in admin with last-successful-fetch timestamp
**Plans**: 7 plans

Plans:
- [x] 02-01-PLAN.md — Schema migration + Wave 0 test stubs: Source/IngestionRun models, contentHash on Article, all test scaffold files and XML fixtures
- [ ] 02-02-PLAN.md — Types + dedup service (TDD): RawItem/AdapterFn interfaces, SHA-256 content fingerprinting, isDuplicate with two-layer dedup
- [ ] 02-03-PLAN.md — OTS.at adapter (TDD): REST API list+detail flow, externalId dedup before detail fetch, defensive body field extraction
- [ ] 02-04-PLAN.md — RSS/Atom adapter (TDD): feedsmith parsing, externalId fallback chain (guid → link → contentHash)
- [ ] 02-05-PLAN.md — Registry + ingest() + Source DAL (TDD): adapter registry, core ingest with health tracking and IngestionRun recording, Source DAL
- [ ] 02-06-PLAN.md — Source seed + ingest-run.ts CLI: idempotent Steiermark source seed, CLI entry point for Phase 4 scheduler
- [ ] 02-07-PLAN.md — Gap closure: fix AdapterFn type alignment and rss.ts Atom externalId to pass tsc --noEmit

### Phase 3: AI Pipeline
**Goal**: Ingested articles are transformed into clean German-language news articles with SEO-optimized titles and meta descriptions, tagged to the correct Bezirk(e), flagged for review when they mention named persons, and guarded against cost explosion — all without blocking any web request
**Depends on**: Phase 2
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05, SEO-02
**Success Criteria** (what must be TRUE):
  1. A raw ingested item transitions through `tagged → written → ready` status flags and produces a German-language article stored in the database with correct Bezirk associations
  2. Every generated article includes an SEO-optimized title and meta description produced by the AI pipeline
  3. An article mentioning a real named person does not auto-publish — it appears in the exception queue awaiting editor review
  4. Every AI-generated article has an "Automatisch erstellt" label attached before it can reach the published state
  5. When simulated LLM costs exceed the configured daily threshold, the circuit-breaker fires, AI generation halts, and the operator receives an alert
**Plans**: 5 plans

Plans:
- [ ] 03-01-PLAN.md — Schema migration + SDK install + Wave 0 test stubs: Article.seoTitle, PipelineRun model, @anthropic-ai/sdk, four test scaffold files
- [ ] 03-02-PLAN.md — Step 1: Tag & Classify (TDD): runStep1Tag() with structured JSON output, bezirk synonym injection, hasNamedPerson detection
- [ ] 03-03-PLAN.md — Step 2: Write & SEO (TDD): runStep2Write() with structured JSON output, Hochdeutsch rewrite, seoTitle + metaDescription
- [ ] 03-04-PLAN.md — Cost circuit-breaker (TDD): checkCostCircuitBreaker() daily token aggregation, threshold from env var, structured console.warn
- [ ] 03-05-PLAN.md — Pipeline orchestrator + CLI (TDD): processArticles() wiring Steps 1+2+circuit-breaker, PipelineRun tracking, ai-run.ts CLI

### Phase 4: Scheduler and Autonomous Publishing
**Goal**: The platform runs unattended — a cron schedule drives the full ingestion-to-publish loop, articles move from ready to published without human action, and the operator is alerted if the pipeline goes silent
**Depends on**: Phase 3
**Requirements**: PUB-01, PUB-02, PUB-03
**Success Criteria** (what must be TRUE):
  1. Without any manual trigger, new articles from OTS.at appear as published on the site within two polling cycles after ingest
  2. The cron schedule fires on the configured interval and its execution is logged with timestamps visible to the operator
  3. If the pipeline produces no new published articles for 6 hours, the operator receives a dead-man alert
  4. Items stuck in an error status are retried automatically on the next cycle without manual intervention
**Plans**: 4 plans

Plans:
- [ ] 04-01-PLAN.md — Schema migration + Wave 0 stubs: ERROR/FAILED enum values, retryCount/errorMessage on Article, publish.ts and dead-man.ts stubs with it.todo() tests
- [ ] 04-02-PLAN.md — Publish service + dead-man monitor (TDD): publishArticles() status flip, REVIEW backlog logging, checkDeadMan() silence alerting
- [ ] 04-03-PLAN.md — Pipeline retry extension (TDD): processArticles() picks up ERROR articles, MAX_RETRY_COUNT → FAILED, errorMessage recorded
- [x] 04-04-PLAN.md — Orchestration + scheduler config: ai-run.ts wiring dead-man→AI→publish, ecosystem.config.js PM2 config, CRONTAB.md

### Phase 5: Editorial CMS
**Goal**: Editors can manage the full content lifecycle — writing manual articles, curating automated content, configuring AI generation behaviour per source, reviewing flagged exceptions, and controlling source configuration — from a single authenticated interface designed for high-volume automated output
**Depends on**: Phase 4
**Requirements**: CMS-01, CMS-02, CMS-03, CMS-04, AICONF-01, AICONF-02, AICONF-03
**Success Criteria** (what must be TRUE):
  1. An authenticated editor can write, publish, pin, feature, edit, and soft-delete any article from the admin interface
  2. An editor can open the exception queue, read the flagged article alongside its source text, and approve or reject it in one action
  3. The article list is filterable by Bezirk, source, status, and time range — locating any article in a list of 200+ takes under 10 seconds
  4. An editor can add a new RSS source, configure its polling interval, and disable it again — all from the admin interface without touching code
  5. An editor can set global AI generation settings (tone, length, style) and override them per source — changes take effect on the next ingestion cycle without a code deploy
**Plans**: 8 plans

Plans:
- [ ] 05-01-PLAN.md — Schema migration + Wave 0 test stubs: isPinned/isFeatured/healthFailureThreshold fields, AiConfig/AiSourceConfig/PipelineConfig tables, cleanDb update, 4 test stub files
- [ ] 05-02-PLAN.md — Auth + middleware + login: HMAC session cookie (Node + Edge), Next.js middleware guard, login page + admin layout
- [ ] 05-03-PLAN.md — Articles + Exceptions Server Actions (TDD): createManualArticle, updateArticle, togglePin, toggleFeature, softDelete, approveArticle, rejectArticle
- [ ] 05-04-PLAN.md — Sources + AI Config + Pipeline Config Server Actions + DALs (TDD): createSource, updateSource, getAiConfig, getResolvedAiConfig, getPipelineConfig
- [ ] 05-05-PLAN.md — Pipeline integration: replace hardcoded constants with DB config reads in pipeline.ts, ingest.ts, dead-man.ts, step2-write.ts
- [ ] 05-06-PLAN.md — Admin UI: articles list page (filterable, inline actions) + manual article creation form + exception queue page
- [ ] 05-07-PLAN.md — Admin UI: sources health dashboard + add source form + AI config page (global + per-source overrides + pipeline config)
- [ ] 05-08-PLAN.md — Checkpoint: human verification of all five Phase 5 success criteria

### Phase 6: Reader Frontend
**Goal**: Steiermark residents can open the site, select their Bezirk(e), and read a personalized local news feed on any device — with full article detail pages, Google AdSense placements, per-Bezirk RSS feeds, SEO-complete article pages, and a legally compliant Impressum
**Depends on**: Phase 5
**Requirements**: READ-01, READ-02, READ-03, READ-04, READ-05, READ-06, AD-01, SEO-01, SEO-03, SEO-04
**Success Criteria** (what must be TRUE):
  1. A reader can tap "Mein Bezirk", select one or more Bezirke, and their preference persists across browser sessions without creating an account
  2. The homepage shows only articles tagged to the reader's selected Bezirk(e), ordered by recency
  3. Tapping an article opens a full detail page with source attribution, AI disclosure label (if applicable), publication timestamp, and a stable URL that does not break after re-generation
  4. The site is usable on a mobile phone without horizontal scroll, with the bottom navigation pattern from the existing design reference
  5. Each Bezirk has a working RSS feed URL that returns valid XML with current articles, and the Impressum page satisfies Austrian MedienG/ECG requirements
  6. Article pages include correct Open Graph meta tags, JSON-LD NewsArticle schema, and the site exposes a sitemap.xml updated on each publish
  7. Google AdSense ad units render in all configured placement zones (hero, between articles, article detail)
**Plans**: 7 plans

Plans:
- [ ] 06-01-PLAN.md — Schema migration + Wave 0 stubs: publicId on Article (nanoid), five test stub files for reader/slug, reader/rss, reader/metadata, reader/sitemap, articles.test.ts extensions
- [x] 06-02-PLAN.md — Reader DAL + slug utility (TDD): slugify() for German URLs, getArticleByPublicId(), listArticlesReader() with pinned/featured sort and multi-bezirk filter
- [ ] 06-03-PLAN.md — Public layout shell: root layout update (lang=de, AdSense script), (public) layout, Header, BottomNav, Footer, CookieBanner, AdUnit
- [ ] 06-04-PLAN.md — Homepage + Bezirk pages: ArticleCard, BezirkModal (localStorage selection), ArticleFeed (infinite scroll), /bezirk/[slug] page
- [ ] 06-05-PLAN.md — Article detail page (TDD metadata): generateMetadata OG tags, canonical redirect, JSON-LD NewsArticle, breadcrumb, social share, related articles, AdUnit
- [ ] 06-06-PLAN.md — RSS feeds + sitemap + Impressum (TDD): generateBezirkRssFeed(), /rss/[slug] route handler, app/sitemap.ts, /impressum page with MedienG/ECG/DSGVO/KI-disclosure
- [x] 06-07-PLAN.md — Checkpoint: human verification of all seven Phase 6 success criteria (completed 2026-03-23)

### Phase 7: Extensibility and Quality Validation
**Goal**: The platform's two most critical architectural properties are confirmed by evidence — the adapter pattern genuinely allows new sources without core changes, and deduplication provably blocks cross-source duplicates — before declaring the platform production-ready
**Depends on**: Phase 6
**Requirements**: ING-02 (extensibility proof via second RSS source), ING-03 (end-to-end dedup test)
**Success Criteria** (what must be TRUE):
  1. A second RSS source is added and ingesting content with zero changes to the Article model or core ingestion logic — only a new adapter file
  2. The same article arriving via both OTS.at and the RSS feed produces exactly one published article — confirmed by automated test
  3. All three operator alert types (source failure, LLM cost circuit-breaker, dead-man silence) fire correctly when their trigger conditions are simulated
  4. Article detail pages and Bezirk feed pages load within acceptable time under simulated load, with database query indexes verified
**Plans**: 2 plans

Plans:
- [ ] 07-01-PLAN.md — Validation foundation: ORF Steiermark RSS fixture, updated sources seed, seedBulkArticles() helper
- [ ] 07-02-PLAN.md — Validation test suite: src/test/validation.test.ts with all 4 success criteria as describe blocks

### Phase 8: Phase 7 Verification + Per-Source AI Config Wiring
**Goal**: The Phase 7 validation work is formally verified, and the per-source AI config override is fully wired into the pipeline so that an editor's per-source tone/style settings actually affect article generation
**Depends on**: Phase 7
**Requirements**: AICONF-02
**Gap Closure**: Closes AICONF-02, integration gap Phase 5→3 (per-source override), flow "Editor sets per-source AI tone → pipeline uses that tone", and Phase 07 verification absent blocker
**Success Criteria** (what must be TRUE):
  1. `07-VERIFICATION.md` exists and all success criteria from Phase 7 are documented as satisfied
  2. `Article` model has a `sourceId` FK backed by a Prisma migration that runs without error
  3. `runStep2Write()` calls `getResolvedAiConfig(db, sourceId)` — an article from a source with a per-source override is generated using that override's settings, confirmed by test
  4. All existing pipeline tests still pass

**Plans**: 3 plans

Plans:
- [ ] 08-01-PLAN.md — Schema + Wave 0 stub: Article.sourceId FK migration, prisma generate, step2-write-source-override.test.ts stubs
- [ ] 08-02-PLAN.md — Pipeline wiring (TDD): ingest.ts sets sourceId, runStep2Write gains sourceId param + calls getResolvedAiConfig, pipeline.ts passes sourceId
- [ ] 08-03-PLAN.md — Phase 7 verification doc: run npx vitest run, write 07-VERIFICATION.md with real evidence + Known Limitations

### Phase 10: Wire Config Site Name into UI
**Goal**: The Bundesland config file is the single source of truth for the site name — four hardcoded `"Ennstal Aktuell"` occurrences are replaced with `config.siteName` so that a new Bundesland deployment requires only a config change, not code changes
**Depends on**: Phase 9
**Requirements**: CONF-01, CONF-02, READ-06
**Gap Closure**: Closes CONF-01, CONF-02, READ-06, integration gap (bundesland.config → Header/layout/RSS/admin login), and flow "Deploy new Bundesland → all branding updates"
**Success Criteria** (what must be TRUE):
  1. `Header.tsx` renders `config.siteName` instead of the hardcoded string `"Ennstal Aktuell"`
  2. `app/layout.tsx` sets `metadata.title` from `config.siteName`
  3. `lib/reader/rss.ts` uses `config.siteName` as the RSS feed title
  4. `app/admin/login/page.tsx` uses `config.siteName + " Admin"` as the page heading
  5. Changing `siteName` in `bundesland.config.ts` propagates to all four locations without any other code change

**Plans**: 1 plan

Plans:
- [ ] 10-01-PLAN.md — Wire config.siteName into Header, layout metadata, RSS feed title, and admin login heading

### Phase 9: Ad Config Wiring + Auth Hardening
**Goal**: Ad placements are driven by the Bundesland config file as the requirement specifies, the `features.ads` flag actually gates ad rendering, and the Server Action auth gap is closed so that direct POST requests cannot bypass the session check
**Depends on**: Phase 8
**Requirements**: AD-02
**Gap Closure**: Closes AD-02, integration gap Phase 1→6 (adZones.envVar → AdUnit), flow "Deploy new Bundesland → ads use correct slots", and requireAuth() tech debt
**Success Criteria** (what must be TRUE):
  1. `AdUnit.tsx` resolves the ad slot by looking up `config.adZones.find(z => z.id === zone)?.envVar` from `bundesland.config` — hardcoded env var names removed
  2. Setting `features.ads: false` in `bundesland.config.ts` causes no ad units to render (confirmed by test or visual check)
  3. All 7 Server Action wrappers have `requireAuth()` restored and active — a request without a valid session cookie returns a 401/redirect
  4. Impressum publisher details are populated from `bundesland.config.ts` impressum fields, not placeholder text

**Plans**: 3 plans

Plans:
- [ ] 09-01-PLAN.md — AdUnit Server wrapper: Wave 0 test stubs + refactor AdUnit.tsx (Server wrapper) + AdUnitClient.tsx (client impl)
- [ ] 09-02-PLAN.md — Auth hardening: requireAuth() in auth-node.ts + wire into all admin Server Action wrappers
- [ ] 09-03-PLAN.md — Impressum + JSON-LD wiring: wire config.branding.impressum fields into impressum/page.tsx and article detail JSON-LD

### Phase 11: Fix State-Wide Article Pipeline
**Goal:** State-wide articles are correctly identified by the AI pipeline and appear in all per-Bezirk feeds and RSS feeds — closing the broken `isStateWide` mapping that leaves all state-wide content invisible to readers
**Depends on**: Phase 10
**Requirements**: AI-02, READ-06
**Gap Closure**: Closes AI-02, READ-06, integration gap (pipeline.ts 'steiermark-weit' → isStateWide=true), and flow "State-wide article → AI tags 'steiermark-weit' → appears in all Bezirk feeds"
**Success Criteria** (what must be TRUE):
  1. When step1-tag.ts returns `bezirkSlugs=['steiermark-weit']`, `pipeline.ts` sets `Article.isStateWide=true` in the database
  2. A state-wide article appears in the feed and RSS output for every Bezirk
  3. Existing per-Bezirk tagging (non-state-wide articles) is unaffected

**Plans**: 2 plans

Plans:
- [ ] 11-01-PLAN.md — Pipeline fix + reader feed fix + prompt tightening (TDD): steiermark-weit detection in pipeline.ts, isStateWide OR clause in listArticlesReader, exclusivity rule in step1 prompt
- [ ] 11-02-PLAN.md — Backfill script: src/scripts/backfill-state-wide.ts CLI to repair existing affected articles

### Phase 12: Config-Driven Region List + RSS Feature Flag
**Goal:** The Bundesland config file is the single source of truth for the region list — BezirkModal and Header load Bezirke from the database rather than hardcoded arrays, and the `features.rss` flag is enforced by the RSS route handler
**Depends on**: Phase 11
**Requirements**: CONF-01
**Gap Closure**: Closes CONF-01, integration gap (BezirkModal/Header not sourced from config/DB), integration gap (features.rss not enforced), and flow "Deploy new Bundesland → change bundesland.config.ts → all UI updates"
**Success Criteria** (what must be TRUE):
  1. `BezirkModal.tsx` loads its region list from a server-provided prop (DB query) — no hardcoded array
  2. `Header.tsx` loads its region list from a server-provided prop (DB query) — no hardcoded array
  3. Setting `config.features.rss: false` causes all `/rss/[slug]` routes to return 404
  4. Adding a new Bundesland with a different region set requires only `bundesland.config.ts` + seed changes — no UI file edits

**Plans**: 4 plans

Plans:
- [ ] 12-01-PLAN.md — Type contract + config: BezirkItem interface, regions field on BundeslandConfig, regions array in bundesland.config.ts
- [ ] 12-02-PLAN.md — Seed refactor (TDD): seedBezirke reads config.regions, remove steiermarkBezirke import, update seed tests
- [ ] 12-03-PLAN.md — UI wiring: (public)/layout.tsx async + listBezirke(), Header bezirke prop, BezirkModal bezirke prop
- [ ] 12-04-PLAN.md — RSS feature flag: route.test.ts (Wave 0), config.features.rss guard in rss/[slug]/route.ts

### Phase 13: Production Readiness — Impressum + CMS Error Count
**Goal**: The Impressum page satisfies Austrian MedienG/ECG requirements with real publisher data from bundesland.config.ts, and the admin sources dashboard shows accurate article error counts per source
**Depends on**: Phase 12
**Requirements**: READ-05, CMS-04
**Gap Closure**: Closes impressum placeholder tech debt (4 literal placeholders), closes CMS-04 integration gap (error count approximate by source.type → exact by source.id)
**Success Criteria** (what must be TRUE):
  1. `impressum/page.tsx` reads `config.branding.impressum` fields — no `[TELEFON]`, `[UNTERNEHMENSGEGENSTAND]`, `[BLATTLINIE]`, or `[DATENSCHUTZ_EMAIL]` placeholders remain
  2. `listSourcesAdmin()` counts article errors by `source.id` (not `source.type`) — accurate when multiple sources of the same type exist
  3. All existing tests pass after changes

**Plans**: 1 plan

Plans:
- [ ] 13-01-PLAN.md — Impressum wiring from bundesland.config.ts + listSourcesAdmin error count fix

### Phase 14: Phase 5 Human Acceptance Gate
**Goal**: The 7 deferred CMS verification flows are formally confirmed against a running application, completing the Phase 5 editorial CMS acceptance that could not be machine-verified
**Depends on**: Phase 13
**Requirements**: CMS-01, CMS-02, CMS-03, CMS-04, AICONF-01, AICONF-02, AICONF-03
**Gap Closure**: Closes Phase 5 `human_needed` verification status — signs off 05-VERIFICATION.md
**Success Criteria** (what must be TRUE):
  1. Authentication gate: `/admin/articles` redirects to login without session; login with correct password sets session and redirects back
  2. Article list filter: locating any article in 200+ records with Bezirk/source/status filter takes under 10 seconds
  3. Manual article creation: form submit creates Article with `source=MANUAL, status=PUBLISHED, isAutoGenerated=false`, visible in list immediately
  4. Exception queue: Genehmigen sets PUBLISHED, Ablehnen sets REJECTED, both remove article from queue
  5. Source management: add RSS source creates Source row with `healthStatus=OK`; disable sets `enabled=false`
  6. AI Config: changing tone to Formell persists in DB; next pipeline run uses updated prompt
  7. Per-source AI override: creating override creates AiSourceConfig row; removing it deletes it and source reverts to global defaults

**Plans**: 1 plan

Plans:
- [ ] 14-01-PLAN.md — Human acceptance testing checklist and 05-VERIFICATION.md sign-off

### Phase 15: Tech Debt Cleanup — PUBLISHED Filter + Auth UX
**Goal**: Close the brittle getArticlesByBezirk() integration gap with a proper PUBLISHED filter, fix the misleading ADMIN_PASSWORD lockout error, and remove orphaned code identified by the v1.0 milestone audit
**Depends on**: Phase 14
**Requirements**: READ-06
**Gap Closure**: Closes integration gap (getArticlesByBezirk missing PUBLISHED filter), tech debt from audit (ADMIN_PASSWORD silent lockout, orphaned LogoutButton.tsx, stale requireAuth comment, orphaned updateSourceHealth export)
**Success Criteria** (what must be TRUE):
  1. `getArticlesByBezirk()` includes `status: 'PUBLISHED'` in its WHERE clause — RSS route JS post-filter workaround removed
  2. Missing `ADMIN_PASSWORD` env var returns a clear configuration error, not a misleading "wrong password" message
  3. `LogoutButton.tsx` is either wired into the admin layout or deleted
  4. Stale `requireAuth() is a placeholder` comment removed from articles-actions.ts
  5. Orphaned `updateSourceHealth()` export removed from sources.ts

**Plans**: 1 plan

Plans:
- [ ] 15-01-PLAN.md — PUBLISHED filter fix, ADMIN_PASSWORD error clarity, orphaned code removal

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete    | 2026-03-21 |
| 2. Ingestion | 7/7 | Complete   | 2026-03-21 |
| 3. AI Pipeline | 5/5 | Complete   | 2026-03-22 |
| 4. Scheduler and Autonomous Publishing | 4/4 | Complete   | 2026-03-22 |
| 5. Editorial CMS | 7/8 | Complete    | 2026-03-22 |
| 6. Reader Frontend | 7/7 | Complete   | 2026-03-23 |
| 7. Extensibility and Quality Validation | 0/2 | Not started | - |
| 8. Phase 7 Verification + Per-Source AI Config Wiring | 3/3 | Complete   | 2026-03-23 |
| 9. Ad Config Wiring + Auth Hardening | 3/3 | Complete    | 2026-03-24 |
| 10. Wire Config Site Name into UI | 1/1 | Complete    | 2026-03-24 |
| 11. Fix State-Wide Article Pipeline | 2/2 | Complete    | 2026-03-25 |
| 12. Config-Driven Region List + RSS Feature Flag | 4/4 | Complete    | 2026-03-25 |
| 13. Production Readiness — Impressum + CMS Error Count | 1/1 | Complete    | 2026-03-25 |
| 14. Phase 5 Human Acceptance Gate | 1/1 | Complete    | 2026-03-25 |
| 15. Tech Debt Cleanup | 1/1 | Complete   | 2026-03-25 |
