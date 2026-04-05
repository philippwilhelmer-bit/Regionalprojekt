# Milestones

## v3.0 The Modern Archivist (Shipped: 2026-04-05)

**Phases completed:** 7 phases, 12 plans + 2 quick tasks
**Timeline:** 5 days (2026-04-01 → 2026-04-05)
**Codebase:** 55 files changed, +3,515 / -308 lines (14,337 LOC TypeScript)
**Git range:** feat(33-01) → fix(shell)

**Delivered:** Complete visual identity transformation from "Modern Mountain Folklore" to "The Modern Archivist" — a high-end editorial print-magazine aesthetic with MD3-style color system, glassmorphic navigation, editorial homepage features, premium article detail, and consistent Archivist treatment across all surfaces.

**Key accomplishments:**
1. MD3-style Archivist token system (Ink/Parchment/Slate/Aged Wood) with ~30 semantic tokens, glassmorphism via color-mix(), and ink-tinted shadows across globals.css
2. Glassmorphic bottom nav with top-border active state, dark editorial footer, responsive hamburger header with desktop Bezirk selector
3. Homepage editorial features: weather widget (Open-Meteo API), Das Grüne der Woche themed section, Frag den Wurzelmann region card, MascotGreeting tonal restyle, Topmeldung CTA
4. Premium article detail: archival header with overlapping title, float-based drop cap, serif blockquote styling, responsive sticky sidebar with metadata
5. Full CMS admin Archivist token migration across 20 files + theme tag persistence tests
6. Gap closure: frontmatter traceability fixes, nav active state on /artikel/* routes, Kontakt link, desktop Bezirk selector

---

## v2.0 Wurzelwelt Rebrand (Shipped: 2026-03-30)

**Phases completed:** 7 phases, 11 plans
**Timeline:** 3 days (2026-03-28 → 2026-03-30)
**Codebase:** 129 files changed, +6,704 / -640 lines (13,341 LOC TypeScript)
**Git range:** feat(26-01) → docs(phase-32)

**Delivered:** Full visual rebrand from "Ennstal Aktuell" to "Wurzelwelt" — new brand identity with Wurzelmann mascot, "Modern Mountain Folklore" design system with tonal layering, redesigned homepage components, article detail and CMS admin restyling.

**Key accomplishments:**
1. Wurzelwelt design system: semantic color tokens (forest green, moss, terracotta, warm cream), Plus Jakarta Sans body font, Material Symbols Rounded icons, organic spacing scale
2. WurzelAppBar with centered "WURZELWELT" branding and Wurzelmann avatar + WurzelNavBar 4-tab bottom nav with terracotta accent
3. Homepage redesign: MascotGreeting speech-bubble, Topmeldung hero with gradient overlay, RegionalEditorialCard, prioritized "Mein Bezirk" section, tonal section alternation
4. Article detail page migrated to Wurzelwelt semantic tokens and typography
5. CMS admin fully restyled: login, sidebar, articles, exceptions, sources, AI config pages
6. Icon/token consistency fix and independent verification of all 18 requirements (18/18 satisfied)

**Tech debt:** 9 non-blocking items (zinc residuals in out-of-scope components, hardcoded BEZIRK_COLORS hex, CSS triangle white literal, SUMMARY frontmatter gaps)

---

## v1.2 Test Deployment (Shipped: 2026-03-28)

**Phases completed:** 5 phases, 7 plans
**Timeline:** 2 days (2026-03-27 → 2026-03-28)
**Codebase:** 79 files changed, +4,976 / -187 lines
**Git range:** feat(21-01) → docs(phase-25)

**Delivered:** Shareable test deployment on Vercel + Neon, clearly marked as non-production with TESTSEITE banners, invisible to search engines, and AdSense-suppressed — all gated by a single environment variable.

**Deviation:** Deployed to Vercel + Neon instead of Railway (user-requested, better Next.js fit). All original requirements satisfied.

**Key accomplishments:**
1. Live Vercel + Neon deployment at regionalprojekt.vercel.app with auto-deploy from main branch
2. TestSiteBanner component on all reader and admin pages, gated by single NEXT_PUBLIC_IS_TEST_SITE env var
3. Full SEO suppression: dynamic robots.txt Disallow, empty sitemap.xml, noindex/nofollow meta tags
4. AdSense defense-in-depth: root layout script gate + AdUnit null guard in test mode
5. Cron pipeline via Vercel cron → /api/cron with CRON_SECRET bearer auth

---

## v1.1 Design Overhaul (Shipped: 2026-03-26)

**Phases completed:** 5 phases, 10 plans
**Timeline:** 2 days (2026-03-25 → 2026-03-26)
**Codebase:** 67 files changed, +8,357 / -260 lines
**Git range:** feat(16-01) → fix(20)

**Delivered:** Premium editorial redesign of the reader frontend — Styrian identity, serif typography, warm cream palette, newspaper-like layouts, and a search/discovery page.

**Key accomplishments:**
1. Design system foundation: Newsreader/Inter/Work Sans fonts, Styrian green + warm cream palette, Material Symbols icons, sharp 2px corners
2. Styrian identity header: white/green flag stripe, dark green editorial header with serif branding and location badge
3. Editorial homepage: full-bleed hero article, horizontal top-stories scroller, Bezirk-grouped topic sections with wood dividers, Eilmeldung breaking news banner
4. Article detail restyling: full-bleed hero image, editorial typography on warm cream canvas, related articles horizontal scroll
5. Bottom navigation: cream background, Material Symbols icons, active green pill state, placeholder tabs for future features
6. Search & discovery page: text + Bezirk AND filtering, trending pills, category grid, recommended articles, activated header search icon

---

## v1.0 MVP (Shipped: 2026-03-25)

**Phases completed:** 15 phases, 52 plans
**Timeline:** 5 days (2026-03-21 → 2026-03-25)
**Codebase:** 10,303 LOC TypeScript/TSX, 278 files changed
**Git range:** Initial commit → docs(phase-15)

**Delivered:** A fully autonomous AI-powered regional news platform for Steiermark — ingests OTS.at and RSS content, generates German-language articles via AI, publishes without human intervention, and serves personalized per-Bezirk feeds with editorial CMS, AdSense, SEO, and legal compliance.

**Key accomplishments:**
1. Full data layer with Prisma v6, all 13 Steiermark Bezirke, and config-driven Bundesland deployment
2. Multi-source ingestion (OTS.at API + generic RSS/Atom) with SHA-256 content fingerprint deduplication
3. AI pipeline: German-language article generation, Bezirk tagging, named-person exception queue, cost circuit-breaker
4. Autonomous cron-driven ingestion-to-publish loop with dead-man monitoring and auto-retry
5. Editorial CMS with HMAC session auth, article CRUD, exception queue inbox, source management, AI config UI with per-source overrides
6. Reader frontend: "Mein Bezirk" selector, per-Bezirk RSS feeds, SEO/JSON-LD/Open Graph, Google AdSense, sitemap.xml, Austrian Impressum

---

