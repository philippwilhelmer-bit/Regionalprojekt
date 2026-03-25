---
phase: 06-reader-frontend
plan: "02"
subsystem: database
tags: [prisma, dal, slug, tdd, reader, german-text]

requires:
  - phase: 06-01
    provides: "Article.publicId field, Wave 0 it.todo() test stubs for slug and reader DAL"
provides:
  - "slugify() function for German URL slugification (ä→ae, ö→oe, ü→ue, ß→ss)"
  - "getArticleByPublicId() DI overload function for public article lookup"
  - "listArticlesReader() DI overload function: PUBLISHED-only, pinned→featured→publishedAt sort, bezirkIds filter, pagination"
affects:
  - "All Phase 6 reader pages (article detail, homepage feed, RSS, sitemap)"

tech-stack:
  added: []
  patterns:
    - "Duck-typing DI overload pattern extended to getArticleByPublicId and listArticlesReader"
    - "Compound orderBy for reader sort: isPinned desc → isFeatured desc → publishedAt desc → createdAt desc"
    - "bezirkIds array filter using Prisma bezirke.some({ bezirkId: { in: bezirkIds } })"

key-files:
  created:
    - src/lib/reader/slug.ts
  modified:
    - src/lib/reader/slug.test.ts
    - src/lib/content/articles.ts
    - src/lib/content/articles.test.ts

key-decisions:
  - "slugify() implemented inline without external library — all German umlaut rules fit in 7 lines"
  - "listArticlesReader bezirkIds filter omitted entirely when array is undefined/empty — no spurious empty-IN clause"

patterns-established:
  - "TDD RED→GREEN: test file committed before implementation, all tests pass in GREEN commit"

requirements-completed: [READ-02, READ-03, READ-06, SEO-01, SEO-03]

duration: ~8min
completed: 2026-03-22
---

# Phase 6 Plan 02: Reader DAL + German slug utility Summary

**Inline German slugify() and reader-optimized DAL functions (getArticleByPublicId, listArticlesReader) built test-first with 19 green tests.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-22T20:38:47Z
- **Completed:** 2026-03-22T20:46:40Z
- **Tasks:** 2 (TDD RED + GREEN)
- **Files modified:** 4

## Accomplishments

- `slugify()` handles all German umlaut cases: ä→ae, ö→oe, ü→ue, Ä/Ö/Ü uppercase variants, ß→ss, plus lowercase/special-char collapse
- `getArticleByPublicId()` added to articles.ts with full DI overload pattern (duck-typing $connect check)
- `listArticlesReader()` added with compound sort (pinned first, featured second, recency third), bezirkIds array filter, pagination
- Full test suite: 153 tests passing, 0 failures, 16 todos remaining; TypeScript clean

## Task Commits

Each task was committed atomically:

1. **Task RED: Failing tests** - `5b6c549` (test)
2. **Task GREEN: Implementation** - `0070b40` (feat)

**Plan metadata:** (docs commit — see below)

_Note: TDD tasks have two commits (test → feat)_

## Files Created/Modified

- `src/lib/reader/slug.ts` — Inline German slug utility, exports slugify()
- `src/lib/reader/slug.test.ts` — 6 real tests replacing it.todo() stubs
- `src/lib/content/articles.ts` — Added getArticleByPublicId and listArticlesReader with DI overloads
- `src/lib/content/articles.test.ts` — 13 real tests replacing it.todo() stubs for both new functions

## Decisions Made

- `slugify()` implemented inline without any external library — all German umlaut transformations fit in 7 replace chains, no dependency overhead needed.
- `listArticlesReader` omits the bezirkIds WHERE clause entirely when the array is undefined or empty, avoiding a spurious `bezirkId IN ()` that could cause DB errors or empty results.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- `slugify()` is ready for use in article detail URL construction and RSS/sitemap generators
- `getArticleByPublicId(publicId)` is ready for `src/app/(public)/artikel/[publicId]/[slug]/page.tsx`
- `listArticlesReader({ bezirkIds, limit, offset })` is ready for homepage feed and Bezirk feed pages
- No blockers for Phase 6 Plan 03

---
*Phase: 06-reader-frontend*
*Completed: 2026-03-22*
