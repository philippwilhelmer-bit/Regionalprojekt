# Project Research Summary

**Project:** Regionalprojekt — Wurzelwelt v3.1 Basemap Article Images
**Domain:** Automatic map image generation for a Vercel-hosted Next.js 15 regional news platform
**Researched:** 2026-04-05
**Confidence:** MEDIUM (one pinned dependency with known upstream instability; all other areas HIGH)

## Executive Summary

Wurzelwelt v3.1 adds auto-generated location-based map images to article headers, replacing the existing gradient fallback for articles with extractable geographic content. The approach is: extract a place name from AI-rewritten article text via regex (with Claude LLM fallback), geocode it to lat/lon via Nominatim, fetch a 3×3 grid of 256×256 PNG tiles from basemap.at's free CC-BY 4.0 WMTS service, composite them into a single JPEG with sharp, store the result in Vercel Blob, and write the URL back to `Article.imageUrl`. This is a well-understood pipeline pattern with no exotic dependencies — the main challenge is engineering it to be non-fatal, idempotent, and within Vercel Hobby plan constraints.

The recommended stack adds exactly two packages to the existing project: `sharp@0.33.5` (pinned, not a range) and `@vercel/blob@^0.27`. No geocoding wrapper, no tile math library, no map rendering framework — all other components are either existing project infrastructure or six lines of inline math. The single highest-risk dependency decision is the sharp version pin: `sharp@0.34.x` is confirmed broken on Vercel's linux-x64 runtime with Next.js 15; `0.33.5` is the version Next.js 15 ships internally and is proven stable.

The two make-or-break risks are: (1) map generation failures propagating into the ingestion pipeline and blocking article publication — prevented by an inner try/catch that treats map generation as best-effort enhancement, never a required step; and (2) Nominatim rate-limit bans from serverless burst requests — prevented by caching geocoding results in Postgres by normalized place name and never geocoding the same location twice. All other pitfalls are real but recoverable. The architecture decision to use a single `generateMapImage()` facade called from three contexts (cron pipeline, on-demand API route, CMS Server Action) keeps error handling and DB writes consolidated and makes the feature straightforward to test and reason about.

---

## Key Findings

### Recommended Stack

The existing Next.js 15 / Prisma v6 / PostgreSQL / Tailwind v4 / Vercel stack requires only two new packages. `sharp@0.33.5` handles tile compositing using the `composite()` API — it is already a transitive dependency of Next.js 15's `<Image>` optimization and ships a pre-compiled linux-x64 binary that loads correctly on Vercel. Pin to exactly `0.33.5` with no caret — the `^0.34.x` range causes a confirmed runtime error on Vercel ("Could not load the 'sharp' module using the linux-x64 runtime"). `@vercel/blob@^0.27` accepts a Node.js Buffer directly and returns a stable CDN URL; it uses the project's existing Vercel hosting and Hobby plan free tier. Nominatim (Austrian geocoding) and basemap.at (tile service) are called via native `fetch` with no wrapper packages — both are adequate at current article volumes (1 req/sec Nominatim policy vs. 5–10 articles/day throughput).

**Core technologies:**
- `sharp@0.33.5` (pinned, no caret): tile compositing into a single JPEG — must not be upgraded to 0.34.x until lovell/sharp#4361 is resolved
- `@vercel/blob@^0.27`: Blob storage for generated map images — native to existing Vercel project, free tier sufficient at <200 images/month
- Nominatim via native `fetch`: Austrian geocoding — free, 1 req/s policy, `countrycodes=at` eliminates cross-border ambiguity
- basemap.at WMTS via native `fetch`: `geolandbasemap` and `bmapgrau` layers at zoom 12–14, CC-BY 4.0, no API key, `/{z}/{y}/{x}` URL order (y before x)

### Expected Features

The full pipeline has a clear P1/P2/P3 split. P1 is the core pipeline that replaces gradients with maps for newly ingested articles. P2 adds the CMS editor workflow and backfill capability. P3 is analytics/metadata and is explicitly out of scope for v3.1.

**Must have (P1 — table stakes for a working v3.1 pipeline):**
- Location extraction from article text: regex against Bezirk names + Steiermark city list (covers ~80% of ORF RSS articles)
- Nominatim geocoding with `countrycodes=at`, result type → zoom auto-selection (zoom 10–15 based on `country`/`city`/`village`/`street` type)
- Layer selection: `bmapgrau` greyscale default, `bmapgelaende` terrain for nature/outdoor articles by keyword match
- Tile fetching from basemap.at, 3×3 grid at zoom 12–14, parallel `Promise.all()`
- Tile stitching with sharp: 3×3 grid → 768×768 → crop to 1200×630px PNG
- Vercel Blob storage + `Article.imageUrl` + `Article.imageCredit = "© basemap.at"` write
- Graceful degradation: any failure leaves `imageUrl` null; existing gradient fallback renders without change
- Attribution: CC-BY 4.0 requires "© basemap.at" as image text overlay AND as `<figcaption>` on article pages

**Should have (P2 — after core pipeline validated in production):**
- On-demand map image API route: `GET /api/map-image/[articleId]`, idempotent, HMAC auth
- CMS map image picker tab alongside existing Unsplash picker (calls on-demand route, shows preview before save)
- LLM fallback for location extraction when regex finds nothing
- Backfill admin action for existing articles (`imageUrl IS NULL`), 1100ms delay between geocoding calls

**Defer (v4+):**
- `mapMeta` JSONB column on Article for generation metadata/analytics
- Interactive maps on article pages (requires Leaflet/MapLibre — separate milestone)
- Aerial/orthofoto layer in production (larger tile sizes, higher Blob usage)

### Architecture Approach

The architecture is organized around a single `generateMapImage(articleId, db?)` facade in `lib/images/map/generate.ts` that orchestrates five single-responsibility sub-modules: location extractor, geocoder, tile fetcher, compositor, and Blob uploader. All three calling contexts — the ingestion pipeline (`pipeline.ts`), the on-demand Route Handler, and the CMS Server Action — delegate to this one function. Auth lives in the Server Action layer, not inside the facade; this keeps the function usable from the auth-free cron pipeline. The facade mirrors the existing Prisma DI pattern (injectable client for tests, singleton for production).

**Major components:**
1. `lib/images/map/generate.ts` — orchestration facade: extract → geocode → stitch → upload → DB write; idempotency guard (`article.imageUrl` check at entry)
2. `lib/images/map/{location-extractor,geocoder,tile-fetcher,compositor,blob-upload}.ts` — single-responsibility pipeline modules, each independently testable with Vitest + pgLite
3. `app/api/map-image/[articleId]/route.ts` — on-demand Node.js Route Handler (not Edge): idempotency check, delegates to facade, returns JSON
4. `lib/admin/map-image-actions.ts` + `components/admin/MapPicker.tsx` — CMS Server Action with `requireAuth()` + client component mirroring `UnsplashPicker.tsx` structure exactly
5. `lib/ai/pipeline.ts` (MODIFIED) — best-effort inner try/catch after WRITTEN status; map failure never propagates to article status

**Files unchanged:** `ingest.ts`, `unsplash-actions.ts`, `UnsplashPicker.tsx`, `schema.prisma` (no migration needed — `Article.imageUrl` and `imageCredit` already exist)

### Critical Pitfalls

1. **sharp@0.34.x on Vercel linux-x64** — Pin `"sharp": "0.33.5"` (no caret) in `package.json`. Add `@img/sharp-linux-x64` to `optionalDependencies`. Validate with a live Vercel deployment smoke test before writing any compositing code. This is the Phase 1 blocking gate.

2. **Nominatim IP ban from serverless burst requests** — Cache geocoding results in Postgres by normalized place name before making any Nominatim API calls. An in-process rate limiter does not persist across concurrent Vercel cold starts and provides false safety. The cache is mandatory, not optional.

3. **Map generation failure blocking article publication** — Wrap `generateMapImage()` in an inner try/catch in `pipeline.ts`. Articles must publish with `imageUrl: null` and render the gradient fallback regardless of any map generation error. The outer per-article error handler must never intercept map errors.

4. **basemap.at tile URL y/x coordinate order** — basemap.at uses `/{z}/{y}/{x}` (TMS convention, y before x), which is the inverse of the standard OSM slippy map URL convention. Validate with a Graz coordinates test (47.07°N, 15.43°E) before building stitching logic.

5. **CC-BY 4.0 attribution is a launch-blocking compliance requirement** — "© basemap.at" must be composited as a text overlay on every generated image AND rendered as `<figcaption>` with a hyperlink on article pages. Attribution is not optional and must be part of the initial compositing implementation, not added later.

---

## Implications for Roadmap

Based on the combined research, the feature has a natural four-phase structure driven by dependency order and risk sequencing. The on-demand API route and CMS picker are P2 and must not be built before the core pipeline is validated in production.

### Phase 1: Infrastructure and Core Image Pipeline

**Rationale:** sharp's Vercel binary compatibility is the single highest technical risk and must be validated before any other work proceeds. All subsequent phases depend on the compositing step working on Vercel linux-x64. Pipeline isolation (try/catch in `pipeline.ts`) must also be implemented before any generation logic — it is a safety invariant, not an afterthought. Attribution is included here because retrofitting it post-launch would require regenerating all existing images.

**Delivers:** Working tile fetch, stitch, and Blob upload for any given lat/lon. Correct attribution overlay on every generated image. Pipeline isolation preventing map failures from affecting article publication. Deployment smoke test confirming sharp works on Vercel.

**Implements:**
- `npm install sharp@0.33.5 @vercel/blob` with `@img/sharp-linux-x64` in `optionalDependencies`
- Tile coordinate math + basemap.at fetch (`tile-fetcher.ts`)
- sharp compositing with attribution text overlay (`compositor.ts`)
- Vercel Blob upload with idempotency check (`blob-upload.ts`)
- `generateMapImage()` facade skeleton with hardcoded test coordinates
- Best-effort inner try/catch in `pipeline.ts` after WRITTEN status
- Vercel deployment smoke test: generate map for Graz (47.07°N, 15.43°E), confirm image content and attribution

**Avoids:** sharp binary error (Pitfall 2), pipeline failure blocking articles (Pitfall 3), attribution violation (Pitfall 6), tile y/x coordinate error (Pitfall 8)

### Phase 2: Location Extraction and Geocoding

**Rationale:** Location extraction is the critical path that determines what percentage of articles get map images. Geocoding caching must be in place before the first Nominatim API call is made in any environment — adding it retroactively is not safe. Regex handles ~80% of articles; LLM fallback extends coverage for ambiguous content.

**Delivers:** End-to-end pipeline from article text to map image. Automatic zoom level selection by Nominatim result type. Layer selection by article keyword. State-wide article handling (Graz centroid fallback).

**Implements:**
- `location-extractor.ts`: regex against all 13 Steiermark Bezirk names + Steiermark city list; LLM fallback using existing `_clientFactory` pattern; state-wide articles skip extraction and use Graz centroid
- Geocoding cache in Postgres: normalized place name → lat/lon (decision: on `Article` columns or separate `GeocodingCache` table — resolve during phase planning)
- `geocoder.ts`: Nominatim with `countrycodes=at`, `User-Agent` header, result-type zoom table, importance threshold (skip if < 0.3), cache check before every API call
- Layer selection keyword logic (3 rules: terrain keywords → `bmapgelaende`, aerial keywords → `bmaporthofoto30cm`, default → `bmapgrau`)
- Full integration into `generateMapImage()` facade

**Avoids:** Nominatim IP ban (Pitfall 1), umlaut/place name mismatches (Pitfall 7)

### Phase 3: On-Demand API Route

**Rationale:** The on-demand Route Handler is the foundation for both the CMS picker and the backfill action. It must be built and tested in isolation before the CMS UI is added. It is also the recovery mechanism for articles that went through the pipeline before v3.1 or where pipeline generation failed.

**Delivers:** `GET /api/map-image/[articleId]` — idempotent, returns existing URL or triggers generation, secured with HMAC auth matching the existing CMS pattern.

**Implements:**
- `app/api/map-image/[articleId]/route.ts` with `export const runtime = 'nodejs'` and `export const maxDuration = 30`
- Idempotency check: return existing `imageUrl` if set; 304 on no-op
- HMAC auth (same pattern as existing CMS routes)
- 422 response when no location can be extracted
- Integration test: call route for article with known location, confirm `imageUrl` written to DB

**Avoids:** Cron timeout risk (Pitfall 4) — decouples on-demand generation from cron function budget

### Phase 4: CMS Map Image Picker and Backfill

**Rationale:** Editor tooling is built last because it depends on the on-demand API route from Phase 3 and requires the core pipeline to be validated in production first. The backfill action is rate-limited by Nominatim and should only run after geocoding caching is confirmed working.

**Delivers:** Editor workflow for manual map generation/override in the existing article edit page. Retroactive map images for existing articles.

**Implements:**
- `lib/admin/map-image-actions.ts`: `generateMapImageAction(articleId)` with `requireAuth()` guard
- `components/admin/MapPicker.tsx`: mirrors `UnsplashPicker.tsx` structure, "Karte generieren" button, preview thumbnail before save, shares `saveArticleImage`/`removeArticleImage` from existing `unsplash-actions.ts`
- Tab integration in `/admin/articles/[id]/edit` page alongside existing Unsplash picker
- `POST /api/admin/map-image/backfill`: processes `imageUrl IS NULL` articles in batches of 10, 1100ms delay between geocoding calls, progress logging to console

**Avoids:** Auth inside `generate.ts` (Architecture Anti-Pattern 5), Nominatim burst from backfill (Pitfall 1), re-generating images that already exist (Architecture Anti-Pattern 3)

### Phase Ordering Rationale

- Phase 1 before Phase 2: The sharp binary must be confirmed working on Vercel before building the location extraction logic that feeds into it. Discovering a binary error after building the full pipeline would require unwinding all layers. Attribution is in Phase 1 because retrofitting it requires regenerating all images.
- Phase 2 before Phase 3: The on-demand route calls `generateMapImage()`, which requires location extraction and geocoding. The route is a thin wrapper, not a reimplementation.
- Phase 3 before Phase 4: The CMS picker is a UI wrapper around the on-demand route. Building the picker UI before the route exists creates a dead end.
- Geocoding cache in Phase 2 (not Phase 1): The first Nominatim API calls happen in Phase 2. The cache must exist before those calls are made. It cannot be added after Phase 2 begins.
- Pipeline isolation in Phase 1 (before generation logic): The try/catch must be the first thing added to `pipeline.ts`, before any generation code is written. It is a safety constraint, not a feature.

### Research Flags

Phases likely needing deeper research or a validation spike before planning:
- **Phase 2 (Location Extraction):** Regex seed list quality determines pipeline coverage. The Bezirk name list is known, but the Steiermark city list and Austrian address pattern regex need validation against a sample of real ORF RSS article titles. Run 20–30 historical articles through the regex before finalizing the implementation.
- **Phase 2 (Geocoding Cache Schema):** The Prisma schema decision (cache on `Article` vs. separate `GeocodingCache` table) affects the migration and query patterns. Review the existing `Article` schema and `bundesland.config.ts` centroid data during phase planning before writing any code.

Phases with standard patterns (can skip research-phase):
- **Phase 1 (sharp + Blob infrastructure):** Both packages have official, high-confidence documentation. The compositing pattern is established. The only validation needed is a live Vercel deployment smoke test — not research.
- **Phase 3 (On-demand Route Handler):** Standard Next.js Route Handler pattern with idempotency. Mirrors the existing CMS route structure. No novel patterns.
- **Phase 4 (CMS Picker):** Mirrors `UnsplashPicker.tsx` exactly. No new state management or UI patterns needed.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | sharp/Vercel compatibility is the one unstable variable — `0.33.5` is confirmed working but the underlying issue (lovell/sharp#4361) is unresolved upstream. All other stack decisions are HIGH confidence with official documentation. |
| Features | HIGH | basemap.at tile mechanics, Nominatim API, and zoom semantics are from official documentation. LOW confidence only on Nominatim data density for rural Steiermark Bezirke — Bezirk centroid fallback mitigates this. |
| Architecture | HIGH | Existing codebase was read directly. Component boundaries and integration points are derived from real `pipeline.ts`, `UnsplashPicker.tsx`, `unsplash-actions.ts`, and `schema.prisma`. No inference required for integration decisions. |
| Pitfalls | HIGH | Critical pitfalls (Nominatim ban, sharp binary, pipeline isolation) all sourced from official docs and confirmed GitHub issues with reproducible steps. Attribution requirement confirmed from data.gv.at license record. |

**Overall confidence:** HIGH — with the hard constraint that `sharp@0.33.5` must be treated as a pinned version until the upstream issue resolves.

### Gaps to Address

- **Nominatim rural coverage:** Small Steiermark settlements (population < 500) may not be in Nominatim's OSM data at useful detail levels. Validate the regex seed list and geocoding fallback against 20–30 historical ORF Steiermark RSS article titles before finalizing the location extractor implementation in Phase 2.
- **Geocoding cache schema:** The research recommends caching geocoding results but does not prescribe whether to add columns to `Article` or create a separate `GeocodingCache` table. Resolve during Phase 2 planning based on the existing schema and expected query patterns.
- **sharp SVG text overlay for attribution:** The exact SVG text rendering approach in sharp requires testing on Vercel's lambda environment (no system fonts available). A pre-generated PNG attribution strip buffer is the fallback if SVG text rendering is unreliable. Validate during Phase 1 deployment smoke test.
- **Vercel Blob Hobby limit runway:** At ~120 KB per image and 100–200 images/month, the 250 MB limit is approximately 12–18 months away. A `del()` cleanup strategy for old article images should be designed in Phase 1 even if not immediately needed — adding it later requires a dedicated deployment.

---

## Sources

### Primary (HIGH confidence)
- [lovell/sharp#4361](https://github.com/lovell/sharp/issues/4361) — `sharp@0.34.x` runtime failure on Vercel linux-x64 with Next.js 15; version pin rationale
- [sharp.pixelplumbing.com](https://sharp.pixelplumbing.com/api-composite/) — composite API and install requirements
- [Nominatim Usage Policy — OSM Foundation](https://operations.osmfoundation.org/policies/nominatim/) — 1 req/s limit, User-Agent requirement, ban policy
- [Nominatim 5.3.0 Search API](https://nominatim.org/release-docs/latest/api/Search/) — `countrycodes`, `format`, result type fields
- [DE:AT/basemap — OpenStreetMap Wiki](https://wiki.openstreetmap.org/wiki/DE:AT/basemap) — tile URL format, layer names, y/x order confirmed
- [basemap.at WMTS GetCapabilities](https://basemap.at/wmts/1.0.0/WMTSCapabilities.xml) — authoritative layer list and tile URL patterns
- [Vercel Blob docs](https://vercel.com/docs/vercel-blob) — `put()` API, Buffer support, 250 MB Hobby limit
- [Vercel Functions Limitations](https://vercel.com/docs/functions/limitations) — 250 MB bundle, 10s/60s timeout, memory
- [OSM Slippy Map Tilenames](https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames) — XYZ tile coordinate formula
- Existing codebase: `pipeline.ts`, `UnsplashPicker.tsx`, `unsplash-actions.ts`, `schema.prisma`, `/api/cron/route.ts`, `/admin/articles/[id]/edit/page.tsx` — read directly, primary source for integration architecture

### Secondary (MEDIUM confidence)
- [@vercel/blob npm](https://www.npmjs.com/package/@vercel/blob) — version 0.27+, `put()` API confirmed
- [Vercel community: Blob storage blocked on overage](https://community.vercel.com/t/vercel-blob-storage-blocked-despite-usage-being-below-hobby-plan-limits/37011) — 30-day block behavior confirmed
- [data.gv.at — basemap.at dataset](https://www.data.gv.at/katalog/en/dataset/basemap-at) — CC-BY 4.0 license, "Datenquelle: basemap.at" attribution requirement
- [Nominatim#3801](https://github.com/osm-search/Nominatim/discussions/3801) — community-confirmed ban triggers from burst serverless requests
- [alexwlchan.net/2025/static-maps](https://alexwlchan.net/2025/static-maps/) — tile stitching pattern (tile math is language-agnostic)
- [vercel/vercel#11052](https://github.com/vercel/vercel/issues/11052) — Vercel-specific sharp linux-x64 binary issue confirmed

### Tertiary (LOW confidence)
- Nominatim data density for rural Steiermark Bezirke — no Austrian-specific coverage data found; needs validation during Phase 2 with real ORF RSS article samples

---
*Research completed: 2026-04-05*
*Ready for roadmap: yes*
