# Regionalprojekt (Wurzelwelt)

## What This Is

An autonomous AI-powered regional news platform covering all 13 Bezirke of Steiermark, Austria, branded as "Wurzelwelt" with "The Modern Archivist" design identity — a high-end editorial print-magazine aesthetic. The platform ingests content from OTS.at and RSS feeds, generates localized German-language articles via AI, and publishes them without manual intervention. Readers personalize their feed by selecting their Bezirk ("Mein Bezirk") and discover content through the Wurzelwelt editorial homepage — featuring a weather widget, Frag den Wurzelmann region selector, Das Grüne der Woche themed section, hero articles with CTA overlays, and glassmorphic bottom navigation. Article pages use archival headers with overlapping titles, drop caps, and sticky metadata sidebars. Editors curate content through a fully branded CMS with Archivist tokens. The architecture is config-driven — deploying for a new Bundesland requires only changing `bundesland.config.ts` and re-seeding.

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

- ✓ MD3-style Archivist color token system (Ink/Parchment/Slate/Aged Wood) with ~30 semantic tokens — v3.0
- ✓ No-Line Rule: tonal background shifts and negative space replace all visible borders — v3.0
- ✓ Glassmorphic bottom nav with top-border active state and filled/outlined icon states — v3.0
- ✓ Dark editorial footer with navigation columns and Impressum/Kontakt links — v3.0
- ✓ Responsive header with hamburger menu (mobile) and desktop nav with Bezirk selector — v3.0
- ✓ Topmeldung hero with "VOLLSTÄNDIGEN ARTIKEL LESEN" CTA button — v3.0
- ✓ MascotGreeting restyled as tonal "Wurzel sagt..." box — v3.0
- ✓ Weather widget with Open-Meteo API and per-Bezirk server-side cache — v3.0
- ✓ "Frag den Wurzelmann" region selector card on homepage — v3.0
- ✓ "Das Grüne der Woche" themed section with Article.theme field and CMS tag management — v3.0
- ✓ Homepage tonal alternation per Archivist palette — v3.0
- ✓ Article archival header with overlapping title on hero image — v3.0
- ✓ Float-based drop cap on article first paragraph — v3.0
- ✓ Blockquote styling with serif italic typography and tonal dividers — v3.0
- ✓ Desktop sticky sidebar with metadata (author, reading time, share) — v3.0
- ✓ Search page restyled with Archivist tokens — v3.0
- ✓ CMS admin fully migrated to Archivist tokens (20 files) — v3.0
- ✓ CMS theme tag field for "Grüne der Woche" article assignment — v3.0

- ✓ Regex location extraction (Bezirk names + Steiermark city list) with lookahead/lookbehind word boundaries — v3.1
- ✓ Haiku LLM location fallback when regex finds nothing — v3.1
- ✓ Nominatim geocoding (countrycodes=at) with Postgres GeocodingCache to prevent rate-limit bans — v3.1
- ✓ basemap.at tile fetching (5×3 grid) with 5xx retry and sharp stitching to 1200×630 JPEG — v3.1
- ✓ Auto-selected zoom (city→12, town→13, village→14, street→15) and layer (greyscale default, terrain/aerial keyword-driven) — v3.1
- ✓ "© basemap.at" attribution overlay via SVG path-based glyphs (font-free for Vercel lambdas) — v3.1
- ✓ Generated maps stored in Vercel Blob, URL written to Article.imageUrl, imageCredit="© basemap.at" — v3.1
- ✓ Map generation wired into cron pipeline with inner try/catch isolation — never blocks publication — v3.1
- ✓ On-demand POST /api/admin/generate-map route with CRON_SECRET bearer auth — v3.1
- ✓ generateMapForArticle and backfillMapImages Server Actions with 1100ms Nominatim rate-limiting — v3.1
- ✓ ImagePickerTabs in CMS: Unsplash + Karte tab switcher, default chosen by current imageCredit — v3.1
- ✓ MapPicker component: preview, generate, remove map image inline in article edit page — v3.1
- ✓ BackfillButton in articles list header: bulk backfill with German count display — v3.1
- ✓ PrismaPg driver adapter replaces Prisma Rust engine (bypasses 5s Neon pooler timeout from local dev) — v3.1

### Active

*(No active milestone — ready for /gsd:new-milestone. Pre-planned next: v3.2 Text Engine Optimization, see `.planning/TEXT-ENGINE-OPTIMIZATION-PLAN.md`.)*

### Out of Scope

- Native iOS/Android app — mobile-optimized web is sufficient
- Reader accounts / registration — "Mein Bezirk" works via localStorage; auth adds GDPR surface area for no reader benefit
- Paywalls — not in current scope
- Multi-tenant single app — config-driven deployment per Bundesland is simpler and sufficient
- Offline mode — real-time news is core value
- Central Wurzelmann action button in bottom nav — functionality still in design, deferred past v3.0
- Animation/motion design — kept scope to visual tokens and components
- Dark mode — not part of Archivist identity; warm parchment is the brand
- SVG choropleth map for region selector — maintenance burden, accessibility issues, low mobile usability

## Context

Shipped v3.1 Basemap Article Images on 2026-05-10 (3 phases, 6 plans, 35-day calendar window with ~3 active build days + verification pause).
Live at: https://regionalprojekt.vercel.app (Vercel Hobby + Neon PostgreSQL).
Tech stack: Next.js 15, Prisma v6 with PrismaPg driver adapter, PostgreSQL (Neon), Anthropic Claude API, Tailwind CSS v4, Vitest with pgLite, sharp@0.33.5 (pinned), @vercel/blob, pg.
Architecture: Config-driven Bundesland deployment, adapter-pattern ingestion, Server Component CMS with HMAC auth, map image pipeline (regex+LLM extract → Nominatim geocode → basemap.at tile fetch → sharp stitch → Vercel Blob).
Reader frontend: "Wurzelwelt" brand with "The Modern Archivist" design identity — Ink/Parchment/Slate/Aged Wood MD3 token system, glassmorphic nav, editorial footer, weather widget, archival article headers, drop caps, sticky sidebar. Plus Jakarta Sans + Newsreader typography, Material Symbols Rounded. Article hero images now auto-generated basemap.at maps (CC-BY 4.0) when location is extractable, gradient fallback otherwise.
Test mode: Single env var (NEXT_PUBLIC_IS_TEST_SITE) gates banners, SEO suppression, and AdSense suppression.
Cron: Vercel cron → /api/cron route (1/day on Hobby plan), secured with CRON_SECRET. Map generation runs inside the cron loop after AI step2, with inner try/catch isolation.
Codebase: ~24,000 LOC TypeScript across 6 milestones (v3.1 added +9,630/-1,379 across 56 files).
Known items: Impressum fields need real publisher data, OTS source disabled (Cloudflare-blocked, using ORF RSS only), Article.theme field added (Prisma db push, no formal migration file), basemap subdomain round-robin reduced to single 'maps' after maps1–4 NXDOMAIN, Vercel Blob store `regionalprojekt-blob` (public, eu-central-1) is the map image store.

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
| MD3-style token system (Ink/Parchment/Slate/Aged Wood) | Cohesive editorial identity, semantic naming | ✓ Good — consistent across all surfaces |
| No-Line Rule (tonal shifts, no borders) | Premium editorial feel, reduces visual clutter | ✓ Good — clean, print-magazine aesthetic |
| Float-based drop cap (not initial-letter) | Firefox doesn't support initial-letter | ✓ Good — cross-browser compatible |
| Open-Meteo for weather (not geolocation) | GDPR friction with geolocation API | ✓ Good — uses Mein Bezirk localStorage selection |
| unstable_cache per bezirk for weather | Prevents cross-bezirk cache collision | ✓ Good — 30-min server-side cache per region |
| Prisma db push for Article.theme | Migration drift made formal migration impractical | ⚠️ Revisit — no migration file exists |
| Bezirk selector in hamburger drawer + desktop nav | Cleaner header, still accessible | ✓ Good — desktop badge added in v3.0 gap closure |
| color-mix() for glassmorphism tokens | Native CSS, no JS runtime | ✓ Good — Tailwind v4 auto-prefixes -webkit |
| basemap.at over Mapbox/Google Maps Static | CC-BY 4.0, free, no API key, EU-hosted | ✓ Good — v3.1 shipped with zero map-API cost |
| sharp@0.33.5 pinned (not 0.34.x) | 0.34.x linux-x64 binary broken on Vercel | ✓ Good — production builds green |
| SVG path-based glyphs for attribution | No <text> elements → font-free for Vercel lambdas | ✓ Good — eliminates font runtime dependency |
| 3-pass sharp pipeline (PNG intermediates) | toBuffer() without format returns raw pixels sharp can't re-decode | ✓ Good — required to make sharp stitching work at all |
| Postgres GeocodingCache table with upsert | Cleaner than create+P2002 catch; atomic concurrent writes | ✓ Good — handles serverless burst races without error inspection |
| Inner try/catch around map block in pipeline | Map errors must never block publication or affect retryCount | ✓ Good — preserves v1.0's autonomy guarantee |
| article.imageUrl guard before map generation | Manually-set Unsplash images must be preserved | ✓ Good — editor overrides survive cron |
| Server Action (requireAuth) for CMS map ops, Route Handler (CRON_SECRET) for cron | next/headers unavailable in Route Handlers | ✓ Good — auth pattern matches existing cron route |
| 1100ms inter-call Nominatim delay (uniform, even on cache hits) | Defensive rate-limit hygiene — never trip 1 req/s ban | ✓ Good — backfill cap take:10 keeps Server Action under any timeout tier |
| ImagePickerTabs default tab driven by currentImageCredit | Editors land on the tab matching the article's current state | ✓ Good — zero-click context |
| PrismaPg driver adapter over Prisma Rust engine | Rust engine times out at 5s on Neon pooler from local dev | ✓ Good — local dev unblocked; production fine on either |
| articles-utils.ts split (pure utils file) | pg has Node-builtin deps that webpack can't resolve for client bundle | ✓ Good — keeps pg out of client; surgical 1-file change |
| basemap subdomain round-robin reduced to single 'maps' | maps1–4.wien.gv.at retired upstream (NXDOMAIN) | ⚠️ Revisit — single subdomain reduces parallel fetch concurrency |
| Reduced retryCount semantics for map block | retryCount reserved for article-level failures only | ✓ Good — observability stays clean |

## Constraints

- **Mobile-first**: Site must work excellently on mobile — bottom nav pattern established
- **Extensibility**: Source ingestion is plug-in style — new feeds added without core changes
- **Autonomy**: Platform runs unattended — editorial intervention is optional
- **German-language**: All user-facing content in Hochdeutsch
- **Austrian legal**: Impressum must satisfy MedienG/ECG; AI disclosure required on generated articles

---
*Last updated: 2026-05-10 after v3.1 milestone shipped*
