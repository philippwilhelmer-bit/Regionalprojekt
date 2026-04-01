# Roadmap: Regionalprojekt (Wurzelwelt)

## Milestones

- ✅ **v1.0 MVP** — Phases 1-15 (shipped 2026-03-25)
- ✅ **v1.1 Design Overhaul** — Phases 16-20 (shipped 2026-03-26)
- ✅ **v1.2 Test Deployment** — Phases 21-25 (shipped 2026-03-28)
- ✅ **v2.0 Wurzelwelt Rebrand** — Phases 26-32 (shipped 2026-03-30)
- 🚧 **v3.0 The Modern Archivist** — Phases 33-37 (in progress)

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

<details>
<summary>✅ v1.2 Test Deployment (Phases 21-25) — SHIPPED 2026-03-28</summary>

- [x] **Phase 21: Railway Infrastructure** - Vercel + Neon deployment (deviated from Railway), cron via /api/cron (completed 2026-03-27)
- [x] **Phase 22: Test Mode Implementation** - TESTSEITE banner, noindex meta, robots.txt, sitemap suppression, AdSense gating (completed 2026-03-28)
- [x] **Phase 23: Deployment Verification** - Verified live Vercel+Neon, set NEXT_PUBLIC_BASE_URL (completed 2026-03-28)
- [x] **Phase 24: Admin Login Banner Fix** - TESTSEITE banner on /admin/login (completed 2026-03-28)
- [x] **Phase 25: Deployment Verification & Requirements Closure** - AdUnit guard, VERIFICATION.md, all 9/9 requirements closed (completed 2026-03-28)

Full details: `.planning/milestones/v1.2-ROADMAP.md`

</details>

<details>
<summary>✅ v2.0 Wurzelwelt Rebrand (Phases 26-32) — SHIPPED 2026-03-30</summary>

- [x] **Phase 26: Design System & Brand Foundation** - New color palette, typography, icons, spacing, naming, mascot asset (completed 2026-03-28)
- [x] **Phase 27: App Chrome** - WurzelAppBar and WurzelNavBar replacing current header and bottom nav (completed 2026-03-28)
- [x] **Phase 28: Homepage Components** - MascotGreeting, Topmeldung, RegionalEditorialCard, Mein Bezirk section, tonal section separation (completed 2026-03-29)
- [x] **Phase 29: Article Detail** - Article detail page restyled with new palette, typography, and spacing (completed 2026-03-30)
- [x] **Phase 30: CMS Admin Restyling** - Admin pages restyled with Wurzelwelt brand tokens (completed 2026-03-30)
- [x] **Phase 31: Icon & Token Consistency Fix** - Fix icon class mismatch, replace residual zinc tokens, fix stale test mock (completed 2026-03-30)
- [x] **Phase 32: Phase 28 Verification** - Independent verification of all Phase 28 homepage components (completed 2026-03-30)

Full details: `.planning/milestones/v2.0-ROADMAP.md`

</details>

### v3.0 The Modern Archivist (In Progress)

**Milestone Goal:** Transform the visual identity from "Modern Mountain Folklore" to "The Modern Archivist" — a high-end editorial print-magazine aesthetic with a new MD3-style color system, glassmorphic navigation, editorial homepage features, article detail print conventions, and consistent Archivist treatment across search and CMS.

- [x] **Phase 33: Color Token Foundation** - MD3-style Ink/Parchment/Slate/Aged Wood token system, No-Line Rule, radius and spacing scales, glassmorphism tokens (Plans 01-03 complete 2026-04-01)
- [x] **Phase 34: Shell Components** - Glassmorphic bottom nav, dark editorial footer, updated header with hamburger and desktop navigation (completed 2026-04-01)
- [ ] **Phase 35: Homepage Feature Components** - Weather widget, Frag den Wurzelmann region selector, Das Grune der Woche section, Topmeldung CTA, tonal palette update, MascotGreeting restyle
- [ ] **Phase 36: Article Detail Redesign** - Drop cap, blockquote styling, sidebar metadata, Archival Header pattern
- [ ] **Phase 37: Search and CMS Refresh** - Search page Archivist token treatment, CMS admin token swap, theme tag management

## Phase Details

### Phase 33: Color Token Foundation
**Goal**: The entire site runs on a coherent Ink/Parchment/Slate/Aged Wood token system — every surface, container, and overlay uses a named semantic token, no raw hex values, and no visible borders separate sections
**Depends on**: Nothing (first v3.0 phase)
**Requirements**: TOKN-01, TOKN-02, TOKN-03, TOKN-04, TOKN-05, TOKN-06
**Success Criteria** (what must be TRUE):
  1. The globals.css @theme block contains approximately 30 named tokens covering the Ink/Parchment/Slate/Aged Wood palette and all semantic surface/container variants
  2. No reader-facing component renders a visible CSS border for section separation — tonal background shifts and negative space carry all visual division
  3. All corner radii across the site are either 0.125rem or 0.25rem — no rounded-xl or rounded-full shapes remain on reader-facing components
  4. All shadow utilities use tinted on-surface color tokens, not literal black or gray hex values
  5. The glassmorphism tokens (color-mix() definitions for nav and overlay surfaces) are defined in @theme and usable as Tailwind utilities
**Plans:** 3/3 plans complete
Plans:
- [x] 33-01-PLAN.md — Define complete Archivist @theme token system in globals.css (complete 2026-04-01)
- [x] 33-02-PLAN.md — Migrate 9 core reader components (cards, lists, feeds, search, modals) (complete 2026-04-01)
- [x] 33-03-PLAN.md — Migrate 5 shell/nav components + full verification sweep (complete 2026-04-01)

### Phase 34: Shell Components
**Goal**: Every public page loads with a glassmorphic bottom nav and a dark editorial footer — the visual chrome that frames all reader content reflects the Archivist identity
**Depends on**: Phase 33
**Requirements**: SHEL-01, SHEL-02, SHEL-03, SHEL-04, SHEL-05
**Success Criteria** (what must be TRUE):
  1. The bottom nav renders with a frosted-glass background (85% opacity + backdrop-blur) and a top-border active state indicator — the terracotta pill is gone
  2. The active nav tab displays a filled icon variant; inactive tabs display outlined icons (auto_stories, forest, face_5, book_2)
  3. The bottom nav renders without visual defects on iOS Safari — the blur effect is visible and the element is not invisible
  4. A dark editorial footer appears at the bottom of all public pages with Wurzelwelt branding, navigation columns, and Impressum/Kontakt links
  5. On mobile, the header shows a hamburger menu and left-aligned serif "Wurzelwelt"; on wider screens it shows Archive, Forest, Guide, Library navigation links
**Plans:** 2/2 plans complete
Plans:
- [ ] 34-01-PLAN.md — Glassmorphic bottom nav with Archivist icons and filled/outlined states
- [ ] 34-02-PLAN.md — Dark editorial footer and responsive header with hamburger/desktop nav

### Phase 35: Homepage Feature Components
**Goal**: The homepage presents the Archivist's three new editorial features — live Bezirk weather, the Frag den Wurzelmann region selector, and the Das Grune der Woche themed section — alongside an updated Topmeldung hero and restyled Wurzel greeting card
**Depends on**: Phase 34
**Requirements**: HOME-01, HOME-02, HOME-03, HOME-04, HOME-05, HOME-06
**Success Criteria** (what must be TRUE):
  1. The Topmeldung hero displays a "VOLLSTAENDIGEN ARTIKEL LESEN" CTA button overlaid on the gradient — clicking it navigates to the article
  2. The MascotGreeting renders as a tonal "Wurzel sagt..." box using Archivist tokens, not a speech bubble
  3. A weather widget on the homepage shows current temperature and weather conditions for the user's selected Bezirk, sourced from Open-Meteo with a 30-minute server-side cache
  4. A "Frag den Wurzelmann" dark green card appears on the homepage and links to the region selector
  5. A "Das Grune der Woche" section appears on the homepage when nature/environment-tagged articles exist — the Article model has a theme field and the CMS can assign it
  6. Homepage sections use Archivist palette background alternation (not the previous warm cream / slightly darker cream pair)
**Plans:** 1/3 plans executed
Plans:
- [ ] 35-01-PLAN.md — Prisma migration for Article.theme, DAL function, CMS field, GrueneWocheSection component
- [ ] 35-02-PLAN.md — Topmeldung CTA, MascotGreeting tonal restyle, FragDenWurzelmannCard
- [ ] 35-03-PLAN.md — Weather widget (API route + client component) + HomepageLayout integration + tonal alternation

### Phase 36: Article Detail Redesign
**Goal**: Article pages read like premium editorial print — a drop cap opens the body, pull quotes are visually distinct, metadata lives in a sidebar, and the article header uses an overlapping archival title layout
**Depends on**: Phase 35
**Requirements**: ARTC-01, ARTC-02, ARTC-03, ARTC-04
**Success Criteria** (what must be TRUE):
  1. The first paragraph of every article body displays a float-based drop cap using ::first-letter — the cap is visible in Firefox, Chrome, and Safari
  2. Blockquotes in article bodies render with large serif italic typography and tonal dividers — visually distinct from body prose
  3. On desktop, article pages show a sticky sidebar with author/source attribution, estimated reading time, and a share button; on mobile this collapses to a horizontal metadata strip
  4. The article header uses the Archival Header pattern — the article title overlaps the hero image rather than sitting below it
**Plans**: TBD

### Phase 37: Search and CMS Refresh
**Goal**: The search page and CMS admin carry the Archivist visual treatment — no reader or editor encounters legacy Wurzelwelt warm-cream tokens after this phase
**Depends on**: Phase 36
**Requirements**: SRCH-01, CMS-01, CMS-02
**Success Criteria** (what must be TRUE):
  1. The search and discovery page renders result cards, filter chips, and typography using Archivist Ink/Parchment/Slate tokens — no legacy forest-green or warm-cream palette remnants visible
  2. CMS admin pages (login, sidebar, articles list, sources, AI config, exception queue) use Archivist Ink/Parchment/Slate tokens throughout
  3. The CMS article edit form includes a "Grune der Woche" theme tag field — an editor can assign and remove the theme tag from any article
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-15 | v1.0 | 52/52 | Complete | 2026-03-25 |
| 16-20 | v1.1 | 10/10 | Complete | 2026-03-26 |
| 21-25 | v1.2 | 7/7 | Complete | 2026-03-28 |
| 26-32 | v2.0 | 11/11 | Complete | 2026-03-30 |
| 33. Color Token Foundation | v3.0 | Complete    | 2026-04-01 | 2026-04-01 |
| 34. Shell Components | 2/2 | Complete    | 2026-04-01 | - |
| 35. Homepage Feature Components | 1/3 | In Progress|  | - |
| 36. Article Detail Redesign | v3.0 | 0/TBD | Not started | - |
| 37. Search and CMS Refresh | v3.0 | 0/TBD | Not started | - |
