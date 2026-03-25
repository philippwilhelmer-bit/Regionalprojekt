# Roadmap: Regionalprojekt (Ennstal Aktuell)

## Milestones

- ✅ **v1.0 MVP** — Phases 1-15 (shipped 2026-03-25)
- 🚧 **v1.1 Design Overhaul** — Phases 16-20 (in progress)

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

### 🚧 v1.1 Design Overhaul (In Progress)

**Milestone Goal:** Restyle the reader frontend with a premium editorial design — Styrian identity, serif headlines, warm cream palette, and newspaper-like layouts.

- [x] **Phase 16: Design System Foundation** - Install fonts, define color tokens, icon library, border radius defaults (completed 2026-03-25)
- [x] **Phase 17: Header & Identity** - Styrian identity bar, dark green header, serif branding, location badge, search icon (completed 2026-03-25)
- [x] **Phase 18: Homepage Editorial Layout** - Hero article, top-stories scroller, topic sections, Eilmeldung banner (completed 2026-03-25)
- [ ] **Phase 19: Article Detail & Bottom Navigation** - Editorial typography on article page, bottom nav restyling
- [ ] **Phase 20: Search & Categories** - Search input, trending pills, category grid, recommended articles

## Phase Details

### Phase 16: Design System Foundation
**Goal**: All design tokens are in place so every subsequent phase can reference consistent fonts, colors, icons, and corners
**Depends on**: Nothing (first v1.1 phase, builds on existing Tailwind CSS v4 setup)
**Requirements**: DS-01, DS-02, DS-03, DS-04
**Success Criteria** (what must be TRUE):
  1. Newsreader renders on headline elements, Inter on body text, Work Sans on labels and uppercase UI text — visibly distinct across the site
  2. Styrian green (#2D5A27), warm cream (#fbfaee), alpine red (#8b0000), and muted sage (#4a5d4e) are available as Tailwind tokens and applied consistently
  3. Material Symbols Outlined icon font is loaded and an icon renders correctly in at least one reader frontend location
  4. All card and UI elements show sharp 2px border radius — no rounded corners remain from the old default
**Plans:** 2/2 plans complete
Plans:
- [ ] 16-01-PLAN.md — Define design tokens (fonts, colors, radius) in Tailwind v4 theme and root layout
- [ ] 16-02-PLAN.md — Apply tokens across all reader components (icons, fonts, colors, border-radius)

### Phase 17: Header & Identity
**Goal**: Every page opens with a recognizable Styrian identity bar and a dark green editorial header that communicates platform and location
**Depends on**: Phase 16
**Requirements**: HDR-01, HDR-02, HDR-03, HDR-04
**Success Criteria** (what must be TRUE):
  1. A fixed white/green horizontal stripe (Styrian flag) is visible at the top of every reader page on all screen sizes
  2. The header displays in dark green with "RegionalNews" in italic serif — immediately distinguishable from the v1.0 header
  3. A Steiermark location badge appears in the header on every page
  4. Tapping the search icon in the header navigates to the search page
**Plans:** 1/1 plans complete
Plans:
- [ ] 17-01-PLAN.md — Refactor Header.tsx with Styrian stripe, dark green styling, location badge, and search icon

### Phase 18: Homepage Editorial Layout
**Goal**: The homepage presents news in an editorial newspaper-like layout with a dominant hero, a scrollable top-stories row, themed topic sections, and a breaking news banner when warranted
**Depends on**: Phase 17
**Requirements**: HOME-01, HOME-02, HOME-03, HOME-04
**Success Criteria** (what must be TRUE):
  1. The featured article renders as a full-bleed hero with image, gradient overlay, category badge, and a large serif headline — visible without scrolling on mobile
  2. Below the hero, a row of cards labeled "Top-Meldungen" scrolls horizontally and each card has a colored bottom-border accent
  3. Topic sections below display an editorial grid with wood-divider separators and Styrian flag accents between sections
  4. When at least one article has the Eilmeldung flag set, a red "Eilmeldung" banner appears at the top of the homepage content area; when no article is flagged the banner is absent
**Plans:** 3/3 plans complete
Plans:
- [ ] 18-01-PLAN.md — Prisma migration (isEilmeldung, imageUrl), new query functions, unit tests
- [ ] 18-02-PLAN.md — Hero, Top-Meldungen, BezirkSection components + HomepageLayout + page.tsx rewire
- [ ] 18-03-PLAN.md — Eilmeldung banner component + layout.tsx wiring

### Phase 19: Article Detail & Bottom Navigation
**Goal**: Article pages use full editorial typography on a warm cream canvas, and the bottom navigation matches the new design system with a clear active-state pill
**Depends on**: Phase 16
**Requirements**: ART-01, ART-02, NAV-01, NAV-02
**Success Criteria** (what must be TRUE):
  1. An article detail page renders its headline in Newsreader serif and body paragraphs in Inter — no sans-serif headlines remain
  2. The article page background is warm cream (#fbfaee) with spacing and sizing consistent with the design system
  3. The bottom navigation bar shows a warm cream background with Material Symbols icons for all items
  4. The currently active navigation item is displayed as a filled green pill — all inactive items have no background highlight
**Plans**: TBD

### Phase 20: Search & Categories
**Goal**: Readers can search for articles by keyword and browse the full topic taxonomy from a single, well-designed discovery page
**Depends on**: Phase 17
**Requirements**: SRCH-01, SRCH-02, SRCH-03, SRCH-04
**Success Criteria** (what must be TRUE):
  1. The search page renders a large serif-styled search input; typing a query filters the displayed article results
  2. Trending topics appear as pill-shaped tags below the search input and tapping one filters results to that topic
  3. A category grid below trending topics lists all topic categories with hover/tap states; selecting one shows relevant articles
  4. A "Empfohlene Artikel" section renders below the category grid with article recommendations when no active search or filter is applied
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 3/3 | Complete | 2026-03-21 |
| 2. Ingestion | v1.0 | 7/7 | Complete | 2026-03-21 |
| 3. AI Pipeline | v1.0 | 5/5 | Complete | 2026-03-22 |
| 4. Scheduler | v1.0 | 4/4 | Complete | 2026-03-22 |
| 5. Editorial CMS | v1.0 | 8/8 | Complete | 2026-03-22 |
| 6. Reader Frontend | v1.0 | 7/7 | Complete | 2026-03-23 |
| 7. Extensibility Validation | v1.0 | 2/2 | Complete | 2026-03-23 |
| 8. Per-Source AI Config | v1.0 | 3/3 | Complete | 2026-03-23 |
| 9. Ad Config + Auth | v1.0 | 3/3 | Complete | 2026-03-24 |
| 10. Config Site Name | v1.0 | 1/1 | Complete | 2026-03-24 |
| 11. State-Wide Pipeline | v1.0 | 2/2 | Complete | 2026-03-25 |
| 12. Config Region List | v1.0 | 4/4 | Complete | 2026-03-25 |
| 13. Production Readiness | v1.0 | 1/1 | Complete | 2026-03-25 |
| 14. CMS Acceptance Gate | v1.0 | 1/1 | Complete | 2026-03-25 |
| 15. Tech Debt Cleanup | v1.0 | 1/1 | Complete | 2026-03-25 |
| 16. Design System Foundation | v1.1 | 2/2 | Complete | 2026-03-25 |
| 17. Header & Identity | 1/1 | Complete    | 2026-03-25 | - |
| 18. Homepage Editorial Layout | 3/3 | Complete   | 2026-03-25 | - |
| 19. Article Detail & Bottom Navigation | v1.1 | 0/TBD | Not started | - |
| 20. Search & Categories | v1.1 | 0/TBD | Not started | - |
