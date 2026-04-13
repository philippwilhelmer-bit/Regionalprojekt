---
status: complete
phase: 40-tile-pipeline-infrastructure
source: [40-01-SUMMARY.md, 40-02-SUMMARY.md]
started: 2026-04-13T17:00:00Z
updated: 2026-04-13T17:05:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Test Suite Passes
expected: Run `npx vitest run src/lib/images/mapgen.test.ts`. All 38 tests pass with no failures or warnings.
result: pass

### 2. Sharp Binary Smoke Test
expected: Sharp is installed at version 0.33.5 exactly (check package.json). The test suite includes a smoke test that creates a 1200x630 JPEG buffer from a blank canvas — confirming the sharp native binary loads on this platform.
result: pass

### 3. Pure Functions Exported
expected: mapgen.ts exports these pure functions: `latLonToTile`, `selectLayer`, `selectZoom`, `tileUrl`, `buildAttributionSvg`. Each has dedicated test coverage in mapgen.test.ts.
result: pass

### 4. Tile URL Generation
expected: `tileUrl` produces URLs matching the pattern `https://maps{0-4}.wien.gv.at/basemap/{layer}/{tileMatrixSet}/{z}/{y}/{x}.jpeg` with round-robin server selection across 5 servers.
result: pass

### 5. Full Pipeline Implementation
expected: `generateMapImage` accepts `(lat, lon, headline, articleId, locationType?)` and returns `{ url: string, credit: "© basemap.at" } | null`. It orchestrates: tile grid fetch -> sharp stitching to 1200x630 JPEG -> SVG attribution overlay -> Vercel Blob upload. Returns null on any error (graceful fallback).
result: pass

### 6. Zoom Auto-Selection by Location Type
expected: `selectZoom` maps location types to zoom levels: city->12, town->13, village->14, street->15, default->13. This is called by `generateMapImage` to implement MAP-04 requirement.
result: pass

### 7. SVG Attribution Overlay (Font-Free)
expected: `buildAttributionSvg` generates an SVG containing "© basemap.at" using only path/arc elements — no `<text>` elements. This ensures compatibility with Vercel lambdas which have no font runtime.
result: pass

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
