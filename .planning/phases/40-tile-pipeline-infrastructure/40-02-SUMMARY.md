---
phase: 40-tile-pipeline-infrastructure
plan: "02"
subsystem: infra
tags: [sharp, vercel-blob, tiles, basemap, image-generation, mapgen, png, jpeg, retry]

# Dependency graph
requires:
  - phase: 40-01
    provides: "mapgen.ts skeleton with pure functions (latLonToTile, selectZoom, tileUrl, buildAttributionSvg) and generateMapImage stub"
provides:
  - fetchTileWithRetry (single tile fetch with 5xx retry after 500ms, 4xx no-retry)
  - fetchTileGrid (5x3 concurrent grid fetch using Promise.all)
  - stitchTiles (3-pass sharp pipeline: composite -> resize 1200x630 -> attribution + JPEG q80)
  - uploadToBlob (Vercel Blob put() to maps/article-{id}.jpg)
  - generateMapImage full implementation (lat/lon/headline/articleId/locationType -> {url, credit} | null)
  - 38 passing tests covering all success paths, failure fallbacks, zoom auto-selection
affects:
  - 41-geocoding-pipeline-integration (calls generateMapImage with geocoded coordinates)
  - 42-api-cms-backfill (exposes mapgen pipeline via API route)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 3-pass sharp pipeline (composite raw tiles -> PNG -> resize to output dimensions -> PNG -> attribution + JPEG encoding)
    - ServerError sentinel class for HTTP 5xx retry signaling without leaking to 4xx paths
    - ArrayBuffer standalone copy (buffer.slice(byteOffset, byteOffset+byteLength)) prevents Node.js pooled buffer issues in mocks
    - vi.useFakeTimers with rejection handler attached before timer advance to avoid PromiseRejectionHandledWarning

key-files:
  created: []
  modified:
    - src/lib/images/mapgen.ts
    - src/lib/images/mapgen.test.ts

key-decisions:
  - "Sharp intermediate buffers must be encoded as PNG between pipeline steps — toBuffer() without format returns raw pixel data that sharp cannot auto-detect on re-input"
  - "ServerError sentinel class used for 5xx retry signaling so 4xx paths (which throw plain Error) never trigger the retry branch"
  - "ArrayBuffer for test mock must be standalone copy (buffer.slice) not a Node.js pool-shared buffer — pool sharing causes sharp to read garbage data"

patterns-established:
  - "Pattern: 3-pass sharp pipeline for tile stitching — each pass encodes to PNG to preserve format metadata between steps"
  - "Pattern: Graceful null return — generateMapImage wraps entire body in try/catch, logs via console.warn with article ID and coordinates, returns null"
  - "Pattern: selectZoom(locationType) called first in generateMapImage to implement MAP-04 zoom auto-selection"

requirements-completed:
  - MAP-03
  - MAP-04
  - MAP-06
  - MAP-07
  - MAP-08
  - INTG-02

# Metrics
duration: 10min
completed: 2026-04-13
---

# Phase 40 Plan 02: Tile Pipeline Infrastructure — Pipeline Implementation Summary

**basemap.at tile grid fetch with 5xx retry, 3-pass sharp stitching to 1200x630 JPEG, SVG attribution overlay, and Vercel Blob upload — all with graceful null fallback and locationType zoom auto-selection**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-13T14:39:47Z
- **Completed:** 2026-04-13T14:49:33Z
- **Tasks:** 2 (both TDD — RED + GREEN commits each)
- **Files modified:** 2

## Accomplishments

- Implemented `fetchTileWithRetry` with HTTP 5xx single-retry (500ms delay) and 4xx immediate throw
- Implemented `fetchTileGrid` fetching 15 tiles (5x3) concurrently via nested `Promise.all`
- Implemented `stitchTiles` as 3-pass sharp pipeline: composite tiles to canvas, resize/crop to 1200x630, composite SVG attribution + JPEG q80 encode
- Implemented `uploadToBlob` uploading JPEG to `maps/article-{id}.jpg` in Vercel Blob (public, image/jpeg)
- Filled in `generateMapImage` stub: full pipeline with `selectZoom(locationType)` auto-selection (MAP-04), error logging, null fallback
- 38 tests passing: 8 todo stubs replaced with real tests covering all behaviors

## Task Commits

TDD tasks — each committed in two phases (RED tests first, then GREEN implementation):

1. **RED phase: failing tests for all async behaviors** — `28ef69e` (test)
2. **GREEN phase: full pipeline implementation** — `6f8a6c3` (feat)

**Plan metadata:** (docs commit — this summary)

## Files Created/Modified

- `src/lib/images/mapgen.ts` — Added `fetchTileWithRetry`, `fetchTileGrid`, `stitchTiles`, `uploadToBlob`, `ServerError`; filled in `generateMapImage` body; total 653 lines
- `src/lib/images/mapgen.test.ts` — Replaced 8 todo stubs with full test suites for all async behaviors; added PNG buffer helper with standalone ArrayBuffer; total 492 lines

## Decisions Made

- **3-pass sharp pipeline:** Sharp's `toBuffer()` without a format encoder returns raw pixel data (uncompressed RGBA), not a decodable format. Re-inputting raw pixel data to `sharp()` fails with "Input buffer contains unsupported image format". Adding `.png()` before `.toBuffer()` in passes 1 and 2 ensures each step produces a properly encoded image.

- **ServerError sentinel class:** A dedicated `ServerError extends Error` class signals HTTP 5xx conditions to the retry catch block without affecting the 4xx path. Since 4xx throws `new Error(...)` (not `ServerError`), the `instanceof ServerError` check in the catch correctly skips retry for client errors.

- **Test ArrayBuffer isolation:** Node.js `Buffer.allocUnsafe` uses a shared memory pool. When a Buffer's `byteOffset > 0` or `buffer.byteLength > byteLength`, the `buffer` property points to the pool. Sharp reading `Buffer.from(pooledArrayBuffer)` may read garbage bytes beyond the actual PNG data. Fix: `buffer.slice(byteOffset, byteOffset + byteLength)` creates a standalone ArrayBuffer containing only the PNG bytes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Encode intermediate sharp buffers as PNG to prevent format detection failure**
- **Found during:** Task 2 (GREEN phase — running generateMapImage tests)
- **Issue:** `sharp({ create: ... }).composite(tiles).toBuffer()` returns raw uncompressed pixel data. Passing this back to `sharp(stitched)` fails: "Input buffer contains unsupported image format" because sharp cannot detect format from raw pixels.
- **Fix:** Added `.png()` before `.toBuffer()` in both steps 1 and 2 of `stitchTiles`. Only the final step uses `.jpeg({ quality: 80 })`.
- **Files modified:** `src/lib/images/mapgen.ts` (stitchTiles function)
- **Verification:** All 38 tests pass including success paths that exercise the full sharp pipeline
- **Committed in:** `6f8a6c3` (feat commit)

**2. [Rule 1 - Bug] Fix PromiseRejectionHandledWarning in fake-timer test**
- **Found during:** Task 1 (GREEN phase — running timer-based retry test)
- **Issue:** Test attached `expect(promise).rejects.toThrow()` AFTER `await vi.advanceTimersByTimeAsync(500)`. The timer advance fires the retry which throws synchronously — rejection created before handler attached.
- **Fix:** Attach `const assertion = expect(resultPromise).rejects.toThrow()` before advancing timers, then `await assertion` after. Rejection handler is registered synchronously before the timer fires.
- **Files modified:** `src/lib/images/mapgen.test.ts`
- **Verification:** No unhandled rejection warnings in test output, all 38 tests pass
- **Committed in:** `6f8a6c3` (feat commit)

**3. [Rule 1 - Bug] Use standalone ArrayBuffer in PNG mock to avoid Node.js pool sharing**
- **Found during:** Task 2 (GREEN phase — generateMapImage tests returning null despite valid mock setup)
- **Issue:** `minimalPng.buffer` pointed to a shared 8192-byte pool, not a standalone PNG buffer. Sharp reading the pool ArrayBuffer got garbage data outside the actual PNG bytes.
- **Fix:** Copy PNG into standalone buffer: `const ab = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength)` — creates independent `ArrayBuffer` of exactly the PNG bytes. Exposed as `minimalPngArrayBuffer` for all mock responses.
- **Files modified:** `src/lib/images/mapgen.test.ts`
- **Verification:** Sharp successfully decodes mock tile buffers in all 15 tile positions, pipeline completes
- **Committed in:** `6f8a6c3` (feat commit)

---

**Total deviations:** 3 auto-fixed (all Rule 1 - Bug corrections)
**Impact on plan:** All three were necessary for the implementation to work correctly. No scope creep — all fixes address the planned behaviors.

## Issues Encountered

Pre-existing test failures in `src/lib/content/bezirke.test.ts` (2 tests) and `src/app/__tests__/root-layout-adsense.test.ts` were present before this plan and are unrelated to mapgen changes. Out of scope per deviation rules.

## Next Phase Readiness

- **Phase 41 ready:** `generateMapImage(lat, lon, headline, articleId, locationType?)` is fully implemented and tested. Phase 41 geocoding pipeline can call it with OSM coordinates directly.
- **API contract stable:** Returns `{ url: string, credit: "© basemap.at" } | null` — matches UnsplashImage shape for pipeline compatibility.
- **No blockers:** All 38 mapgen tests green, zero Prisma dependency, module is DB-free.

---
*Phase: 40-tile-pipeline-infrastructure*
*Completed: 2026-04-13*
