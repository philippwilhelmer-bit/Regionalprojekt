---
phase: 33-color-token-foundation
plan: "01"
subsystem: ui
tags: [tailwind, css, design-tokens, color-system, glassmorphism]

# Dependency graph
requires: []
provides:
  - Complete Archivist @theme token system in globals.css (~33 tokens)
  - Ink/Parchment/Slate/Aged Wood base palette with brightness-scale variants
  - Semantic surface tokens (surface, surface-elevated, surface-overlay)
  - Glassmorphism tokens (glass-nav, glass-overlay) with literal hex in color-mix()
  - Ink-tinted shadow tokens overriding Tailwind v4 defaults (2xs, xs, sm, md, lg, xl, nav)
  - Corrected spacing tokens (--spacing-gutter: 1rem, --spacing-vertical: 1.7rem new)
affects: [34-glassmorphism-nav, 35-reader-features, 36-editorial-typography, 37-admin-migration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Tailwind v4 @theme block as single source of truth for all design tokens"
    - "color-mix(in srgb, #literal N%, transparent) for glassmorphism and shadow tokens — never var() inside color-mix() in @theme"
    - "Brightness-scale suffix convention: -soft, -muted, -dim for palette variants"

key-files:
  created: []
  modified:
    - src/app/globals.css

key-decisions:
  - "Clean break from 8 old tokens (primary/secondary/accent/etc.) — no aliases, no bridge vars"
  - "Literal hex values in color-mix() within @theme (not var() references) — Tailwind processes @theme statically"
  - "--radius-sm override removed entirely; Tailwind v4 default 0.25rem already matches target"
  - "--spacing-gutter corrected to 1rem (was 1.7rem); --spacing-vertical: 1.7rem added as new token"

patterns-established:
  - "Shadow tokens: color-mix(in srgb, #071806 N%, transparent) — ink-tinted, never pure black"
  - "Glassmorphism: color-mix(in srgb, #FCF9EF N%, transparent) — literal parchment hex"
  - "Semantic surfaces alias to palette tokens via var() — this is fine in @theme (only color-mix() can't use var())"

requirements-completed: [TOKN-01, TOKN-04, TOKN-05, TOKN-06]

# Metrics
duration: 4min
completed: 2026-04-01
---

# Phase 33 Plan 01: Color Token Foundation Summary

**33-token Archivist @theme system replacing 8 old semantic tokens — Ink/Parchment/Slate/Aged Wood palettes with ink-tinted shadows and glassmorphism via color-mix() literal hex**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-01T15:55:45Z
- **Completed:** 2026-04-01T16:00:01Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Replaced 8 old Wurzelwelt semantic tokens (primary, secondary, accent, background, text, surface, surface-elevated, primary-container) with 33 Archivist tokens in a clean break
- Defined complete base palette: Ink (#071806) with 3 variants, Parchment (#FCF9EF) with 2 variants, Slate (#50606F) with 3 variants, Aged Wood (#230E08) with 3 variants
- Added 3 semantic surface tokens, 2 glassmorphism tokens, 7 shadow tokens (overriding Tailwind v4 defaults), corrected spacing tokens
- Build compiled successfully (no errors); 242/244 existing tests pass (2 pre-existing failures unrelated to CSS changes)

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite @theme block with complete Archivist token system** - `f095044` (feat)
2. **Task 2: Validate token system and build** - validation only, no separate commit (Task 1 covers all file changes)

**Plan metadata:** `5fed65b` (docs: complete plan)

## Files Created/Modified
- `src/app/globals.css` - Complete @theme block rewrite: 8 old tokens removed, ~33 Archivist tokens added (base palette, semantic surfaces, glassmorphism, shadows, spacing, typography)

## Decisions Made
- Removed `--radius-sm: 0.75rem` override entirely rather than setting it to 0.25rem — Tailwind v4 default (0.25rem) is already correct
- Used literal hex values (#071806, #FCF9EF) inside all color-mix() expressions in @theme per the RESEARCH.md pitfall documentation
- Semantic surface tokens (surface, surface-elevated, surface-overlay) use var() references to palette tokens — this is safe in @theme (only color-mix() specifically needs literals)

## Deviations from Plan

None — plan executed exactly as written. The two failing tests (root-layout-adsense and bezirke) are pre-existing failures unrelated to CSS token changes (verified: no references to new tokens in those test files).

## Issues Encountered

- `npx` not on default PATH — resolved by using `/Users/philipp/.nvm/versions/node/v24.13.1/bin/npx` directly
- `grep -c "color-mix.*var("` returned exit code 1 due to matching a CSS comment line that contains both words — confirmed no actual functional `color-mix(var(...))` patterns exist in the file

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- All ~33 Archivist tokens are defined and available as Tailwind utilities (e.g., `bg-ink`, `text-parchment`, `shadow-sm`, `shadow-nav`, `bg-glass-nav`)
- Plans 02 and 03 can now migrate reader components from old token names to new ones
- Expected: build warnings about missing old utilities (bg-primary, text-secondary etc.) in unmigrated components — this is the clean break working as designed
- Blocker to watch: Phase 34 must empirically verify Tailwind v4 `-webkit-backdrop-filter` auto-prefix for glass-nav usage

## Self-Check: PASSED

- FOUND: `src/app/globals.css` (rewritten with ~33 tokens)
- FOUND: `.planning/phases/33-color-token-foundation/33-01-SUMMARY.md`
- FOUND: commit `f095044` (feat(33-01): rewrite @theme block with complete Archivist token system)

---
*Phase: 33-color-token-foundation*
*Completed: 2026-04-01*
