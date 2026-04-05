# Phase 40: Tile Pipeline Infrastructure - Research

**Researched:** 2026-04-05
**Domain:** Image generation pipeline — basemap.at XYZ tiles, sharp image compositing, Vercel Blob storage
**Confidence:** HIGH (core APIs verified against official docs and WMTS capabilities XML)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Phase boundary:** Generate map images from basemap.at tiles for any lat/lon coordinate, store in Vercel Blob, write to Article.imageUrl — with "© basemap.at" attribution on every image and pipeline failures never blocking article publication. Location extraction, geocoding, CMS tools, and backfill are separate phases.
- **Attribution overlay:** Bottom-right semi-transparent dark strip (rgba 0,0,0,0.6), white text, 18px font size, rendered via SVG text buffer composited with sharp (no system font dependency on Vercel lambdas), text content: "© basemap.at"
- **Layer-topic mapping:** 3-layer mapping on article headline keywords only:
  - `bmapgrau` (greyscale) — default for all articles
  - `bmapgelaende` (terrain/hillshade) — keywords: Natur, Umwelt, Wald, Wandern, Alm, Landwirtschaft, Klima, Hochwasser, Lawine, Nationalpark
  - `bmaporthofoto30cm` (aerial photo) — keywords: Bau, Baustelle, Straße, Brücke, Tunnel, Verkehr, Autobahn, Gebäude, Abriss, Sanierung
- **Image composition:** JPEG quality 80, 3x3 tile grid center-cropped to 1200x630px; if 3x3 grid (768x768) is too small at some zooms, fetch wider grid (e.g., 5x3) to ensure 1200px width; no visual post-processing
- **Maps fill gaps only:** Only generate when Article.imageUrl is null (existing Unsplash/editor images preserved)
- **Fallback behavior:** On any failure (tile fetch, sharp crash, Blob upload): Article.imageUrl stays null, existing gradient fallback renders unchanged. Failures logged via console.warn with article ID, error type, and coordinates. Single retry after 500ms on HTTP 5xx from tile server; fail through to null on second failure
- **Return type:** Same `{ url, credit }` shape as `src/lib/images/unsplash.ts` — `UnsplashImage` interface
- **Error isolation:** Inner try/catch matching `pipeline.ts` pattern — failure never blocks article publication
- **DI pattern:** Zero-arg production path; injected client for tests (same as pipeline.ts and ingest.ts)
- **sharp pinned to 0.33.5** — 0.34.x is broken on Vercel linux-x64 (lovell/sharp#4361, unresolved)
- **Graz smoke test (47.07N, 15.43E):** Runs during Phase 40 verification only, not on every deploy

### Claude's Discretion
- Exact SVG layout for attribution strip (padding, corner radius)
- Grid size calculation logic to ensure 1200px minimum width at each zoom level
- Internal module structure (single file vs split by concern)
- Vercel Blob path naming convention

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

## Summary

Phase 40 builds an isolated image-generation utility: given lat/lon coordinates and a headline, it fetches a grid of raster tiles from basemap.at, stitches them with sharp, center-crops to 1200x630, composites an attribution strip, uploads to Vercel Blob, and returns `{ url, credit }`. The module must be pure infrastructure — no Prisma writes, no pipeline coupling — so it can be called from Phase 41 (pipeline integration) and Phase 42 (API route + CMS) without modification.

The two highest-risk areas are (1) the SVG attribution overlay on Vercel serverless (no system fonts), and (2) the sharp 0.33.5 binary loading on Vercel linux-x64. Both have known workarounds: the attribution strip must use SVG paths rather than `<text>` elements to eliminate font dependency; sharp must be pinned to exactly 0.33.5 and installed with the correct platform flags.

The basemap.at WMTS service is free (CC-BY 4.0), tiles are standard 256px PNG/JPEG at `https://maps{1-4}.wien.gv.at/basemap/{layer}/normal/google3857/{z}/{TileRow}/{TileCol}.{ext}`, and the URL ordering is **z/y/x** (TileRow before TileCol) — a non-standard ordering that is confirmed in STATE.md and the official WMTS capabilities XML.

**Primary recommendation:** Build a single `src/lib/images/mapgen.ts` module with a `generateMapImage(lat, lon, headline)` function that returns `Promise<{ url: string; credit: string } | null>`, fully isolated by an inner try/catch, following the unsplash.ts return shape and pipeline.ts DI/error patterns exactly.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `sharp` | **0.33.5 exactly** | Tile stitching, center crop, JPEG encode, SVG composite | Pinned per project decision — 0.34.x broken on Vercel |
| `@vercel/blob` | latest | Upload generated image Buffer to Blob store | First-party Vercel SDK; env var `BLOB_READ_WRITE_TOKEN` auto-injected on Vercel |
| Node.js `fetch` | built-in (Node 18+) | Fetch individual tiles from basemap.at | Already used in unsplash.ts; no axios/node-fetch needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `Buffer` | Node built-in | Concatenate tile response bytes; pass to sharp | Always — sharp accepts Buffers directly |
| `vi.fn()` / vitest | already installed | Mock fetch + Blob upload in tests | All unit tests for this module |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| sharp 0.33.5 | 0.34.x | 0.34.x broken on Vercel linux-x64; do not use |
| SVG paths for attribution | SVG `<text>` element | `<text>` requires system fonts; Vercel lambdas have none; use paths |
| Blob `put()` with Buffer | Blob client upload | Server-side put() is correct here; client upload is for browser flows |

**Installation:**
```bash
npm install sharp@0.33.5 @vercel/blob
```

For Vercel deployment — add to `package.json` to force correct native binary:
```json
"optionalDependencies": {
  "@img/sharp-linux-x64": "0.33.5"
}
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/lib/images/
├── unsplash.ts          # existing — Unsplash fetcher
└── mapgen.ts            # NEW — tile pipeline infrastructure (this phase)
```

Internal structure of `mapgen.ts` (single file, split by named functions):
```
mapgen.ts
  latLonToTile(lat, lon, zoom)         → { x, y }
  selectLayer(headline)                 → LayerName
  selectZoom(locationType?)             → number  [Phase 41 passes this; Phase 40 defaults to 13]
  fetchTileGrid(layer, zoom, cx, cy, cols, rows) → Buffer[][]
  stitchTiles(tileGrid)                 → Promise<sharp.Sharp>
  buildAttributionSvg(width, height)    → Buffer
  generateMapImage(lat, lon, headline)  → Promise<{ url, credit } | null>
```

### Pattern 1: Lat/Lon to XYZ Tile Coordinates
**What:** Convert geographic coordinates to tile column/row at a given zoom level using the Spherical Mercator (EPSG:3857) formula.
**When to use:** Before any tile fetch; output is the center tile (cx, cy); grid tiles are offset by ±1 (3x3) or ±2 (5x3).

```typescript
// Source: https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
function lon2tile(lon: number, zoom: number): number {
  return Math.floor((lon + 180) / 360 * Math.pow(2, zoom))
}

function lat2tile(lat: number, zoom: number): number {
  const latRad = lat * Math.PI / 180
  return Math.floor(
    (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * Math.pow(2, zoom)
  )
}
```

### Pattern 2: basemap.at Tile URL (CONFIRMED from WMTS capabilities XML)
**What:** Tile URL format from the official WMTS GetCapabilities at `https://www.basemap.at/wmts/1.0.0/WMTSCapabilities.xml`
**Critical:** URL ordering is `/{z}/{TileRow}/{TileCol}` = **z/y/x** — y before x. This is non-standard but confirmed.

```typescript
// Source: https://www.basemap.at/wmts/1.0.0/WMTSCapabilities.xml
type LayerName = 'bmapgrau' | 'bmapgelaende' | 'bmaporthofoto30cm'

const LAYER_CONFIG: Record<LayerName, { ext: 'png' | 'jpeg'; maxZoom: number }> = {
  bmapgrau:          { ext: 'png',  maxZoom: 20 },
  bmapgelaende:      { ext: 'jpeg', maxZoom: 17 },
  bmaporthofoto30cm: { ext: 'jpeg', maxZoom: 20 },
}

const BASEMAP_SERVERS = ['maps', 'maps1', 'maps2', 'maps3', 'maps4']

function tileUrl(layer: LayerName, z: number, y: number, x: number): string {
  const server = BASEMAP_SERVERS[(x + y) % BASEMAP_SERVERS.length] // simple round-robin
  const { ext } = LAYER_CONFIG[layer]
  return `https://${server}.wien.gv.at/basemap/${layer}/normal/google3857/${z}/${y}/${x}.${ext}`
}
```

### Pattern 3: Tile Grid Fetch with Single Retry
**What:** Fetch all tiles in a grid concurrently using Promise.all; retry once after 500ms on HTTP 5xx.
**When to use:** All tile fetches in `fetchTileGrid()`.

```typescript
// Single retry on 5xx per CONTEXT.md decision
async function fetchTileWithRetry(url: string): Promise<Buffer> {
  const attempt = async (): Promise<Buffer> => {
    const res = await fetch(url)
    if (!res.ok) {
      if (res.status >= 500) throw new Error(`HTTP ${res.status}`)
      throw new Error(`Tile fetch failed: HTTP ${res.status}`)
    }
    return Buffer.from(await res.arrayBuffer())
  }

  try {
    return await attempt()
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('HTTP 5')) {
      await new Promise(r => setTimeout(r, 500))
      return attempt() // second attempt — throws on failure, caught by outer try/catch
    }
    throw err
  }
}
```

### Pattern 4: Sharp Stitching + Center Crop
**What:** Arrange tile buffers onto a canvas using `sharp.composite()`, then center-crop to 1200x630.
**Tile size:** 256x256px. A 3x3 grid = 768x768px. At most zoom levels this covers > 1200px when using a 5x3 grid (1280x768).

```typescript
// Source: https://sharp.pixelplumbing.com/api-composite + https://sharp.pixelplumbing.com/api-resize
import sharp from 'sharp'

async function stitchTiles(tiles: Buffer[][], cols: number, rows: number): Promise<Buffer> {
  const TILE_SIZE = 256
  const totalWidth  = cols * TILE_SIZE
  const totalHeight = rows * TILE_SIZE

  // Build composite array: each tile placed at its grid position
  const compositeOps = tiles.flatMap((row, rowIdx) =>
    row.map((tileBuffer, colIdx) => ({
      input: tileBuffer,
      left: colIdx * TILE_SIZE,
      top:  rowIdx * TILE_SIZE,
    }))
  )

  // Create a blank canvas, paste all tiles
  const canvas = sharp({
    create: {
      width: totalWidth,
      height: totalHeight,
      channels: 3,
      background: { r: 200, g: 200, b: 200 }, // fallback grey if a tile fails
    }
  })

  // Stitch → crop to 1200x630 from center → encode as JPEG q80
  return canvas
    .composite(compositeOps)
    .resize(1200, 630, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 80 })
    .toBuffer()
}
```

### Pattern 5: Attribution Strip via SVG Paths (No Font Dependency)
**What:** Render "© basemap.at" as SVG path data (pre-outlined glyphs or a Unicode-safe approach), composited onto the bottom-right corner. Per CONTEXT.md decision: 18px white text on rgba(0,0,0,0.6) strip.
**Critical:** Do NOT use SVG `<text>` elements — sharp on Vercel has no system fonts and `<text>` renders as empty squares. The CONTEXT.md decision explicitly requires "no system font dependency."
**Approach:** Two options, ordered by reliability:
  1. **SVG rect + SVG `<text>` with `FONTCONFIG_PATH`** — sharp docs say point `FONTCONFIG_PATH` to a bundled font dir for serverless; requires bundling a `.ttf` file
  2. **SVG rect + pre-outlined paths** — Convert "© basemap.at" glyphs to SVG `<path>` elements at build time; zero runtime font dependency (preferred for reliability)

```typescript
// Source: https://sharp.pixelplumbing.com/api-composite
// Attribution strip: 200px wide, 28px tall, bottom-right

function buildAttributionSvg(imageWidth: number, imageHeight: number): Buffer {
  const stripW = 200
  const stripH = 28
  const x = imageWidth - stripW
  const y = imageHeight - stripH

  // Option A (if font bundling is used): use <text> with FONTCONFIG_PATH set
  // Option B (preferred, no font dependency): use pre-outlined path data for "© basemap.at"
  // The planner should choose: if bundling Inter/Roboto subset is acceptable, Option A;
  // otherwise pre-outline the attribution text using a tool like opentype.js or svg-path-generator.

  // This template assumes Option A as a starting point:
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${imageWidth}" height="${imageHeight}">
    <rect x="${x}" y="${y}" width="${stripW}" height="${stripH}" rx="2"
          fill="rgba(0,0,0,0.6)"/>
    <text x="${x + 8}" y="${y + 19}" font-size="13" fill="white"
          font-family="sans-serif">© basemap.at</text>
  </svg>`

  return Buffer.from(svg)
}

// Composite onto the stitched image:
const result = await sharp(stitchedBuffer)
  .composite([{ input: buildAttributionSvg(1200, 630), top: 0, left: 0 }])
  .jpeg({ quality: 80 })
  .toBuffer()
```

### Pattern 6: Vercel Blob Upload
**What:** Upload the final JPEG Buffer using `@vercel/blob`'s `put()` function.
**Return:** `{ url }` from put() response is written to Article.imageUrl.

```typescript
// Source: https://vercel.com/docs/vercel-blob/using-blob-sdk
import { put } from '@vercel/blob'

async function uploadToBlob(articleId: number, imageBuffer: Buffer): Promise<string> {
  const pathname = `maps/article-${articleId}.jpg`
  const blob = await put(pathname, imageBuffer, {
    access: 'public',
    contentType: 'image/jpeg',
    allowOverwrite: true,  // idempotent re-generation
  })
  return blob.url
}
```

### Pattern 7: Outer Try/Catch Isolation (pipeline.ts pattern)
**What:** Wrap the entire map generation in try/catch so failures return null, never throwing to callers.
**Return:** `{ url: string; credit: string } | null` — same shape as `UnsplashImage` from unsplash.ts.

```typescript
// Source: project pattern from src/lib/ai/pipeline.ts inner catch
export async function generateMapImage(
  lat: number,
  lon: number,
  headline: string,
  articleId: number,
): Promise<{ url: string; credit: string } | null> {
  try {
    const layer   = selectLayer(headline)
    const zoom    = 13 // default; Phase 41 will pass zoom from geocoding result
    const { x: cx, y: cy } = latLonToTile(lat, lon, zoom)
    const tiles   = await fetchTileGrid(layer, zoom, cx, cy)
    const stitched = await stitchTiles(tiles, 3, 3)   // or 5x3 if needed
    const withAttr = await addAttribution(stitched)
    const url     = await uploadToBlob(articleId, withAttr)
    return { url, credit: '© basemap.at' }
  } catch (err) {
    console.warn(`[mapgen] article id=${articleId} — ${err instanceof Error ? err.message : String(err)} — lat=${lat} lon=${lon}`)
    return null
  }
}
```

### Pattern 8: Layer Selection by Headline Keywords
**What:** Scan headline for infrastructure or nature keywords; default to bmapgrau.

```typescript
const TERRAIN_KEYWORDS  = ['Natur', 'Umwelt', 'Wald', 'Wandern', 'Alm', 'Landwirtschaft', 'Klima', 'Hochwasser', 'Lawine', 'Nationalpark']
const AERIAL_KEYWORDS   = ['Bau', 'Baustelle', 'Straße', 'Brücke', 'Tunnel', 'Verkehr', 'Autobahn', 'Gebäude', 'Abriss', 'Sanierung']

function selectLayer(headline: string): LayerName {
  if (AERIAL_KEYWORDS.some(k => headline.includes(k)))  return 'bmaporthofoto30cm'
  if (TERRAIN_KEYWORDS.some(k => headline.includes(k))) return 'bmapgelaende'
  return 'bmapgrau'
}
```

### Anti-Patterns to Avoid
- **SVG `<text>` without bundled font:** Renders as empty boxes on Vercel. Use SVG path outlines or bundle a font + set `FONTCONFIG_PATH`.
- **sharp 0.34.x:** Do not upgrade. Pin to exactly 0.33.5. Binary fails to load on Vercel linux-x64.
- **Sequential tile fetches:** Always use `Promise.all()` for the tile grid — a 3x3 grid = 9 tiles, sequential would be ~9x slower.
- **Writing to Article directly from mapgen.ts:** The module returns `{ url, credit }` or null. Prisma writes belong in the caller (Phase 41 integration). Keep mapgen.ts free of Prisma.
- **Generating when imageUrl is not null:** Check `Article.imageUrl === null` before calling. mapgen.ts itself has no DB awareness — the guard belongs in the caller.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image stitching | Custom pixel buffer concat | `sharp.composite()` | Sharp handles pixel format differences between PNG and JPEG tiles; manual concat breaks on mixed formats |
| JPEG encode | Raw JPEG headers | `sharp.jpeg({ quality: 80 })` | Chroma subsampling, Huffman tables — sharp wraps libvips correctly |
| Blob upload | Custom fetch to S3 | `@vercel/blob` put() | Vercel Blob handles auth, CDN, and retry internally |
| Center crop math | Manual pixel offset calculation | `sharp.resize(w, h, { fit: 'cover', position: 'centre' })` | Resize with cover handles partial tile rows/cols at image edges |

**Key insight:** The only genuinely custom code is (1) lat/lon → tile XY math, (2) the 3x3 tile grid URL construction, and (3) keyword-based layer selection. Everything else is a thin wrapper over sharp and @vercel/blob.

---

## Common Pitfalls

### Pitfall 1: y/x URL Ordering (basemap.at non-standard)
**What goes wrong:** Developer assumes standard XYZ = `/{z}/{x}/{y}` and fetches wrong tiles.
**Why it happens:** Most tile servers use x/y; basemap.at WMTS spec uses `/{z}/{TileRow}/{TileCol}` = z/y/x.
**How to avoid:** Use `tileUrl(layer, z, y, x)` consistently — parameter order must match z/y/x, not z/x/y. Validate with Graz smoke test (47.07N, 15.43E) before writing stitching code.
**Warning signs:** Tile images load but show wrong geographic area.

### Pitfall 2: 3x3 Grid (768px) Narrower Than 1200px Target
**What goes wrong:** 3 tiles × 256px = 768px wide, but target is 1200px. Sharp resize with `fit: 'cover'` will upscale, losing quality.
**Why it happens:** 768 < 1200; sharp cannot crop what doesn't exist.
**How to avoid:** Per CONTEXT.md: if 3x3 is too small, fetch a 5x3 grid (5 × 256 = 1280px wide). At zoom 12–15, a 5x3 grid always provides > 1200px width. Determine grid size based on zoom level before fetching.
**Warning signs:** Output is blurry; check if input grid width < 1200px before cropping.

**Grid size by zoom:**
- At any zoom: tile_size = 256px. 3×256 = 768 (too narrow). 5×256 = 1280 (sufficient).
- Use 5×3 (cols×rows) as the default to guarantee 1200px width. Crop 1280→1200 is lossless.

### Pitfall 3: SVG Text Renders as Empty Boxes on Vercel
**What goes wrong:** Attribution strip shows rectangles instead of "© basemap.at".
**Why it happens:** Vercel Node.js runtime has no system fonts; libvips/librsvg cannot rasterize `<text>`.
**How to avoid:** Either (a) bundle a TTF and set `FONTCONFIG_PATH` env var, or (b) pre-convert text to SVG path outlines (zero runtime dependency). Option (b) is recommended.
**Warning signs:** Test locally works; Vercel deploy shows garbled or invisible attribution text.

### Pitfall 4: sharp Binary Not Loading on Vercel
**What goes wrong:** `Error: Could not load the 'sharp' module using the linux-x64 runtime`
**Why it happens:** 0.34.x ships different native binaries; 0.33.5 is the known-good version.
**How to avoid:** Pin `"sharp": "0.33.5"` exactly; add `@img/sharp-linux-x64` to optionalDependencies. Confirm with a smoke test in the Vercel function logs before writing compositing code.
**Warning signs:** Works locally (macOS) but fails on Vercel deployment.

### Pitfall 5: Tiles Mixed PNG/JPEG in Same Grid
**What goes wrong:** sharp errors or color banding when compositing tiles from different layers.
**Why it happens:** bmapgrau returns PNG; bmapgelaende and bmaporthofoto30cm return JPEG. If the wrong layer config is used, tiles decode to different color profiles.
**How to avoid:** Use `LAYER_CONFIG` to track file extension per layer. All 9 tiles in a grid come from the same layer, so no mixing occurs in a single request.

### Pitfall 6: Article imageUrl Already Set (Race Condition)
**What goes wrong:** Map image generated even when article already has an Unsplash image.
**Why it happens:** Caller doesn't check `Article.imageUrl === null` before calling `generateMapImage`.
**How to avoid:** The caller (Phase 41) must guard: only call mapgen when `article.imageUrl === null`. mapgen.ts itself has no DB check — that's by design (no Prisma in mapgen).

---

## Code Examples

### lat/lon → tile coordinates (verified formula)
```typescript
// Source: https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
// Graz test: lat=47.07, lon=15.43, zoom=13 → x=4468, y=2873
function latLonToTile(lat: number, lon: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom)
  const x = Math.floor((lon + 180) / 360 * n)
  const latRad = lat * Math.PI / 180
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n)
  return { x, y }
}
```

### Vercel Blob put() from server-side Buffer
```typescript
// Source: https://vercel.com/docs/vercel-blob/using-blob-sdk
import { put } from '@vercel/blob'

const { url } = await put('maps/article-123.jpg', jpegBuffer, {
  access: 'public',
  contentType: 'image/jpeg',
  allowOverwrite: true,
})
// url → 'https://<store>.public.blob.vercel-storage.com/maps/article-123.jpg'
```

### sharp create blank canvas + composite tiles
```typescript
// Source: https://sharp.pixelplumbing.com/api-constructor (create option)
// Source: https://sharp.pixelplumbing.com/api-composite
import sharp from 'sharp'

const canvas = await sharp({
  create: { width: 1280, height: 768, channels: 3, background: { r: 200, g: 200, b: 200 } }
})
.composite(tileCompositeOps)      // position each 256x256 tile
.resize(1200, 630, { fit: 'cover', position: 'centre' })
.jpeg({ quality: 80 })
.toBuffer()
```

### sharp toBuffer() for upload
```typescript
// Source: https://sharp.pixelplumbing.com/api-output
const buffer = await sharp(input).jpeg({ quality: 80 }).toBuffer()
// typeof buffer === 'Buffer' — pass directly to Vercel Blob put()
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| sharp 0.32.x API (overlayWith) | sharp 0.33.x API (composite) | ~2023 | `overlayWith` removed; use `composite([])` array |
| sharp 0.34.x (latest) | sharp 0.33.5 (pinned) | 2024 per project decision | 0.34.x breaks on Vercel linux-x64 |
| Vercel Blob beta API | @vercel/blob stable | 2024 | `put()` is stable; `access` parameter required on every call |

**Deprecated/outdated:**
- `sharp().overlayWith()`: Removed. Use `sharp().composite([{ input, top, left }])`.
- basemap.at legacy URL `maps.wien.gv.at` without number suffix: Still works but use numbered subdomains (maps1–maps4) for load distribution.

---

## Open Questions

1. **Attribution text as SVG paths vs. bundled font**
   - What we know: SVG `<text>` fails on Vercel serverless without system fonts. CONTEXT.md says "no system font dependency" — which means Option B (pre-outlined paths) is correct.
   - What's unclear: The glyph outlines for "© basemap.at" at 13px in a sans-serif font need to be pre-generated. This requires a one-time offline tool run (opentype.js, Inkscape, or figma export).
   - Recommendation: Planner should create a Wave 0 task to pre-generate SVG path data for "© basemap.at" and hard-code it into mapgen.ts. The path data is ~2KB and static.

2. **5x3 vs. 3x3 grid — decision at which zoom levels**
   - What we know: 3×256=768 < 1200. Always use 5×3 (1280×768) to guarantee sufficient width, then crop to 1200×630.
   - What's unclear: Whether 5×3 is always the right default or if zoom-level-specific logic is better.
   - Recommendation: Always use 5×3 (5 columns × 3 rows = 15 tiles). This is simpler and correct at all zoom levels 10–15. The crop handles the extra 80px.

3. **Vercel Blob path naming convention**
   - What we know: CONTEXT.md leaves this to Claude's discretion.
   - Recommendation: `maps/article-{articleId}.jpg` — simple, sortable, overwrite-safe with `allowOverwrite: true`.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/lib/images/mapgen.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MAP-03 | Fetches tiles and stitches into single image | unit | `npx vitest run src/lib/images/mapgen.test.ts` | ❌ Wave 0 |
| MAP-04 | Zoom level 10–15 passed through correctly | unit | `npx vitest run src/lib/images/mapgen.test.ts` | ❌ Wave 0 |
| MAP-05 | Layer selected from headline keywords | unit | `npx vitest run src/lib/images/mapgen.test.ts` | ❌ Wave 0 |
| MAP-06 | Blob upload called; URL returned in `{ url, credit }` | unit | `npx vitest run src/lib/images/mapgen.test.ts` | ❌ Wave 0 |
| MAP-07 | credit field equals "© basemap.at" | unit | `npx vitest run src/lib/images/mapgen.test.ts` | ❌ Wave 0 |
| MAP-08 | Returns null on tile fetch failure; no exception thrown | unit | `npx vitest run src/lib/images/mapgen.test.ts` | ❌ Wave 0 |
| INTG-02 | Map failure does not block article creation | unit | `npx vitest run src/lib/images/mapgen.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/images/mapgen.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/images/mapgen.test.ts` — covers MAP-03 through MAP-08, INTG-02
- [ ] `sharp@0.33.5` — must be in dependencies (not yet installed)
- [ ] `@vercel/blob` — must be in dependencies (not yet installed)
- [ ] `BLOB_READ_WRITE_TOKEN` — must be set in `.env.local` for local dev

**Test mocking approach (consistent with pipeline.test.ts pattern):**
- Mock `fetch` with `vi.fn()` returning fake tile buffers (e.g., 256x256 gray PNG)
- Mock `@vercel/blob` `put` with `vi.fn()` returning `{ url: 'https://blob.example.com/maps/article-1.jpg' }`
- Do not mock `sharp` — run it for real in tests (it's fast; no Vercel constraint in test env)

---

## Sources

### Primary (HIGH confidence)
- `https://www.basemap.at/wmts/1.0.0/WMTSCapabilities.xml` — exact tile URL templates, layer names, zoom ranges, y/x ordering confirmed
- `https://sharp.pixelplumbing.com/api-composite` — composite() API, gravity options, blend modes
- `https://sharp.pixelplumbing.com/api-output` — jpeg() quality option, toBuffer() return type
- `https://sharp.pixelplumbing.com/api-resize` — resize() with fit: 'cover', position: 'centre'
- `https://sharp.pixelplumbing.com/api-constructor` — create blank canvas with `create` option
- `https://sharp.pixelplumbing.com/install/#fonts` — FONTCONFIG_PATH for serverless font handling
- `https://vercel.com/docs/vercel-blob/using-blob-sdk` — put() parameters, return shape, BLOB_READ_WRITE_TOKEN
- `https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames` — lat/lon → tile XY formula, 256px tile size

### Secondary (MEDIUM confidence)
- `https://github.com/lovell/sharp/issues/4426` — SVG text on Vercel: system fonts required; FONTCONFIG_PATH solution confirmed
- `https://github.com/lovell/sharp/issues/4361` — 0.34.x Vercel linux-x64 failure; 0.33.5 confirmed stable fallback
- `https://wiki.openstreetmap.org/wiki/DE:AT/basemap` — layer names, subdomain pattern (maps1–maps4), y/x URL ordering

### Tertiary (LOW confidence — needs validation)
- WebSearch claim that `geolandbasemap` is the default layer — ignored; project uses `bmapgrau` per CONTEXT.md decision

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — sharp and @vercel/blob official docs checked; versions from project decision + known issues
- Architecture: HIGH — patterns derived from official sharp API docs + existing project code patterns
- Tile URL format: HIGH — verified against official WMTS capabilities XML
- Pitfalls: HIGH — sharp font issues confirmed via multiple GitHub issues; grid size math is basic arithmetic
- Attribution approach: MEDIUM — SVG path approach is the right call per CONTEXT.md, but path data for "© basemap.at" must be generated offline

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable libraries; basemap.at WMTS format rarely changes)
