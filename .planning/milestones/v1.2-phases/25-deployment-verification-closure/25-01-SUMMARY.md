---
phase: 25-deployment-verification-closure
plan: 01
subsystem: infra
tags: [adunit, test-mode, deployment, verification, requirements]

# Dependency graph
requires:
  - phase: 21-railway-infrastructure
    provides: Vercel+Neon deployment that DEPLOY-01/02/03 requirements are based on
  - phase: 23-deployment-verification
    provides: Live verification of all 5 deployment checks that 23-VERIFICATION.md documents
  - phase: 22-test-mode-implementation
    provides: NEXT_PUBLIC_IS_TEST_SITE env-var pattern that AdUnit guard follows
provides:
  - AdUnit.tsx with test-mode null guard (NEXT_PUBLIC_IS_TEST_SITE=true returns null)
  - AdUnit.test.tsx with 5 passing tests (4 existing + 1 new test-mode test)
  - 21-VERIFICATION.md documenting Vercel+Neon deployment outcome (4/4 passed)
  - 23-VERIFICATION.md documenting deployment verification (5/5 passed)
  - REQUIREMENTS.md with all 9/9 v1.2 requirements marked complete
affects: [future-phases, v1.2-closure]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "NEXT_PUBLIC_IS_TEST_SITE guard placed as first check in AdUnit (Server Component env-var checks before config checks)"
    - "TDD pattern: RED test added to existing describe block, GREEN via minimal code addition"

key-files:
  created:
    - .planning/phases/21-railway-infrastructure/21-VERIFICATION.md
    - .planning/phases/23-deployment-verification/23-VERIFICATION.md
  modified:
    - src/components/reader/AdUnit.tsx
    - src/components/reader/AdUnit.test.tsx
    - .planning/REQUIREMENTS.md

key-decisions:
  - "Test-mode guard in AdUnit placed as first check (before config.features.ads) — consistent with pattern: env-var gates supersede config gates in Server Components"
  - "REQUIREMENTS.md DEPLOY wording kept as-is ('Railway') — intent satisfied by Vercel equivalent, no wording change needed"

patterns-established:
  - "Verification docs follow 22-VERIFICATION.md format with frontmatter status/score, observable truths table, artifacts table, requirements coverage table"

requirements-completed: [DEPLOY-01, DEPLOY-02, DEPLOY-03, SAFETY-01]

# Metrics
duration: 4min
completed: 2026-03-28
---

# Phase 25 Plan 01: Deployment Verification Closure Summary

**AdUnit test-mode null guard added via TDD, VERIFICATION.md files created for Phases 21 and 23, all 9/9 v1.2 requirements marked complete in REQUIREMENTS.md**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-28T19:20:12Z
- **Completed:** 2026-03-28T19:24:29Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added `NEXT_PUBLIC_IS_TEST_SITE === 'true'` guard as first check in AdUnit.tsx — ads will never render in test mode (previously the test-mode env var had no effect on AdUnit, only on the root layout AdSense script tag)
- Created 21-VERIFICATION.md and 23-VERIFICATION.md using the established Phase 22 format, documenting the Vercel+Neon deployment outcome and deployment verification results with observable truths tables and requirements coverage
- Marked DEPLOY-01, DEPLOY-02, DEPLOY-03 as complete in REQUIREMENTS.md — all 9/9 v1.2 requirements now satisfied, 0 pending

## Task Commits

Each task was committed atomically:

1. **Task 1: Add test-mode null guard to AdUnit.tsx with TDD** - `e4214cd` (feat)
2. **Task 2: Create VERIFICATION.md for Phases 21 and 23, update REQUIREMENTS.md** - `525b191` (feat)

## Files Created/Modified

- `src/components/reader/AdUnit.tsx` - Added `if (process.env.NEXT_PUBLIC_IS_TEST_SITE === 'true') return null` as first guard
- `src/components/reader/AdUnit.test.tsx` - Added 5th test: returns null when NEXT_PUBLIC_IS_TEST_SITE is 'true'
- `.planning/phases/21-railway-infrastructure/21-VERIFICATION.md` - Post-hoc verification of Vercel+Neon deployment (4/4 passed); notes Railway-to-Vercel deviation
- `.planning/phases/23-deployment-verification/23-VERIFICATION.md` - Verification of all 5 deployment checks (5/5 passed); confirms NEXT_PUBLIC_BASE_URL set
- `.planning/REQUIREMENTS.md` - DEPLOY-01/02/03 marked [x] Complete; traceability table updated; coverage updated to Satisfied:9, Pending:0

## Decisions Made

- Test-mode guard placed as first check in AdUnit (before `config.features.ads` check) — env-var gates supersede config gates in Server Components, consistent with the established codebase pattern
- REQUIREMENTS.md DEPLOY wording kept as-is ("Railway") — intent is satisfied by the Vercel equivalent, no wording change needed per plan instructions

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- **npm not in PATH**: Shell sessions in this environment do not have nvm initialized automatically. Resolved by using the direct nvm path: `PATH="/Users/philipp/.nvm/versions/node/v24.13.1/bin:$PATH"`. All test runs succeeded.
- **Pre-existing test failures (out of scope)**: `src/lib/content/bezirke.test.ts` has 2 pre-existing failures (`gemeindeSynonyms` empty in test DB). Confirmed pre-existing by checking HEAD-1. Not caused by this plan's changes; logged as out of scope.

## Next Phase Readiness

- v1.2 is fully closed: all 9 requirements satisfied, VERIFICATION.md files exist for all phases, AdUnit cosmetic gap fixed
- The codebase is production-ready: removing `NEXT_PUBLIC_IS_TEST_SITE` from Vercel env vars will activate full production mode with no code changes needed

---
*Phase: 25-deployment-verification-closure*
*Completed: 2026-03-28*
