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
- [ ] **Phase 5: Editorial CMS** - Authenticated admin interface, article CRUD, exception queue inbox, and source management
- [ ] **Phase 6: Reader Frontend** - "Mein Bezirk" selector, Bezirk-filtered feed, article detail pages, RSS feeds per Bezirk, and Impressum
- [ ] **Phase 7: Extensibility and Quality Validation** - Second RSS adapter, end-to-end deduplication test, alert chain verification

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
**Plans**: TBD

Plans:
- [ ] 06-01: TBD

### Phase 7: Extensibility and Quality Validation
**Goal**: The platform's two most critical architectural properties are confirmed by evidence — the adapter pattern genuinely allows new sources without core changes, and deduplication provably blocks cross-source duplicates — before declaring the platform production-ready
**Depends on**: Phase 6
**Requirements**: ING-02 (extensibility proof via second RSS source), ING-03 (end-to-end dedup test)
**Success Criteria** (what must be TRUE):
  1. A second RSS source is added and ingesting content with zero changes to the Article model or core ingestion logic — only a new adapter file
  2. The same article arriving via both OTS.at and the RSS feed produces exactly one published article — confirmed by automated test
  3. All three operator alert types (source failure, LLM cost circuit-breaker, dead-man silence) fire correctly when their trigger conditions are simulated
  4. Article detail pages and Bezirk feed pages load within acceptable time under simulated load, with database query indexes verified
**Plans**: TBD

Plans:
- [ ] 07-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete    | 2026-03-21 |
| 2. Ingestion | 7/7 | Complete   | 2026-03-21 |
| 3. AI Pipeline | 5/5 | Complete   | 2026-03-22 |
| 4. Scheduler and Autonomous Publishing | 4/4 | Complete   | 2026-03-22 |
| 5. Editorial CMS | 3/8 | In Progress|  |
| 6. Reader Frontend | 0/? | Not started | - |
| 7. Extensibility and Quality Validation | 0/? | Not started | - |
