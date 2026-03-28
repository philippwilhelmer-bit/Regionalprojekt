# Roadmap: Regionalprojekt (Wurzelwelt)

## Milestones

- ✅ **v1.0 MVP** — Phases 1-15 (shipped 2026-03-25)
- ✅ **v1.1 Design Overhaul** — Phases 16-20 (shipped 2026-03-26)
- ✅ **v1.2 Test Deployment** — Phases 21-25 (shipped 2026-03-28)
- 🚧 **v2.0 Wurzelwelt Rebrand** — Phases 26-30 (in progress)

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

### 🚧 v2.0 Wurzelwelt Rebrand (In Progress)

**Milestone Goal:** Full visual rebrand from "Ennstal Aktuell" to "Wurzelwelt" — new brand identity with Wurzelmann mascot, "Modern Mountain Folklore" design system, redesigned homepage components, and CMS restyling.

- [ ] **Phase 26: Design System & Brand Foundation** - New color palette, typography, icons, spacing, naming, mascot asset
- [ ] **Phase 27: App Chrome** - WurzelAppBar and WurzelNavBar replacing current header and bottom nav
- [ ] **Phase 28: Homepage Components** - MascotGreeting, Topmeldung, RegionalEditorialCard, Mein Bezirk section, tonal section separation
- [ ] **Phase 29: Article Detail** - Article detail page restyled with new palette, typography, and spacing
- [ ] **Phase 30: CMS Admin Restyling** - Admin pages restyled with Wurzelwelt brand tokens

## Phase Details

### Phase 26: Design System & Brand Foundation
**Goal**: The Wurzelwelt visual language is fully defined — every token, font, icon variant, spacing rule, and brand name is in place so all subsequent phases can build on a coherent foundation.
**Depends on**: Phase 25
**Requirements**: DS-01, DS-02, DS-03, DS-04, DS-05, DS-06, DS-07, BRAND-01, BRAND-02
**Success Criteria** (what must be TRUE):
  1. The site displays forest green / moss / terracotta / warm cream colors drawn from the Tailwind theme tokens (no hardcoded hex values in components)
  2. Body text and UI labels render in Plus Jakarta Sans; headlines render in Newsreader
  3. All icons throughout the reader and admin are the Rounded variant of Material Symbols
  4. No visible 1px borders exist anywhere — section separation is achieved through tonal background differences
  5. All interactive elements (buttons, inputs, cards) have soft corners and the Wurzelwelt site name appears everywhere "Ennstal Aktuell" previously appeared; Wurzelmann mascot image is served from public assets
**Plans:** 3 plans

Plans:
- [ ] 26-01-PLAN.md — Wurzelwelt color tokens, Plus Jakarta Sans font, Material Symbols Rounded
- [ ] 26-02-PLAN.md — Border-to-tonal migration, corner radius, organic spacing, CTA gradient
- [ ] 26-03-PLAN.md — Brand rename (Ennstal Aktuell to Wurzelwelt) and Wurzelmann mascot asset

### Phase 27: App Chrome
**Goal**: Every page is framed by the Wurzelwelt app chrome — the centered logo app bar at the top and the 4-tab rounded icon nav bar at the bottom.
**Depends on**: Phase 26
**Requirements**: COMP-01, COMP-06
**Success Criteria** (what must be TRUE):
  1. The header shows "WURZELWELT" in bold uppercase Newsreader centered on the bar with the Wurzelmann avatar beside it
  2. The bottom navigation has exactly 4 tabs, each using rounded Material Symbols icons, with the active tab clearly indicated using the Wurzelwelt accent treatment
  3. Both the app bar and bottom nav are visible on every reader page (homepage, article detail, search)
**Plans**: TBD

### Phase 28: Homepage Components
**Goal**: The homepage delivers the full Wurzelwelt editorial experience — mascot greeting, featured top story with gradient overlay, regional editorial cards, a prioritized Mein Bezirk section, and tonal section alternation.
**Depends on**: Phase 27
**Requirements**: COMP-02, COMP-03, COMP-04, COMP-05, COMP-07
**Success Criteria** (what must be TRUE):
  1. A speech-bubble card with "Wurzelmann sagt:" and a quote from the mascot appears on the homepage above the main content
  2. The top story renders as a full-bleed image with a dark gradient overlay behind the headline text (text is legible against any image)
  3. Article cards display full-width aspect-video images with Newsreader serif headlines and uppercase Jakarta Sans category labels
  4. The reader's selected Bezirk section appears at the top of the content area with a visually larger featured card compared to non-selected sections
  5. Alternating homepage sections are distinguished by tonal background shifts (#FCF9EF / #F6F4EA) with no border lines between them
**Plans**: TBD

### Phase 29: Article Detail
**Goal**: The article detail page is fully restyled to match the Wurzelwelt design system — correct palette, typography, and spacing throughout.
**Depends on**: Phase 26
**Requirements**: ART-01
**Success Criteria** (what must be TRUE):
  1. The article page body uses Plus Jakarta Sans at the organic spacing scale with warm cream (#FCF9EF) as the canvas color
  2. Article headlines render in Newsreader at the correct type scale with no legacy Styrian green colors visible
  3. The article detail page is visually consistent with the homepage components (same tokens, same corner radius, same icon variant)
**Plans**: TBD

### Phase 30: CMS Admin Restyling
**Goal**: The CMS admin interface is restyled with Wurzelwelt brand tokens so the editor experience matches the reader-facing identity.
**Depends on**: Phase 26
**Requirements**: CMS-01
**Success Criteria** (what must be TRUE):
  1. CMS admin pages display the Wurzelwelt color palette (no legacy Styrian green or cream from v1.1)
  2. Admin typography uses Plus Jakarta Sans for body and labels, Newsreader for any headings
  3. Admin buttons, inputs, and interactive elements have rounded corners and gradient CTAs consistent with the design system
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-15 | v1.0 | 52/52 | Complete | 2026-03-25 |
| 16-20 | v1.1 | 10/10 | Complete | 2026-03-26 |
| 21-25 | v1.2 | 7/7 | Complete | 2026-03-28 |
| 26. Design System & Brand Foundation | v2.0 | 0/3 | Not started | - |
| 27. App Chrome | v2.0 | 0/TBD | Not started | - |
| 28. Homepage Components | v2.0 | 0/TBD | Not started | - |
| 29. Article Detail | v2.0 | 0/TBD | Not started | - |
| 30. CMS Admin Restyling | v2.0 | 0/TBD | Not started | - |
