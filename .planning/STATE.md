---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: completed
stopped_at: Completed 11-fix-state-wide-article-pipeline 11-02-PLAN.md
last_updated: "2026-03-25T11:09:11.006Z"
last_activity: "2026-03-22 — Phase 6 Plan 03 executed: public layout shell, Header, BottomNav, Footer, CookieBanner, AdUnit — next build success"
progress:
  total_phases: 12
  completed_phases: 11
  total_plans: 45
  completed_plans: 45
  percent: 88
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-21)

**Core value:** Steiermark residents get relevant, hyperlocal news for their Bezirk — automatically, without an editorial team needed to run it.
**Current focus:** Phase 5 — Editorial CMS (in progress)

## Current Position

Phase: 6 of 7 (Reader Frontend)
Plan: 3 of 7 in current phase (in progress)
Status: Phase 6 Plan 03 complete — public layout shell delivered
Last activity: 2026-03-22 — Phase 6 Plan 03 executed: public layout shell, Header, BottomNav, Footer, CookieBanner, AdUnit — next build success

Progress: [████████░░] 88%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: none yet
- Trend: -

*Updated after each plan completion*
| Phase 01-foundation P01 | 9 | 2 tasks | 12 files |
| Phase 01-foundation P02 | 5 | 2 tasks | 3 files |
| Phase 01-foundation P03 | 4 | 2 tasks | 7 files |
| Phase 02-ingestion P01 | 3 | 2 tasks | 11 files |
| Phase 02-ingestion P02 | 7 | 2 tasks | 4 files |
| Phase 02-ingestion P04 | 2 | 2 tasks | 4 files |
| Phase 02-ingestion P05 | 15 | 2 tasks | 6 files |
| Phase 02-ingestion P06 | 3 | 2 tasks | 4 files |
| Phase 02-ingestion P07 | 5 | 2 tasks | 6 files |
| Phase 03-ai-pipeline P04 | 8 | 2 tasks | 2 files |
| Phase 03-ai-pipeline P03 | 4 | 2 tasks | 7 files |
| Phase 03-ai-pipeline P02 | 3 | 2 tasks | 2 files |
| Phase 03-ai-pipeline P01 | 5 | 2 tasks | 8 files |
| Phase 03-ai-pipeline P05 | 6 | 2 tasks | 3 files |
| Phase 04-scheduler-and-autonomous-publishing P01 | 7 | 2 tasks | 6 files |
| Phase 04-scheduler-and-autonomous-publishing P02 | 3 | 4 tasks | 4 files |
| Phase 04-scheduler-and-autonomous-publishing P03 | 4 | 2 tasks | 2 files |
| Phase 04-scheduler-and-autonomous-publishing P04 | 4 | 2 tasks | 3 files |
| Phase 05-editorial-cms P01 | 15 | 2 tasks | 7 files |
| Phase 05-editorial-cms P02 | 25 | 2 tasks | 14 files |
| Phase 05-editorial-cms P03 | 8 | 2 tasks | 4 files |
| Phase 05-editorial-cms P04 | 20 | 2 tasks | 7 files |
| Phase 05-editorial-cms P05 | 5 | 2 tasks | 5 files |
| Phase 05-editorial-cms P06 | 20 | 2 tasks | 8 files |
| Phase 05-editorial-cms P07 | 5 | 2 tasks | 9 files |
| Phase 06-reader-frontend P01 | 4 | 2 tasks | 7 files |
| Phase 06-reader-frontend P05 | 3 | 2 tasks | 4 files |
| Phase 06-reader-frontend P04 | 4 | 2 tasks | 6 files |
| Phase 06-reader-frontend P06 | 10 | 2 tasks | 7 files |
| Phase 06-reader-frontend P07 | 10 | 1 tasks | 0 files |
| Phase 06-reader-frontend P07 | 15 | 2 tasks | 5 files |
| Phase 08-per-source-ai-config-wiring P01 | 8 | 2 tasks | 3 files |
| Phase 08-per-source-ai-config-wiring P03 | 4 | 1 tasks | 1 files |
| Phase 08-per-source-ai-config-wiring P02 | 15 | 2 tasks | 5 files |
| Phase 09-ad-config-wiring-auth-hardening P03 | 1min | 1 tasks | 2 files |
| Phase 09-ad-config-wiring-auth-hardening P01 | 10 | 1 tasks | 3 files |
| Phase 09-ad-config-wiring-auth-hardening P02 | multi-session | 2 tasks | 7 files |
| Phase 10-config-branding-wiring P01 | 4 | 2 tasks | 5 files |
| Phase 11-fix-state-wide-article-pipeline P01 | 12min | 3 tasks | 6 files |
| Phase 11-fix-state-wide-article-pipeline P02 | 3 | 1 tasks | 1 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Pre-planning]: Auto-publish by default — platform runs without human bottleneck
- [Pre-planning]: All 13 Steiermark Bezirke at launch — multi-region by design from day one
- [Pre-planning]: OTS.at as first API source — major Austrian press wire
- [Phase 01-01]: Used pglite-prisma-adapter@0.6.1 (not 0.7.x) — v0.7.x requires @prisma/client >= 7.1.0, conflicts with Prisma v6
- [Phase 01-01]: Explicit ArticleBezirk junction model (not Prisma implicit M2M) — enables taggedAt/taggedBy metadata in Phase 3 without destructive migration
- [Phase 01-01]: Migration SQL applied directly to pgLite in tests — no running Postgres server needed for test environment
- [Phase 01-02]: Used satisfies BundeslandConfig operator (not as) — enforces type checking without widening the type
- [Phase 01-02]: AdZone.id as string literal union — invalid zone names caught at build time (not runtime)
- [Phase 01-02]: bundesland.config.ts committed to git with env var name strings only — actual AdSense unit IDs stay in .env
- [Phase 01-foundation]: Seed exports seedBezirke(prisma, bundesland) for testability — main() only runs when file is executed directly via import.meta.url guard
- [Phase 01-foundation]: DAL functions use TypeScript overloads for DI: zero-arg for production (singleton), client-injection for tests
- [Phase 01-foundation]: Duck-typing ($connect in client) instead of instanceof PrismaClient — vitest module isolation breaks instanceof across module boundaries
- [Phase 02-01]: Migration SQL manually crafted (no live DB) using prisma migrate diff as reference — pgLite picks it up via sorted directory scan
- [Phase 02-01]: contentHash is nullable String? @unique — allows Article rows without hash (MANUAL source items don't need dedup)
- [Phase 02-01]: Wave 0 stubs use it.todo() with commented-out imports — no TypeScript errors before implementation files exist
- [Phase 02-02]: AdapterFn uses ArticleSource enum (not a separate Source model type) — matches enum already in @prisma/client
- [Phase 02-02]: cleanDb updated to include IngestionRun and Source tables — required for correct test isolation in Phase 2
- [Phase 02-02]: Prisma client regenerated after Phase 2 schema — Source and IngestionRun models were missing from generated client
- [Phase 02-03]: createOtsAtAdapter(db?) factory pattern — keeps AdapterFn signature clean while enabling DI for tests
- [Phase 02-03]: CANDIDATE_BODY_FIELDS defensive extraction — OTS API body field name is MEDIUM confidence; tries TEXT/BODY/INHALT/text/body with warn-and-fallback
- [Phase 02-03]: Pre-fetch dedup uses article.findFirst (not isDuplicate) — isDuplicate requires contentHash which only exists after the detail fetch
- [Phase 02-ingestion]: rssAdapter takes Source (Prisma model, has .url) not ArticleSource enum — adapter needs source.url to fetch the feed
- [Phase 02-ingestion]: feedsmith RSS item.guid is a Guid object {value, isPermaLink?} — use item.guid.value for externalId string
- [Phase 02-ingestion]: rssAdapter cast to AdapterFn in registry via 'as unknown as AdapterFn' — rssAdapter takes Source (Prisma model) not ArticleSource enum; ingest() passes full Source row satisfying both
- [Phase 02-ingestion]: HEALTH_FAILURE_THRESHOLD = 3 as module-level constant in ingest.ts — Phase 5 CMS will make it configurable per-source
- [Phase 02-06]: seedSources upserts by url (@unique in schema) — consistent with seedBezirke upsert-by-slug pattern
- [Phase 02-06]: ingest-run.ts per-source error handling: failures logged and aggregated, remaining sources continue, exit(1) only if any errors
- [Phase 02-ingestion]: AdapterFn parameter changed from ArticleSource (enum) to Source (Prisma model) — enables adapters to access source.url without unsafe casts
- [Phase 02-ingestion]: ingest.test.ts mock strategy: direct registry property assignment with afterEach restore instead of vi.spyOn accessor (avoids vitest overload incompatibility with Partial<Record<K,V>>)
- [Phase 03-ai-pipeline]: Threshold read from AI_DAILY_TOKEN_THRESHOLD env var, defaults to 500000; >= comparison halts generation conservatively
- [Phase 03-ai-pipeline]: System prompt kept as module-level constant SYSTEM_PROMPT_TEMPLATE with bezirkContext placeholder — LOW confidence wording until validated against real OTS data in Phase 7
- [Phase 03-ai-pipeline]: runStep2Write() accepts Anthropic client as first arg for vi.spyOn testability — same DI pattern as Step 1
- [Phase 03-ai-pipeline]: runStep1Tag() accepts injected Anthropic client as first arg — enables vi.spyOn mocking; output_config cast as 'any' since SDK types don't expose it
- [Phase 03-ai-pipeline]: PipelineRun has no FK to Source — pipeline-level run tracking, not per-source like IngestionRun
- [Phase 03-ai-pipeline]: Article.seoTitle is a separate nullable String? field — SEO-optimised title distinct from display title
- [Phase 03-ai-pipeline]: _clientFactory.create mutable object pattern for Anthropic client injection — vi.spyOn on exported let doesn't intercept internal module calls in vitest ESM
- [Phase 03-ai-pipeline]: Circuit-breaker checked before PipelineRun.create — no run record opened if budget exhausted
- [Phase 03-ai-pipeline]: (import.meta as any).main cast in ai-run.ts — Bun extension not typed in standard ImportMeta
- [Phase 04-scheduler-and-autonomous-publishing]: Wave 0 test stubs import describe/it from vitest explicitly — tsconfig includes test files in compilation, no globals configured
- [Phase 04-scheduler-and-autonomous-publishing]: ERROR = retryable failure (scheduler retries), FAILED = permanently excluded (max retries exceeded)
- [Phase 04-scheduler-and-autonomous-publishing]: findFirst used instead of findUnique for externalId lookup — externalId is String? (not @unique) in Article schema
- [Phase 04-scheduler-and-autonomous-publishing]: Math.round(silenceDurationHours) in DEAD_MAN_ALERT produces clean integer hours in alert payload
- [Phase 04-scheduler-and-autonomous-publishing]: MAX_RETRY_COUNT = 3 module-level constant in pipeline.ts — configurable via CMS in Phase 5
- [Phase 04-scheduler-and-autonomous-publishing]: newRetryCount >= MAX_RETRY_COUNT for FAILED boundary — 3rd failure = FAILED, no 4th attempt
- [Phase 04-04]: ecosystem.config.js block comment avoids */ sequence — writes '* /15' with note to prevent JS parser treating it as comment-close
- [Phase 04-04]: ai-run.ts log line includes inputTokens/outputTokens alongside published/reviewBacklog — complete observability from single log entry
- [Phase 05-01]: AiConfig and PipelineConfig are singleton tables with no FK constraints — cleanDb() deletes them after aiSourceConfig to maintain FK-safe order
- [Phase 05-01]: Wave 0 test stubs use it.todo() with no implementation imports — avoids TypeScript errors before implementation files exist in later plans
- [Phase 05-01]: Migration SQL hand-crafted to mirror Prisma schema for pgLite test compatibility — sorted directory scan applies all migrations in createTestDb()
- [Phase 05-editorial-cms]: Auth split into auth-node.ts (node:crypto) + auth-edge.ts (crypto.subtle) — middleware imports auth-edge.ts directly to avoid Edge bundling of node:crypto
- [Phase 05-editorial-cms]: tailwindcss upgraded to v4 — @tailwindcss/postcss@4 bundles v4 internally; root v3 conflicted with webpack CSS @import resolution in Next.js build
- [Phase 05-editorial-cms]: loginAction uses LoginState = { error: string } | null with useActionState — Server Action returns error without redirect; redirect() only on success outside try/catch
- [Phase 05-03]: DB-layer *Db functions exported separately from Server Action wrappers — tests call *Db directly, no cookie/auth mocking needed in vitest
- [Phase 05-03]: listArticlesAdmin uses duck-typed DI overload ($connect check) — zero-arg = production singleton, injected = tests
- [Phase 05-03]: approveArticleDb sets publishedAt=new Date() alongside status=PUBLISHED — approval marks when article went live
- [Phase 05-04]: listSourcesAdmin FAILED+ERROR count filters by source type not source id — Articles have no FK to Source (ArticleSource enum only), documented as approximate for multi-source same-type
- [Phase 05-04]: upsertAiSourceConfig uses Prisma native upsert on sourceId @unique — single atomic DB call avoids findFirst+update race condition
- [Phase 05-04]: getResolvedAiConfig calls getAiConfig(client) internally — reuses singleton logic without duplication, passes injected client through for test isolation
- [Phase 05-editorial-cms]: step2-write.ts uses getAiConfig(db) global config only (not getResolvedAiConfig with sourceId) — per-source prompt overrides deferred to Phase 7 with TODO comment
- [Phase 05-editorial-cms]: dead-man.ts reads deadManThresholdHours from PipelineConfig DB row via getPipelineConfig(db) — env var DEAD_MAN_THRESHOLD_HOURS no longer controls threshold
- [Phase 05-06]: FormData wrappers (*Form suffix) added alongside typed Server Actions — form-facing wrappers parse FormData.get('id'); typed *Db functions remain for test injection
- [Phase 05-06]: ArticleRow is 'use client' to support window.confirm on soft-delete; Client Components can reference Server Actions in form action={} in Next.js 15
- [Phase 05-editorial-cms]: ai-config-actions.ts and pipeline-config-actions.ts rewritten with FormData-accepting Server Actions — Plan 04 stubs used typed args incompatible with HTML form action= binding
- [Phase 05-editorial-cms]: SourceOverrideForm uses details open={hasOverride} for server-side pre-expanded state — no client JS needed for collapsible override forms
- [Phase 05-editorial-cms]: AI Config page uses prisma.source.findMany with include.aiSourceConfig directly — sources-actions.ts SourceAdminRow does not include the aiSourceConfig relation
- [Phase 06-reader-frontend]: publicId is String? (nullable) — existing articles don't fail migration, backfill populates values before unique constraint is added
- [Phase 06-reader-frontend]: Wave 0 stubs use only describe/it from vitest with no implementation imports — prevents TypeScript errors before reader implementation files exist
- [Phase 06-02]: slugify() implemented inline without external library — all German umlaut rules fit in 7 replace chains
- [Phase 06-02]: listArticlesReader omits bezirkIds WHERE clause when array is undefined/empty — avoids spurious empty-IN clause causing DB errors
- [Phase 06-03]: Admin login moved to top-level src/app/admin/login (no route group) — prevents (public)/layout.tsx reader shell from wrapping the login page
- [Phase 06-03]: AdUnit renders dev placeholder when NEXT_PUBLIC_ADSENSE_PUB_ID absent — enables local development without AdSense credentials
- [Phase 06-03]: CookieBanner sets window.__adsenseNpa=true on rejection — AdUnit reads flag to pass {google_npa:true} in adsbygoogle push
- [Phase 06-reader-frontend]: buildArticleMetadata() returns empty {} on null article — generateMetadata() calls it directly, notFound() in page component handles 404
- [Phase 06-reader-frontend]: ShareButton extracted as separate 'use client' component — keeps article detail page as Server Component
- [Phase 06-04]: formatRelativeTime() inline in ArticleCard.tsx — pure function, no external dependency
- [Phase 06-04]: ArticleFeed replaces initialArticles on mount if localStorage bezirk_selection found — avoids server/client mismatch
- [Phase 06-04]: API route /api/reader/articles resolves bezirk slugs via listBezirke() on each request — needed for client-side localStorage personalization
- [Phase 06-reader-frontend]: sitemap.ts and (public)/page.tsx use export const dynamic = 'force-dynamic' — prevents static pre-render of DB-dependent routes at build time
- [Phase 06-reader-frontend]: sitemap.test.ts uses relative imports not @/ alias — vitest does not resolve @/ for value imports without explicit vite resolve.alias config
- [Phase 08-per-source-ai-config-wiring]: Article.sourceId uses sourceFk relation field name (not source) — Article already has source ArticleSource enum field; Prisma forbids duplicate field names
- [Phase 08-per-source-ai-config-wiring]: onDelete: SetNull on Article.sourceFk — articles survive Source deletion, fall through to global AI config
- [Phase 08-per-source-ai-config-wiring]: step2-write.ts uses conditional call: getResolvedAiConfig(db, sourceId) when db injected, getResolvedAiConfig(sourceId as unknown as number) for production singleton path — production always passes db from pipeline.ts so the else branch is a safety fallback only
- [Phase 09-ad-config-wiring-auth-hardening]: Remaining Impressum placeholders ([TELEFON], [UNTERNEHMENSGEGENSTAND], [BLATTLINIE], [DATENSCHUTZ_EMAIL]) left as static strings — operator fills before launch
- [Phase 09-ad-config-wiring-auth-hardening]: AdUnit.tsx has no 'use client' — Server Component reads bundesland.config and server-side env vars at import time
- [Phase 09-ad-config-wiring-auth-hardening]: React import added explicitly to AdUnit.tsx for vitest JSX transform (classic runtime requires React in scope)
- [Phase 09-ad-config-wiring-auth-hardening]: requireAuth() placed before try/catch in Server Actions — Next.js redirect() throws NEXT_REDIRECT internally and must not be caught
- [Phase 10-01]: vitest.config.ts gains resolve.alias for '@' to match tsconfig paths — required for @/../bundesland.config to resolve in test environment
- [Phase 11-fix-state-wide-article-pipeline]: pipeline.ts uses typeof allBezirke[number][] for matchedBezirke — avoids manual struct, stays in sync with DB model
- [Phase 11-fix-state-wide-article-pipeline]: isStateWide branch uses single db.article.update (no transaction) — no ArticleBezirk upserts needed for state-wide articles
- [Phase 11-fix-state-wide-article-pipeline]: console.warn for mixed slug case is non-fatal — pipeline continues, bad LLM response flagged in logs
- [Phase 11-fix-state-wide-article-pipeline]: No test file for backfill script — one-time operator tool analogous to ai-run.ts which also has no dedicated test

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 2]: OTS.at API authentication, rate limits, and response format have LOW confidence in research. Must verify with APA-OTS developer documentation before Phase 2 planning begins.
- [Phase 3]: Specific prompts for German-language regional news generation require iteration with real OTS content samples.
- [Phase 6]: Exact Austrian MedienG/ECG Impressum requirements and AI disclosure form need legal/regulatory verification before launch.

## Session Continuity

Last session: 2026-03-25T11:09:11.004Z
Stopped at: Completed 11-fix-state-wide-article-pipeline 11-02-PLAN.md
Resume file: None
