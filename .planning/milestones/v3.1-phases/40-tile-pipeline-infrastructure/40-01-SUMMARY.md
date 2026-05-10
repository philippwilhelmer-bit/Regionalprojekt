---
phase: 40-tile-pipeline-infrastructure
plan: "01"
subsystem: infra
tags: [sharp, vercel-blob, tiles, basemap, image-generation, mapgen, svg]

# Dependency graph
requires: []
provides:
  - sharp@0.33.5 pinned and confirmed working (JPEG buffer from blank canvas)
  - "@vercel/blob installed and ready"
  - mapgen.ts module skeleton with all exported pure functions
  - latLonToTile (Spherical Mercator, OSM formula)
  - selectLayer (aerial > terrain > greyscale keyword priority)
  - selectZoom (city->12, town->13, village->14, street->15, default 13)
  - tileUrl (z/y/x basemap.at URL ordering, round-robin across 5 servers)
  - buildAttributionSvg (SVG path-based glyphs, no <text> elements, font-free)
  - generateMapImage stub (returns null, Plan 40-02 implements pipeline)
  - Full test coverage for all pure functions + 8 todos for Plan 40-02 async tests
affects:
  - 40-02 (tile pipeline implementation — fills in generateMapImage stub)
  - 41-geocoding-pipeline-integration (calls generateMapImage)
  - 42-api-cms-backfill (exposes mapgen via API route)

# Tech tracking
tech-stack:
  added:
    - sharp@0.33.5 (pinned — 0.34.x broken on Vercel linux-x64)
    - "@img/sharp-linux-x64@0.33.5 (optionalDependency for Vercel linux-x64 deployment)"
    - "@vercel/blob@^2.3.3"
  patterns:
    - SVG path-based attribution overlay (no <text> elements — font-free for Vercel lambdas)
    - Round-robin server selection via stateful counter across BASEMAP_SERVERS array
    - TDD cycle: RED (failing test commit) -> GREEN (implementation commit)
    - Stub function returning null as placeholder for Plan 40-02 pipeline implementation

key-files:
  created:
    - src/lib/images/mapgen.ts
    - src/lib/images/mapgen.test.ts
  modified:
    - package.json (sharp pinned 0.33.5, @vercel/blob added, optionalDependencies added)
    - package-lock.json

key-decisions:
  - "Tile test vectors corrected: plan stated Graz={x:4468,y:2873} but OSM Slippy Map formula gives {x:4447,y:2879} (x:4468 is actually Vienna's x); implementation uses correct formula values"
  - "tileUrl servers use wien.gv.at domain (maps*.wien.gv.at/basemap/...) not basemap.at domain — test updated to match actual URL structure from WMTS capabilities XML"
  - "buildAttributionSvg uses individual glyph path builder functions for each character in '© basemap.at' — no SVG <text> elements, zero font runtime dependency"
  - "BASEMAP_SERVERS stores subdomain prefixes (maps,maps1..maps4) for https://{server}.wien.gv.at/basemap pattern per WMTS spec"

patterns-established:
  - "Pattern: Lat/lon to tile using OSM Slippy Map formula (not raw WMTS projection)"
  - "Pattern: tileUrl(layer, z, y, x) — y before x matches basemap.at z/TileRow/TileCol ordering"
  - "Pattern: selectLayer checks AERIAL_KEYWORDS first, then TERRAIN_KEYWORDS, defaults to bmapgrau"

requirements-completed:
  - MAP-03
  - MAP-04
  - MAP-05
  - MAP-07
  - MAP-08
  - INTG-02

# Metrics
duration: 7min
completed: 2026-04-13
---

# Phase 40 Plan 01: Tile Pipeline Infrastructure — Foundation Summary

**sharp@0.33.5 binary confirmed working; mapgen.ts skeleton with lat/lon math, layer selection, zoom mapping, z/y/x tile URLs, and SVG path-based attribution overlay — all tested and passing**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-04-13T16:30:24Z
- **Completed:** 2026-04-13T16:37:41Z
- **Tasks:** 1 (TDD — 2 commits: RED test + GREEN implementation)
- **Files modified:** 4

## Accomplishments

- Installed sharp@0.33.5 (exact pin) and @vercel/blob; added `@img/sharp-linux-x64@0.33.5` to optionalDependencies for Vercel linux-x64 deployment
- Implemented and tested all pure functions: `latLonToTile`, `selectLayer`, `selectZoom`, `tileUrl`, `buildAttributionSvg`, `generateMapImage` stub
- Confirmed sharp binary loads and produces a valid 1200x630 JPEG buffer from a blank canvas (smoke test passes — blocking gate cleared)
- Created comprehensive test file: 22 passing tests + 8 todos for Plan 40-02 async behaviors

## Task Commits

TDD task committed in two phases:

1. **RED phase: failing tests** — `e81e725` (test)
2. **GREEN phase: implementation + test corrections** — `31a5ad6` (feat)

**Plan metadata:** (docs commit — this summary)

## Files Created/Modified

- `src/lib/images/mapgen.ts` — Module skeleton: types, constants, pure functions, generateMapImage stub
- `src/lib/images/mapgen.test.ts` — 22 passing pure function tests + 8 async stubs for Plan 40-02
- `package.json` — sharp@0.33.5 pinned, @vercel/blob added, optionalDependencies section added
- `package-lock.json` — Updated lock file

## Decisions Made

- **Test vector correction:** Plan stated Graz tile as `{x:4468, y:2873}` but the OSM Slippy Map formula gives `{x:4447, y:2879}`. The value `x:4468` is actually Vienna's x-coordinate. Tests updated to use mathematically correct values.
- **URL structure:** `tileUrl` uses `https://{server}.wien.gv.at/basemap/...` (from WMTS capabilities XML). The test was updated from `/basemap\.at/` regex to `/wien\.gv\.at\/basemap/` to match actual URL structure.
- **SVG attribution:** Used individual per-glyph `buildGlyph*()` functions with SVG path/arc commands. No `<text>` elements — fully font-free for Vercel lambda compatibility.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected plan test vector for Graz tile coordinates**
- **Found during:** Task 1 (GREEN phase — running tests against formula output)
- **Issue:** Plan specified `{x:4468, y:2873}` for Graz (47.07N, 15.43E, zoom=13) but the standard OSM Slippy Map formula gives `{x:4447, y:2879}`. The value x=4468 matches Vienna's x-coordinate, not Graz's.
- **Fix:** Updated test to use `{x:4447, y:2879}` for Graz and `{x:4468, y:2840}` for Vienna based on the correct formula. The `latLonToTile` implementation is mathematically correct per the OSM wiki.
- **Files modified:** `src/lib/images/mapgen.test.ts`
- **Verification:** Both Graz and Vienna tests pass with correct values
- **Committed in:** `31a5ad6` (feat commit)

**2. [Rule 1 - Bug] Fixed tileUrl test regex to match actual URL domain**
- **Found during:** Task 1 (GREEN phase — test failure on URL assertion)
- **Issue:** Test used `/basemap\.at/` regex expecting domain `basemap.at` in URL, but basemap.at tiles are served from `maps*.wien.gv.at` (confirmed in RESEARCH.md and WMTS capabilities XML). The tileUrl implementation correctly uses `wien.gv.at`.
- **Fix:** Updated test regex to `/wien\.gv\.at\/basemap/` and BASEMAP_SERVERS to subdomain-prefix format matching the RESEARCH.md pattern.
- **Files modified:** `src/lib/images/mapgen.test.ts`, `src/lib/images/mapgen.ts`
- **Verification:** tileUrl tests pass; URL format matches official WMTS spec
- **Committed in:** `31a5ad6` (feat commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - Bug corrections)
**Impact on plan:** Both fixes corrected documentation errors in the plan's test vectors — the implementation logic was correct and the RESEARCH.md had the right formulas.

## Issues Encountered

Pre-existing test failures in `src/lib/content/bezirke.test.ts` (2 tests) were present before this plan and are unrelated to mapgen changes. These are out of scope per deviation rules and documented in `deferred-items.md`.

## Next Phase Readiness

- **Plan 40-02 ready to start:** `generateMapImage` stub exists, all pure functions tested, sharp binary confirmed working
- **Plan 40-02 fills in:** `fetchTileGrid`, `stitchTiles`, attribution compositing, Vercel Blob upload, the 8 todo test stubs
- **No blockers:** sharp smoke test passed — the blocking gate (sharp binary on this platform) is cleared

---
*Phase: 40-tile-pipeline-infrastructure*
*Completed: 2026-04-13*

## Self-Check: PASSED

- FOUND: `src/lib/images/mapgen.ts`
- FOUND: `src/lib/images/mapgen.test.ts`
- FOUND: `.planning/phases/40-tile-pipeline-infrastructure/40-01-SUMMARY.md`
- FOUND: commit `e81e725` (RED phase — failing tests)
- FOUND: commit `31a5ad6` (GREEN phase — implementation)
