---
phase: 22-test-mode-implementation
plan: 01
subsystem: ui
tags: [react, nextjs, tailwind, vitest, env-var, test-mode, banner]

# Dependency graph
requires:
  - phase: 21-railway-infrastructure
    provides: NEXT_PUBLIC_IS_TEST_SITE env var decision established in research
provides:
  - TestSiteBanner component gated by NEXT_PUBLIC_IS_TEST_SITE=true
  - Banner wired into public (reader) layout as first element
  - Banner wired into admin layout as first element
affects: [23-metadata-and-robots, any-phase-using-layouts]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server Component env-var gate: read process.env at render time, return null if inactive"
    - "Vitest pattern: delete process.env key in beforeEach, restore full env in afterEach"
    - "Call Server Component as function in tests (no jsdom needed)"

key-files:
  created:
    - src/components/TestSiteBanner.tsx
    - src/components/TestSiteBanner.test.tsx
  modified:
    - src/app/(public)/layout.tsx
    - src/app/(admin)/layout.tsx

key-decisions:
  - "Named export (not default) for TestSiteBanner to align with project component conventions"
  - "React import required for JSX in Vitest test environment even in Server Components"
  - "Fragment wrapper in admin layout to place banner above existing flex container"

patterns-established:
  - "Env-var gated Server Component: check process.env, return null to no-op when inactive"
  - "Layout injection: new visual concern as first child before all other layout elements"

requirements-completed: [TEST-01, TEST-02]

# Metrics
duration: 8min
completed: 2026-03-28
---

# Phase 22 Plan 01: TestSiteBanner Component and Layout Wiring Summary

**Yellow full-width TESTSEITE banner injected at top of both reader and admin layouts, gated by NEXT_PUBLIC_IS_TEST_SITE env var, with 3 passing Vitest unit tests**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-28T08:21:00Z
- **Completed:** 2026-03-28T08:29:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- TestSiteBanner Server Component renders yellow banner with role="banner" when NEXT_PUBLIC_IS_TEST_SITE=true, returns null otherwise
- 3 unit tests covering render-when-true, hide-when-undefined, and hide-when-false behaviors — all passing
- Banner injected as first element in public (reader) layout, before RegionalAppBar
- Banner injected as first element in admin layout, above the sidebar/main flex container using fragment wrapper

## Task Commits

Each task was committed atomically:

1. **Task 1: Create TestSiteBanner component with tests** - `3561bf9` (feat)
2. **Task 2: Wire TestSiteBanner into public and admin layouts** - `f7da013` (feat)

## Files Created/Modified
- `src/components/TestSiteBanner.tsx` - React Server Component: reads env var, renders yellow Tailwind banner or null
- `src/components/TestSiteBanner.test.tsx` - 3 Vitest unit tests for render/hide behavior
- `src/app/(public)/layout.tsx` - Added TestSiteBanner import and render as first child in fragment
- `src/app/(admin)/layout.tsx` - Added TestSiteBanner import, wrapped return in fragment, banner before sidebar div

## Decisions Made
- Named export used for TestSiteBanner to match project component conventions (e.g., RegionalAppBar, EilmeldungBanner)
- React import added explicitly to TestSiteBanner.tsx — required for JSX resolution in Vitest test environment
- Admin layout wrapped in fragment (`<>`) to allow banner above the existing `<div className="flex h-screen bg-gray-100">` without nesting it inside

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added React import to TestSiteBanner component**
- **Found during:** Task 1 (GREEN phase — running tests)
- **Issue:** Tests failed with "React is not defined" — JSX transform in Vitest requires explicit React import even for Server Components
- **Fix:** Added `import React from 'react'` at top of TestSiteBanner.tsx
- **Files modified:** src/components/TestSiteBanner.tsx
- **Verification:** All 3 tests passed after fix
- **Committed in:** 3561bf9 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — missing React import for test environment)
**Impact on plan:** Necessary fix for correctness in test environment. No scope creep.

## Issues Encountered
None beyond the React import auto-fix documented above.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- TestSiteBanner component ready for use in both layouts
- Set NEXT_PUBLIC_IS_TEST_SITE=true in Vercel test deployment to activate banner
- Phase 22 Plan 02 (metadata/robots) can proceed immediately

---
*Phase: 22-test-mode-implementation*
*Completed: 2026-03-28*
