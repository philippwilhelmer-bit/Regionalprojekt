---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Test Deployment
status: planning
stopped_at: Completed 21-railway-infrastructure/21-01-PLAN.md
last_updated: "2026-03-26T10:03:29.365Z"
last_activity: 2026-03-26 — Roadmap created for v1.2
progress:
  total_phases: 2
  completed_phases: 0
  total_plans: 2
  completed_plans: 1
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-26)

**Core value:** Steiermark residents get relevant, hyperlocal news for their Bezirk — automatically, without an editorial team needed to run it.
**Current focus:** v1.2 Test Deployment — Phase 21: Railway Infrastructure

## Current Position

Phase: 21 of 22 (Railway Infrastructure)
Plan: — (not yet planned)
Status: Ready to plan
Last activity: 2026-03-26 — Roadmap created for v1.2

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity (prior milestones):**
- v1.0: 52 plans over 5 days
- v1.1: 10 plans over 2 days

**v1.2 By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

*Updated after each plan completion*
| Phase 21-railway-infrastructure P01 | 3 | 2 tasks | 3 files |

## Accumulated Context

### Decisions

Carried from v1.1 (see PROJECT.md Key Decisions):
- NEXT_PUBLIC_IS_TEST_SITE is the canonical env var name (from research/SUMMARY.md)
- All test-mode behaviors gated by a single env var — no code changes needed to go production, only redeploy
- [Phase 21 DEVIATION]: Switched from Railway to Vercel + Neon. User requested Vercel as better fit for Next.js. Neon chosen for Postgres (free tier, serverless, native Vercel integration).
- [Phase 21-vercel]: Cron runs via Vercel cron → /api/cron API route (replaces Railway cron service). Secured with CRON_SECRET bearer token.
- [Phase 21-vercel]: Prisma migrations run via `npx prisma migrate deploy` before seed, not in start command (Vercel handles Next.js start automatically)

### Pending Todos

None yet.

### Blockers/Concerns

- AdSense gating: FEATURES.md notes AdSense silently no-ops on unverified Railway domains. Confirm during Phase 22 whether explicit gating is needed or placeholder pub-ID approach is sufficient.
- Prisma migrate deploy in build command: confirm `npx prisma migrate deploy && npm run build` does not conflict with any existing postinstall hook before Phase 21 deploy.

## Session Continuity

Last session: 2026-03-26T10:03:29.364Z
Stopped at: Completed 21-railway-infrastructure/21-01-PLAN.md
Resume file: None
