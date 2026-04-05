---
gsd_state_version: 1.0
milestone: v3.1
milestone_name: Basemap Article Images
status: ready_to_plan
stopped_at: Roadmap created — Phase 40 ready to plan
last_updated: "2026-04-05T21:30:00.000Z"
last_activity: 2026-04-05 — v3.1 roadmap created, phases 40-42 defined
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-05)

**Core value:** Steiermark residents get relevant, hyperlocal news for their Bezirk — automatically, without an editorial team needed to run it.
**Current focus:** Phase 40 — Tile Pipeline Infrastructure (v3.1 start)

## Current Position

Phase: 40 of 42 in v3.1 (Tile Pipeline Infrastructure)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-04-05 — v3.1 roadmap created, phases 40-42 defined

Progress: [░░░░░░░░░░] 0% (v3.1 milestone)

## Performance Metrics

**Velocity (prior milestones):**
- v3.0: 12 plans + 2 quick tasks, ~25 min/plan average
- v2.0: 11 plans over 3 days
- v3.1: Not started

*Updated after each plan completion*

## Accumulated Context

### Decisions

See PROJECT.md Key Decisions for full history.
Recent decisions affecting current work:

- v3.1: sharp pinned to exactly 0.33.5 — 0.34.x broken on Vercel linux-x64 (lovell/sharp#4361, unresolved)
- v3.1: Nominatim Postgres cache is mandatory before first API call — serverless burst causes IP bans
- v3.1: Map generation isolated by inner try/catch in pipeline.ts — failure never blocks article publication
- v3.1: basemap.at tile URL is /{z}/{y}/{x} (y before x) — validate with Graz test before stitching logic

### Pending Todos

None.

### Blockers/Concerns

- Phase 40: sharp binary smoke test on Vercel is a blocking gate — do not write compositing code until confirmed
- Phase 40: SVG text overlay for attribution may need PNG fallback if Vercel lambda has no system fonts
- Phase 41: Steiermark city regex list needs validation against real ORF RSS article titles before finalizing
- Phase 41: Geocoding cache schema (Article columns vs. separate GeocodingCache table) — resolve during planning

## Session Continuity

Last session: 2026-04-05
Stopped at: Roadmap created for v3.1. Phase 40 ready to plan.
Resume file: None
