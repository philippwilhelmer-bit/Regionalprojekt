---
gsd_state_version: 1.0
milestone: v3.1
milestone_name: Basemap Article Images
status: executing
stopped_at: Completed 42-on-demand-route-cms-picker-backfill-42-01-PLAN.md
last_updated: "2026-04-13T17:41:22.868Z"
last_activity: "2026-04-13 — Plan 41-01 complete: locextract.ts + geocode.ts + GeocodingCache model with 25 tests"
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 6
  completed_plans: 5
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-05)

**Core value:** Steiermark residents get relevant, hyperlocal news for their Bezirk — automatically, without an editorial team needed to run it.
**Current focus:** Phase 40 — Tile Pipeline Infrastructure (v3.1 start)

## Current Position

Phase: 41 of 42 in v3.1 (Location Intelligence - Full Pipeline)
Plan: 1 of 2 in current phase
Status: In progress
Last activity: 2026-04-13 — Plan 41-01 complete: locextract.ts + geocode.ts + GeocodingCache model with 25 tests

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
- [Phase 40-tile-pipeline-infrastructure]: Graz tile test vector corrected from plan's x=4468,y=2873 to formula-correct x=4447,y=2879 (x=4468 is Vienna's x)
- [Phase 40-tile-pipeline-infrastructure]: tileUrl uses wien.gv.at domain (maps*.wien.gv.at/basemap/) confirmed from WMTS capabilities XML — not basemap.at domain
- [Phase 40-tile-pipeline-infrastructure]: Sharp intermediate buffers must be PNG-encoded between pipeline steps — toBuffer() returns raw pixel data that sharp cannot auto-detect
- [Phase 40-tile-pipeline-infrastructure]: Test ArrayBuffer must be standalone copy (buffer.slice) to avoid Node.js pool sharing corrupting sharp PNG reads
- [Phase 41-location-intelligence-full-pipeline]: Regex uses lookahead/lookbehind (not \b) to handle place names ending in non-word chars like "Graz (Stadt)"
- [Phase 41-location-intelligence-full-pipeline]: geocode.ts uses upsert with update:{} (no-op) rather than create+P2002 catch to handle concurrent serverless cache writes
- [Phase 41-location-intelligence-full-pipeline]: GEOCODING_QUERY_OVERRIDE lives in locextract.ts and imported by geocode.ts — all Steiermark location domain knowledge in one module
- [Phase 41-location-intelligence-full-pipeline]: Inner try/catch for map block in pipeline.ts ensures map errors never block publication or increment retryCount
- [Phase 41-location-intelligence-full-pipeline]: Separate db.article.update for imageUrl/imageCredit prevents silent overwrite by the status/content update
- [Phase 42-on-demand-route-cms-picker-backfill]: backfillMapImages caps at take:10 (conservative Vercel Hobby Server Action timeout limit)
- [Phase 42-on-demand-route-cms-picker-backfill]: 1100ms delay placed after geocodeLocation call — rate-limit on the call site, even for cache hits

### Pending Todos

None.

### Blockers/Concerns

- Phase 40: sharp binary smoke test on Vercel is a blocking gate — do not write compositing code until confirmed
- Phase 40: SVG text overlay for attribution may need PNG fallback if Vercel lambda has no system fonts
- Phase 41: Steiermark city regex list needs validation against real ORF RSS article titles before finalizing
- Phase 41: Geocoding cache schema (Article columns vs. separate GeocodingCache table) — resolve during planning

## Session Continuity

Last session: 2026-04-13T17:41:22.865Z
Stopped at: Completed 42-on-demand-route-cms-picker-backfill-42-01-PLAN.md
Resume file: None
