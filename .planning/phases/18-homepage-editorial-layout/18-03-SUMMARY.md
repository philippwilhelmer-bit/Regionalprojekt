---
phase: 18-homepage-editorial-layout
plan: "03"
subsystem: ui
tags: [react, nextjs, eilmeldung, breaking-news, session-storage, client-component]

# Dependency graph
requires:
  - phase: 18-homepage-editorial-layout
    plan: "01"
    provides: hasEilmeldung server-side query function from articles.ts
provides:
  - EilmeldungBanner client component with sticky red bar and sessionStorage dismiss
  - Public layout.tsx conditionally rendering banner when Eilmeldung is active
affects:
  - future homepage plans that render below the header (banner shifts layout by ~40px when visible)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - hydration-safe client component pattern: visible state starts false, corrected in useEffect
    - server/client split: server confirms flag via hasEilmeldung(), client handles dismiss-only logic

key-files:
  created:
    - src/components/reader/EilmeldungBanner.tsx
  modified:
    - src/app/(public)/layout.tsx

key-decisions:
  - "visible state starts as false in EilmeldungBanner to avoid SSR/client hydration mismatch — useEffect sets true only if session key absent"
  - "Banner mounted only when server confirms eilmeldungActive=true — client component does no DB calls"
  - "listBezirke and hasEilmeldung parallelized via Promise.all in layout server function"

patterns-established:
  - "Client banner components: initialize visible=false, correct in useEffect to avoid hydration errors"

requirements-completed: [HOME-04]

# Metrics
duration: 5min
completed: 2026-03-25
---

# Phase 18 Plan 03: Eilmeldung Banner Summary

**Dismissible sticky red "EILMELDUNG" banner below the header using sessionStorage for session-scoped dismiss, rendered only when server confirms an active Eilmeldung article**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-25T21:05:00Z
- **Completed:** 2026-03-25T21:10:00Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Created `EilmeldungBanner.tsx` client component: sticky at `top-[60px]`, alpine-red background, dismiss via sessionStorage, hydration-safe with `visible` starting as `false`
- Updated `src/app/(public)/layout.tsx` to import `hasEilmeldung` and `EilmeldungBanner`, parallelize both async calls, and conditionally render the banner between Header and main

## Task Commits

Each task was committed atomically:

1. **Task 1: Create EilmeldungBanner and wire into public layout** - `a86444f` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `src/components/reader/EilmeldungBanner.tsx` — Client component: sticky red banner with dismiss button, sessionStorage-backed visibility, no hydration mismatch
- `src/app/(public)/layout.tsx` — Added hasEilmeldung import and EilmeldungBanner conditional render; parallelized listBezirke + hasEilmeldung with Promise.all

## Decisions Made

- **Hydration-safe pattern**: `visible` initialized to `false` so server-rendered markup matches initial client render (null). `useEffect` on mount checks `sessionStorage` and sets `visible(true)` when the key is absent. This is the standard pattern for sessionStorage-dependent client components in Next.js.
- **Server-only flag check**: `hasEilmeldung()` is called only in the server layout function. The client component receives no props — it is only mounted when the server already knows a flag is active. This keeps the client component simple and free of DB dependencies.
- **Promise.all optimization**: `listBezirke()` and `hasEilmeldung()` are independent queries. Running them in parallel reduces layout render latency.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `npx` was not on the default PATH in the execution environment — resolved by prepending `~/.nvm/versions/node/v25.8.0/bin` to PATH for the tsc check. TypeScript compiled clean with zero errors.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- EilmeldungBanner is live and wired up; set `isEilmeldung=true` on any published article to verify the red banner appears below the header
- Plans 02 and 04+ can build on the updated public layout without any conflicts
- No blockers

---
*Phase: 18-homepage-editorial-layout*
*Completed: 2026-03-25*

## Self-Check: PASSED

- `src/components/reader/EilmeldungBanner.tsx` — confirmed present
- `src/app/(public)/layout.tsx` — confirmed modified
- Commit `a86444f` — confirmed in git log
- `npx tsc --noEmit` — compiled with zero errors
