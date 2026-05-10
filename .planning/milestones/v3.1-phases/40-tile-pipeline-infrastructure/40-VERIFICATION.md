---
phase: 40-tile-pipeline-infrastructure
verified: 2026-04-13T16:55:00Z
status: passed
score: 13/13 must-haves verified
re_verification: false
---

# Phase 40: Tile Pipeline Infrastructure — Verification Report

**Phase Goal:** sharp pin, Blob storage, tile fetch, stitching, attribution, graceful fallback, pipeline isolation
**Verified:** 2026-04-13T16:55:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | sharp@0.33.5 is installed and can create a JPEG buffer from a blank canvas | VERIFIED | `package.json` pins `"sharp": "0.33.5"`; smoke test (mapgen.test.ts:164) passes — 38/38 tests green |
| 2 | @vercel/blob is installed as a dependency | VERIFIED | `"@vercel/blob": "^2.3.3"` in package.json; `import { put } from '@vercel/blob'` at mapgen.ts:12 |
| 3 | generateMapImage fetches 5x3 tile grid, stitches to 1200x630 JPEG, uploads to Vercel Blob, returns { url, credit } | VERIFIED | Full pipeline implemented at mapgen.ts:620-653; fetchTileGrid(layer, zoom, cx, cy, 5, 3) + stitchTiles(tiles, 5, 3) + uploadToBlob; test at mapgen.test.ts:357 passes |
| 4 | credit field is always "© basemap.at" (CC-BY 4.0 compliance) | VERIFIED | `return { url, credit: '© basemap.at' }` at mapgen.ts:647; test at mapgen.test.ts:371 verifies |
| 5 | generateMapImage accepts optional locationType and calls selectZoom internally (city->12, town->13, village->14, street->15, default->13) | VERIFIED | `const zoom = selectZoom(locationType)` at mapgen.ts:629; zoom tests for city/village/default at mapgen.test.ts:437-477 all pass |
| 6 | When tile fetch fails, generateMapImage returns null without throwing | VERIFIED | try/catch wraps entire body at mapgen.ts:627-652; test at mapgen.test.ts:400 passes |
| 7 | When Blob upload fails, generateMapImage returns null without throwing | VERIFIED | Same try/catch; test at mapgen.test.ts:408 passes |
| 8 | Failures are logged via console.warn with article ID, error type, and coordinates | VERIFIED | `console.warn(\`[mapgen] article id=${articleId} -- ${msg} -- lat=${lat} lon=${lon}\`)` at mapgen.ts:650; test at mapgen.test.ts:423 verifies article ID + lat + lon in warn output |
| 9 | Single retry after 500ms on HTTP 5xx; second failure returns null | VERIFIED | fetchTileWithRetry implements ServerError sentinel + 500ms setTimeout retry at mapgen.ts:436-460; tests at mapgen.test.ts:235 and 479 both pass |
| 10 | Attribution SVG uses pre-outlined path data, not text elements (no system font dependency) | VERIFIED | buildAttributionSvg returns SVG with `<path>`, `<rect>`, `<circle>` elements; no `<text` present; test at mapgen.test.ts:147 confirms |
| 11 | selectZoom returns correct zoom for each location type: city->12, town->13, village->14, street->15, default->13 | VERIFIED | ZOOM_BY_LOCATION_TYPE constant at mapgen.ts:92-97; selectZoom at mapgen.ts:163-166; all 6 test cases pass |
| 12 | Module has zero Prisma imports (pipeline isolation / DB-free) | VERIFIED | `grep -c "prisma" mapgen.ts` returns 0 |
| 13 | Tile URLs use z/y/x ordering (not z/x/y) and target wien.gv.at/basemap | VERIFIED | tileUrl returns `https://${server}.wien.gv.at/basemap/${layer}/normal/google3857/${z}/${y}/${x}.${ext}` at mapgen.ts:186; tests at mapgen.test.ts:100-117 verify ordering |

**Score:** 13/13 truths verified

---

### Required Artifacts

| Artifact | Expected | Lines | Status | Details |
|----------|----------|-------|--------|---------|
| `package.json` | sharp@0.33.5 pinned + @img/sharp-linux-x64 optional + @vercel/blob | — | VERIFIED | All three dependencies present; sharp pinned to exact version 0.33.5; @img/sharp-linux-x64 in optionalDependencies for Vercel linux-x64 |
| `src/lib/images/mapgen.ts` | Complete map image generation pipeline | 653 | VERIFIED | Exports: generateMapImage, selectLayer, selectZoom, latLonToTile, buildAttributionSvg, tileUrl, LayerName, LAYER_CONFIG; min_lines 120 met (653 actual) |
| `src/lib/images/mapgen.test.ts` | Comprehensive tests for all mapgen behaviors | 492 | VERIFIED | 38 tests passing; covers all success paths, all failure fallbacks, zoom auto-selection, retry logic; min_lines 100 met (492 actual) |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/images/mapgen.ts` | `sharp` | `import sharp from 'sharp'` | WIRED | Line 11: `import sharp from 'sharp'`; sharp() called at lines 549, 562, 569 |
| `src/lib/images/mapgen.ts` | `@vercel/blob` | `import { put } from '@vercel/blob'` | WIRED | Line 12: `import { put } from '@vercel/blob'`; `put(` called at line 587 |
| `src/lib/images/mapgen.ts` | `basemap.at` | `fetch()` with z/y/x URL | WIRED | `wien.gv.at/basemap` URL constructed at line 186; fetch() called in fetchTileWithRetry at line 438 |
| `generateMapImage` | `selectZoom` | internal call to determine zoom from locationType | WIRED | `const zoom = selectZoom(locationType)` at line 629 — first step in pipeline body |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| MAP-03 | 40-01, 40-02 | System fetches basemap.at tiles and stitches using sharp | SATISFIED | fetchTileGrid + stitchTiles fully implemented and tested |
| MAP-04 | 40-01, 40-02 | System auto-selects zoom (city->12, town->13, village->14, street->15) | SATISFIED | selectZoom + ZOOM_BY_LOCATION_TYPE constant; called in generateMapImage; 6 tests covering all mappings |
| MAP-05 | 40-01 | System selects map layer based on article topic keywords | SATISFIED | selectLayer with AERIAL_KEYWORDS and TERRAIN_KEYWORDS; priority aerial > terrain > greyscale; 5 tests |
| MAP-06 | 40-02 | System stores generated map image in Vercel Blob, writes URL to Article.imageUrl | SATISFIED | uploadToBlob calls put() to `maps/article-{id}.jpg`; URL returned in MapImage.url; Blob path test passes |
| MAP-07 | 40-01, 40-02 | System sets Article.imageCredit to "© basemap.at" (CC-BY 4.0) | SATISFIED | `credit: '© basemap.at'` hardcoded in return value at line 647 |
| MAP-08 | 40-01, 40-02 | System falls back gracefully when tile fetching fails | SATISFIED | try/catch wraps entire generateMapImage body; null returned on any failure; 3 failure tests pass |
| INTG-02 | 40-01, 40-02 | Map generation failure never blocks article creation or publication | SATISFIED | generateMapImage returns null (not throws) on all error paths; module has zero Prisma dependency |

**All 7 Phase 40 requirements satisfied. No orphaned requirements found.**

Note: REQUIREMENTS.md traceability table confirms MAP-01, MAP-02, INTG-01, INTG-03, INTG-04, CMS-01, CMS-02 are mapped to phases 41-42 — not Phase 40.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/lib/images/mapgen.ts` | 651 | `return null` in catch block | INFO | Expected — this is the correct graceful fallback, not a stub. The catch block also calls console.warn before returning null. |

No blocker or warning-level anti-patterns found. No TODO/FIXME/placeholder comments. No stub implementations. No empty handlers.

---

### Human Verification Required

None. All behaviors are verifiable programmatically:
- Sharp binary confirmed working via passing smoke test (not runtime observation needed)
- Attribution overlay correctness (no text elements) verified via string check on SVG output
- Tile URL format verified via regex tests
- Graceful failure verified via mocked rejections

The only behavior that would benefit from human observation is the visual quality of the rendered "© basemap.at" attribution (glyph paths are geometric approximations), but this does not block goal achievement — the functional requirement (no `<text>` elements, path-based rendering) is fully met.

---

## Summary

Phase 40 goal is **fully achieved**. All seven components declared in the phase goal are present and functional:

- **sharp pin**: `sharp@0.33.5` pinned exactly; `@img/sharp-linux-x64@0.33.5` in optionalDependencies for Vercel
- **Blob storage**: `@vercel/blob` installed; `put()` wired in uploadToBlob; Blob path follows `maps/article-{id}.jpg` convention
- **Tile fetch**: fetchTileWithRetry (5xx retry, 4xx no-retry) + fetchTileGrid (5x3 concurrent via Promise.all) fully implemented
- **Stitching**: 3-pass sharp pipeline (composite tiles → PNG → resize 1200x630 → PNG → attribution + JPEG q80)
- **Attribution**: buildAttributionSvg returns font-free SVG with path/circle/rect elements only; no `<text>` elements
- **Graceful fallback**: generateMapImage wraps entire body in try/catch; returns null on any failure; logs via console.warn
- **Pipeline isolation**: Zero Prisma imports; module is DB-free; compatible with Phase 41 caller interface ({ url, credit } matching UnsplashImage shape)

All 38 tests pass. All 13 observable truths verified. All 7 requirements satisfied. 4 key links confirmed wired. Both planned commits (`6f8a6c3`, `31a5ad6`) exist in git history.

---

_Verified: 2026-04-13T16:55:00Z_
_Verifier: Claude (gsd-verifier)_
