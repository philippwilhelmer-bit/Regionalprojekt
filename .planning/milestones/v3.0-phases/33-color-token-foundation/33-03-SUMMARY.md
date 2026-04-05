---
phase: 33-color-token-foundation
plan: "03"
subsystem: ui
tags: [tailwind, css, design-tokens, color-system, reader-components]

# Dependency graph
requires:
  - phase: 33-01
    provides: Complete Archivist @theme token system in globals.css
  - phase: 33-02
    provides: 9 core reader components migrated to Archivist tokens (ArticleCard, TopMeldungenRow, ListItem, ArticleFeed, HeroArticle, EditorialCard, SearchPageLayout, BezirkModal, CookieBanner)
provides:
  - 5 nav/shell components migrated to Archivist tokens (BottomNavClient, RegionalNavBar, WurzelNavBar, WurzelAppBar, Footer)
  - Complete reader directory audit sweep — all remaining components migrated
  - shadow-[var(--shadow-nav)] pattern established across all 3 bottom nav components
  - bg-aged-wood accent pattern for WurzelNavBar and EilmeldungBanner
  - bg-ink header pattern for Header and RegionalAppBar
  - Zero token violations across entire src/components/reader/ directory
affects: [34-glassmorphism-nav, 35-reader-features]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "shadow-[var(--shadow-nav)] for ink-tinted bottom nav shadow (replaces shadow-[rgba(0,0,0,0.06)])"
    - "rounded-none on WurzelNavBar container (straight top edge, Phase 34 redesigns)"
    - "style={{ borderRadius: '50%' }} for functional circles (avatar images) — not decorative radius"
    - "bg-ink/bg-parchment for editorial header/surface contrast"
    - "bg-aged-wood for warm dark accent surfaces (Wurzel brand, Eilmeldung)"

key-files:
  created: []
  modified:
    - src/components/reader/BottomNavClient.tsx
    - src/components/reader/RegionalNavBar.tsx
    - src/components/reader/WurzelNavBar.tsx
    - src/components/reader/WurzelAppBar.tsx
    - src/components/reader/Footer.tsx
    - src/components/reader/AdUnitClient.tsx
    - src/components/reader/BezirkSection.tsx
    - src/components/reader/EilmeldungBanner.tsx
    - src/components/reader/Header.tsx
    - src/components/reader/HomepageLayout.tsx
    - src/components/reader/MascotGreeting.tsx
    - src/components/reader/RegionalAppBar.tsx
    - src/components/reader/RegionalEditorialCard.tsx
    - src/components/reader/RegionalSelector.tsx
    - src/components/reader/ShareButton.tsx

key-decisions:
  - "WurzelNavBar active indicator uses bg-aged-wood (not bg-ink) — preserves terracotta-brand distinction from RegionalNavBar"
  - "Header and RegionalAppBar use bg-ink (not inline Styrian green) — editorial dark is the correct Archivist semantic for these headers"
  - "WurzelAppBar avatar: style={{ borderRadius: '50%' }} exempts functional circle from TOKN-03 decorative radius rule"
  - "HomepageLayout bg-background -> bg-parchment (the actual rendered value of --color-background was parchment)"

patterns-established:
  - "shadow-nav: shadow-[var(--shadow-nav)] on all bottom navs — references @theme --shadow-nav ink-tinted token"
  - "Aged-wood accent: bg-aged-wood for Wurzel-brand active states and urgent banners (EilmeldungBanner)"
  - "Ink header: bg-ink + text-parchment for dark editorial app bars"

requirements-completed: [TOKN-03, TOKN-06]

# Metrics
duration: 25min
completed: 2026-04-01
---

# Phase 33 Plan 03: Nav/Shell Migration and Final Audit Summary

**5 nav/shell components migrated to shadow-[var(--shadow-nav)] and Archivist tokens; full reader directory audit sweep achieves zero violations across old-tokens, radii, shadows, zinc, and Bezirk color maps**

## Performance

- **Duration:** 25 min
- **Started:** 2026-04-01T16:30:00Z
- **Completed:** 2026-04-01T16:55:00Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments
- Replaced `shadow-[0_-2px_8px_rgba(0,0,0,0.06)]` with `shadow-[var(--shadow-nav)]` in all 3 bottom nav components (BottomNavClient, RegionalNavBar, WurzelNavBar)
- Removed all `rounded-full`, `rounded-t-2xl` from nav pill indicators and WurzelNavBar container; replaced with `rounded-xs` or `rounded-none`
- Migrated WurzelAppBar avatar from `rounded-full` class to `style={{ borderRadius: '50%' }}` inline (functional circle exemption)
- Full audit sweep across ALL reader components — all 5 violation categories (old tokens, oversized radii, raw shadows, zinc, Bezirk color maps) return 0 matches
- Build succeeds cleanly; pre-existing test failures (bezirke, root-layout-adsense, db-layer) are unrelated to CSS changes
- Plan 02's scope (9 core reader components) had already been handled by a parallel agent run, confirmed clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate nav/shell components** - `7f7fb95` (feat)
2. **Task 2: Full codebase verification sweep and build confirmation** - `8341ec6` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/components/reader/BottomNavClient.tsx` - shadow-[var(--shadow-nav)], rounded-xs pills, bg-ink active, text-slate inactive
- `src/components/reader/RegionalNavBar.tsx` - same pattern as BottomNavClient
- `src/components/reader/WurzelNavBar.tsx` - shadow-[var(--shadow-nav)], rounded-none container, bg-aged-wood active
- `src/components/reader/WurzelAppBar.tsx` - bg-aged-wood header, avatar borderRadius: 50% inline, text-parchment
- `src/components/reader/Footer.tsx` - zinc-500/600/700 -> ink-muted/ink-soft/ink
- `src/components/reader/AdUnitClient.tsx` - bg-zinc-100 -> bg-surface, text-zinc-400 -> text-ink-dim
- `src/components/reader/BezirkSection.tsx` - text-primary -> text-ink
- `src/components/reader/EilmeldungBanner.tsx` - bg-accent -> bg-aged-wood
- `src/components/reader/Header.tsx` - bg-primary -> bg-ink, text-white -> text-parchment
- `src/components/reader/HomepageLayout.tsx` - bg-background -> bg-parchment, text-primary -> text-ink, text-text -> text-ink
- `src/components/reader/MascotGreeting.tsx` - text-primary -> text-ink-muted, text-text -> text-ink
- `src/components/reader/RegionalAppBar.tsx` - bg-primary -> bg-ink, text-white -> text-parchment
- `src/components/reader/RegionalEditorialCard.tsx` - from-primary/to-secondary -> from-ink/to-ink-soft, text-primary -> text-ink-muted
- `src/components/reader/RegionalSelector.tsx` - zinc-* -> ink-dim/ink, text-primary -> text-ink, bg-primary/10 -> bg-ink/10
- `src/components/reader/ShareButton.tsx` - text-secondary -> text-slate

## Decisions Made
- WurzelNavBar active indicator: `bg-aged-wood` (warm dark accent) to preserve Wurzel brand distinction from `bg-ink` used in RegionalNavBar — different editorial personalities
- Header/RegionalAppBar: `bg-ink` chosen over inline Styrian green hex — the Archivist ink color (#071806) is the correct editorial dark header, Styrian flag identity preserved via the inline-style stripe above the header
- HomepageLayout bg-background swap: former `--color-background` was parchment in the old system; `bg-parchment` is the exact semantic equivalent

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Extended scope to cover all reader components beyond plan's 5 files**
- **Found during:** Task 2 (full audit sweep)
- **Issue:** Plan 02 had not yet been executed when Task 1 ran, leaving violations in AdUnitClient, BezirkSection, EilmeldungBanner, Header, HomepageLayout, MascotGreeting, RegionalAppBar, RegionalEditorialCard, RegionalSelector, ShareButton (and others)
- **Fix:** Fixed all remaining violations as part of Task 2 audit sweep — 10 additional files migrated
- **Files modified:** As listed above
- **Verification:** All 5 audit categories return 0 violations
- **Committed in:** `8341ec6` (Task 2 commit)

Note: By the time Task 2 was committed, Plan 02 had also executed (parallel agent), confirming no double-fixes and no conflicts in the overlapping files.

---

**Total deviations:** 1 auto-fixed (Rule 3 blocking — scope extension to complete full audit)
**Impact on plan:** Necessary to satisfy plan's must_have truth "The entire reader component directory passes a clean token audit." No scope creep.

## Issues Encountered
- Plan 02 was executed in parallel by another agent during this plan's execution — discovered after Task 1 commit. Some files (ArticleCard, TopMeldungenRow, ListItem, ArticleFeed, HeroArticle, EditorialCard, SearchPageLayout, BezirkModal, CookieBanner) were already migrated by that agent. No conflicts resulted.
- `npx` requires explicit PATH setup on this machine: `export PATH="/Users/philipp/.nvm/versions/node/v24.13.1/bin:$PATH"`

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- All reader components exclusively use Archivist tokens (ink, parchment, slate, aged-wood families)
- Phase 33 requirements TOKN-01 through TOKN-06 are fully satisfied
- Phase 34 (glassmorphism nav) can proceed — WurzelNavBar has straight top edge (rounded-none) as required
- Phase 34 must empirically verify Tailwind v4 -webkit-backdrop-filter auto-prefix (blocker noted in STATE.md)

## Self-Check: PASSED

- FOUND: `src/components/reader/BottomNavClient.tsx` (migrated)
- FOUND: `src/components/reader/WurzelNavBar.tsx` (migrated, rounded-none)
- FOUND: commit `7f7fb95` (feat(33-03): migrate nav/shell components to Archivist tokens)
- FOUND: commit `8341ec6` (feat(33-03): full audit sweep)
- AUDIT: 0 old tokens, 0 oversized radii, 0 raw shadows, 0 zinc, 0 Bezirk color maps in reader/

---
*Phase: 33-color-token-foundation*
*Completed: 2026-04-01*
