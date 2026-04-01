---
phase: 35-homepage-feature-components
plan: 03
subsystem: ui
tags: [nextjs, react, weather, open-meteo, unstable_cache, tailwind, archivist]

# Dependency graph
requires:
  - phase: 35-homepage-feature-components
    provides: "GrueneWocheSection, FragDenWurzelmannCard, MascotGreeting, listGrueneWocheArticles from Plans 01 and 02"
provides:
  - "BEZIRK_COORDS exported const with lat/lon for all 13 Steiermark Bezirke"
  - "Weather API route at /api/reader/weather with 30-min unstable_cache per bezirk"
  - "WeatherWidget client component — null until mounted + bezirk selected (no hydration mismatch)"
  - "HomepageLayout fully integrated with all Phase 35 components and Archivist tonal alternation"
affects: [homepage, weather, gruene-woche, archivist-tokens]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "unstable_cache keyed per-bezirk slug to prevent cache key collision in weather API route"
    - "WeatherWidget gates on mounted state + data before rendering (prevents SSR hydration mismatch)"
    - "Tonal section alternation: no-bg > bg-surface > bg-parchment > bg-ink > bg-surface > alternating > bg-surface"

key-files:
  created:
    - bundesland.config.ts (BEZIRK_COORDS appended)
    - src/app/api/reader/weather/route.ts
    - src/components/reader/WeatherWidget.tsx
  modified:
    - src/components/reader/HomepageLayout.tsx
    - src/app/(public)/page.tsx

key-decisions:
  - "Weather API route uses unstable_cache per bezirk slug — key array ['weather', slug] avoids cross-bezirk cache collision"
  - "WeatherWidget silently swallows fetch errors — weather is non-critical, no error state shown"
  - "bg-ink dark accent zone wraps both WeatherWidget and FragDenWurzelmannCard as a single visual block"

patterns-established:
  - "unstable_cache constructed-and-immediately-invoked per request (not module-level) to allow per-slug cache keys"
  - "Client components that read localStorage gate on mounted state to prevent SSR/hydration mismatch"

requirements-completed: [HOME-03, HOME-06]

# Metrics
duration: 5min
completed: 2026-04-01
---

# Phase 35 Plan 03: Weather + Layout Integration Summary

**Open-Meteo weather widget with 30-min per-bezirk cache and fully integrated HomepageLayout with Archivist tonal background alternation across all seven sections**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-01T21:43:37Z
- **Completed:** 2026-04-01T21:48:37Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- BEZIRK_COORDS added to bundesland.config.ts with lat/lon for all 13 Steiermark Bezirke
- Weather API route at /api/reader/weather fetches Open-Meteo with 30-min unstable_cache per bezirk slug
- WeatherWidget client component renders temperature + WMO condition label, returns null until mounted and bezirk selected
- HomepageLayout wires all three new components (WeatherWidget, FragDenWurzelmannCard, GrueneWocheSection) with correct Archivist tonal section alternation
- page.tsx fetches grueneWocheArticles server-side and passes to HomepageLayout

## Task Commits

Each task was committed atomically:

1. **Task 1: Weather API route + Bezirk coordinates + WeatherWidget** - `f1a2e99` (feat)
2. **Task 2: Wire all sections into HomepageLayout + tonal alternation** - `900d19c` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `bundesland.config.ts` - Added BEZIRK_COORDS exported const (13 Bezirke with lat/lon)
- `src/app/api/reader/weather/route.ts` - GET handler wrapping Open-Meteo fetch in unstable_cache
- `src/components/reader/WeatherWidget.tsx` - Client component reading localStorage bezirk and fetching /api/reader/weather
- `src/components/reader/HomepageLayout.tsx` - Added WeatherWidget/FragDenWurzelmannCard/GrueneWocheSection with tonal alternation
- `src/app/(public)/page.tsx` - Added listGrueneWocheArticles to Promise.all, passed as prop

## Decisions Made
- Weather API uses unstable_cache constructed per request (not module-level) so cache key array can include the bezirk slug — prevents all bezirke sharing a single cache entry
- WeatherWidget silently fails on fetch errors (empty catch) — weather is non-critical UX, no error state needed
- bg-ink zone combines WeatherWidget and FragDenWurzelmannCard as a single dark accent block, matching research Pattern 6

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- npx not on PATH in shell environment — resolved by prefixing PATH with /Users/philipp/.nvm/versions/node/v25.8.0/bin for all commands
- Pre-existing test failures (bezirke synonyms, root-layout-adsense mock, intermittent DB timeouts) confirmed as pre-existing via git stash baseline run — not caused by this plan

## User Setup Required

None - no external service configuration required. Open-Meteo is a free public API with no auth key needed.

## Next Phase Readiness
- Phase 35 is now fully complete: all homepage feature components built (Plans 01-03), all wired into HomepageLayout
- Weather widget will display live data once the app is running with user bezirk selection in localStorage
- No blockers for next phase

## Self-Check: PASSED

All files exist and both commits verified (f1a2e99, 900d19c).

---
*Phase: 35-homepage-feature-components*
*Completed: 2026-04-01*
