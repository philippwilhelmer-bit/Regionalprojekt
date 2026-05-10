# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v3.1 — Basemap Article Images

**Shipped:** 2026-05-10
**Phases:** 3 | **Plans:** 6 | **Timeline:** 35-day calendar window (~3 active build days + verification pause)

### What Was Built
- mapgen.ts tile pipeline: sharp@0.33.5, lat/lon→XYZ math, 5×3 grid fetch with 5xx retry, 3-pass sharp stitch to 1200×630 JPEG, font-free SVG-glyph attribution, Vercel Blob upload, graceful null fallback
- Location intelligence: regex with lookahead/lookbehind word boundaries, Haiku LLM fallback, Nominatim geocoding, GeocodingCache Prisma model with upsert race handling
- Cron pipeline integration: map block after AI step2 with inner try/catch isolation, imageUrl guard preserving manually-set Unsplash images
- On-demand POST /api/admin/generate-map route (CRON_SECRET auth) + generateMapForArticle/backfillMapImages Server Actions (requireAuth) with 1100ms inter-call rate-limiting and take:10 batch cap
- CMS surface: ImagePickerTabs (Unsplash/Karte switcher, credit-driven default), MapPicker (preview + generate + remove), BackfillButton with German count display
- Verification fixes: basemap subdomain reduced to 'maps' after maps1–4 NXDOMAIN; PrismaPg driver adapter bypasses 5s Neon Rust-engine timeout from local dev; articles-utils.ts split keeps pg/Node-builtins off the client bundle

### What Worked
- TDD with RED→GREEN commits per task — every plan executed cleanly with test-vector corrections caught at GREEN phase (Graz tile coords, basemap.at vs wien.gv.at domain), not in production
- Graceful null fallback as a layered pattern — fetch fails, stitch fails, blob fails, geocode fails all return null and the article still publishes
- 1100ms inter-call delay applied uniformly (even on cache hits) — defensive hygiene that paid off when Nominatim was strict
- Inner try/catch separation for map block: clean autonomy guarantee preserved from v1.0
- Pre-existing v1.0 bezirke test failures correctly noted as out-of-scope rather than scope-creeping into v3.1
- Verification phase surfaced three real production-blocking bugs (basemap subdomains, Prisma timeout, pg in client bundle) — UAT pause was costly in calendar time but saved a broken prod deploy

### What Was Inefficient
- Phase 42-02 SUMMARY written retroactively on 2026-05-10 (gap from 2026-04-13 implementation) — GSD accounting drifted during the verification pause
- ROADMAP plan checkboxes for Phase 42 stale until milestone close (same cosmetic issue as v2.0 and v3.0) — auto-flip on plan completion would close this loop
- CMS-01 REQUIREMENTS checkbox flipped at milestone close, not at phase close — same documentation drift class
- Verification surfaced three pre-existing infrastructure issues that should have been caught earlier: af51de6 had to fix mapgen subdomain round-robin (Phase 40 regression as upstream maps1–4 retired), Prisma timeout (env drift), and Blob store provisioning gap
- Build failure on first Vercel deploy after af51de6 — pg pulled into client bundle via HomepageLayout → articles.ts → prisma.ts → adapter-pg → pg chain. Would have been caught by `next build` locally before push
- 35-day calendar window vs ~3 active days — implementation finished 2026-04-13 but verification slipped 27 days. Validation should happen the same week as implementation while context is fresh
- No VERIFICATION.md for Phase 42 (only UAT.md) — Phases 40 and 41 had both; Phase 42 took the UAT-only path

### Patterns Established
- TDD RED commit + GREEN commit per task (separate commits for failing tests vs implementation) — clean git history showing what was tested before built
- Pure functions extracted to test-friendly module (mapgen.ts) — DB-free, fetch-mockable, sharp-only-at-edge
- Inner try/catch around resilient background work (map generation) — separate from per-article catch to prevent retryCount inflation
- Server Action (requireAuth) for CMS, Route Handler (CRON_SECRET) for cron — splits auth concern by entry point because next/headers is Route-Handler-unavailable
- 1100ms setTimeout AFTER each external API call (not before) — rate-limit hygiene at the call site, not speculative
- Cache-aside upsert with `update: {}` (no-op) — clean concurrent-write race handling in Prisma without P2002 inspection
- vi.useFakeTimers + vi.runAllTimersAsync for testing async setTimeout delays in Server Actions
- "Pure utils" file pattern: when a module pulls in heavy backend deps (pg, sharp) but exports a tiny pure helper, extract the pure helper to its own file so client bundles can import safely
- SVG path-based glyphs (no `<text>`) for attribution overlays — font-free, lambda-portable
- 3-pass sharp pipeline with PNG intermediates — required for sharp re-input compatibility

### Key Lessons
1. **Verify locally before pushing to Vercel** — `next build` would have caught the pg-in-client-bundle webpack failure that burned one deploy. Add to muscle memory before milestone push.
2. **Verification should happen the same week as implementation** — 27-day gap let context fade and surfaced three infrastructure issues at once instead of in isolation
3. **Auto-flip ROADMAP/REQUIREMENTS checkboxes on plan completion** — the same cosmetic drift hit v2.0, v3.0, and now v3.1. Stop documenting; automate.
4. **Layered graceful fallback is worth the explicit code** — every layer (fetch, stitch, blob, geocode, regex, LLM) returns null cleanly. Cron stays unbreakable, which is the v1.0 autonomy guarantee.
5. **Heavy backend deps must not leak into client bundles** — when a util lives next to prisma/pg code, extract it the moment a client component touches it; don't wait for the webpack error
6. **External infrastructure decays** — basemap.at maps1–4 subdomains were valid in Phase 40 research, NXDOMAIN by Phase 42 UAT. Smoke-test external endpoints during verification, not just at research time.
7. **TDD test-vector corrections at GREEN phase are normal** — three Rule-1 bug fixes in Phase 40 alone (Graz coords, URL domain, sharp PNG intermediates) were all caught by tests before merge. Trust the cycle.
8. **Driver adapter migrations need bundle-impact testing** — switching from `@prisma/client` to `@prisma/adapter-pg` solved local timeouts but introduced raw `pg` which broke client bundling. Bundle should be verified after any transport-level dep change.

### Cost Observations
- Model mix: balanced profile (opus for orchestration + verification, sonnet for execution + TDD)
- Sessions: ~3 active implementation sessions (2026-04-13) + 1 long verification session (2026-05-10)
- Notable: implementation phase was extremely fast (~3 hours total across 6 plans) — verification pause + diagnostic detour dominated calendar time

---

## Milestone: v3.0 — The Modern Archivist

**Shipped:** 2026-04-05
**Phases:** 7 | **Plans:** 12 + 2 quick tasks | **Timeline:** 5 days

### What Was Built
- MD3-style Archivist token system (Ink/Parchment/Slate/Aged Wood) with ~30 semantic tokens, glassmorphism via color-mix(), ink-tinted shadows
- Glassmorphic bottom nav with top-border active state, dark editorial footer, responsive hamburger header with desktop Bezirk selector
- Homepage features: weather widget (Open-Meteo), Das Grüne der Woche themed section, Frag den Wurzelmann card, MascotGreeting tonal restyle, Topmeldung CTA
- Article detail: archival header with overlapping title, float-based drop cap, serif blockquote styling, responsive sticky sidebar
- Full CMS admin and search page migrated to Archivist tokens (20 admin files)
- Gap closure: frontmatter traceability, nav active state, Kontakt link, desktop Bezirk selector

### What Worked
- Foundation-first sequencing (Phase 33 tokens → 34 shell → 35-37 surfaces) proven for third consecutive redesign milestone — zero rework
- Quick tasks for gap closure (Phases 38-39) were faster than full plan/execute cycles for small fixes
- Two-phase token rename strategy (add new alongside old → migrate → remove old) prevented silent breakage during migration
- Research phases identified cross-browser issues early (initial-letter Firefox gap, backdrop-filter Safari quirks)
- Milestone audit caught 5 gaps (3 frontmatter, 2 integration) that quick tasks resolved cleanly

### What Was Inefficient
- Bezirk selector visibility regression on desktop — moved to hamburger drawer in Phase 34 without preserving desktop access, caught only at milestone completion
- ROADMAP.md plan checkboxes out of sync (Phases 34, 35, 37 show `[ ]` despite SUMMARY.md existing) — same cosmetic issue as v2.0
- Prisma db push used instead of formal migration for Article.theme — creates migration drift risk
- Phase 38/39 directories created but empty (no PLAN/SUMMARY files) — quick task artifacts live in .planning/quick/ instead

### Patterns Established
- `color-mix()` in @theme for glassmorphism surfaces — native CSS, no JS runtime, auto-prefixed by Tailwind v4
- Float-based `::first-letter` drop cap pattern — cross-browser fallback for `initial-letter`
- `unstable_cache` per bezirk slug for weather — prevents cross-key cache collision in Next.js
- Archival Header: negative margin title overlay on hero image — creates print-magazine feel
- Tonal three-zone homepage: parchment sections, surface sections, ink accent zone

### Key Lessons
1. Desktop UX must be verified alongside mobile — hamburger-only Bezirk selector was a regression caught late
2. Quick tasks are the right tool for gap-closure fixes < 3 tasks — faster than full plan/execute cycle
3. Three consecutive design milestones confirm: foundation-first phase ordering eliminates rework
4. Prisma db push is expedient but creates migration drift — formal migration should be preferred for schema changes
5. Token migration at scale (20+ files) benefits from systematic file-by-file approach with build verification after each batch

### Cost Observations
- Model mix: balanced profile (opus orchestration, sonnet execution)
- Sessions: ~5-6 across 5 days
- Notable: Phases 33-37 all completed on 2026-04-01 (single day for core work), gap closure on 2026-04-05

---

## Milestone: v2.0 — Wurzelwelt Rebrand

**Shipped:** 2026-03-30
**Phases:** 7 | **Plans:** 11 | **Timeline:** 3 days

### What Was Built
- "Wurzelwelt" brand identity: forest green/moss/terracotta/warm cream palette, Plus Jakarta Sans + Newsreader typography, Material Symbols Rounded
- WurzelAppBar + WurzelNavBar app chrome replacing Styrian-branded header and nav
- Homepage redesign: MascotGreeting speech-bubble, Topmeldung hero with gradient overlay, RegionalEditorialCard, tonal section alternation, prioritized "Mein Bezirk"
- Article detail page and CMS admin fully restyled with Wurzelwelt semantic tokens
- Icon/token consistency fix and independent verification of all 18 requirements

### What Worked
- Design token foundation in Phase 26 enabled all subsequent phases to build cleanly — same pattern proven in v1.1, scaled again
- Milestone audit caught 5 real gaps (icon class mismatch, missing verification, zinc residuals, traceability table) — gap-closure phases 31-32 resolved all
- "Clean break" approach: replacing all legacy v1.1 tokens with new semantic names prevented token confusion across phases
- Iterative visual review for Wurzelmann avatar size (6 iterations from 56px to 360px) — user feedback loop worked well
- CTA gradient pill pattern established once (Phase 26-02) and reused consistently across homepage, article detail, and admin

### What Was Inefficient
- Phase 30 ROADMAP.md plan checkboxes not updated by CLI (30-01, 30-02, 31-01, 32-01 still show `[ ]` in roadmap despite SUMMARY.md existing) — cosmetic but confusing
- Old RegionalAppBar/RegionalNavBar components preserved rather than deleted — added to tech debt
- SUMMARY frontmatter gaps (DS-04-07 missing from 26-02-SUMMARY.md) — documentation drift not caught until audit
- Nyquist validation missing for all 7 phases — skipped during fast execution cycle

### Patterns Established
- Semantic token naming: `text-text`, `bg-background`, `bg-surface`, `bg-surface-elevated` — role-based, not color-based
- Tonal section separation: alternating `bg-background` / `bg-surface` with `py-[var(--spacing-section)]` gaps
- CTA gradient pill: `bg-gradient-to-br from-primary to-primary-container rounded-full`
- Admin tonal error: `bg-accent/10 text-accent rounded-sm` instead of bordered red boxes
- Time-of-day client component: `"use client"` for `getHours()` detection in MascotGreeting

### Key Lessons
1. Design rebrand milestones execute fastest with foundation-first sequencing — same lesson as v1.1, now verified across two redesigns
2. Milestone audits remain essential — v2.0 audit caught 5 gaps that gap-closure phases 31-32 resolved cleanly
3. SUMMARY frontmatter should be validated against VERIFICATION.md during phase completion — audit found documentation drift
4. Interactive visual review checkpoints (like avatar sizing) work well for subjective design decisions — worth the iteration cost
5. "Preserve old components" adds tech debt — better to delete replaced components and let git history be the backup

### Cost Observations
- Model mix: balanced profile (opus orchestration, sonnet execution)
- Sessions: ~4-5 across 3 days
- Notable: gap-closure phases (31-32) executed in single session — very fast once audit identified specific issues

---

## Milestone: v1.2 — Test Deployment

**Shipped:** 2026-03-28
**Phases:** 5 | **Plans:** 7 | **Timeline:** 2 days

### What Was Built
- Live Vercel + Neon deployment at regionalprojekt.vercel.app (deviated from Railway at user request)
- TestSiteBanner component on all reader and admin pages, gated by NEXT_PUBLIC_IS_TEST_SITE
- SEO suppression: dynamic robots.txt Disallow, empty sitemap, noindex/nofollow meta tags
- AdSense defense-in-depth: root layout script gate + AdUnit null guard
- Cron pipeline via Vercel cron → /api/cron with CRON_SECRET bearer auth

### What Worked
- Single env var pattern (NEXT_PUBLIC_IS_TEST_SITE) kept test-mode implementation clean — 6 files, one check each
- Audit-driven gap closure: first audit found 3/9 requirements gaps, spawned phases 23-25, second audit passed 9/9
- Quick platform pivot (Railway → Vercel+Neon) executed smoothly — Vercel's Next.js integration eliminated config overhead
- Defense-in-depth for AdSense (two layers) was right call — root layout gate covers scripts, AdUnit guard covers component rendering

### What Was Inefficient
- Phase 21 original plan (Railway) became partially obsolete when switching to Vercel — Plan 21-01 artifacts (railway.toml, PORT binding) were never deployed
- Milestone required 3 gap-closure phases (23-25) that could have been anticipated upfront if deployment verification was in scope from the start
- Nyquist validation remained partial across all 5 phases — wave_0 not completed for any phase

### Patterns Established
- Env-var gating for deployment modes: `NEXT_PUBLIC_IS_TEST_SITE === 'true'` as universal test-mode gate
- Server Component conditional rendering: `if (isTestSite) return null` as first guard in components
- generateMetadata() as named function (not const) for runtime env var checks
- Defense-in-depth: multiple guard layers for safety-critical suppression (AdSense)

### Key Lessons
1. Infrastructure decisions (hosting platform) should be validated with the user before deep planning — Railway plan was written before user expressed Vercel preference
2. Deployment verification should be a planned phase, not an afterthought — requirements like "shareable URL works" need explicit verification
3. Single env-var gating scales well for test/prod mode switching — clean, auditable, no code changes to go production
4. Milestone audits are essential — caught 3 real gaps that would have been missed without systematic review

### Cost Observations
- Model mix: balanced profile (opus orchestration, sonnet execution)
- Sessions: ~3-4 across 2 days
- Notable: gap-closure phases (23-25) were very small (1 plan each) — fast to execute once gaps were identified

---

## Milestone: v1.1 — Design Overhaul

**Shipped:** 2026-03-26
**Phases:** 5 | **Plans:** 10 | **Timeline:** 2 days

### What Was Built
- Design system foundation: Newsreader/Inter/Work Sans fonts, Styrian green + warm cream palette, Material Symbols, 2px radius
- Editorial header with Styrian identity stripe, serif branding, and location badge
- Newspaper-style homepage: full-bleed hero, top-stories scroller, Bezirk-grouped sections, Eilmeldung banner
- Article detail restyling: hero image, editorial typography, warm cream canvas
- Bottom nav with active green pill state
- Search/discovery page: text + Bezirk AND filtering, trending pills, category grid, recommended articles

### What Worked
- Phase sequencing was well-designed — design tokens first, then components, then pages — zero rework
- RSC page + client layout pattern consistent across homepage, article detail, and search page
- DAL overload pattern scaled cleanly — adding listArticlesForSearch was trivial following established pattern
- TDD on DAL functions caught edge cases (status filter, ordering) before UI integration
- UAT after final phase caught missing back navigation — fixed immediately before milestone close

### What Was Inefficient
- Dev server management during UAT required manual restarts — port conflicts from stale processes
- Pre-existing /impressum build error surfaced during verification but was unrelated to v1.1 work
- Phase 18 required a manual Prisma migration due to dev DB migration mismatch — could have been documented earlier

### Patterns Established
- `SearchPageLayout` pattern: RSC page fetches data in parallel, passes to "use client" layout component with filter state
- `toggleBezirk` single handler shared between pill and grid — single source of truth for activeBezirkId
- Discovery → Filtered transition: `isFiltered` boolean conditionally shows/hides entire UI zones
- `type="text"` over `type="search"` for cross-browser clear button consistency

### Key Lessons
1. Frontend redesign milestones benefit from strict phase ordering (tokens → components → pages) — prevents rework
2. Pure frontend phases execute faster than mixed data+UI phases — v1.1 was 2 days vs v1.0's 5 days
3. UAT catches UX gaps that automated tests miss (back navigation) — always run before milestone close
4. Client-side search works well at 200-article scale but needs server-side API planning for growth

### Cost Observations
- Model mix: sonnet for execution, opus for orchestration
- Sessions: ~5 across 2 days
- Notable: pure UI phases averaged 2-3 plans each — much smaller than v1.0 data+logic phases

---

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-25
**Phases:** 15 | **Plans:** 52 | **Timeline:** 5 days

### What Was Built
- Autonomous AI news platform with full ingestion → generation → publish pipeline
- Editorial CMS with auth, article CRUD, exception queue, source management, AI config
- Reader frontend with "Mein Bezirk" personalization, RSS feeds, SEO, AdSense, Impressum
- Config-driven Bundesland deployment (change one file to deploy for a new region)
- Extensibility validated with second RSS adapter (ORF Steiermark)

### What Worked
- Wave 0 (test stubs first) pattern prevented integration surprises — tests existed before implementation
- Config-driven architecture payoff: phases 9-13 were mostly wiring config into existing components
- pgLite in-process test DB eliminated infrastructure dependency — fast tests, zero setup
- Server Component CMS with FormData actions — minimal boilerplate vs API layer approach
- Milestone audit (phases 8-15) caught real gaps before declaring v1.0 done

### What Was Inefficient
- Phase 5 was the largest phase (8 plans) — auth split (node/edge) and Tailwind v3→v4 upgrade caused unexpected rework
- OTS.at API format researched but never verified with real credentials — defensive field extraction may need revision
- Phases 8-15 were gap-closure phases added after initial 7-phase roadmap — better upfront audit would have caught these earlier
- Some plan summaries recorded `0 tasks` due to state tracking inconsistency

### Patterns Established
- DI via TypeScript overloads: zero-arg for production singleton, client-injection for tests
- Wave 0 stubs with `it.todo()` — no imports until implementation exists
- Migration SQL hand-crafted for pgLite compatibility (sorted directory scan)
- `*Db` functions exported separately from Server Action wrappers for testability
- `bundesland.config.ts` as single source of truth for all deployment-specific values

### Key Lessons
1. Plan the milestone audit phases upfront — gap-closure phases (8-15) doubled the phase count but were necessary for production quality
2. Auth in Next.js 15 with Edge middleware requires separate node/edge modules — plan for this complexity early
3. Adapter pattern pays off quickly — second RSS adapter was trivial to add, validating the architecture
4. Config-driven deployment is worth the upfront investment — wiring phases are small and mechanical

### Cost Observations
- Model mix: balanced profile (opus for planning/verification, sonnet for execution, haiku for tools)
- Sessions: ~15-20 across 5 days
- Notable: gap-closure phases (8-15) were fast — mostly 1-3 plan phases with mechanical changes

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Timeline | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | 5 days | 15 | Initial build — gap-closure phases added mid-milestone |
| v1.1 | 2 days | 5 | Pure frontend redesign — no gap-closure needed |
| v1.2 | 2 days | 5 | Deployment + test mode — 3 gap-closure phases from audit |
| v2.0 | 3 days | 7 | Full rebrand — 2 gap-closure phases from audit |
| v3.0 | 5 days | 7 | Archivist identity — 2 quick-task gap-closure phases |
| v3.1 | 35d calendar / ~3 active | 3 | First backend-heavy milestone since v1.0 — verification pause exposed external-infra decay |

### Cumulative Quality

| Milestone | LOC | Files | Architecture |
|-----------|-----|-------|-------------|
| v1.0 | 10,303 | 278 | Config-driven, adapter pattern, Server Components |
| v1.1 | +8,357 | 67 | Design tokens, editorial components, RSC+client layouts |
| v1.2 | +4,976 | 79 | Env-var test mode, Vercel+Neon deployment, defense-in-depth AdSense |
| v2.0 | +6,704 | 129 | Wurzelwelt rebrand, semantic tokens, tonal design, mascot identity |
| v3.0 | +3,515 | 55 | Archivist identity, MD3 tokens, glassmorphism, weather, drop caps |
| v3.1 | +9,630 | 56 | basemap.at tile pipeline, Nominatim geocoding cache, PrismaPg adapter, CMS Karte tab |

### Top Lessons (Verified Across Milestones)

1. Wave 0 test stubs before implementation catches integration issues early
2. Config-driven architecture reduces per-deployment effort to near-zero
3. Strict phase ordering (foundations first, then consumers) prevents rework — validated in v1.0, v1.1, v2.0
4. UAT after final phase catches UX gaps that automated tests miss — back navigation (v1.1), CMS acceptance (v1.0)
5. Milestone audits catch real gaps — v1.0 spawned 8 gap-closure phases, v1.2 spawned 3, v2.0 spawned 2 — consistently essential
6. Validate infrastructure decisions with user before planning — v1.2 Railway→Vercel pivot wasted one plan
7. Design rebrand milestones execute fastest with foundation-first sequencing — verified across v1.1, v2.0, and v3.0
8. Quick tasks are the right tool for small gap-closure fixes — faster than full plan/execute cycles (v3.0)
9. Desktop UX must be verified alongside mobile — hamburger-only patterns can regress desktop discoverability (v3.0)
10. Run `next build` locally before pushing milestone-close commits to Vercel — webpack client-bundle failures aren't caught by unit tests (v3.1)
11. Same-week verification keeps context fresh and surfaces infrastructure issues in isolation, not all at once (v3.1)
12. Layered graceful null fallback at every external boundary preserves the v1.0 autonomy guarantee through backend-heavy milestones (v3.1)
