---
phase: 15-tech-debt-cleanup
plan: 01
subsystem: auth
tags: [prisma, nextjs, server-actions, testing, vitest]

# Dependency graph
requires:
  - phase: 05-editorial-cms
    provides: login-action, auth-edge, auth-node, logout Route Handler
  - phase: 12-config-driven-region-list-rss-feature-flag
    provides: RSS route with getArticlesByBezirk
  - phase: 02-ingestion
    provides: updateSourceHealth + SourceHealthPatch in sources.ts
provides:
  - PUBLISHED status filter in getArticlesByBezirk WHERE clause (DB-level)
  - Clean RSS route without JS post-filter workaround
  - Split loginAction error branches (config-error vs wrong-password)
  - LogoutButton 'use client' component calling logoutAction Server Action
  - Admin layout wired to LogoutButton
  - updateSourceHealth + SourceHealthPatch fully removed from sources.ts
  - Stale requireAuth placeholder comment removed from articles-actions.ts
affects: [rss-feeds, admin-auth, sources-dal]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "DB-level WHERE clause filter preferred over JS post-filter for status filtering"
    - "Split auth error branches: config-error (no env var) vs auth-error (wrong password)"
    - "Server Action + LogoutButton pattern for logout — no Route Handler needed"

key-files:
  created:
    - src/lib/admin/login-action.test.ts
    - src/components/admin/LogoutButton.tsx
  modified:
    - src/lib/content/articles.ts
    - src/lib/content/articles.test.ts
    - src/app/rss/[slug]/route.ts
    - src/lib/admin/login-action.ts
    - src/app/(admin)/layout.tsx
    - src/lib/admin/articles-actions.ts
    - src/lib/content/sources.ts
    - src/lib/content/sources.test.ts
  deleted:
    - src/app/api/admin/logout/route.ts

key-decisions:
  - "getArticlesByBezirk status filter moved to DB WHERE clause — JS post-filter was a workaround that leaked non-PUBLISHED articles to RSS consumers"
  - "loginAction missing-env-var branch returns 'Login derzeit nicht möglich.' — never reveals that ADMIN_PASSWORD env var is missing, logs config error server-side"
  - "LogoutButton as 'use client' form wrapping logoutAction — Server Action replaces logout Route Handler, no navigation required"
  - "updateSourceHealth deleted from sources.ts — ingest.ts calls db.source.update() directly, export was unused"

patterns-established:
  - "Split auth conditionals: !adminPassword → config-error, password !== adminPassword → auth-error"
  - "Server Actions preferred over Route Handlers for admin mutations (logout pattern)"

requirements-completed: [READ-06]

# Metrics
duration: 6min
completed: 2026-03-25
---

# Phase 15 Plan 01: Tech Debt Cleanup Summary

**DB-level PUBLISHED filter in getArticlesByBezirk, split loginAction error branches, LogoutButton Server Action replacing Route Handler, and removal of updateSourceHealth dead code**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-25T17:07:25Z
- **Completed:** 2026-03-25T17:13:00Z
- **Tasks:** 2
- **Files modified:** 10 (8 modified, 1 created, 1 deleted)

## Accomplishments
- getArticlesByBezirk() now filters `status: 'PUBLISHED'` at DB level — RSS feeds no longer leak FETCHED/WRITTEN/ERROR articles
- loginAction split into two separate branches: missing ADMIN_PASSWORD returns 'Login derzeit nicht möglich.' (config error), wrong password returns 'Falsches Passwort.' — tested with 3 new tests
- Logout converted from Route Handler (`/api/admin/logout`) to Server Action + LogoutButton component — admin layout wired to use LogoutButton
- Dead code removed: updateSourceHealth + SourceHealthPatch deleted from sources.ts, stale requireAuth comment deleted from articles-actions.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: PUBLISHED filter + login split + tests** - `46ad595` (feat)
2. **Task 2: Logout Server Action + orphaned code removal** - `772f9e6` (feat)

**Plan metadata:** (docs commit follows)

_Note: Task 1 used TDD approach (RED then GREEN)_

## Files Created/Modified
- `src/lib/content/articles.ts` - Added `status: 'PUBLISHED'` to getArticlesByBezirk WHERE clause
- `src/lib/content/articles.test.ts` - New PUBLISHED-only test; existing tests updated to use PUBLISHED status
- `src/app/rss/[slug]/route.ts` - Removed JS post-filter comment and `.filter()` call
- `src/lib/admin/login-action.ts` - Split combined conditional into two separate if-branches
- `src/lib/admin/login-action.test.ts` (NEW) - 3 tests: missing env var, wrong password, correct password
- `src/components/admin/LogoutButton.tsx` (NEW) - 'use client' form wrapping logoutAction Server Action
- `src/app/(admin)/layout.tsx` - Replaced `<a href>` with `<LogoutButton />`, added import
- `src/app/api/admin/logout/route.ts` (DELETED) - Route Handler replaced by Server Action
- `src/lib/admin/articles-actions.ts` - Removed stale requireAuth placeholder comment
- `src/lib/content/sources.ts` - Deleted updateSourceHealth + SourceHealthPatch + unused SourceHealth import
- `src/lib/content/sources.test.ts` - Removed updateSourceHealth import and describe block

## Decisions Made
- getArticlesByBezirk status filter moved to DB WHERE clause — JS post-filter was a workaround leaking non-PUBLISHED articles to RSS consumers
- loginAction missing-env-var branch returns 'Login derzeit nicht möglich.' — never reveals the env var is missing, logs config error server-side only
- LogoutButton as 'use client' form wrapping logoutAction — Server Action replaces logout Route Handler entirely
- updateSourceHealth deleted from sources.ts — ingest.ts calls db.source.update() directly; export was orphaned

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated pre-existing getArticlesByBezirk tests to use PUBLISHED status**
- **Found during:** Task 1 (GREEN phase — after adding DB-level filter)
- **Issue:** Two existing tests created articles with `status: 'FETCHED'` and expected them to appear in getArticlesByBezirk() results. After adding the PUBLISHED filter, those tests correctly failed because FETCHED articles are now excluded at DB level.
- **Fix:** Updated `status: 'FETCHED'` to `status: 'PUBLISHED'` in the two pre-existing test articles (Liezen News and Steiermark-weit News tests)
- **Files modified:** src/lib/content/articles.test.ts
- **Verification:** All 19 article tests pass
- **Committed in:** 46ad595 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in test data)
**Impact on plan:** Pre-existing tests were testing the broken behavior. Fix is correct — tests now verify the intended PUBLISHED-only contract.

## Issues Encountered
- `DRAFT` is not a valid ArticleStatus enum value — corrected to `WRITTEN` in new test data
- `.next/types/app/api/admin/logout/route.ts` stale type file caused tsc error after deleting route — cleaned by removing the stale `.next/types` subdirectory

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 5 tech debt items from v1.0 milestone audit closed
- Full test suite passes (202 tests, 2 pre-existing bezirke.test.ts failures unrelated to this plan)
- `tsc --noEmit` passes with no errors
- RSS feeds now serve only PUBLISHED articles without workarounds

---
*Phase: 15-tech-debt-cleanup*
*Completed: 2026-03-25*
