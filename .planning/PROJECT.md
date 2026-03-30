# Regionalprojekt (Wurzelwelt)

## What This Is

An autonomous AI-powered regional news platform covering all 13 Bezirke of Steiermark, Austria, branded as "Wurzelwelt" with a "Modern Mountain Folklore" design identity. The platform ingests content from OTS.at and RSS feeds, generates localized German-language articles via AI, and publishes them without manual intervention. Readers personalize their feed by selecting their Bezirk ("Mein Bezirk") and discover content through the Wurzelwelt editorial homepage — featuring the Wurzelmann mascot, hero articles with gradient overlays, tonal section layering, and a 4-tab bottom navigation. Editors curate content through a fully branded CMS. The architecture is config-driven — deploying for a new Bundesland requires only changing `bundesland.config.ts` and re-seeding.

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

- ✓ Design system: Newsreader/Inter/Work Sans fonts, Styrian green + warm cream palette, Material Symbols, 2px radius — v1.1
- ✓ Styrian identity bar (white/green flag stripe) + dark green editorial header — v1.1
- ✓ Homepage editorial layout: hero article, top-stories scroller, topic sections, Eilmeldung banner — v1.1
- ✓ Article detail restyling: editorial typography on warm cream canvas — v1.1
- ✓ Bottom nav: cream background, Material Symbols, active green pill — v1.1
- ✓ Search & discovery page: text + Bezirk filtering, trending pills, category grid, recommended articles — v1.1

- ✓ Live Vercel + Neon deployment with shareable URL — v1.2
- ✓ TESTSEITE banner on all reader and admin pages — v1.2
- ✓ SEO suppression (noindex, robots.txt, sitemap) in test mode — v1.2
- ✓ AdSense suppression in test mode (defense-in-depth) — v1.2
- ✓ All test behaviors gated by single NEXT_PUBLIC_IS_TEST_SITE env var — v1.2

- ✓ Wurzelwelt design system: forest green, moss, terracotta, warm cream palette — v2.0
- ✓ Plus Jakarta Sans body/UI font + Newsreader headlines — v2.0
- ✓ Material Symbols Rounded icons throughout — v2.0
- ✓ "Modern Mountain Folklore" design: tonal layering, no borders, soft corners, organic spacing — v2.0
- ✓ Brand rename from "Ennstal Aktuell" to "Wurzelwelt" with Wurzelmann mascot — v2.0
- ✓ WurzelAppBar with centered logo + Wurzelmann avatar — v2.0
- ✓ MascotGreeting speech-bubble card ("Wurzelmann sagt:") — v2.0
- ✓ Topmeldung with dark gradient overlay — v2.0
- ✓ RegionalEditorialCard: full-width images, serif headlines, uppercase labels — v2.0
- ✓ Prioritized "Mein Bezirk" section with featured card — v2.0
- ✓ WurzelNavBar: 4-tab bottom nav with rounded icons — v2.0
- ✓ Homepage tonal section alternation (#FCF9EF / #F6F4EA) — v2.0
- ✓ Article detail restyled with Wurzelwelt tokens — v2.0
- ✓ CMS admin restyled with Wurzelwelt brand — v2.0

### Active

(None yet — define with `/gsd:new-milestone`)

### Out of Scope

- Native iOS/Android app — mobile-optimized web is sufficient
- Reader accounts / registration — "Mein Bezirk" works via localStorage; auth adds GDPR surface area for no reader benefit
- Paywalls — not in current scope
- Multi-tenant single app — config-driven deployment per Bundesland is simpler and sufficient
- Offline mode — real-time news is core value
- Central Wurzelmann action button in bottom nav — functionality still in design, deferred past v2.0
- Animation/motion design — kept scope to visual tokens and components in v2.0

## Context

Shipped v2.0 Wurzelwelt Rebrand on 2026-03-30 (3 days, 7 phases, 11 plans).
Live at: https://regionalprojekt.vercel.app (Vercel Hobby + Neon PostgreSQL).
Tech stack: Next.js 15, Prisma v6, PostgreSQL (Neon), Anthropic Claude API, Tailwind CSS v4, Vitest with pgLite.
Architecture: Config-driven Bundesland deployment, adapter-pattern ingestion, Server Component CMS with HMAC auth.
Reader frontend: "Wurzelwelt" brand identity with Wurzelmann mascot, "Modern Mountain Folklore" design system — forest green/moss/terracotta/warm cream palette, Plus Jakarta Sans + Newsreader typography, Material Symbols Rounded, tonal section layering, organic spacing.
Test mode: Single env var (NEXT_PUBLIC_IS_TEST_SITE) gates banners, SEO suppression, and AdSense suppression.
Cron: Vercel cron → /api/cron route (1/day on Hobby plan), secured with CRON_SECRET.
Codebase: 13,341 LOC TypeScript across 4 milestones.
Known items: Impressum fields need real publisher data, OTS source disabled (Cloudflare-blocked, using ORF RSS only), 12 pre-existing test failures (DB hooks + bezirke data), 9 non-blocking tech debt items from v2.0 audit.

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
| Design system foundation via Tailwind v4 @theme | Tokens as single source of truth for all components | ✓ Good — consistent across v1.1 and v2.0 |
| Serif typography (Newsreader) for editorial feel | Differentiates from generic news sites | ✓ Good — strong brand identity, retained in v2.0 |
| Client-side search (no server API) | 200 article limit keeps it simple | ⚠️ Revisit if article count exceeds 200 |
| Vercel + Neon instead of Railway | Better Next.js fit, user-requested | ✓ Good — auto-deploy, serverless Postgres, EU region |
| Single env var for all test behaviors | No code changes to go production | ✓ Good — 6 files check one variable |
| Vercel cron for pipeline | Replaces Railway cron service | ⚠️ Revisit — Hobby plan limits to 1/day |
| Wurzelwelt rebrand over incremental v1.x updates | User wanted distinct brand identity, not generic regional news look | ✓ Good — "Modern Mountain Folklore" creates unique identity |
| Plus Jakarta Sans replaces Inter + Work Sans | Single body/UI font simplifies stack, better geometric feel | ✓ Good — cleaner typography hierarchy |
| Tonal layering over borders | Borderless design with bg shifts creates warmer, editorial feel | ✓ Good — consistent across all pages |
| Terracotta accent for active nav state | Distinct from primary green, creates visual hierarchy | ✓ Good — visually clear active indication |
| MascotGreeting as client component | Time-of-day detection requires getHours(), cannot SSR | ✓ Good — acceptable trade-off for dynamic greeting |

## Constraints

- **Mobile-first**: Site must work excellently on mobile — bottom nav pattern established
- **Extensibility**: Source ingestion is plug-in style — new feeds added without core changes
- **Autonomy**: Platform runs unattended — editorial intervention is optional
- **German-language**: All user-facing content in Hochdeutsch
- **Austrian legal**: Impressum must satisfy MedienG/ECG; AI disclosure required on generated articles

---
*Last updated: 2026-03-30 after v2.0 milestone*
