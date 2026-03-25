---
phase: 12-config-driven-region-list-rss-feature-flag
plan: "04"
subsystem: api
tags: [rss, feature-flag, route-handler, vitest, tdd]

# Dependency graph
requires:
  - phase: 12-01
    provides: BundeslandConfig with features.rss boolean field in bundesland.config.ts
provides:
  - RSS route handler now respects config.features.rss — false returns silent 404 before any async work
  - Test coverage for RSS feature flag behavior (3 tests, all green)
affects: [rss, reader-frontend, feature-flags]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Feature flag guard as first statement in route handler before any await — prevents DB calls when feature disabled"
    - "vi.mock('@/../bundesland.config') for per-test config override in vitest"

key-files:
  created:
    - src/app/rss/[slug]/route.test.ts
  modified:
    - src/app/rss/[slug]/route.ts

key-decisions:
  - "new Response(null, { status: 404 }) produces empty body — satisfies silent 404 requirement without leaking feature existence"
  - "Guard placed before await params destructuring — flag check fires synchronously before any async DB or route logic"

patterns-established:
  - "Pattern 1: Feature flag check is first statement in route handler body, before any async work"

requirements-completed: [CONF-01]

# Metrics
duration: 2min
completed: 2026-03-25
---

# Phase 12 Plan 04: RSS Feature Flag Guard Summary

**RSS route now returns silent 404 for all /rss/* paths when config.features.rss is false, enforced before any DB calls**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-25T12:17:19Z
- **Completed:** 2026-03-25T12:19:40Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created test file with 3 tests covering flag=false → 404 for Bezirk slug, state-wide feed, and empty body
- Added `config.features.rss` guard as first statement in GET handler before any async work
- All 3 RSS route tests pass; TypeScript check passes

## Task Commits

Each task was committed atomically:

1. **Task 1: Create RSS route test file (RED)** - `8f3ddf0` (test)
2. **Task 2: Add config.features.rss guard to RSS route handler (GREEN)** - `9b938be` (feat)

**Plan metadata:** (docs commit — see final commit)

_Note: TDD task — RED commit followed by GREEN commit_

## Files Created/Modified
- `src/app/rss/[slug]/route.test.ts` - Tests for RSS feature flag (features.rss: false → 404)
- `src/app/rss/[slug]/route.ts` - Added config import and feature flag guard at top of GET handler

## Decisions Made
- `new Response(null, { status: 404 })` used for silent 404 — null body produces empty string on response.text(), satisfying the "silent 404" requirement
- Guard placed before `await params` so it fires synchronously before any async work (no DB calls, no slug parsing when flag is false)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing failure in `bezirke.test.ts` (gemeindeSynonyms assertion) — unrelated to this plan's changes, documented in Phase 12-02 STATE decisions as expected behavior after config-driven seed refactor

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- RSS feature is now fully toggleable via `config.features.rss` in `bundesland.config.ts`
- Phase 12 complete — all config-driven region list and RSS feature flag work delivered

---
*Phase: 12-config-driven-region-list-rss-feature-flag*
*Completed: 2026-03-25*
