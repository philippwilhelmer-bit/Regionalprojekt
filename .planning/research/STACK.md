# Stack Research

**Domain:** Basemap article image generation — tile stitching, geocoding, blob storage (v3.1)
**Researched:** 2026-04-05
**Confidence:** MEDIUM (sharp/Vercel compatibility is actively unstable; other areas HIGH)

## Context: Milestone Scope

This is a SUBSEQUENT MILESTONE on an existing Next.js 15 / Prisma v6 / PostgreSQL / Tailwind CSS v4 app.

Validated stack (do NOT re-research): Next.js 15, Prisma v6, PostgreSQL (Neon), Anthropic Claude API, Tailwind CSS v4, Vitest with pgLite, Server Components, HMAC auth CMS, Vercel deployment.

**New packages required for v3.1:**
- `sharp@^0.33.5` — image compositing (tile stitching)
- `@vercel/blob@^0.27` — persisting generated map images
- No geocoding package — Nominatim is called via native `fetch` (no wrapper needed)
- No tile math package — OSM tile coordinate formula is 6 lines of code

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `sharp` | `^0.33.5` (pinned minor) | Fetch and composite basemap.at PNG tiles into a single map image | libvips-backed, runs in Node.js serverless without a browser. The `composite()` API accepts an array of `{ input: Buffer, left: number, top: number }` objects — exactly the pattern for stitching a grid of 256×256 tiles. Used internally by Next.js 15 for `<Image>` optimization, so it is already a transitive dependency. Pinning to `^0.33.5` is critical — see version compatibility section. |
| `@vercel/blob` | `^0.27` | Store generated map images and return public CDN URLs | Native to the project's Vercel hosting. `put(pathname, buffer, { access: 'public' })` accepts a Node.js `Buffer` directly — no stream conversion needed. Returns a `url` property pointing to Vercel's CDN edge. Automatically namespaced under `BLOB_READ_WRITE_TOKEN`. Version 0.27 is the current stable release. |
| Nominatim (via native `fetch`) | API v1, no package | Geocode Austrian place names extracted from article text to lat/lon coordinates | No wrapper library needed. A single `fetch` call to `https://nominatim.openstreetmap.org/search?q={place}&countrycodes=at&format=jsonv2&limit=1` with a `User-Agent` header is sufficient. The API returns `lat` and `lon` as strings. No authentication required. Free with a 1 req/s policy — adequate for pipeline use (one geocode per article ingestion, not per request). |
| basemap.at WMTS (via native `fetch`) | OGC WMTS 1.0.0, XYZ-style, no package | Fetch individual 256×256 PNG map tiles for Austria | CC-BY 4.0 licensed, no API key. The XYZ tile URL format is `https://mapsneu.wien.gv.at/basemap/{layer}/normal/google3857/{z}/{y}/{x}.png`. Use the `geolandbasemap` layer for the full-color Austrian basemap. Zoom 12–14 is the right range for Bezirk-level context (shows roads and geography, not individual buildings). |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `sharp` | `^0.33.5` | `sharp(width, height).composite(tiles).png().toBuffer()` | Every map image generation call. Do not use for anything else in this project — existing article images come from Unsplash URLs and do not need processing. |
| `@vercel/blob` | `^0.27` | `put()` to store, `list()` to check existence, `del()` for CMS cleanup | Use `put()` in the ingestion pipeline and on-demand API route. Use `list({ prefix: 'maps/' })` to check if a map already exists before regenerating. Use `del()` in the CMS when an editor replaces a map image. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `@vercel/blob` local dev mock | Blob storage in development without hitting Vercel | Set `BLOB_READ_WRITE_TOKEN=vercel_blob_rw_test_localtoken` in `.env.local`. The SDK detects a test token and stores files locally in `.vercel/blob/` — no real Vercel project needed during development. |

---

## Installation

```bash
# Core new dependencies
npm install sharp@0.33.5 @vercel/blob

# No new dev dependencies required
# sharp ships its own prebuilt linux-x64 binary — no @types/sharp needed
```

**Critical: pin sharp to exactly `0.33.5`, not a range.** See version compatibility.

---

## basemap.at Tile URL Format

The service uses a modified WMTS XYZ pattern where `y` and `x` are swapped from the OSM convention:

```
https://mapsneu.wien.gv.at/basemap/{layer}/normal/google3857/{z}/{y}/{x}.{ext}
```

Available layers:

| Layer name | Format | Use |
|---|---|---|
| `geolandbasemap` | `.png` | Full-color Austrian basemap — **use this** |
| `bmapgrau` | `.png` | Grayscale version |
| `bmapoverlay` | `.png` | Labels only (overlay) |
| `bmaporthofoto30cm` | `.jpeg` | Aerial photography |
| `bmaphidpi` | `.png` | HiDPI variant |

For article header images, use `geolandbasemap` at zoom 13. A 3×3 tile grid (9 tiles) at zoom 13 covers roughly a 20×20 km area — appropriate for Bezirk-level context.

**Tile coordinate math** (no library needed):

```typescript
function lonToTile(lon: number, zoom: number): number {
  return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
}

function latToTile(lat: number, zoom: number): number {
  const rad = lat * Math.PI / 180;
  return Math.floor(
    (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * Math.pow(2, zoom)
  );
}
```

**Attribution requirement:** basemap.at is CC-BY 4.0. Generated images must carry the attribution "basemap.at" — render it as a text overlay on the composited image using `sharp`'s SVG composite, or store it in the image metadata field and render in the article template.

---

## Nominatim Integration Pattern

```typescript
// Geocode an Austrian place name to lat/lon
async function geocodeAustria(placeName: string): Promise<{ lat: number; lon: number } | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', placeName);
  url.searchParams.set('countrycodes', 'at');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('accept-language', 'de');

  const res = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'Wurzelwelt/3.1 (regionalprojekt.vercel.app; contact@wurzelwelt.at)',
    },
    next: { revalidate: 86400 }, // 24h cache — geocoding results don't change
  });

  const results = await res.json();
  if (!results.length) return null;
  return { lat: parseFloat(results[0].lat), lon: parseFloat(results[0].lon) };
}
```

Key points:
- `countrycodes=at` restricts results to Austria — eliminates ambiguity for place names that exist in multiple countries
- `accept-language=de` returns German-language names in `display_name` (relevant if results are logged)
- `User-Agent` is **required** by the usage policy — requests without it will be rate-limited or blocked
- Cache geocoding results in Prisma (store `lat`/`lon` on the article or a Bezirk-level cache) — do not geocode the same place name twice
- Pipeline rate: 1 geocode per new article ingestion. At 5–10 articles/day, well within the 1 req/s policy

---

## Vercel Function Constraints

Sharp runs as a Node.js serverless function on Vercel. Key constraints:

| Constraint | Value | Impact |
|---|---|---|
| Max unzipped bundle size | 250 MB | sharp's prebuilt binary is ~30 MB — safe. Do not add puppeteer (~170 MB) or canvas |
| Default memory | 1024 MB (Hobby) | Sufficient for 9-tile stitch (9 × ~200KB PNG = ~1.8MB in memory). Flag if expanding to larger grids. |
| Execution timeout | 10s (Hobby) | 9 tile fetches + composite + blob upload must complete in <10s. Use `Promise.all()` to fetch tiles in parallel. |
| Cold start | ~1–2s extra | Sharp initialization is included in cold start. Use `unstable_cache` or background job pattern for pipeline (not user-facing requests) |
| Response payload | 4.5 MB body limit | Map images are stored in Blob and returned as URLs — body limit is not an issue |

**Memory sizing:** A 3×3 grid of 256×256 PNG tiles at zoom 13 produces a 768×768 output image (~1.2 MB PNG). Well within memory limits.

---

## Tile Stitching with sharp

```typescript
import sharp from 'sharp';

interface TileInput {
  input: Buffer;
  left: number;   // x pixel offset
  top: number;    // y pixel offset
}

async function stitchTiles(
  tiles: TileInput[],
  width: number,   // cols × 256
  height: number,  // rows × 256
): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 240, g: 240, b: 240 }, // fallback grey
    },
  })
    .composite(tiles)
    .png({ compressionLevel: 6 })
    .toBuffer();
}
```

Call `stitchTiles` after `Promise.all(tileUrls.map(fetch))`. The composited `Buffer` is passed directly to `@vercel/blob`'s `put()`.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `sharp` for compositing | `canvas` (node-canvas) | canvas supports text rendering natively (useful for map overlays with labels), but requires Cairo native bindings that fail reliably on Vercel's lambda environment. sharp is the safe choice for pure compositing. |
| `sharp` for compositing | Puppeteer / Playwright headless screenshot | These work but add ~170 MB to the function bundle (hits Vercel's 250 MB limit) and have ~3s cold start overhead per image. Completely disproportionate for tile stitching. |
| Nominatim via native `fetch` | `nominatim-geocoder` npm wrapper | The wrapper adds an npm dependency for what is a single `fetch` call. The package's last update was 2022 — maintenance risk. Direct fetch is more transparent and controllable. |
| Nominatim via native `fetch` | Google Maps Geocoding API | Costs money ($0.005/request), requires API key management, GDPR surface area. Nominatim with `countrycodes=at` is accurate for Austrian places. Use Google only if Nominatim repeatedly fails on specific Austrian place names. |
| `@vercel/blob` | Cloudinary / S3 | Require additional credentials and separate billing. Vercel Blob is native to the project's existing Vercel hosting and bills under the same account. For the Hobby plan's image volume (<100 images/month initially), it stays within the free tier. |
| `@vercel/blob` | Storing image URLs from Unsplash | Unsplash images are fetched externally on each render and have no guaranteed availability. Blob gives us a stable CDN URL that we own. |
| zoom level 13 | zoom level 10 (Bundesland view) or 15 (street view) | Zoom 10 shows too little context (country-level). Zoom 15 shows individual streets but provides no regional orientation. Zoom 13 balances recognizable geography with editorial utility. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `sharp@^0.34.x` | Confirmed broken with Next.js 15 on Vercel — "Could not load the 'sharp' module using the linux-x64 runtime" as of October 2025. Multiple projects affected. | Pin to `sharp@0.33.5` which is the version bundled with Next.js 15's internal image optimization and known to work on Vercel linux-x64. |
| `canvas` (node-canvas) | Requires native Cairo bindings that Vercel's build environment does not reliably compile. Results in deploy failures. | `sharp` for all compositing needs |
| `puppeteer` or `playwright` | ~170 MB binary pushed the Vercel 250 MB bundle limit; ~3s cold start per invocation; overkill for tile stitching. | `sharp` |
| `mapbox-gl`, `leaflet`, or any map rendering library | These render tiles in a browser DOM. For server-side map image generation, they require a headless browser (see puppeteer above). | Direct WMTS tile fetch + sharp composite |
| `node-fetch` package | Node.js ≥18 (required by Next.js 15) ships native `fetch`. Adding `node-fetch` duplicates this and complicates the build. | Native `fetch` |
| A tile coordinate npm package (`coordinates2tile`, etc.) | 6 lines of math (standard OSM formula). An npm dependency with maintenance overhead is not justified. | Inline coordinate functions |
| mapbox static images API or similar paid services | These would work but cost money and add external dependencies. basemap.at is CC-BY 4.0 and tailored to Austria — more relevant content for an Austrian news platform. | basemap.at WMTS |

---

## Stack Patterns by Variant

**If the ingestion pipeline (cron job) generates maps automatically:**
- Run tile fetch + sharp composite + blob upload inside the ingestion function
- Use `Promise.all()` for the 9 tile fetches — do not await sequentially (adds ~9× network latency)
- Store the returned Blob URL in the `Article.imageUrl` field via Prisma update
- Budget: ~2–4s for the full pipeline per article (9 parallel tile fetches ~1s, composite ~0.5s, blob upload ~1s)

**If map generation is on-demand (API route, not pipeline):**
- Create `/api/maps/generate?articleId=...` route with HMAC auth
- Check Blob existence (`list({ prefix: \`maps/article-${id}\` })`) before regenerating
- Return 304 if map already exists
- Cap total function timeout at 8s with an `AbortController` signal

**If a location cannot be geocoded (Nominatim returns no results):**
- Fall back to the article's tagged Bezirk centroid (add lat/lon to `bundesland.config.ts`)
- Every Steiermark Bezirk should have a centroid lat/lon in config — this is the guaranteed fallback

**If the Hobby plan Blob free tier is approached:**
- Implement `del()` of old Blob images when a new map replaces them
- CMS map picker should show current blob URL and offer "Bild löschen" action calling `del()`
- Current estimate: ~100–200 generated images at ~150KB each = ~30 MB/month — well within Hobby limits

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `sharp@0.33.5` | Next.js 15 App Router, Vercel linux-x64 | This is the version Next.js 15.0.2 ships internally. Proven working on Vercel. Do NOT upgrade to 0.34.x until the issue (lovell/sharp#4361) is resolved. Lock with `"sharp": "0.33.5"` (no caret) in package.json. |
| `sharp@0.33.5` | Node.js ≥18 | Uses libvips prebuilt binary — no compilation needed. |
| `@vercel/blob@^0.27` | Next.js 15 App Router (Server Actions, Route Handlers) | Works in both Server Actions and API routes. Reads `BLOB_READ_WRITE_TOKEN` from `process.env`. |
| `@vercel/blob@^0.27` | Vercel Hobby plan | Free tier — no paid plan required. Usage limits apply (consult Vercel Blob pricing page for current quotas). |
| basemap.at WMTS tiles | EPSG:3857 (Web Mercator) | OSM tile math uses Web Mercator. basemap.at uses `google3857` tile matrix set — same projection, same tile coordinate formula. No reprojection needed. |
| Nominatim API | OpenStreetMap data, CC-BY-SA 2.0 | Results are CC-BY-SA licensed — using them to generate map images (which are separately CC-BY via basemap.at) is legally unambiguous for a non-commercial Austrian news site. Verify with legal if monetization plans change. |

---

## Sources

- [sharp/issues/4361 — sharp@0.34.0 fails with Next.js 15](https://github.com/lovell/sharp/issues/4361) — version pinning rationale, HIGH confidence (GitHub issue with reproducible steps)
- [sharp/issues/3870 — linux-x64 runtime error on Vercel](https://github.com/lovell/sharp/issues/3870) — Vercel compatibility context, HIGH confidence
- [sharp.pixelplumbing.com](https://sharp.pixelplumbing.com/) — compositing API, install requirements, MEDIUM confidence (WebFetch blocked, confirmed via search)
- [Vercel Functions Limitations](https://vercel.com/docs/functions/limitations) — 250 MB bundle, 10s timeout, 1024 MB memory, MEDIUM confidence (WebSearch-confirmed official docs)
- [@vercel/blob npm](https://www.npmjs.com/package/@vercel/blob) — version 0.27+, `put()` API, Buffer support, MEDIUM confidence (WebSearch-confirmed)
- [Vercel Blob Server Uploads docs](https://vercel.com/docs/vercel-blob/server-upload) — `put()` Server Action pattern, MEDIUM confidence
- [DE:AT/basemap — OpenStreetMap Wiki](https://wiki.openstreetmap.org/wiki/DE:AT/basemap) — tile URL format, layer names, WMTS spec, HIGH confidence
- [basemap.at WMTS GetCapabilities](https://basemap.at/wmts/1.0.0/WMTSCapabilities.xml) — authoritative layer list and URL patterns, HIGH confidence
- [Nominatim 5.3.0 Search API](https://nominatim.org/release-docs/latest/api/Search/) — query parameters including `countrycodes`, `format`, `accept-language`, HIGH confidence
- [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/) — 1 req/s limit, User-Agent requirement, HIGH confidence
- [OSM tile coordinate formula](https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames) — standard XYZ math, HIGH confidence

---

*Stack research for: v3.1 Basemap Article Images — tile stitching, Nominatim geocoding, Vercel Blob Storage*
*Researched: 2026-04-05*
