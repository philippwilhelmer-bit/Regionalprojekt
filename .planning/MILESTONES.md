# Milestones

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

