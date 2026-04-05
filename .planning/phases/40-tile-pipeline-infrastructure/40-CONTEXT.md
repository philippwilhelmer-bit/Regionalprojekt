# Phase 40: Tile Pipeline Infrastructure - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Generate map images from basemap.at tiles for any lat/lon coordinate, store in Vercel Blob, and write to Article.imageUrl — with "© basemap.at" attribution on every image and pipeline failures never blocking article publication. Location extraction, geocoding, CMS tools, and backfill are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Attribution overlay
- Bottom-right semi-transparent dark strip (rgba 0,0,0,0.6)
- White text, 18px font size — readable at card thumbnail size
- Rendered via SVG text buffer composited with sharp (no system font dependency on Vercel lambdas)
- Text content: "© basemap.at"

### Layer-topic mapping
- 3-layer mapping based on article headline keywords:
  - **bmapgrau** (greyscale) — default for all articles
  - **bmapgelaende** (terrain/hillshade) — nature keywords: Natur, Umwelt, Wald, Wandern, Alm, Landwirtschaft, Klima, Hochwasser, Lawine, Nationalpark
  - **bmaporthofoto30cm** (aerial photo) — infrastructure keywords: Bau, Baustelle, Straße, Brücke, Tunnel, Verkehr, Autobahn, Gebäude, Abriss, Sanierung
- Keyword matching checks headline only (not body text)

### Image composition
- JPEG quality 80 (matches existing Unsplash images at q=80)
- 3x3 tile grid center-cropped to 1200x630px landscape format
- If 3x3 grid (768x768) is too small at some zooms, fetch wider grid (e.g., 5x3) to ensure 1200px width
- No visual post-processing — basemap.at tiles used as-is (bmapgrau already has muted editorial feel)
- Maps fill gaps only — only generate when Article.imageUrl is null (existing Unsplash/editor images preserved)

### Fallback behavior
- On any failure (tile fetch, sharp crash, Blob upload): Article.imageUrl stays null, existing gradient fallback renders unchanged
- Failures logged via console.warn with article ID, error type, and coordinates
- Single retry after 500ms on HTTP 5xx from basemap.at tile server; fail through to null on second failure
- Graz smoke test (47.07N, 15.43E) runs during Phase 40 verification only, not on every deploy

### Claude's Discretion
- Exact SVG layout for attribution strip (padding, corner radius)
- Grid size calculation logic to ensure 1200px minimum width at each zoom level
- Internal module structure (single file vs split by concern)
- Vercel Blob path naming convention

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/images/unsplash.ts`: Existing image fetcher pattern with `{ url, credit }` return type — map generator should return the same shape
- `src/lib/ai/pipeline.ts`: AI pipeline with inner try/catch isolation pattern — map generation should follow the same DI and error isolation approach
- `prisma/schema.prisma`: Article already has `imageUrl` (String?) and `imageCredit` (String?) fields — no schema changes needed

### Established Patterns
- DI pattern: zero-arg production path uses singleton PrismaClient; injected client for tests (pipeline.ts, ingest.ts)
- Error isolation: inner try/catch in pipeline.ts ensures failures don't block article creation
- Image credit format: Unsplash uses "Foto: {name} / Unsplash" — basemap uses "© basemap.at"

### Integration Points
- `src/lib/ai/pipeline.ts`: Map generation will be called after AI article generation (Phase 41 integration)
- `src/app/api/cron/route.ts`: Cron endpoint orchestrates ingestion → AI pipeline; map step added in Phase 41
- Article.imageUrl / Article.imageCredit: Direct Prisma writes after Blob upload

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The infrastructure should be a clean utility that Phase 41 calls with coordinates and Phase 42 exposes via API route.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 40-tile-pipeline-infrastructure*
*Context gathered: 2026-04-05*
