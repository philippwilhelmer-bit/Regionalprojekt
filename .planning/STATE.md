---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: The Modern Archivist
status: completed
stopped_at: Completed 37-01-PLAN.md
last_updated: "2026-04-01T22:08:38.440Z"
last_activity: 2026-04-01 — Plan 37-02 complete — theme persistence tests (CMS-02) + SRCH-01 token audit sealed
progress:
  total_phases: 5
  completed_phases: 5
  total_plans: 12
  completed_plans: 12
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-30)

**Core value:** Steiermark residents get relevant, hyperlocal news for their Bezirk — automatically, without an editorial team needed to run it.
**Current focus:** Phase 33 — Color Token Foundation

## Current Position

Phase: 37 of 37 (Search & CMS Refresh)
Plan: 02 complete — Phase 37 complete
Status: Phase 37 complete — v3.0 milestone complete
Last activity: 2026-04-01 — Plan 37-02 complete — theme persistence tests (CMS-02) + SRCH-01 token audit sealed

Progress: [██████████] 100%

## Performance Metrics

**Velocity (prior milestones):**
- v1.0: 52 plans over 5 days
- v1.1: 10 plans over 2 days
- v1.2: 7 plans over 2 days
- v2.0: 11 plans over 3 days

## Accumulated Context

### Decisions

See PROJECT.md Key Decisions for full history.

Recent decisions relevant to v3.0:
- Token migration uses two-phase rename (add new tokens alongside old → migrate utility classes → remove old) to prevent silent breakage
- Float-based ::first-letter drop cap (not initial-letter) — Firefox unsupported
- Weather widget: Server Component fetch with revalidate: 1800; no geolocation API (GDPR)
- "Das Grüne der Woche": nullable theme field on Article model (Prisma migration required in Phase 35)
- Plan 33-01: Clean break from 8 old tokens — no bridge aliases. Literal hex in color-mix() within @theme (not var()). --radius-sm override removed (Tailwind v4 default 0.25rem already correct). --spacing-gutter corrected to 1rem; --spacing-vertical: 1.7rem added.
- [Phase 33]: BEZIRK_COLORS/BEZIRK_BADGE_COLORS maps deleted from reader components — unified from-ink to-ink-soft gradient for all article cards
- [Phase 33]: ListItem border-b removed — tonal bg shift (bg-parchment hover:bg-parchment-dim) used for separation per TOKN-02
- [Phase 33]: Spinner uses style={{ borderRadius: 50% }} inline instead of rounded-full — functional circle exemption pattern established
- [Plan 33-03]: WurzelNavBar active state uses bg-aged-wood (not bg-ink) to preserve Wurzel brand distinction from RegionalNavBar
- [Plan 33-03]: Header/RegionalAppBar use bg-ink (Archivist editorial dark) — Styrian flag identity preserved via inline-style stripe above header
- [Plan 33-03]: HomepageLayout bg-background -> bg-parchment (former --color-background was parchment in old system)
- [Phase 34-shell-components]: Bezirk selector moved to hamburger drawer — openBezirkModal event preserved
- [Phase 34-shell-components]: Footer uses pb-28 for 112px bottom nav clearance
- [Phase 34-shell-components]: WurzelAppBar image avatar removed, replaced with left-aligned font-headline italic brand text
- [Phase 34-shell-components]: Tailwind v4 auto-generates -webkit-backdrop-filter for backdrop-blur-md — no manual override needed (verified via grep on tailwindcss/dist/lib.js)
- [Phase 34-shell-components]: [Plan 34-01]: WurzelNavBar aged-wood pill removed — top-border pattern (border-t-2 border-ink) replaces pill; inactive tabs use border-transparent for layout consistency
- [Phase 35-homepage-feature-components]: FragDenWurzelmannCard: bg-ink dark wrapper deferred to HomepageLayout Plan 03 — card is content-only for reusability
- [Phase 35-homepage-feature-components]: HeroArticle CTA: span (not button/Link) used inside outer Link — avoids nested interactives
- [Phase 35]: prisma db push used for theme migration due to migration drift; theme empty string maps to null in DB; GrueneWocheSection returns null on empty articles
- [Phase 35]: Weather API uses unstable_cache per bezirk slug — prevents cross-bezirk cache collision
- [Phase 35]: bg-ink dark accent zone combines WeatherWidget and FragDenWurzelmannCard as single visual block per Archivist tonal pattern
- [Plan 36-01]: Drop cap uses float::first-letter (not initial-letter) — Firefox support for initial-letter is incomplete
- [Plan 36-01]: isBlockquote detects > and \u201E (German lower-9 quote) as blockquote markers; stripBlockquotePrefix removes multiple quote styles
- [Plan 36-01]: prose class removed from article body — custom paragraph map provides full typographic control
- [Plan 36-01]: ShareButton temporarily in source attribution area — moves to sidebar in Plan 36-02
- [Plan 36-01]: bg-background replaced with bg-parchment on article page outer wrapper (deprecated token removal)
- [Plan 36-02]: ArticleSidebar sticky offset is top-[4rem] to clear WurzelAppBar/RegionalAppBar height
- [Plan 36-02]: ShareButton removed from source attribution area — now exclusively in sidebar (desktop) and metadata strip (mobile)
- [Plan 36-02]: AdUnit and related articles remain outside grid — they span full content column width
- [Plan 37-02]: SearchPageLayout.tsx was already fully Archivist-compliant — Task 2 was a verification seal with no code changes required
- [Plan 37-02]: Theme persistence tests confirm empty string normalizes to null in updateArticleDb (gruene_woche assign, clear, and preserve-on-omission all verified)
- [Plan 37-01]: Non-semantic admin badges (source type, category, keywords, bezirk preview) use bg-surface text-slate — no color meaning applied
- [Plan 37-01]: isPinned active state uses neutral bg-surface text-slate (not orange) — functional only
- [Plan 37-01]: isFeatured active state uses bg-ink/10 text-ink — editorial emphasis without purple
- [Plan 37-01]: theme option label is 'Grune der Woche' matching homepage section title
- [Plan 37-01]: UnsplashPicker hover:border-primary -> hover:border-ink; parchment-dim border replaces surface border on inputs

### Pending Todos

None.

### Blockers/Concerns

- Phase 35: useMeinBezirk() hook reactivity scope (shared context vs. storage event listeners) — decide at planning time
- Phase 35: Bezirk coordinate data for weather widget needs adding to bundesland.config.ts for all 13 Bezirke
- Phase 34: Tailwind v4 -webkit-backdrop-filter auto-prefix must be verified empirically at Phase 34 start

## Session Continuity

Last session: 2026-04-02T00:02:00Z
Stopped at: Completed 37-01-PLAN.md
Resume file: None
