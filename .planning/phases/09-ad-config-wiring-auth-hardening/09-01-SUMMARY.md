---
phase: 09-ad-config-wiring-auth-hardening
plan: 01
subsystem: ui
tags: [react, next.js, adsense, server-components, vitest, tdd]

# Dependency graph
requires:
  - phase: 06-reader-frontend
    provides: "AdUnit client component with hardcoded slot env vars"
  - phase: 01-foundation
    provides: "bundesland.config.ts with AdZone config shape and BundeslandConfig type"
provides:
  - "AdUnit Server Component wrapper — config-driven slot resolution via bundesland.config.adZones"
  - "AdUnitClient — isolated 'use client' component with useEffect AdSense push and dev placeholder"
  - "Unit tests for features.ads gate, per-zone enabled gate, env var slot resolution"
affects: [ad-placements, bundesland-config, reader-frontend]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server Component wrapper + Client Component pair: Server reads config/env at import time, Client handles browser APIs"
    - "TDD with vi.mock for bundesland.config — mock config module to test gating behavior without real env setup"

key-files:
  created:
    - src/components/reader/AdUnitClient.tsx
    - src/components/reader/AdUnit.test.tsx
  modified:
    - src/components/reader/AdUnit.tsx

key-decisions:
  - "AdUnit.tsx has no 'use client' — Server Component reads bundesland.config and server-side env vars at import time"
  - "AdUnitClient.tsx is 'use client' and NOT re-exported from AdUnit.tsx — call sites only use { AdUnit }"
  - "process.env[zoneConfig.envVar] for slot resolution (server-side env vars, no NEXT_PUBLIC_ prefix) — pubId stays NEXT_PUBLIC_ since AdUnitClient needs it in the browser"
  - "React import added explicitly to AdUnit.tsx — vitest does not configure JSX automatic transform, classic transform requires React in scope"
  - "afterEach imported explicitly from vitest in test file — globals:true handles runtime but TypeScript strict mode requires explicit import"

patterns-established:
  - "Server Component + Client Component pair: wrap 'use client' child in a Server Component for config-gated rendering"

requirements-completed: [AD-02]

# Metrics
duration: 10min
completed: 2026-03-24
---

# Phase 9 Plan 01: AdUnit Server Wrapper Summary

**AdUnit.tsx refactored from hardcoded-slot Client Component to Server Component wrapper — ad slots now resolved from bundesland.config.adZones[zone].envVar, gated by config.features.ads and per-zone enabled flag**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-24T20:04:00Z
- **Completed:** 2026-03-24T20:06:00Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 3

## Accomplishments
- Extracted `AdUnitClient.tsx` with `"use client"` directive — all browser-side logic (useEffect, ins tag, dev placeholder) lives here
- Rewrote `AdUnit.tsx` as Server Component — reads `bundesland.config` at import time, gates on `features.ads` and per-zone `enabled`, resolves slot via `process.env[zoneConfig.envVar]`
- All 3 call sites (public page.tsx, ArticleFeed.tsx, article detail page.tsx) compile without modification — exported name `AdUnit` unchanged
- 4 unit tests green: features.ads false gate, zone enabled:false gate, valid zone renders AdUnitClient, dev placeholder path

## Task Commits

Each task was committed atomically:

1. **RED: AdUnit Server wrapper tests** - `0f78901` (test)
2. **GREEN: AdUnit Server wrapper + AdUnitClient** - `30cb39c` (feat)

_Note: TDD task had two commits (test RED → feat GREEN)_

## Files Created/Modified
- `src/components/reader/AdUnit.tsx` - Server Component wrapper; reads bundesland.config, gates rendering, resolves slot from env var
- `src/components/reader/AdUnitClient.tsx` - New client component with useEffect AdSense push, ins tag, dev placeholder
- `src/components/reader/AdUnit.test.tsx` - New unit tests for gating behavior via vi.mock

## Decisions Made
- Added `import React from 'react'` to `AdUnit.tsx` because vitest uses classic JSX transform (not the automatic React 17+ transform), requiring React in scope for JSX to compile in tests
- `afterEach` imported explicitly from vitest — TypeScript strict mode requires it even when `globals: true` is set in vitest config
- No `"use client"` on `AdUnit.tsx` — this is a Server Component that accesses server-side env vars and config at import time

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added explicit React import to AdUnit.tsx for vitest JSX transform**
- **Found during:** Task 1 GREEN phase (test run)
- **Issue:** vitest transforms JSX using classic runtime; without `import React from 'react'`, `React is not defined` ReferenceError when calling AdUnit() in tests
- **Fix:** Added `import React from 'react'` at top of AdUnit.tsx
- **Files modified:** src/components/reader/AdUnit.tsx
- **Verification:** All 4 tests pass, `tsc --noEmit` clean, `next build` succeeds
- **Committed in:** 30cb39c (Task 1 feat commit)

**2. [Rule 3 - Blocking] Added afterEach import to test file**
- **Found during:** Task 1 GREEN phase (tsc --noEmit)
- **Issue:** TypeScript error TS2304: Cannot find name 'afterEach' — globals: true in vitest.config.ts provides runtime globals but TypeScript still requires explicit import
- **Fix:** Added `afterEach` to vitest import in test file
- **Files modified:** src/components/reader/AdUnit.test.tsx
- **Verification:** `tsc --noEmit` exits 0
- **Committed in:** 30cb39c (Task 1 feat commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 — blocking issues discovered during test run)
**Impact on plan:** Both fixes necessary to make tests pass and TypeScript compile. No scope creep.

## Issues Encountered
- Vitest environment is 'node' with no jsdom — AdUnit Server Component is testable as a plain function returning JSX/null (React Server Components are just functions), which works without jsdom

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- AD-02 complete: ad slot configuration is now fully driven by bundesland.config.ts — no component changes needed when deploying to new Bundesland
- Remaining phase 09 plans can proceed: auth hardening and other wiring tasks unblocked

---
*Phase: 09-ad-config-wiring-auth-hardening*
*Completed: 2026-03-24*
