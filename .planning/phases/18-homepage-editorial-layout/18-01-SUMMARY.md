---
phase: 18-homepage-editorial-layout
plan: "01"
subsystem: database
tags: [prisma, postgresql, articles, homepage, eilmeldung]

# Dependency graph
requires:
  - phase: 17-header-identity
    provides: established design system tokens and header structure the homepage will sit below
provides:
  - isEilmeldung and imageUrl fields on Article model via Prisma migration
  - getFeaturedArticle query function for hero zone
  - getPinnedArticles query function for top-stories row
  - hasEilmeldung query function for conditional banner
  - listArticlesForHomepage query function for editorial grid
  - groupArticlesByBezirk pure utility for Bezirk sections
  - scrollbar-none CSS utility for horizontal scroll rows
affects:
  - 18-02 (hero zone component builds on getFeaturedArticle)
  - 18-03 (top stories row builds on getPinnedArticles)
  - 18-04 (Eilmeldung banner uses hasEilmeldung and isEilmeldung field)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - dual-overload DI pattern for testability (clientOrOptions or PrismaClient as first arg)
    - pure function for grouping logic (no DB dependency, testable without pgLite)

key-files:
  created:
    - prisma/migrations/20260325_phase18_eilmeldung_imageurl/migration.sql
    - src/test/articles-phase18.test.ts
  modified:
    - prisma/schema.prisma
    - src/lib/content/articles.ts
    - src/app/globals.css

key-decisions:
  - "groupArticlesByBezirk is a pure function — no DB access needed since callers already have fetched articles"
  - "getPinnedArticles fallback to newest when none pinned ensures top-stories row is always populated"
  - "isStateWide articles appear in all Bezirk groups in groupArticlesByBezirk — consistent with existing isStateWide semantics"
  - "Migration created manually (migrate dev --create-only unavailable due to dev DB migration mismatch) — SQL written by hand and validated"

patterns-established:
  - "Pure grouping functions live in articles.ts alongside query functions — colocation of related data logic"
  - "DB query functions follow dual-overload DI: (options?) or (client, options?) overloads"

requirements-completed: [HOME-01, HOME-02, HOME-03, HOME-04]

# Metrics
duration: 15min
completed: 2026-03-25
---

# Phase 18 Plan 01: Data Layer for Homepage Editorial Layout Summary

**Five new homepage query functions and Prisma migration for isEilmeldung/imageUrl fields, covering featured hero, pinned top-stories, Eilmeldung banner detection, editorial grid, and Bezirk grouping**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-25T20:57:00Z
- **Completed:** 2026-03-25T21:02:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added `isEilmeldung Boolean @default(false)` and `imageUrl String?` to Article model with migration
- Implemented five new exported functions in articles.ts following the existing DI overload pattern
- Added `.scrollbar-none` CSS utility to globals.css for horizontal scroll rows
- 17 unit tests written covering all specified behaviors — all passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Prisma migration + new query functions + scrollbar utility** - `5694d58` (feat)
2. **Task 2: Unit tests for new query functions** - `dbc058e` (test)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `prisma/schema.prisma` — Added isEilmeldung, imageUrl fields and isEilmeldung index to Article model
- `prisma/migrations/20260325_phase18_eilmeldung_imageurl/migration.sql` — ALTER TABLE statements for new columns and index
- `src/lib/content/articles.ts` — Added getFeaturedArticle, getPinnedArticles, hasEilmeldung, listArticlesForHomepage, groupArticlesByBezirk
- `src/app/globals.css` — Added .scrollbar-none utility class
- `src/test/articles-phase18.test.ts` — 17 unit tests for all new functions

## Decisions Made

- **groupArticlesByBezirk as pure function**: No DB access needed — callers already have fetched articles. Pure functions are simpler to test and have no side effects.
- **getPinnedArticles fallback**: Returns newest published when 0 pinned articles. Ensures the top-stories row never appears empty.
- **Migration created manually**: `prisma migrate dev --create-only` failed due to a dev database migration mismatch (`20260321_ingestion` applied to DB but missing locally). SQL was written by hand and validated.
- **Prisma.ArticleWhereInput type**: Used explicit Prisma type import instead of `Parameters<typeof db.article.findMany>[0]['where']` which does not work when `findMany` argument is undefined.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript error: `Parameters<typeof db.article.findMany>[0]['where']` type**
- **Found during:** Task 1 (Prisma migration + new query functions)
- **Issue:** TypeScript cannot resolve `['where']` on the parameters type when the argument can be `undefined`, causing TS2339 error
- **Fix:** Imported `Prisma` namespace from `@prisma/client` and used `Prisma.ArticleWhereInput` directly
- **Files modified:** `src/lib/content/articles.ts`
- **Verification:** `npx tsc --noEmit` passes clean
- **Committed in:** `5694d58` (Task 1 commit)

**2. [Rule 1 - Bug] Fixed TypeScript error: `status` field typed as `string` in test helper**
- **Found during:** Task 2 (unit tests)
- **Issue:** Test helper `createArticle` typed `status` as `string` but Prisma expects `ArticleStatus` enum
- **Fix:** Imported `ArticleStatus` from `@prisma/client` and typed the override field correctly
- **Files modified:** `src/test/articles-phase18.test.ts`
- **Verification:** `npx tsc --noEmit` passes clean
- **Committed in:** `dbc058e` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - TypeScript type bugs)
**Impact on plan:** Both fixes required for correctness. No scope creep.

## Issues Encountered

- **Dev DB migration mismatch**: `prisma migrate dev` found migration `20260321_ingestion` applied in the remote dev DB but missing from the local migrations directory. This prevented `--create-only`. Workaround: created the migration SQL file manually. The pgLite-based test DB loads all migrations from disk (including the new one), so tests work correctly.

## User Setup Required

None - no external service configuration required. The migration file is ready but must be applied to the production/dev database when the environment is next available via `prisma migrate deploy`.

## Next Phase Readiness

- All 5 homepage query functions exported from `src/lib/content/articles.ts` and ready for use
- Plans 02 and 03 can import and use `getFeaturedArticle`, `getPinnedArticles`, `listArticlesForHomepage`, `groupArticlesByBezirk`
- Plan 04 (Eilmeldung banner) can use `hasEilmeldung` and the `isEilmeldung` field
- No blockers

---
*Phase: 18-homepage-editorial-layout*
*Completed: 2026-03-25*

## Self-Check: PASSED

All files confirmed present on disk. All commits verified in git log.
