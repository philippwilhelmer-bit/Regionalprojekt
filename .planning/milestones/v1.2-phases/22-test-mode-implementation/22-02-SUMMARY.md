---
phase: 22-test-mode-implementation
plan: "02"
subsystem: seo
tags: [next.js, robots, sitemap, adsense, metadata, noindex, test-mode]

# Dependency graph
requires:
  - phase: 22-01
    provides: TestSiteBanner component and NEXT_PUBLIC_IS_TEST_SITE env var pattern established
provides:
  - robots.ts: dynamic /robots.txt with Disallow: / in test mode
  - sitemap.ts: suppressed /sitemap.xml (empty array) in test mode
  - generateMetadata() in public layout: noindex/nofollow meta in test mode
  - AdSense Script conditional render: gated by !isTestSite in root layout
  - 8 unit tests covering all four behaviors in both test and production modes
affects: [seo, deployments, production-readiness]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single env var gate: process.env.NEXT_PUBLIC_IS_TEST_SITE === 'true' used consistently across all 4 suppression points"
    - "Named export generateMetadata() in Next.js layout for page-level metadata injection"
    - "TDD for Next.js App Router files: vi.mock for DB deps, font/google, next/script"

key-files:
  created:
    - src/app/robots.ts
    - src/app/__tests__/robots.test.ts
    - src/app/__tests__/sitemap-testmode.test.ts
    - src/app/__tests__/public-layout-metadata.test.ts
    - src/app/__tests__/root-layout-adsense.test.ts
  modified:
    - src/app/sitemap.ts
    - src/app/(public)/layout.tsx
    - src/app/layout.tsx

key-decisions:
  - "React import not needed in layout.tsx for Vitest JSX — tests pass without it after linter removed explicit import"
  - "generateMetadata() uses named export pattern (not metadata const) to enable env var check at request time"

patterns-established:
  - "Test mode suppression: check process.env.NEXT_PUBLIC_IS_TEST_SITE === 'true' at function entry, return safe default"
  - "vi.mock for next/font/google and next/script enables testing layout components in node environment"

requirements-completed: [SEO-01, SEO-02, SEO-03, SAFETY-01]

# Metrics
duration: 15min
completed: 2026-03-28
---

# Phase 22 Plan 02: SEO Suppression and AdSense Gating Summary

**SEO fully suppressed in test mode via robots.ts (Disallow: /), sitemap early return, noindex generateMetadata, and conditional AdSense Script — all gated by NEXT_PUBLIC_IS_TEST_SITE**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-28T08:24:00Z
- **Completed:** 2026-03-28T08:28:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Created robots.ts: serves `Disallow: /` to all crawlers in test mode, `Allow: /` + sitemap URL in production
- Modified sitemap.ts: early return of empty array `[]` when NEXT_PUBLIC_IS_TEST_SITE=true
- Added `generateMetadata()` to public layout: injects `{ robots: { index: false, follow: false } }` in test mode
- Wrapped AdSense Script tag in `{!isTestSite && ...}` conditional in root layout
- Wrote 8 unit tests across 4 test files — all green

## Task Commits

Each task was committed atomically:

1. **Task 1: robots.ts and sitemap suppression** - `6e13b6f` (feat)
2. **Task 2: noindex metadata and AdSense gating** - `1e00010` (feat)

## Files Created/Modified
- `src/app/robots.ts` - New: dynamic robots.txt with test-mode Disallow
- `src/app/sitemap.ts` - Modified: early return [] in test mode
- `src/app/(public)/layout.tsx` - Modified: added generateMetadata() named export
- `src/app/layout.tsx` - Modified: isTestSite conditional wrapping AdSense Script
- `src/app/__tests__/robots.test.ts` - New: 2 tests for robots behavior
- `src/app/__tests__/sitemap-testmode.test.ts` - New: 2 tests with mocked DB deps
- `src/app/__tests__/public-layout-metadata.test.ts` - New: 2 tests for generateMetadata
- `src/app/__tests__/root-layout-adsense.test.ts` - New: 2 tests for AdSense gating

## Decisions Made
- `generateMetadata()` uses a function (not a static `metadata` const) so it can read `process.env` at request time
- `import React from "react"` was added to layout.tsx for Vitest JSX resolution but removed by linter (not needed in Next.js 17+ automatic JSX transform) — tests still pass without it
- JSON.stringify recursive search used to inspect JSX tree in root-layout-adsense test (simpler than react-test-renderer)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- The `bezirke.test.ts` suite has 2 pre-existing failures (gemeindeSynonyms data not seeded in test DB) — unrelated to this plan, confirmed by reverting changes and reproducing same failures.

## User Setup Required
None - no external service configuration required. NEXT_PUBLIC_IS_TEST_SITE env var already established in Phase 22-01.

## Next Phase Readiness
- All four test-mode SEO suppressions are implemented and tested
- Phase 22 is complete: TestSiteBanner (plan 01) + SEO suppression (plan 02) are both done
- Ready for deployment to Vercel/Neon (Phase 21 infrastructure)
- Production deployment: set NEXT_PUBLIC_IS_TEST_SITE=true on test environment, leave unset on production

---
*Phase: 22-test-mode-implementation*
*Completed: 2026-03-28*

## Self-Check: PASSED
- All 5 created/modified source files verified present on disk
- Both task commits (6e13b6f, 1e00010) verified in git log
