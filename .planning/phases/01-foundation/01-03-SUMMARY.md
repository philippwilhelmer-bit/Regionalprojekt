---
phase: 01-foundation
plan: 03
subsystem: database
tags: [prisma, typescript, seed, dal, pglite, vitest, bezirke, articles]

# Dependency graph
requires:
  - phase: 01-foundation/01-01
    provides: Next.js 15 scaffold, Prisma v6, pgLite test infrastructure, RED stub tests
  - phase: 01-foundation/01-02
    provides: BundeslandConfig type, bundesland.config.ts with steiermark config
provides:
  - prisma/seed-data/bezirke.ts with all 13 Steiermark Bezirke and gemeindeSynonyms arrays
  - prisma/seed.ts config-driven upsert seed script with seedBezirke() export for testing
  - src/lib/prisma.ts singleton PrismaClient (globalThis pattern)
  - src/lib/content/bezirke.ts DAL: listBezirke, getBezirkBySlug, getBezirkById
  - src/lib/content/articles.ts DAL: listArticles, getArticleById, getArticlesByBezirk with isStateWide logic
  - 13 passing integration tests (seed + bezirke + articles) using pgLite (no real DB needed)
affects: [02-ingestion, 03-ai-tagging, 04-cms, 05-frontend, all subsequent phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Seed script exports seedBezirke(prisma, bundesland) for test injection; main() guarded by import.meta.url check
    - DAL functions use TypeScript overloads to support both production (no-arg singleton) and test (client injection) usage
    - Duck-typing ($connect check) instead of instanceof for PrismaClient detection — avoids vitest module isolation issues
    - getArticlesByBezirk uses OR clause: bezirke.some(bezirkId) OR isStateWide:true

key-files:
  created:
    - prisma/seed-data/bezirke.ts (all 13 Steiermark Bezirke with gemeindeSynonyms)
    - prisma/seed.ts (config-driven seed; exports seedBezirke for tests)
    - src/lib/prisma.ts (singleton PrismaClient)
    - src/lib/content/bezirke.ts (Bezirk DAL)
    - src/lib/content/articles.ts (Article DAL with isStateWide logic)
  modified:
    - prisma/seed.test.ts (implemented 3 test cases from it.todo stubs)
    - src/lib/content/bezirke.test.ts (implemented 5 test cases from it.todo stubs)

key-decisions:
  - "Seed exports seedBezirke(prisma, bundesland) for testability — main() only runs when file is executed directly via import.meta.url guard"
  - "DAL functions use TypeScript overloads: zero-arg form for production (singleton), client-injection form for tests"
  - "Duck-typing ('$connect' in clientOrOptions) instead of instanceof PrismaClient — vitest module isolation can break instanceof cross-module"
  - "articles.ts includes bezirke relation eagerly loaded (include: { bezirke: { include: { bezirk: true } } }) — avoids N+1 for consumers"
  - "getArticlesByBezirk uses OR[bezirk-tagged, isStateWide:true] — all Steiermark-weit articles appear in every Bezirk feed"

patterns-established:
  - "Pattern: Seed logic extracted into exported function for testability — entry point guarded by import.meta.url check"
  - "Pattern: DAL functions accept optional PrismaClient for DI; use TypeScript overloads to keep production API clean"
  - "Pattern: isStateWide OR bezirk-tagged union query for regional content feeds"

requirements-completed: [CONF-01, CONF-02]

# Metrics
duration: 4min
completed: 2026-03-21
---

# Phase 1 Plan 03: Seed Data and Content DAL Summary

**13 Steiermark Bezirke seeded via config-driven upsert script, with typed Bezirk and Article DAL functions, 13 passing pgLite integration tests, and isStateWide OR logic for regional article feeds**

## Performance

- **Duration:** 4 minutes
- **Started:** 2026-03-21T18:33:03Z
- **Completed:** 2026-03-21T18:37:21Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- All 13 Steiermark Bezirke seeded with canonical slugs and gemeindeSynonym arrays (2-9 per Bezirk; Liezen has the most)
- Config-driven seed: `config.bundesland === 'steiermark'` selects data — changing config to 'tirol' produces 0 rows
- Singleton PrismaClient with globalThis pattern prevents Next.js hot-reload connection exhaustion
- Three DAL files with fully typed Prisma return types — no `any`, no raw SQL
- 13 integration tests all GREEN using pgLite (no real PostgreSQL server required)

## Task Commits

Each task was committed atomically:

1. **Task 1 TDD RED: seed test cases** - `585413a` (test)
2. **Task 1 TDD GREEN: seed data + seed script** - `d74de19` (feat)
3. **Task 2 TDD RED: bezirke + articles DAL tests** - `3a22371` (test)
4. **Task 2 TDD GREEN: prisma singleton + DAL implementation** - `cfc48c1` (feat)

## Files Created/Modified

- `prisma/seed-data/bezirke.ts` — BezirkSeedEntry interface and steiermarkBezirke array (13 Bezirke, 2-9 synonyms each)
- `prisma/seed.ts` — seedBezirke(prisma, bundesland) export + config-driven main(); upsert for idempotency
- `src/lib/prisma.ts` — globalThis singleton PrismaClient per official Prisma/Next.js recommendation
- `src/lib/content/bezirke.ts` — listBezirke (asc by name), getBezirkBySlug, getBezirkById with overloads
- `src/lib/content/articles.ts` — listArticles (with filter options), getArticleById, getArticlesByBezirk (OR isStateWide)
- `prisma/seed.test.ts` — 3 tests: 13 bezirke for steiermark, validation per row, 0 rows for other bundesland
- `src/lib/content/bezirke.test.ts` — 5 tests: count, slugs/names/synonyms, getBezirkBySlug, null case, getBezirkById

## Decisions Made

- **seedBezirke export:** Extracted seeding logic into an exported function so tests can inject a pgLite client. `main()` is guarded by `import.meta.url === file://${process.argv[1]}` — prevents the seed from running when imported by tests.
- **DAL overloads:** TypeScript overloads allow `listBezirke()` (production) and `listBezirke(pgLiteClient)` (tests). Avoids `vi.mock` which would be fragile for this use case.
- **Duck-typing for client detection:** Used `'$connect' in clientOrOptions` instead of `instanceof PrismaClient`. In vitest, each test file gets its own module instance — `instanceof` checks across module boundaries fail silently, causing the default singleton to be used instead of the injected pgLite client.
- **Eager bezirke include:** All article queries include `bezirke: { include: { bezirk: true } }` — avoids N+1 queries when consumers need article-to-Bezirk relationships.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added import.meta.url guard to prevent seed main() running during test import**
- **Found during:** Task 1 TDD GREEN (running seed.test.ts)
- **Issue:** `prisma/seed.ts` calls `main()` at module level. When tests import `seedBezirke`, the `main()` call triggers, fails with "Can't reach database localhost:5432", and causes an unhandled rejection in vitest
- **Fix:** Wrapped `main()` call with `if (import.meta.url === \`file://${process.argv[1]}\`)` guard
- **Files modified:** prisma/seed.ts
- **Verification:** `npx vitest run prisma/seed.test.ts` passes with 0 unhandled errors
- **Committed in:** d74de19 (Task 1 feat commit)

**2. [Rule 1 - Bug] Used duck-typing instead of instanceof for PrismaClient detection in listArticles**
- **Found during:** Task 2 TDD GREEN (running articles.test.ts)
- **Issue:** `clientOrOptions instanceof PrismaClient` returned false for the pgLite-backed test client due to vitest module isolation — the `PrismaClient` class in articles.ts was a different module instance than the one used in tests. The function fell through to `defaultPrisma` (singleton) and failed with "Can't reach localhost:5432"
- **Fix:** Replaced `instanceof PrismaClient` with `'$connect' in clientOrOptions` duck-typing check
- **Files modified:** src/lib/content/articles.ts
- **Verification:** `npx vitest run src/lib/content/` passes 10/10 tests
- **Committed in:** cfc48c1 (Task 2 feat commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both auto-fixes required for correct test execution. No scope creep.

## Issues Encountered

- Vitest module isolation caused `instanceof PrismaClient` to fail cross-module — this is a known gotcha with vitest's ESM module system. Duck-typing is the correct pattern for this codebase.

## User Setup Required

None - all tests use pgLite in-process. No external database required. To run `npx prisma db seed` against a real database, set `DATABASE_URL` in `.env` to point to a running PostgreSQL instance.

## Next Phase Readiness

- Foundation is complete: schema locked, config typed, seed data ready, DAL functions typed and tested
- Phase 2 (ingestion) can import `listBezirke()`, `getArticlesByBezirk()` from `src/lib/content/`
- Phase 3 (AI tagging) can call `getBezirkBySlug()` to resolve tags to Bezirk IDs
- `npx prisma db seed` is ready to seed a production database once DATABASE_URL is configured
- All 13 integration tests pass GREEN — no regressions introduced

---
*Phase: 01-foundation*
*Completed: 2026-03-21*
