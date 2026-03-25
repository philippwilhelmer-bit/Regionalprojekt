---
phase: 01-foundation
plan: 02
subsystem: database
tags: [prisma, typescript, bundesland, config, adsense, types]

# Dependency graph
requires:
  - phase: 01-foundation/01-01
    provides: Next.js 15 scaffold with Prisma v6, vitest, pgLite test infrastructure
provides:
  - BundeslandConfig, BundeslandBranding, AdZone TypeScript interfaces (src/types/bundesland.ts)
  - Steiermark bundesland.config.ts with satisfies type operator — committed, no secrets
  - Locked Prisma schema (Article, Bezirk, ArticleBezirk, enums, indexes) — validate + generate both pass
  - Migration SQL for initial schema (prisma/migrations/20260321000000_init/migration.sql)
affects: [01-03, 02-ingestion, 03-ai-tagging, all subsequent phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - bundesland.config.ts uses `satisfies BundeslandConfig` operator (not `as`, not plain assignment)
    - AdZone.id is a string literal union — typos caught at compile time
    - Config file committed to git with only envVar name references, never actual secrets

key-files:
  created:
    - src/types/bundesland.ts (BundeslandConfig, BundeslandBranding, AdZone interfaces)
    - bundesland.config.ts (Steiermark config, satisfies BundeslandConfig)
    - src/types/bundesland.test-types.ts (compile-time type assertion tests)
  modified: []

key-decisions:
  - "Used `satisfies BundeslandConfig` operator (not `as`) — enforces type checking without widening the type"
  - "AdZone.id as literal union — invalid zone names caught at build time, not runtime"
  - "bundesland.config.ts committed to git with env var name strings only — actual AdSense unit IDs stay in .env"
  - "Prisma schema from Plan 01 was already complete — Task 1 required no changes (schema matches all 01-02 specifications)"

patterns-established:
  - "Pattern: BundeslandConfig is the single source of truth for deployment identity — future Bundesländer create new config file, no core code changes"
  - "Pattern: Type-level tests in .test-types.ts files use @ts-expect-error for compile-time behavior verification"

requirements-completed: [CONF-01, AD-02]

# Metrics
duration: 5min
completed: 2026-03-21
---

# Phase 1 Plan 02: Schema + BundeslandConfig Summary

**BundeslandConfig/AdZone TypeScript interfaces with Steiermark config using `satisfies` operator, plus locked Prisma schema with Article/Bezirk/ArticleBezirk models — all type-checked at build time**

## Performance

- **Duration:** 5 minutes
- **Started:** 2026-03-21T18:30:00Z
- **Completed:** 2026-03-21T18:35:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Defined `BundeslandConfig`, `BundeslandBranding`, `AdZone` interfaces with strict typing (literal union for AdZone.id)
- Created Steiermark `bundesland.config.ts` using `satisfies BundeslandConfig` — TypeScript enforces the contract at build time
- All 3 ad zones configured with env var name references only — no secrets committed
- Prisma schema confirmed complete and valid: `prisma validate` and `prisma generate` both pass
- TDD type-assertion tests verify that missing `adZones` and invalid zone ids cause compile errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Prisma schema validation** — no file changes (schema was already correct from Plan 01); verified via `prisma validate` and `prisma generate`
2. **Task 2: TDD RED — type tests** - `82e0918` (test)
3. **Task 2: TDD GREEN — BundeslandConfig types + Steiermark config** - `50095b6` (feat)

_Note: TDD task has two commits (test RED → feat GREEN). No refactor needed._

## Files Created/Modified

- `src/types/bundesland.ts` — AdZone (literal union id), BundeslandBranding, BundeslandConfig interfaces
- `bundesland.config.ts` — Steiermark deployment config using `satisfies BundeslandConfig`; all 3 adZones with ADSENSE_UNIT_* env var name references; no secrets
- `src/types/bundesland.test-types.ts` — Compile-time type assertion tests: missing adZones errors, invalid zone id errors

## Decisions Made

- **`satisfies` over `as`:** The `satisfies` operator validates that the config object matches `BundeslandConfig` while preserving the narrower inferred type. `as` would suppress errors; `satisfies` catches them.
- **Literal union for AdZone.id:** Makes invalid zone names (e.g., `'sidebar'`) a compile error rather than a silent runtime bug. Critical for preventing misconfiguration.
- **No schema changes needed:** Plan 01 already wrote the complete Prisma schema. Task 1 in this plan confirmed it matches all 01-02 specifications — `prisma validate` passes, 3 models, correct indexes, explicit junction model. Migration SQL was generated in Plan 01 but not yet applied (no running Postgres in dev environment — pgLite handles tests).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed @ts-expect-error directive placement in type test**
- **Found during:** Task 2 GREEN (after running tsc)
- **Issue:** `@ts-expect-error` placed two lines above the erroring statement (`id: 'sidebar'` is inside an object literal). TypeScript requires the directive on the line immediately preceding the error.
- **Fix:** Moved `@ts-expect-error` to be a comment inside the object literal, directly above the `id: 'sidebar'` line
- **Files modified:** `src/types/bundesland.test-types.ts`
- **Verification:** `npx tsc --noEmit` exits 0 after fix
- **Committed in:** `50095b6` (Task 2 feat commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor — only affects test file placement of a TSDoc directive. No impact on production types or config.

## Issues Encountered

- No running PostgreSQL server at `localhost:5432` (placeholder `.env`). `prisma migrate dev` could not connect. Per plan specification, this is expected — the migration SQL was already generated in Plan 01 and the schema is valid. Migration will be applied when a real DATABASE_URL is configured.

## User Setup Required

None - no external service configuration required for this plan. The `DATABASE_URL` in `.env` must point to a running PostgreSQL instance to apply migrations, but tests use pgLite in-process and no tests were added in this plan.

## Next Phase Readiness

- `bundesland.config.ts` is ready to import in any component via `import config from './bundesland.config'`
- `BundeslandConfig` type is available for any module that needs config-driven behavior
- Prisma schema is locked and validated — Plan 03 (seeding) can proceed
- `adZones` are fully typed — ad integration in Phase 5 can read `config.adZones` with full type safety

---
*Phase: 01-foundation*
*Completed: 2026-03-21*

## Self-Check: PASSED

- FOUND: src/types/bundesland.ts
- FOUND: bundesland.config.ts
- FOUND: src/types/bundesland.test-types.ts
- FOUND: .planning/phases/01-foundation/01-02-SUMMARY.md
- FOUND commit: 82e0918 (test RED)
- FOUND commit: 50095b6 (feat GREEN)
