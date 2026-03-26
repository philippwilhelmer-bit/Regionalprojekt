---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Test Deployment
status: active
stopped_at: null
last_updated: "2026-03-26T09:00:00.000Z"
last_activity: 2026-03-26 — Roadmap created for v1.2 (2 phases, 9 requirements mapped)
progress:
  total_phases: 2
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
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

## Accumulated Context

### Decisions

Carried from v1.1 (see PROJECT.md Key Decisions):
- NEXT_PUBLIC_IS_TEST_SITE is the canonical env var name (from research/SUMMARY.md)
- All test-mode behaviors gated by a single env var — no code changes needed to go production, only redeploy
- Railway PostgreSQL addon referenced via `${{Postgres.DATABASE_URL}}` — never a hard-coded connection string
- start script must use `next start -p ${PORT:-3000}` — Railway assigns dynamic PORT, Next.js ignores it without explicit flag
- NEXT_PUBLIC_ vars must be set in Railway Variables before the first build runs — not after

### Pending Todos

None yet.

### Blockers/Concerns

- AdSense gating: FEATURES.md notes AdSense silently no-ops on unverified Railway domains. Confirm during Phase 22 whether explicit gating is needed or placeholder pub-ID approach is sufficient.
- Prisma migrate deploy in build command: confirm `npx prisma migrate deploy && npm run build` does not conflict with any existing postinstall hook before Phase 21 deploy.

## Session Continuity

Last session: 2026-03-26
Stopped at: Roadmap written for v1.2. Phase 21 is next (Railway Infrastructure).
Resume file: None
