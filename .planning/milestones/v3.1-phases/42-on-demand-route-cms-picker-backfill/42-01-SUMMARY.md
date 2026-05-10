---
phase: 42-on-demand-route-cms-picker-backfill
plan: "01"
subsystem: api
tags: [next.js, prisma, vitest, tdd, nominatim, geocoding, maps, server-actions]

requires:
  - phase: 41-location-intelligence-full-pipeline
    provides: extractLocation, llmLocationFallback, geocodeLocation, GeocodingCache
  - phase: 40-tile-pipeline-infrastructure
    provides: generateMapImage, MapImage type

provides:
  - POST /api/admin/generate-map route handler with CRON_SECRET auth
  - generateMapForArticle Server Action with requireAuth
  - backfillMapImages Server Action with 1100ms inter-geocoding delay and progress logging
  - BackfillResult interface
  - 23 unit tests (9 route, 14 map-actions)

affects: [42-02, CMS picker implementation, backfill UI button]

tech-stack:
  added: []
  patterns:
    - "On-demand route uses CRON_SECRET bearer auth (not requireAuth — next/headers unavailable in Route Handlers)"
    - "Server Actions use requireAuth() for session-based CMS auth"
    - "backfillMapImages caps at take:10 (conservative Vercel Hobby Server Action timeout limit)"
    - "1100ms setTimeout after each geocodeLocation call even on cache hits — uniform Nominatim rate limiting"
    - "vi.mock at module level + vi.useFakeTimers + vi.runAllTimersAsync for async timer testing"

key-files:
  created:
    - src/app/api/admin/generate-map/route.ts
    - src/app/api/admin/generate-map/route.test.ts
    - src/lib/admin/map-actions.ts
    - src/lib/admin/map-actions.test.ts

key-decisions:
  - "backfillMapImages caps at take:10 (not 50) — conservative limit after research notes Vercel Hobby Server Action timeout is unclear; 10 articles × ~6s ≈ 60s is safe within any timeout tier"
  - "1100ms delay placed after geocodeLocation call (not before) — rate-limit on the call itself, not speculative pre-delay"
  - "Skipped articles (no location OR no geocoding result) both count as skipped, not failed — failed reserved for unexpected errors"

patterns-established:
  - "Route Handler auth: Authorization: Bearer CRON_SECRET — mirrors existing cron route pattern"
  - "Server Action auth: requireAuth() from auth-node.ts — mirrors all other admin actions"
  - "TDD with vi.useFakeTimers + vi.runAllTimersAsync to test async setTimeout delays"

requirements-completed: [INTG-03, INTG-04]

duration: 4min
completed: 2026-04-13
---

# Phase 42 Plan 01: On-Demand Map Route and Server Actions Summary

**POST /api/admin/generate-map route handler with CRON_SECRET auth + generateMapForArticle and backfillMapImages Server Actions with sequential 1100ms Nominatim rate-limiting, 23 tests via TDD**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-13T17:36:44Z
- **Completed:** 2026-04-13T17:40:25Z
- **Tasks:** 1 (TDD: RED commit + GREEN commit)
- **Files modified:** 4

## Accomplishments
- POST /api/admin/generate-map route handler: CRON_SECRET bearer auth, 401/400/404/422/500/200 status codes, maxDuration=60 for tile pipeline headroom
- generateMapForArticle Server Action: requireAuth(), full extractLocation → geocodeLocation → generateMapImage pipeline, returns { url, credit } or { error }
- backfillMapImages Server Action: PUBLISHED+imageUrl:null filter, take:10 cap, sequential loop with 1100ms setTimeout after each geocodeLocation call, console progress logging per article, returns BackfillResult counts
- 23 tests covering all route error cases, Server Action pipeline branches, backfill count tracking, delay verification, and progress logging

## Task Commits

TDD approach with two commits per task:

1. **RED — Failing tests** - `c851408` (test)
2. **GREEN — Implementation** - `0bf70ab` (feat)

## Files Created/Modified
- `src/app/api/admin/generate-map/route.ts` — POST route handler, maxDuration=60, CRON_SECRET auth
- `src/app/api/admin/generate-map/route.test.ts` — 9 unit tests for all route status codes
- `src/lib/admin/map-actions.ts` — generateMapForArticle + backfillMapImages Server Actions + BackfillResult interface
- `src/lib/admin/map-actions.test.ts` — 14 unit tests for pipeline branches, counts, delay timing, logging

## Decisions Made
- `take: 10` cap on backfillMapImages (not 50 as in research Pattern 2 example) — plan's must_haves truth specifies 10 explicitly; conservative given unclear Vercel Hobby Server Action timeout
- Skipped articles (no location found OR geocoding null) counted as `skipped`, not `failed` — `failed` reserved for unexpected exceptions or generateMapImage returning null
- 1100ms delay placed immediately after geocodeLocation call (not at loop end) — makes rate-limiting intent explicit at the API call site

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
- Pre-existing test failures in `src/lib/content/bezirke.test.ts` (3 tests) confirmed pre-existing by stash verification — unrelated to this plan's changes, out of scope per deviation rules.

## User Setup Required
None — no external service configuration required. CRON_SECRET already exists in Vercel env vars.

## Next Phase Readiness
- Route handler and Server Actions ready for Plan 02 (CMS picker tab)
- MapPicker should call `generateMapForArticle(articleId)` Server Action directly (not the route) for session-auth consistency
- BackfillButton component in Plan 02 can import `backfillMapImages` and `BackfillResult` directly from `@/lib/admin/map-actions`

---
*Phase: 42-on-demand-route-cms-picker-backfill*
*Completed: 2026-04-13*
