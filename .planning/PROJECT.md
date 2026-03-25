# Regionalprojekt (Ennstal Aktuell)

## What This Is

An autonomous AI-powered regional news platform covering all 13 Bezirke of Steiermark, Austria. The platform ingests content from OTS.at and RSS feeds, generates localized German-language articles via AI, and publishes them without manual intervention. Readers personalize their feed by selecting their Bezirk ("Mein Bezirk"). Editors can manually post, curate, pin, feature, and override any automated content through a full CMS. The architecture is config-driven — deploying for a new Bundesland requires only changing `bundesland.config.ts` and re-seeding.

## Core Value

Steiermark residents get relevant, hyperlocal news for their Bezirk — automatically, without an editorial team needed to run it.

## Requirements

### Validated

- ✓ Platform is deployable for any Bundesland by changing a single config file — v1.0
- ✓ Steiermark deployment ships with all 13 regions pre-configured — v1.0
- ✓ System ingests press releases from OTS.at via API — v1.0
- ✓ System ingests content from generic RSS/Atom feeds — v1.0
- ✓ System deduplicates content using content fingerprinting — v1.0
- ✓ System alerts operator when a source fails or goes stale — v1.0
- ✓ Source adapters follow a plug-in interface — v1.0
- ✓ System rewrites ingested content into clean German-language news articles via AI — v1.0
- ✓ System automatically tags each article with the relevant Bezirk(e) — v1.0
- ✓ System flags articles mentioning real named persons for review — v1.0
- ✓ Cost circuit-breaker halts AI generation on threshold — v1.0
- ✓ All AI-generated articles display "Automatisch erstellt" disclosure — v1.0
- ✓ Approved articles publish automatically — v1.0
- ✓ System polls sources on scheduled cron interval — v1.0
- ✓ Dead-man monitor alerts if pipeline stops — v1.0
- ✓ Editor can write and publish articles manually — v1.0
- ✓ Editor can pin, feature, edit, or remove any article — v1.0
- ✓ Editor can review, approve, or reject exception queue articles — v1.0
- ✓ Editor can add, configure, and disable content sources — v1.0
- ✓ Editor can configure global AI generation settings — v1.0
- ✓ Editor can override AI settings per source — v1.0
- ✓ AI configuration editable from admin UI — v1.0
- ✓ Google AdSense with configurable placement zones — v1.0
- ✓ Ad placements configurable per deployment via config — v1.0
- ✓ SEO-optimized meta tags on every article — v1.0
- ✓ AI generates SEO titles and meta descriptions — v1.0
- ✓ Sitemap.xml updated on publish — v1.0
- ✓ JSON-LD NewsArticle structured data — v1.0
- ✓ "Mein Bezirk" reader preference via localStorage — v1.0
- ✓ Homepage filtered to reader's selected regions — v1.0
- ✓ Full article detail with source attribution — v1.0
- ✓ Mobile-optimized with bottom navigation — v1.0
- ✓ Austrian Impressum (MedienG/ECG) — v1.0
- ✓ Per-Bezirk subscribable RSS feeds — v1.0

### Active

## Current Milestone: v1.1 Design Overhaul

**Goal:** Restyle the reader frontend with a premium editorial design — Styrian identity, serif headlines, warm cream palette, and newspaper-like layouts.

**Target features:**
- Design system (Newsreader/Inter/Work Sans fonts, Styrian green + warm cream palette, Material Symbols, sharp corners)
- Styrian identity bar (white/green flag stripe)
- Header redesign (dark green, italic serif branding, location badge)
- Homepage editorial layout (hero featured article, scrollable top stories, topic sections with wood dividers)
- Article detail page restyling (editorial typography, warm cream)
- Bottom nav restyling (active pill state)
- Breaking news banner ("Eilmeldung" flagging from CMS)
- Search/categories page (article search, trending topics, category grid)

### Out of Scope

- Native iOS/Android app — mobile-optimized web is sufficient
- Reader accounts / registration — "Mein Bezirk" works via localStorage; auth adds GDPR surface area for no reader benefit
- Paywalls — not in current scope
- Multi-tenant single app — config-driven deployment per Bundesland is simpler and sufficient
- Offline mode — real-time news is core value

## Context

Shipped v1.0 with 10,303 LOC TypeScript/TSX in 5 days.
Tech stack: Next.js 15, Prisma v6, PostgreSQL, Anthropic Claude API, Tailwind CSS v4, Vitest with pgLite.
Architecture: Config-driven Bundesland deployment, adapter-pattern ingestion, Server Component CMS with HMAC auth.
Known pre-launch items: Impressum fields need real publisher data (TODO: placeholders in bundesland.config.ts), OTS.at API access requires APA-OTS credentials.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Auto-publish by default (no draft queue) | Platform should run autonomously without human bottleneck | ✓ Good — works as designed |
| All of Steiermark at launch | Multi-region by design from day one, not bolted on later | ✓ Good — 13 Bezirke seeded from config |
| Mobile-optimized web (not native app) | Broader reach, faster to build | ✓ Good — bottom nav pattern works well |
| OTS.at as first API source | Major Austrian press wire, high relevance for regional news | ⚠️ Revisit — API format unverified, needs real credentials |
| Explicit ArticleBezirk junction model | Enables taggedAt/taggedBy metadata without destructive migration | ✓ Good — served tagging pipeline well |
| pgLite for test DB | No running Postgres server needed for test environment | ✓ Good — fast CI, zero infra |
| Config-driven Bundesland deployment | Single config file change deploys for new region | ✓ Good — proven with region list, branding, ads, impressum |
| HMAC session auth (not OAuth/NextAuth) | Minimal dependency, single-admin use case | ✓ Good — lightweight, Edge-compatible |
| Adapter pattern for ingestion | New sources added without core changes | ✓ Good — validated with ORF RSS second adapter |
| Server Component CMS with FormData actions | No API layer needed for admin CRUD | ✓ Good — reduced boilerplate significantly |

## Constraints

- **Mobile-first**: Site must work excellently on mobile — bottom nav pattern established
- **Extensibility**: Source ingestion is plug-in style — new feeds added without core changes
- **Autonomy**: Platform runs unattended — editorial intervention is optional
- **German-language**: All user-facing content in Hochdeutsch
- **Austrian legal**: Impressum must satisfy MedienG/ECG; AI disclosure required on generated articles

---
*Last updated: 2026-03-25 after v1.1 milestone start*
