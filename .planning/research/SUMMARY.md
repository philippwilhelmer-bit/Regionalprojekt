# Project Research Summary

**Project:** Regionalprojekt (Ennstal Aktuell)
**Domain:** AI-powered regional/hyperlocal news aggregation and publishing platform (Steiermark, Austria)
**Researched:** 2026-03-21
**Confidence:** MEDIUM

## Executive Summary

This is an autonomous AI news publishing platform that ingests press wire and RSS content, generates German-language articles with regional Bezirk context using LLMs, and publishes without requiring human intervention. The recommended approach is a Next.js 15 monorepo with PostgreSQL, a plug-in source adapter architecture, a staged pipeline with database-backed status flags, and GPT-4o for article generation — deployed to Vercel for managed scheduling and ISR caching. The platform must cover all 13 Steiermark Bezirke from day one, using a many-to-many article-to-Bezirk junction table as the foundational data model.

The core engineering challenge is not the frontend or the AI integration in isolation, but the pipeline: ingestion → deduplication → Bezirk geo-tagging → LLM generation → auto-publish must run reliably, unattended, and at low cost. All research converges on building this pipeline first — before any CMS UI or reader frontend — because every other component depends on it. The adapter pattern for sources must be enforced from the first line of ingestion code; retrofitting it after an OTS-specific implementation is one of the highest-cost mistakes identified.

The two most dangerous risks are (1) auto-publishing hallucinated or factually wrong content that names real persons, and (2) AI generation cost explosion during burst regional events. Both require hard controls built into the pipeline itself — a named-person exception queue and a daily LLM cost circuit-breaker are not optional enhancements. Austrian media law (MedienG/ECG) also mandates AI disclosure labeling and a legal Impressum at launch, making these hard requirements on day one.

## Key Findings

### Recommended Stack

The stack is built around Next.js 15 (App Router, ISR) with TypeScript 5, PostgreSQL 16 via Prisma 5, and the OpenAI SDK 4 (GPT-4o/GPT-4o-mini). The existing frontend design is Tailwind CSS v3.4 — this is a constraint, not a choice; Tailwind v4 must not be adopted. For deployment, Vercel is recommended: Vercel Cron replaces node-cron, `@vercel/postgres` handles connection pooling, and ISR integrates natively with CDN edge caching.

Supporting libraries are well-established: `rss-parser` for RSS ingestion, `zod` for schema validation at every external boundary, `date-fns` v3 with German locale, `slugify` for umlaut-aware URL slugs, `cheerio` for HTML sanitization, and `next-auth` v5 (beta, the only Auth.js version compatible with Next.js 15 App Router). OTS.at has no public SDK — a custom `axios`-based adapter is required, and API authentication details must be verified directly with APA-OTS before integration work begins (LOW confidence on OTS specifics).

**Core technologies:**
- Next.js 15: Full-stack framework — ISR fits news publishing; App Router enables server-side data fetching co-located with UI
- TypeScript 5: Type safety — prevents schema drift across ingestion, AI, and rendering layers
- PostgreSQL 16: Primary database — JSONB for variable AI metadata, `tsvector` for German full-text search, relational joins for Bezirk associations
- Prisma 5: ORM — type-safe client generated from schema, version-controlled migrations enforced at build time
- OpenAI SDK 4 (GPT-4o / GPT-4o-mini): AI generation — GPT-4o for full articles, GPT-4o-mini for Bezirk classification and tagging (cost optimization)
- Tailwind CSS 3.4: Styling — pre-existing design constraint; v4 must be avoided
- Zod 3: Validation — guards every external data boundary before it reaches the database

### Expected Features

The Bezirk data model is foundational: all Steiermark Bezirke (13 total, with a canonical Bezirk-Gemeinde synonym lookup table) must be defined before ingestion is active. The primary reader experience is a Bezirk-filtered article feed — not a global feed with filters — persisted in localStorage without requiring a reader account. AI-generation disclosure ("Automatisch erstellt") and a legal Impressum are hard launch requirements under Austrian media law.

**Must have (v1 table stakes):**
- Content ingestion pipeline with OTS.at adapter — nothing publishes without this
- AI article generation with Bezirk context injection — the core value proposition
- Bezirk data model and canonical Gemeinde synonym lookup — foundational for all geo features
- AI disclosure label per article — required under Austrian MedienG/ECG
- "Mein Bezirk" region selector persisted in localStorage — no reader accounts
- Bezirk-filtered article feed as primary homepage view
- Article detail page with stable slugged URLs and OG tags
- Source attribution per article — trust signal, legal requirement
- Article timestamps (relative + absolute)
- Mobile-optimized layout with bottom nav (existing design reference)
- Editor admin interface with Bezirk/source/status filters and an exceptions queue
- Auto-publish pipeline (no draft queue; platform is fully autonomous)
- RSS feed per Bezirk

**Should have (competitive differentiators):**
- Fully autonomous pipeline with circuit-breaker monitoring (named-person exception queue, API quota alerts, 6-hour silence alerts)
- Content deduplication using content fingerprinting at ingest time (before AI generation)
- Pluggable source adapter architecture with a second RSS source added to verify extensibility
- Contextual multi-Bezirk tagging (rule-based lookup first, LLM fallback)
- LLM cost controls — daily budget cap with automatic fallback to source excerpt publishing

**Defer (v2+):**
- PWA installability ("Add to Home Screen")
- Per-article AI-generated OG images
- Editor analytics dashboard
- Full-text search (add when corpus exceeds ~500 articles)
- Additional source adapters beyond OTS.at and one RSS feed
- Automated publishing cadence / time-spread queue

### Architecture Approach

The system has four layers: Ingestion (source adapters → deduplication → ingestion queue), AI Processing (Bezirk tagger → article writer → structured output validation), Content Store (PostgreSQL with article-to-Bezirk junction table, source raw cache), and Delivery (reader frontend with ISR, editorial CMS admin, scheduler). The critical architectural decision is that all inter-layer communication happens through database status flags (`fetched → deduped → tagged → written → published`), not direct function calls. This allows async AI processing, retry logic, and monitoring without a separate queue infrastructure at launch scale.

**Major components:**
1. Source Adapter Registry — plug-in interface; OTS adapter plus at least one RSS adapter to prove extensibility before architecture is declared done
2. Ingestion Queue with deduplication — database-backed status flags; content fingerprinting to block duplicates before AI processing
3. AI Pipeline — Bezirk tagger (rule-based lookup + LLM fallback) then article writer (GPT-4o, structured JSON output, validated by Zod)
4. Content Data Access Layer — single `content/` module shared by pipeline, CMS, and reader frontend; no raw SQL outside this layer
5. Editorial CMS — authenticated admin routes; filters by Bezirk/source/status/time; exceptions queue for flagged articles
6. Reader Frontend — Next.js ISR; Bezirk-filtered queries using `article_bezirke` junction table; paginated and indexed on `(bezirk_id, published_at DESC)`
7. Scheduler — thin trigger layer only; Vercel Cron on Vercel deployment

**Build order (strict dependency chain):**
DB schema + Bezirk reference data → Content data access layer → Source adapter interface + OTS adapter → Ingestion queue + deduplication → AI pipeline → Scheduler → Editorial CMS → Reader frontend

### Critical Pitfalls

1. **Auto-publishing hallucinated content about real persons** — Implement a named-person flag in the AI pipeline that routes articles to an exceptions queue rather than auto-publishing; instruct the model to quote the source for all factual claims; log full source text alongside every generated article for audit.

2. **Duplicate article flooding** — Build content fingerprinting (simhash or MinHash on normalized source text) at ingestion time before any AI processing; mark OTS.at as canonical and check OTS IDs against the registry before processing any RSS source that may syndicate OTS; never treat deduplication as a post-publish cleanup step.

3. **Bezirk attribution failures (wrong or missing geo-tagging)** — Build the canonical Bezirk-Gemeinde synonym lookup table before ingestion is active; use deterministic rule-based matching first, LLM extraction only as fallback; tag to "Steiermark" catch-all when confidence is below threshold rather than silently dropping.

4. **AI generation cost explosion during burst events** — Implement a hard daily/hourly LLM call budget with automatic circuit-breaker that falls back to publishing source excerpts; use GPT-4o-mini for classification and GPT-4o only for full article generation; model costs at average/event/crisis scenarios before launch.

5. **Source schema lock-in blocking extensibility** — Use source-agnostic canonical article fields (`source_id`, `external_id`, `raw_payload` JSONB) from day one; enforce the adapter pattern as the only path to article creation; validate the architecture is correct by implementing a second source before declaring it done.

## Implications for Roadmap

Based on the dependency chain from ARCHITECTURE.md and the pitfall prevention requirements from PITFALLS.md, the recommended phase structure has seven phases:

### Phase 1: Foundation — DB Schema, Bezirk Data Model, Content Layer

**Rationale:** Every other component depends on the article schema, Bezirk junction table, and canonical Gemeinde lookup. This must be locked before any ingestion or AI work begins. Schema changes later are expensive.
**Delivers:** PostgreSQL schema with migrations, Bezirk reference fixture (13 Bezirke + Gemeinden + synonyms), content data access layer (`content/articles.ts`, `content/bezirke.ts`), source registry table
**Addresses:** FEATURES — Bezirk data model, multi-Bezirk coverage from day one
**Avoids:** PITFALLS — Bezirk attribution errors (lookup table built first), source schema lock-in (source-agnostic canonical fields from day one), single-Bezirk-column anti-pattern

### Phase 2: Source Ingestion Pipeline with OTS.at Adapter

**Rationale:** Content ingestion is the gate for everything downstream. The adapter pattern must be established here, with OTS.at as the first implementation, before AI processing is wired in. Deduplication must also be built here — never after AI is enabled.
**Delivers:** Source adapter interface, OTS.at adapter (axios-based, custom), RSS generic adapter, content fingerprinting deduplication, ingestion queue with database status flags, feed health monitoring and circuit-breaker for API quota/rate limits
**Uses:** STACK — axios, rss-parser, zod (validation at ingest boundary), cheerio (HTML sanitization of RSS bodies)
**Implements:** ARCHITECTURE — Ingestion Layer, Source Adapter Registry, Ingestion Queue, Source Raw Cache
**Avoids:** PITFALLS — duplicate flooding (fingerprinting before AI), source schema lock-in (adapter interface enforced), silent quota failure (circuit-breaker + admin visibility)
**Research flag:** OTS.at API authentication, quota limits, and response format must be verified with APA-OTS before this phase begins (LOW confidence in current research).

### Phase 3: AI Processing Pipeline

**Rationale:** AI pipeline can now be built on top of the proven ingestion queue. Cost controls, structured output validation, and the named-person exception flag are required features of this phase — not post-launch additions.
**Delivers:** Bezirk tagger (rule-based + LLM fallback), article writer (GPT-4o with structured JSON output, Zod-validated), named-person exception queue, AI generation disclosure flag on articles, daily LLM cost budget with circuit-breaker fallback, prompt templates (versioned), async pipeline (never blocks web requests)
**Uses:** STACK — openai@4 (GPT-4o for generation, GPT-4o-mini for classification), zod (output validation), date-fns (German timestamps)
**Implements:** ARCHITECTURE — AI Processing Layer (tagger → writer → pipeline orchestrator)
**Avoids:** PITFALLS — hallucinated content (exception queue + structured output), cost explosion (hard cap + circuit-breaker), sync blocking (background worker only)

### Phase 4: Scheduler and Autonomous Publishing

**Rationale:** Once ingestion and AI pipeline are individually functional, the scheduler wires them into a fully autonomous loop. Auto-publish must ship with monitoring — a 6-hour silence alert is a launch requirement, not a nice-to-have.
**Delivers:** Scheduler (Vercel Cron or node-cron), automated ingestion → AI → publish loop, pipeline retry logic for stuck/error status items, 6-hour silence alert, publishing pipeline status visible in admin
**Uses:** STACK — Vercel Cron (recommended), node-cron (self-hosted fallback)
**Implements:** ARCHITECTURE — Scheduler component, full automation flow
**Avoids:** PITFALLS — silent ingestion outage (dead-man monitoring ships with automation), no monitoring added later

### Phase 5: Editorial CMS

**Rationale:** The platform must be manageable at high automation volume. The CMS must be designed for the scenario where 200+ articles/day are published, not for occasional manual publishing. Filters and exceptions queue are required features, not refinements.
**Delivers:** Authenticated admin interface (next-auth v5), article CRUD (pin, feature, edit, remove/soft-delete), Bezirk/source/status/time-range filters, exceptions queue inbox for flagged articles, feed health status panel (API quota, last successful ingest timestamps), bulk actions
**Uses:** STACK — next-auth@5 (beta), Next.js App Router admin route group
**Implements:** ARCHITECTURE — Editorial CMS component
**Avoids:** PITFALLS — CMS unusable at high volume (filters + exceptions queue built as primary use case)

### Phase 6: Reader Frontend

**Rationale:** The public-facing site can be built independently once the content layer is working. ISR must be configured correctly from the start — short revalidation TTLs for Bezirk feed pages.
**Delivers:** "Mein Bezirk" selector (localStorage, no account), Bezirk-filtered article feed as homepage, article detail pages with stable slugged URLs, OG tags for social sharing, relative+absolute timestamps, source attribution and AI disclosure label, mobile-optimized layout (bottom nav, existing design), RSS feed per Bezirk, Impressum/legal notice (Austrian law requirement)
**Uses:** STACK — Next.js 15 ISR, Tailwind CSS 3.4, date-fns with de locale, slugify
**Implements:** ARCHITECTURE — Reader Frontend, ISR/revalidation pattern, Bezirk junction table queries with correct indexes
**Avoids:** PITFALLS — UX pitfalls (empty Bezirk feed fallback, sentence-aware truncation, 404 handling for stale URLs)

### Phase 7: Quality, Extensibility Validation, and Monitoring

**Rationale:** Before declaring the platform production-ready, two correctness checks are required by the architecture research: (1) deduplication must be verified end-to-end with cross-source syndication, (2) source extensibility must be proven by adding a second RSS source without touching the Article model. Monitoring must be end-to-end testable.
**Delivers:** Second RSS source adapter (proves extensibility without core changes), end-to-end deduplication test (same article via OTS + RSS → one publish), verified feed health monitoring with tested alerts, performance index verification, load scenario cost modeling
**Implements:** ARCHITECTURE — Source extensibility validation, performance indexes
**Avoids:** PITFALLS — source schema lock-in (validated), duplicate flooding (end-to-end test), silent outage (alert chain tested)

### Phase Ordering Rationale

- Phases 1-3 follow the strict dependency chain from ARCHITECTURE.md: schema before data layer, data layer before adapters, adapters before AI pipeline.
- Deduplication is placed in Phase 2 (ingestion) rather than Phase 3 (AI) specifically to prevent wasting LLM API cost on duplicate content — a direct lesson from PITFALLS.md.
- The scheduler (Phase 4) is wired after both ingestion and AI pipeline are individually stable, so that the automated loop inherits working components rather than being used to test them.
- CMS (Phase 5) and reader frontend (Phase 6) are independent of each other and share only the content data access layer; they could be built in parallel if resources allow.
- Phase 7 is positioned last because it validates architecture decisions made in Phases 2-3 and should be done before announcing production availability, not after.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (OTS.at integration):** OTS.at API authentication mechanism, rate limits, quota tiers, and response format have LOW confidence in current research. Must verify with APA-OTS developer documentation before writing the adapter. Also verify whether OTS provides ETag/If-Modified-Since support for efficient polling.
- **Phase 3 (AI content generation):** Prompt engineering for German-language regional news generation and the named-person NER approach need validation. The recommended strategy (structured JSON output + Zod validation) is well-established, but the specific prompts require iteration with real OTS content samples.
- **Phase 6 (Austrian legal requirements):** The specific provisions of MedienG and ECG for AI disclosure and Impressum requirements should be reviewed with current sources; the research identifies the requirement but not the exact implementation form.

Phases with standard patterns (can skip or minimize research-phase):
- **Phase 1 (DB schema + Bezirk data model):** Standard PostgreSQL/Prisma patterns; Steiermark Bezirke list is verifiable from Statistik Austria.
- **Phase 4 (Scheduler/automation):** Vercel Cron and node-cron are well-documented; standard status-flag queue pattern.
- **Phase 5 (CMS):** Standard Next.js App Router admin pattern with next-auth; well-documented.
- **Phase 6 (Reader frontend):** Standard Next.js ISR frontend; existing design reference is already established.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Next.js 15 verified via official release notes (HIGH). All other library versions from training knowledge (MEDIUM). OTS.at SDK/API details unverified (LOW). next-auth v5 is beta — verify stability before adopting. |
| Features | MEDIUM | Feature set well-grounded in hyperlocal news domain patterns. Austrian regulatory requirements (MedienG, ECG) known to exist; exact provisions need verification. Competitor analysis has LOW confidence — no direct Austrian AI news competitors identified. |
| Architecture | MEDIUM | Patterns (adapter registry, status-flag pipeline, junction table, ISR) are well-established and domain-appropriate. Specific library API details should be re-verified during implementation phases. |
| Pitfalls | MEDIUM | Pitfall patterns (deduplication, hallucination, cost explosion) drawn from documented AI journalism post-mortems through mid-2025. OTS.at-specific behaviors (quota limits, token expiry) unverified. |

**Overall confidence:** MEDIUM

### Gaps to Address

- **OTS.at API specifics:** Authentication mechanism, rate limits, quota tiers, response format (XML vs JSON), available metadata fields. Must verify with APA-OTS developer documentation before Phase 2 begins. Block the phase if this is not resolved.
- **Steiermark Bezirk count and canonical identifiers:** Research used "13 Bezirke" but the Statistik Austria official count should be verified (the number and boundaries may differ from informal usage). This affects the foundational Phase 1 fixture.
- **next-auth v5 beta stability:** Auth.js v5 is the only version compatible with Next.js 15 App Router Server Actions. Monitor for stable release; pin an exact beta version and avoid automatic upgrades until stable.
- **Austrian media law compliance specifics:** The requirement for AI disclosure labeling and Impressum is confirmed, but the exact form (label text, placement, required metadata in Impressum for automated content) needs legal review or current regulatory guidance before launch.
- **Tailwind v4 status:** As of August 2025, Tailwind v4 was in RC. Verify current release status — if v4 is now stable, evaluate migration cost vs benefit before starting Phase 6.

## Sources

### Primary (HIGH confidence)
- `https://nextjs.org/blog/next-15` — Next.js 15 release notes: version confirmed stable, React 19 requirement, minimum Node.js 18.18.0, ISR and App Router features

### Secondary (MEDIUM confidence)
- Training knowledge (through August 2025): OpenAI SDK v4, Prisma v5, rss-parser v3, date-fns v3, next-auth v5, zod v3, Tailwind CSS v3.4
- Training knowledge: AP Automated Insights, Axios Local, hyperlocal news industry platform patterns
- Training knowledge: AI content pipeline failure patterns and post-mortems from automated journalism projects (2023-2025)
- Training knowledge: Steiermark Bezirk/Gemeinde administrative structure
- Training knowledge: PostgreSQL full-text search, JSONB patterns, ISR architecture for news sites

### Tertiary (LOW confidence)
- OTS.at (Austria Presseagentur press wire) API — no external verification possible; authentication, quotas, and response format must be confirmed directly with APA-OTS
- Austrian competitor landscape for AI regional news — no direct competitors identified; cannot confirm market whitespace claim without current market research
- Austrian MedienG/ECG specific provisions for AI disclosure — requirement known, exact implementation form needs legal verification

---
*Research completed: 2026-03-21*
*Ready for roadmap: yes*
