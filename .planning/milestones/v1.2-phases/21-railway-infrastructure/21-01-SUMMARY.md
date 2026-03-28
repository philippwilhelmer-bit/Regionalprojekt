---
phase: 21-railway-infrastructure
plan: 01
subsystem: infra
tags: [railway, prisma, nextjs, cron, deployment]

# Dependency graph
requires:
  - phase: 20-codebase (prior codebase with ingest + AI pipeline scripts)
    provides: scripts/ingest-run.ts and src/scripts/ai-run.ts as basis for cron consolidation
provides:
  - railway.toml with build/start config-as-code for Railway deployment
  - package.json start script with dynamic PORT binding
  - scripts/railway-cron.ts combined cron entry point for Railway cron service
affects: [22-env-and-launch]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "railway.toml config-as-code: prisma generate in build, prisma migrate deploy in startCommand only"
    - "Railway PORT binding: next start -p ${PORT:-3000} with local fallback"
    - "Cron consolidation: single railway-cron.ts entry point replacing two separate scripts"

key-files:
  created:
    - railway.toml
    - scripts/railway-cron.ts
  modified:
    - package.json

key-decisions:
  - "prisma migrate deploy goes in startCommand not buildCommand — Railway internal network (Postgres) only available at runtime"
  - "prisma generate is safe in buildCommand — no DB connection needed"
  - "Ingest failures are non-fatal in railway-cron.ts — AI pipeline still runs on previously fetched articles"
  - "Single railway-cron.ts replaces two separate cron services — reduces Railway service count per research recommendation"

patterns-established:
  - "Railway PORT binding: always use next start -p ${PORT:-3000}"
  - "Railway build/start separation: generate in build, migrate in deploy"

requirements-completed: [DEPLOY-01, DEPLOY-02, DEPLOY-03]

# Metrics
duration: 3min
completed: 2026-03-26
---

# Phase 21 Plan 01: Railway Infrastructure Summary

**railway.toml config-as-code with build/start separation, dynamic PORT binding in package.json, and combined ingest+AI cron entry point for Railway**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-26T09:59:41Z
- **Completed:** 2026-03-26T10:02:35Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created railway.toml with correct build/start command separation (prisma generate in build, prisma migrate deploy at runtime)
- Updated package.json start script to bind to Railway's dynamic PORT with local fallback
- Created scripts/railway-cron.ts consolidating ingest and AI pipelines into a single sequential Railway cron service

## Task Commits

Each task was committed atomically:

1. **Task 1: Create railway.toml and update package.json start script** - `f7a0f6d` (chore)
2. **Task 2: Create combined Railway cron script** - `bd90456` (feat)

## Files Created/Modified
- `railway.toml` - Railway config-as-code: buildCommand runs prisma generate + npm build; startCommand runs prisma migrate deploy + next start with dynamic PORT
- `package.json` - Updated start script from `next start` to `next start -p ${PORT:-3000}`
- `scripts/railway-cron.ts` - Combined cron entry point: runs ingest pipeline then AI+publish pipeline sequentially, logs timestamps, exits cleanly

## Decisions Made
- `prisma migrate deploy` placed in startCommand, not buildCommand — Railway's internal network (where Postgres lives) is only available at runtime, not build time. Prisma generate needs no DB connection so it's safe at build time.
- Ingest errors in railway-cron.ts are non-fatal — the AI pipeline continues regardless because previously fetched articles may still need processing.
- Single combined cron script instead of two separate Railway cron services — reduces Railway service count per research recommendation.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing test failures (2 tests in `src/lib/content/bezirke.test.ts` — Liezen/Ennstal synonym data) are unrelated to these changes and were present before this plan. No regressions introduced.

## User Setup Required

None - no external service configuration required. Railway environment variable setup is handled in Phase 22.

## Next Phase Readiness
- railway.toml is ready for Railway project creation
- package.json start script correctly bound to dynamic PORT
- scripts/railway-cron.ts ready for Railway cron service configuration
- Phase 22 (env-and-launch) can proceed with Railway Variables setup and first deployment

---
*Phase: 21-railway-infrastructure*
*Completed: 2026-03-26*
