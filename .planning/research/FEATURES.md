# Feature Research

**Domain:** Automatic map image generation for regional news articles — basemap.at tile stitching for Wurzelwelt v3.1
**Researched:** 2026-04-05
**Confidence:** HIGH for tile mechanics and zoom semantics; MEDIUM for geocoding confidence mapping; LOW for Austrian Nominatim data density in rural Bezirke

---

## Scope Note

This research covers ONLY new features for v3.1 "Basemap Article Images." The following already exist and are explicitly out of scope: Unsplash picker in CMS, Article.imageUrl / imageCredit fields, gradient fallback in HeroArticle / ArticleCard / EditorialCard / RegionalEditorialCard, OTS image extraction (disabled), RSS adapter. The gradient fallback already works — the goal is to replace it with meaningful location-based map images, not to fix broken behavior.

---

## Domain Context: How Map Images Work in News Platforms

News platforms generate location-based header images by:
1. **Extracting a location** from the article text (city/town name, address, Bezirk mention)
2. **Geocoding that location** to lat/lon coordinates
3. **Fetching map tiles** from a tile server at appropriate zoom and coordinate
4. **Stitching tiles** into a single rectangular image at the desired output dimensions
5. **Storing the result** in blob storage and writing the URL back to the Article record

The zoom level controls what geographic scope is visible. Nominatim's zoom levels map directly to XYZ tile zoom levels:

| Nominatim zoom | Map zoom | What's visible |
|---------------|----------|----------------|
| 3 | 3 | Country |
| 5 | 5 | State/Bundesland |
| 8 | 8 | County/Bezirk |
| 10 | 10 | City |
| 12 | 12 | Town / Borough |
| 13 | 13 | Village / Suburb |
| 14 | 14 | Neighbourhood |
| 16 | 16 | Major streets |
| 18 | 18 | Building-level |

For article header images, the sweet spot is **zoom 12–14** for a named town or village (shows the settlement in full context), and **zoom 10–11** for a Bezirk or city-level result. Zoom ≥15 for header images is too tight — shows only a few streets, loses geographic context entirely.

---

## basemap.at Tile Services

basemap.at is an open-data initiative of Austrian federal and state administrations. All layers are **CC-BY 4.0 Austria** — attribution required, no API key needed.

### Available Layers

| Layer | Identifier | Character | Best Use |
|-------|-----------|-----------|----------|
| Standard (color) | `geolandbasemap` | Full-color topographic | Default — most readable for article headers |
| Grau (greyscale) | `bmapgrau` | Desaturated colour map | Best for overlaid article titles (Archivist design) |
| Orthofoto (aerial) | `bmaporthofoto30cm` | Aerial photography | Differentiator — visual interest for nature/infrastructure articles |
| Overlay | `bmapoverlay` | Roads + labels only, transparent | Not useful standalone — used as a label layer on top of Orthofoto |
| Gelände (terrain shading) | `bmapgelaende` | Hillshade | Scenic/outdoor stories |
| Oberfläche | `bmapoberflaeche` | Surface model | Low editorial value |
| High DPI | `bmaphidpi` | Standard × 2 resolution | Retina screens; same content as Standard |

### Tile URL Format

```
https://maps{s}.wien.gv.at/basemap/{layer}/normal/google3857/{z}/{y}/{x}.png
```

Where:
- `{s}` — subdomain: empty, `1`, `2`, `3`, `4` (use rotation to distribute requests)
- `{layer}` — layer identifier from table above
- `{z}` — zoom level integer
- `{y}` — tile y coordinate (note: y before x in this URL format)
- `{x}` — tile x coordinate

**Orthofoto extension:** `.jpeg` not `.png`

**WMTS Capabilities:** `https://basemap.at/wmts/1.0.0/WMTSCapabilities.xml`

### Attribution Requirement

All images generated from basemap.at tiles must include the credit string:

```
© basemap.at
```

This maps to Article.imageCredit — the existing field already supports this. Set it to `"© basemap.at"` when generating map images programmatically.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that must work for map image generation to be coherent. Missing any of these means map images either don't generate, look wrong, or break the pipeline.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Location extraction from article text | Without a location, no map is possible. Every pipeline feature depends on this. | MEDIUM | Two-stage: regex first (fast, cheap), LLM fallback only when regex finds nothing. Regex handles: Bezirk names from config, Austrian city/town names from a seed list, address patterns (Straße, Platz, Gasse). LLM call structured prompt returning `{location: string \| null}`. |
| Nominatim geocoding of extracted location | Converts extracted text ("Leoben") to lat/lon. Austria-focused query using `countrycodes=at&limit=1`. | LOW | Public Nominatim rate limit: 1 req/sec. At 1 article/day cron cadence this is never an issue. Must include `User-Agent: Wurzelwelt/1.0 (regionalprojekt.vercel.app)` header per usage policy. Self-host not required at current volume. |
| Tile fetching at computed XYZ coordinates | Downloads the 256×256 PNG tiles needed to cover the output image at the chosen zoom. | MEDIUM | lat/lon → tile X,Y,Z via standard Web Mercator formula. Fetch 2×2 or 3×3 grid around center tile to get margin. Parallel `fetch()` calls with basemap.at subdomain rotation. Handle 404 gracefully (ocean/border tiles). |
| Tile stitching into output image | Combines fetched tiles into one PNG at the target dimensions (e.g., 1200×630). | MEDIUM | Use `sharp` (already a standard dependency for Next.js image optimization scenarios). Composite fetched tiles onto a canvas at their correct pixel offsets. Crop to output dimensions centered on the geocoded point. Sharp operates in Node.js; run in a Next.js Route Handler (not Edge runtime — Node.js required for sharp). |
| Vercel Blob storage of generated image | Generated PNG must be persisted — regenerating on every request is too slow for article load. | MEDIUM | `@vercel/blob` SDK. `put()` with `access: 'public'`. Store at deterministic key e.g. `map-images/{articleId}.png`. Vercel CDN caches public blobs for up to 1 month. Write returned URL to Article.imageUrl via Prisma update. |
| Attribution written to Article.imageCredit | CC-BY 4.0 requires attribution. Existing imageCredit field already exists — just needs to be populated. | LOW | Set `imageCredit = "© basemap.at"` on Article record when saving generated map image URL. No schema change needed. |
| Graceful degradation to gradient | If location extraction yields nothing, geocoding fails, or tile fetch errors — the gradient fallback already exists and must remain the safety net. | LOW | All reader components (HeroArticle, ArticleCard, etc.) already fall back to gradient when imageUrl is null. Pipeline failure must leave imageUrl null (not set a broken URL). No change to reader components needed. |

### Differentiators (Competitive Advantage)

Features that make map image generation better than the naive implementation. None of these are required for a working v3.1, but they improve quality significantly.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Zoom level auto-selection based on geocoding confidence | A "Graz" result should zoom out to city level (z12). A "Hauptplatz 1, Leoben" should zoom in to street level (z15). Zoom based on Nominatim result type. | LOW | Map Nominatim `type` field: `country`→z5, `state`→z8, `county`→z10, `city`→z12, `town`→z13, `village`→z14, `suburb`→z14, `neighbourhood`→z15, `street`/`road`→z16. Cap at z15 for article headers — anything tighter loses geographic context. |
| Layer selection based on article topic | Nature/outdoor articles get terrain (`bmapgelaende`). Infrastructure gets standard. Default is greyscale (`bmapgrau`) to align with Archivist editorial aesthetic. | LOW | Simple keyword match on article title/tags: keywords like "Wald", "Berg", "Natur", "Wandern", "Landwirtschaft" → terrain layer. "Bau", "Straße", "Projekt", "Infrastruktur" → standard. Default → greyscale. No LLM needed — keyword array in config. |
| CMS map image picker (alongside Unsplash) | Editor can preview generated map, regenerate with different location/zoom, or replace with Unsplash image. Manual override without losing automation. | MEDIUM | New "Karte" tab in existing CMS image picker modal. Displays current map image if generated. "Neu generieren" button calls the on-demand API route. Location/zoom override inputs (pre-filled from generation metadata). Saves to same imageUrl/imageCredit fields. Dependency: on-demand map image API route must exist first. |
| On-demand map image API route | Generates a map image for any article on request, not just during initial ingestion. Needed by CMS picker and for articles ingested before v3.1. | MEDIUM | `GET /api/map-image?articleId={id}` — reads article from DB, runs full pipeline (extract → geocode → tile fetch → stitch → blob store → DB update). Returns JSON `{imageUrl, location, zoom, layer}`. Must be secured — HMAC auth same pattern as existing CMS. |
| Backfill for existing articles | Thousands of existing articles have no imageUrl. After pipeline is validated, bulk-generate map images for the backlog. | MEDIUM | One-time admin action: `POST /api/admin/map-image/backfill`. Processes articles in batches of 10 with 1-second delay between geocoding calls (Nominatim rate limit). Long-running — should be a background task with progress logging, not a synchronous API response. |
| Generation metadata stored on Article | Record what location was extracted, what zoom was chosen, which layer was used. Allows CMS to show "Karte von: Leoben, Zoom 13, Grau" and let editor understand why the map looks as it does. | LOW | Options: (a) add `mapMeta JSONB` column to Article, (b) encode in a separate table, (c) store in Vercel Blob filename only. Recommend option (a) — single nullable JSONB column, no migrations needed in practice with `db push`. Schema: `{location: string, lat: number, lon: number, zoom: number, layer: string, generatedAt: string}`. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time tile rendering on article page load | "Always fresh" maps, no blob storage needed | Tile fetching + stitching takes 1–3 seconds. Unacceptable latency for article page loads. Sharp runs in Node.js, not Edge — cold start penalty on Vercel. Tile fetch failures would break image display. | Generate once at ingest time, store in Vercel Blob, serve static URL. Regeneration via CMS picker or on-demand route when needed. |
| Mapbox / Google Maps Static API | Higher quality, no tile stitching code | Both require API keys and have usage costs. Mapbox free tier limited to 50,000 static image requests/month — exceeds budget for automated platform at scale. Google Maps Static API is not free at any meaningful volume. basemap.at is CC-BY 4.0, free, no key, specifically for Austrian geography. | Use basemap.at exclusively. |
| Custom map styling (colour theming to Archivist palette) | Map matches brand | basemap.at serves pre-rendered raster tiles — no dynamic styling. MapLibre vector tiles would allow this but adds massive complexity (client-side rendering, different SDK). | Use greyscale (`bmapgrau`) layer as default — desaturated, editorial, pairs well with Archivist Ink/Parchment palette without requiring custom styling. |
| Interactive map on article page | Rich user experience | Adds Leaflet/MapLibre dependency + JS bundle. Maps at this complexity require geocoordinate storage on Article model + rendering components. This is a v4+ feature, not a v3.1 feature. | Static map image in article header is visually equivalent for the current use case. Interactive maps are a separate feature milestone. |
| Geocoding every article regardless of content | "Always have a map" | Many articles are genuinely non-location-specific (national policy, stock market news). A map of Austria at zoom 8 adds no value. Forced geocoding wastes Nominatim quota and Blob storage. | Only generate map if location extraction returns a result with sufficient confidence. Fall back to gradient for location-free articles — gradient is a deliberate design choice, not a failure. |
| Self-hosted Nominatim instance | No rate limit concerns | At 1 article/day (Vercel Hobby cron), public Nominatim is more than sufficient. Self-hosting adds a running service to maintain. | Use public Nominatim. Revisit if cron frequency increases beyond 50 articles/day. |
| Zoom level user preference in reader app | "Show me more context" | Reader has no concept of map zoom — they just see the article header image. No UI for this interaction exists. | Fixed zoom per result type (auto-selection from differentiator above) is the right abstraction. CMS picker can override for editors. |
| Tile caching layer (Redis/KV) | Avoid re-fetching same tiles | Generated images are stored in Vercel Blob already — tiles are fetched once at generation time and the result is persisted. No tile-level cache needed. Adding Vercel KV for tile caching is over-engineering. | Vercel Blob stores the final composited image. Tiles are ephemeral during generation only. |

---

## Feature Dependencies

```
[Location Extraction]
    └──feeds──> [Nominatim Geocoding]
                    └──feeds──> [Zoom Auto-Selection]
                    └──feeds──> [Tile Coordinate Calculation]
                                    └──feeds──> [Tile Fetching]
                                                    └──feeds──> [Tile Stitching (sharp)]
                                                                    └──feeds──> [Vercel Blob Store]
                                                                                    └──writes──> [Article.imageUrl]
                                                                                    └──writes──> [Article.imageCredit = "© basemap.at"]

[Layer Selection]
    └──reads──> [Article title/tags] (existing)
    └──feeds──> [Tile Fetching] (determines which basemap.at layer URL to use)

[On-demand API Route]
    └──runs──> [Full pipeline above] (extract → geocode → tiles → stitch → blob → db)
    └──required-by──> [CMS Map Image Picker]

[CMS Map Image Picker]
    └──calls──> [On-demand API Route]
    └──extends──> [Existing CMS image picker modal] (existing)
    └──writes-to──> [Article.imageUrl + Article.imageCredit] (existing fields)

[Automatic Pipeline Integration]
    └──runs-after──> [Article saved to DB] (existing ingestion pipeline)
    └──runs-same-process-as──> [Existing AI article generation step]

[Backfill Admin Action]
    └──calls──> [On-demand API Route] per article
    └──rate-limits-to──> [1 req/sec for Nominatim]
    └──reads──> [Articles WHERE imageUrl IS NULL] (existing DB)
```

### Dependency Notes

- **Location extraction is the critical path.** If it returns nothing, the entire pipeline short-circuits to gradient. Regex + LLM fallback must be tuned before anything else is validated.
- **On-demand API route is the foundation for the CMS picker.** Build and test the API route standalone before building the picker UI. The picker is just a UI wrapper around the route.
- **Sharp requires Node.js runtime.** Do not run the tile stitch step in Edge functions or Edge API routes. Use `export const runtime = 'nodejs'` on the Route Handler. This is already the default for Next.js Route Handlers.
- **Vercel Blob must be provisioned before testing.** The `BLOB_READ_WRITE_TOKEN` env var must exist in both local dev (`.env.local`) and Vercel project settings. Without it, `put()` throws at runtime.
- **Article.imageCredit already exists** — no schema migration needed for attribution. The `mapMeta` JSONB column is optional (differentiator); build the core pipeline without it first.
- **Existing image pipeline compatibility.** The Unsplash picker writes to `imageUrl` + `imageCredit`. The map generator writes to the same fields. They are alternatives — last write wins. The CMS picker UI must make clear which source is active (Unsplash vs. generated map).

---

## Zoom Level Guidance by Geocoding Result

This is the primary decision table for the auto-selection feature. Based on Nominatim result type:

| Nominatim `type` | Map zoom | Rationale | Example |
|------------------|----------|-----------|---------|
| `country` | 6 | Should not generate — too generic | "Österreich" |
| `state` | 7 | Borderline — shows full Bundesland | "Steiermark" |
| `county` | 10 | Shows Bezirk in full | "Bezirk Leoben" |
| `city` | 12 | Shows city + surrounding area | "Graz", "Leoben" |
| `town` | 13 | Shows town + immediate surroundings | "Bruck an der Mur" |
| `village` | 14 | Shows village + adjacent settlements | "Proleb" |
| `suburb` / `neighbourhood` | 14 | Shows sub-district | "Graz-Liebenau" |
| `street` / `road` | 15 | Shows street + cross streets | "Hauptplatz Leoben" |
| `building` / `house` | 15 | Cap here — don't go tighter for headers | "Rathaus Graz" |

**Hard rules:**
- Minimum zoom for article headers: 10 (anything below shows too large an area to be meaningful)
- Maximum zoom for article headers: 15 (anything tighter loses geographic context)
- If Nominatim `importance` score < 0.3 and result `type` is `country` or `state`: skip map generation, leave gradient

---

## Map Layer Selection Logic

Default to greyscale. Override by keyword match on article body (first 500 chars + title):

| Keywords (German) | Layer | Rationale |
|------------------|-------|-----------|
| Wald, Berg, Natur, Wandern, Alm, Forst, Jagd, Fauna, Flora, Landschaft | `bmapgelaende` (terrain) | Hillshading highlights topography for outdoor/nature stories |
| Luftbild, Infrastruktur, Bau, Baustelle, Gelände, Areal, Betriebsgelände | `bmaporthofoto30cm` (aerial) | Aerial photo shows physical footprint of construction/infrastructure |
| (default) | `bmapgrau` (greyscale) | Desaturated. Pairs with Archivist Ink/Parchment. Editorial, not distracting. |
| Standard color | `geolandbasemap` | Not used by default — too colourful against editorial palette. Available as CMS override. |

---

## MVP Definition

### Launch With (v3.1)

Minimum viable pipeline that replaces gradients with maps for newly ingested articles.

- [ ] Location extraction: regex for Bezirk names + major Steiermark cities/towns — enough to cover 80% of ORF RSS articles
- [ ] Nominatim geocoding with Austria-focused query parameters
- [ ] Zoom auto-selection from result type (table above)
- [ ] Layer selection: greyscale default, terrain/aerial by keyword (3 rules, no config complexity)
- [ ] Tile fetching from basemap.at (greyscale + terrain layers minimum)
- [ ] Tile stitching with sharp — output 1200×630px PNG
- [ ] Vercel Blob storage + Article.imageUrl + Article.imageCredit write
- [ ] Integration into ingestion pipeline (runs after AI article generation)
- [ ] Graceful failure: any error → leave imageUrl null → gradient fallback

### Add After Validation (v3.1.x)

- [ ] On-demand API route — enables CMS picker and backfill
- [ ] CMS map image picker tab alongside Unsplash picker
- [ ] LLM fallback for location extraction (when regex finds nothing and article has meaningful geographic content)
- [ ] Backfill admin action for existing articles

### Future Consideration (v4+)

- [ ] Generation metadata (`mapMeta` JSONB) — useful for analytics/debugging but not for v3.1 value
- [ ] Interactive maps on article pages — separate milestone, requires Leaflet/MapLibre
- [ ] Orthofoto (aerial) layer in production — higher quality but larger tile file sizes

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Location extraction (regex) | HIGH — enables whole pipeline | LOW | P1 |
| Nominatim geocoding | HIGH — required by all map features | LOW | P1 |
| Zoom auto-selection | HIGH — wrong zoom = useless image | LOW | P1 |
| Tile fetching (bmapgrau) | HIGH — core deliverable | MEDIUM | P1 |
| Tile stitching (sharp) | HIGH — core deliverable | MEDIUM | P1 |
| Vercel Blob storage | HIGH — persistence required | LOW | P1 |
| Attribution (imageCredit) | HIGH — legal requirement (CC-BY 4.0) | LOW | P1 |
| Layer selection (greyscale/terrain) | MEDIUM — improves quality | LOW | P1 |
| On-demand API route | MEDIUM — enables editor workflow | MEDIUM | P2 |
| CMS map image picker | MEDIUM — editor control | MEDIUM | P2 |
| LLM location fallback | MEDIUM — improves coverage | MEDIUM | P2 |
| Backfill admin action | MEDIUM — retroactive value | MEDIUM | P2 |
| mapMeta JSONB metadata | LOW — debugging aid | LOW | P3 |

**Priority key:**
- P1: Required for v3.1 pipeline to function
- P2: Should have, add after core pipeline is validated
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

Context: how Austrian/German regional news platforms handle article imagery where photos are unavailable.

| Feature | Der Standard | Kleine Zeitung | ORF.at | Wurzelwelt v3.1 |
|---------|--------------|----------------|--------|-----------------|
| Fallback when no photo | Tonal gradient in brand color | Branded placeholder | Category-icon placeholder | Static generated map image — location-specific |
| Map images for regional stories | No | No | No | Yes — auto-generated from basemap.at |
| Attribution handling | N/A | N/A | N/A | `imageCredit = "© basemap.at"` auto-populated |
| Zoom/context appropriateness | N/A | N/A | N/A | Auto-selected by Nominatim result type |
| Editor override | N/A | N/A | N/A | CMS picker with regenerate + Unsplash alternative |

No direct Austrian competitor generates map images automatically for article headers. This is a genuine differentiator for a hyperlocal platform — the map reinforces geographic context on every article.

---

## Implementation Notes

### Location Extraction Regex Seed List

Priority order for regex matching:

1. **Bezirk names** — all 13 Steiermark Bezirke from `bundesland.config.ts` (Murtal, Liezen, etc.). Match boundary: word start/end to avoid partial matches.
2. **Major Steiermark cities** (population > 10,000): Graz, Leoben, Kapfenberg, Bruck an der Mur, Feldbach, Hartberg, Leibnitz, Voitsberg, Mürzzuschlag, Weiz, Judenburg, Knittelfeld, Mürau, Zeltweg, Eisenerz
3. **Address patterns**: `(.*?)(straße|gasse|platz|weg|allee|ring),?\s+\d{4}?\s+\w+` — captures Austrian address patterns likely to geocode accurately
4. **Fallback**: Return `null` if no match → pipeline skips map generation

### Tile Math (Web Mercator / EPSG:3857)

```typescript
// lat/lon → tile XY at zoom z
function latLonToTile(lat: number, lon: number, z: number): { x: number; y: number } {
  const x = Math.floor((lon + 180) / 360 * Math.pow(2, z));
  const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));
  return { x, y };
}
```

Fetch a 3×3 grid of tiles around the center tile. At 256px per tile, a 3×3 grid = 768×768px. Crop to 1200×630px centered on the target coordinates (requires pixel offset math from center tile to target lat/lon pixel).

### Sharp Composite Operation

```typescript
import sharp from 'sharp';

// canvas = 768x768 (3×3 tiles at 256px each)
const canvas = sharp({
  create: { width: 768, height: 768, channels: 4, background: { r: 240, g: 237, b: 230, alpha: 1 } }
});

const composites = tiles.map(({ buffer, col, row }) => ({
  input: buffer,
  left: col * 256,
  top: row * 256,
}));

const stitched = await canvas.composite(composites).png().toBuffer();

// Crop to 1200×630, centering on target pixel
const finalImage = await sharp(stitched)
  .extract({ left: cropX, top: cropY, width: 1200, height: 630 })
  .toBuffer();
```

### Vercel Blob Upload

```typescript
import { put } from '@vercel/blob';

const { url } = await put(`map-images/${articleId}.png`, finalImage, {
  access: 'public',
  contentType: 'image/png',
  cacheControlMaxAge: 60 * 60 * 24 * 30, // 30 days
});

await prisma.article.update({
  where: { id: articleId },
  data: { imageUrl: url, imageCredit: '© basemap.at' },
});
```

### Nominatim Request

```typescript
const url = new URL('https://nominatim.openstreetmap.org/search');
url.searchParams.set('q', extractedLocation);
url.searchParams.set('format', 'jsonv2');
url.searchParams.set('countrycodes', 'at');
url.searchParams.set('limit', '1');
url.searchParams.set('addressdetails', '1');

const response = await fetch(url.toString(), {
  headers: {
    'User-Agent': 'Wurzelwelt/1.0 (regionalprojekt.vercel.app)',
    'Accept-Language': 'de',
  },
});
```

Result: check `result[0].type` for zoom selection, `result[0].lat` + `result[0].lon` for coordinates, `result[0].importance` to filter garbage results (skip if < 0.3).

---

## Sources

- [basemap.at official site](https://basemap.at/en/) — HIGH confidence (official, CC-BY 4.0 confirmed, layer list confirmed)
- [DE:AT/basemap — OpenStreetMap Wiki](https://wiki.openstreetmap.org/wiki/DE:AT/basemap) — HIGH confidence (community-maintained, layer identifiers confirmed)
- [basemap.at WMTS Capabilities XML](https://basemap.at/wmts/1.0.0/WMTSCapabilities.xml) — HIGH confidence (authoritative capabilities document)
- [Nominatim reverse zoom parameter table](https://nominatim.org/release-docs/latest/api/Reverse/) — HIGH confidence (official docs, zoom→granularity mapping)
- [Nominatim usage policy — 1 req/sec limit](https://operations.osmfoundation.org/policies/nominatim/) — HIGH confidence (official OSM Foundation policy)
- [Nominatim Search API docs](https://nominatim.org/release-docs/latest/api/Search/) — HIGH confidence (official docs, `countrycodes` and `featuretype` parameters)
- [staticmaps npm — Node.js tile stitching library](https://github.com/StephanGeorg/staticmaps) — MEDIUM confidence (GitHub repo, sharp-based, custom tileUrl supported)
- [Zoom levels — OpenStreetMap Wiki](https://wiki.openstreetmap.org/wiki/Zoom_levels) — HIGH confidence (canonical zoom level reference)
- [Vercel Blob docs](https://vercel.com/docs/vercel-blob) — HIGH confidence (official Vercel documentation)
- [Creating static map images with Pillow (Python) — alexwlchan.net 2025](https://alexwlchan.net/2025/static-maps/) — MEDIUM confidence (verified pattern, language-agnostic tile math applies to Node.js)
- [Tile stitching — OpenStreetMap Wiki](https://wiki.openstreetmap.org/wiki/Tile_stitching) — HIGH confidence (community reference)
- [Isticktoit.net — basemap.at Leaflet tile URL examples](https://www.isticktoit.net/?p=1145) — MEDIUM confidence (community blog, tile URL format verified against WMTS capabilities)

---

*Feature research for: Wurzelwelt v3.1 "Basemap Article Images" — automatic map image generation*
*Researched: 2026-04-05*
