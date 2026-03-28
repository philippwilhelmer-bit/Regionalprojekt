---
phase: 24-admin-login-banner-fix
plan: 01
subsystem: ui
tags: [react, nextjs, testing, vitest, test-mode, banner]

# Dependency graph
requires:
  - phase: 22-test-mode-implementation
    provides: TestSiteBanner component with NEXT_PUBLIC_IS_TEST_SITE env var gating
provides:
  - TestSiteBanner rendered on /admin/login page (last admin page missing the banner)
  - Unit tests for login page banner behavior
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [Server Component testing by calling component function directly, collectElementTypes traversal for React tree inspection]

key-files:
  created: [src/app/admin/login/login-page.test.tsx]
  modified: [src/app/admin/login/page.tsx]

key-decisions:
  - "React import required in page.tsx for Vitest JSX resolution (consistent with TestSiteBanner.tsx pattern)"
  - "Test uses collectElementTypes() to verify TestSiteBanner is in page tree, then calls TestSiteBanner() directly to check rendered output — avoids need for full renderer"
  - "TestSiteBanner not mocked in login-page test; real component used to validate env-conditional behavior"

patterns-established:
  - "Server Component tree inspection: collectElementTypes() finds component references in JSX output without a renderer"

requirements-completed: [TEST-02]

# Metrics
duration: 5min
completed: 2026-03-28
---

# Phase 24 Plan 01: Admin Login Banner Fix Summary

**TestSiteBanner added to /admin/login page with React fragment wrap, closing the last TEST-02 gap across all admin pages**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-28T08:58:19Z
- **Completed:** 2026-03-28T09:03:00Z
- **Tasks:** 1 (TDD)
- **Files modified:** 2

## Accomplishments
- `/admin/login` now renders TESTSEITE banner when `NEXT_PUBLIC_IS_TEST_SITE=true`
- Existing login content (h1, LoginForm) unchanged and still renders in all cases
- TEST-02 requirement now fully satisfied across all admin pages (login + admin layout)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add TestSiteBanner to login page with tests** - `8b8b67b` (feat)

**Plan metadata:** _(docs commit to follow)_

_Note: TDD task — RED phase confirmed test failure, GREEN phase achieved passing tests in single implementation commit._

## Files Created/Modified
- `src/app/admin/login/page.tsx` - Added React import, TestSiteBanner import, fragment wrap with banner as first child
- `src/app/admin/login/login-page.test.tsx` - 3 tests: banner present with env var, absent without, h1 always present

## Decisions Made
- React import added to `page.tsx` for Vitest JSX resolution — consistent with existing pattern from TestSiteBanner.tsx (STATE.md decision from Phase 22-01)
- Test strategy: `collectElementTypes()` traversal checks `TestSiteBanner` is included in page tree; then calls `TestSiteBanner()` directly to assert rendered banner props — avoids full React renderer while still testing behavior

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added missing React import to page.tsx**
- **Found during:** Task 1 (RED phase — test execution)
- **Issue:** `page.tsx` lacked `import React from 'react'`, causing `React is not defined` error under Vitest (no auto JSX transform configured)
- **Fix:** Added `import React from 'react'` as first import in page.tsx
- **Files modified:** `src/app/admin/login/page.tsx`
- **Verification:** Tests ran without `React is not defined` error after fix
- **Committed in:** `8b8b67b` (Task 1 commit)

**2. [Rule 1 - Bug] Rewrote test tree traversal to handle React element structure**
- **Found during:** Task 1 (GREEN phase iteration)
- **Issue:** Initial test used `JSON.stringify` for tree inspection, which fails for React elements containing function references (component types). Tree traversal also needed to handle React's `props.children` nesting correctly.
- **Fix:** Replaced `JSON.stringify` approach with `collectElementTypes()` that traverses React element tree and collects component type references; combined with direct `TestSiteBanner()` call for rendered output assertion
- **Files modified:** `src/app/admin/login/login-page.test.tsx`
- **Verification:** All 3 tests pass; approach matches React element structure
- **Committed in:** `8b8b67b` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes required for tests to work correctly in this project's Vitest setup. No scope creep.

## Issues Encountered
- Vitest setup has no `@vitejs/plugin-react` — JSX transform is via esbuild but requires explicit React import for older-style JSX resolution in test files
- React element trees cannot be inspected via `JSON.stringify` when component types are functions — required `collectElementTypes()` traversal pattern

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- TEST-02 requirement fully satisfied across all admin pages
- v1.2 Test Deployment milestone complete (Phase 24 was the final phase)
- No blockers

---
*Phase: 24-admin-login-banner-fix*
*Completed: 2026-03-28*
