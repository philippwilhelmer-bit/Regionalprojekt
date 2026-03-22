---
phase: 04-scheduler-and-autonomous-publishing
plan: "04"
subsystem: infra
tags: [pm2, cron, bun, orchestration, scheduler, dead-man, publish]

requires:
  - phase: 04-02
    provides: publishArticles() and checkDeadMan() implementations
  - phase: 04-03
    provides: ERROR retry / FAILED exclusion in processArticles()

provides:
  - ai-run.ts: full AI+Publish+DeadMan orchestrator (checkDeadMan → processArticles → publishArticles)
  - ecosystem.config.js: PM2 cron configuration for ingest-cron and ai-publish-cron
  - CRONTAB.md: OS-level crontab alternative with env var reference

affects:
  - Phase 05: CMS integration — ai-run.ts is the production entry point operators will invoke
  - Phase 06: Infrastructure — ecosystem.config.js is the PM2 deployment artifact

tech-stack:
  added: []
  patterns:
    - "Orchestrator script (ai-run.ts) chains dead-man check → AI pipeline → publish in sequence"
    - "PM2 cron-mode with autorestart: false prevents crash loops on exit-code-1 scripts"

key-files:
  created:
    - ecosystem.config.js
    - CRONTAB.md
  modified:
    - src/scripts/ai-run.ts

key-decisions:
  - "ecosystem.config.js comment avoids */ sequence by writing '* /15' with note — prevents JS parser treating comment content as block-comment close"
  - "ai-run.ts log line extended to include inputTokens/outputTokens alongside published/reviewBacklog for complete observability"

patterns-established:
  - "PM2 cron apps: autorestart: false is mandatory — scripts that exit(1) on partial failure must not be crash-looped"
  - "Orchestrator script imports all three modules (dead-man, pipeline, publish) and sequences calls in order"

requirements-completed:
  - PUB-01
  - PUB-02
  - PUB-03

duration: 4min
completed: "2026-03-22"
---

# Phase 4 Plan 04: Scheduler and Autonomous Publishing — Glue Layer Summary

**ai-run.ts wired as full AI+Publish+DeadMan orchestrator with PM2 ecosystem config and crontab docs completing the Phase 4 autonomous publishing pipeline**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-22T06:59:55Z
- **Completed:** 2026-03-22T07:04:00Z
- **Tasks:** 2 completed
- **Files modified:** 3

## Accomplishments

- ai-run.ts now chains checkDeadMan() → processArticles() → publishArticles() in correct sequence, logging all key metrics in a single summary line
- ecosystem.config.js defines two PM2 apps (ingest-cron, ai-publish-cron) both with autorestart: false and 15-minute cron_restart schedule
- CRONTAB.md provides OS-level crontab alternative with complete env var reference table

## Task Commits

Each task was committed atomically:

1. **Task 1: Update ai-run.ts — chain dead-man check → AI → publish** - `100b98e` (feat)
2. **Task 2: Create ecosystem.config.js (PM2) and CRONTAB.md** - `028f403` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `src/scripts/ai-run.ts` — Updated orchestrator: imports and calls checkDeadMan, processArticles, publishArticles in sequence; log line extended with published/reviewBacklog/inputTokens/outputTokens
- `ecosystem.config.js` — PM2 config with ingest-cron (tsx) and ai-publish-cron (bun) apps, both using cron_restart and autorestart: false
- `CRONTAB.md` — OS-level crontab alternative documenting both cron entries and required env vars (DATABASE_URL, ANTHROPIC_API_KEY, POLL_INTERVAL_MINUTES, AI_DAILY_TOKEN_THRESHOLD, DEAD_MAN_THRESHOLD_HOURS)

## Decisions Made

- ecosystem.config.js block comment avoids `*/` sequence (which would close the comment prematurely) by writing `* /15` with an explanatory note
- ai-run.ts log line includes inputTokens/outputTokens in addition to the plan-specified published/reviewBacklog fields — all metrics from both results are surfaced for operators

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Node.js v24 treated `*/15 * * * *` inside a block comment as a comment-close token; fixed by writing `* /15 * * * *` (space added) in the comment text only — the actual cron_restart string value `'*/15 * * * *'` is correct and unchanged.

## User Setup Required

None - no external service configuration required. Operators must set env vars (documented in CRONTAB.md) and run `pm2 start ecosystem.config.js` or add crontab entries.

## Next Phase Readiness

- Phase 4 is now complete: all four plans delivered (schema migration, publish service + dead-man, ERROR retry + FAILED exclusion, orchestrator + scheduler)
- PUB-01, PUB-02, PUB-03 requirements addressed
- ecosystem.config.js is ready for production deployment in Phase 6 infrastructure work
- Full test suite: 103 tests GREEN across 15 test files

---
*Phase: 04-scheduler-and-autonomous-publishing*
*Completed: 2026-03-22*
