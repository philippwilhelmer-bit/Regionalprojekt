# Architecture Research

**Domain:** Map image generation pipeline integrated into existing Next.js 15 + Prisma news platform
**Researched:** 2026-04-05
**Confidence:** HIGH (existing codebase read directly; external services confirmed via official docs and search)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CRON PIPELINE (existing)                      │
│  /api/cron → ingest() → processArticles() → publishArticles()       │
├──────────────────────────────────┬──────────────────────────────────┤
│   NEW: Auto Map Step             │   NEW: On-Demand API             │
│   (injected into pipeline.ts)    │   /api/map-image/[articleId]     │
│                                  │                                  │
│   generateMapImage(article.id)   │   GET → check existing →        │
│        ↓                         │   generateMapImage() → JSON      │
│   extractLocation(title,content) │                                  │
│        ↓                         │                                  │
│   geocodeLocation(placeName)     │                                  │
│        ↓                         │                                  │
│   fetchTiles(lat,lng,zoom=12)    │                                  │
│        ↓  3x3 grid = 9 PNGs      │                                  │
│   stitchTiles() via sharp        │                                  │
│        ↓  JPEG Buffer ~100KB     │                                  │
│   put(buffer) → Vercel Blob      │                                  │
│        ↓  public URL             │                                  │
│   article.update(imageUrl)       │                                  │
├──────────────────────────────────┴──────────────────────────────────┤
│                     NEW: CMS Map Picker                              │
│   MapPicker.tsx (client) ← map-image-actions.ts (Server Action)     │
│   Sits alongside existing UnsplashPicker in /admin/articles/[id]/edit│
├─────────────────────────────────────────────────────────────────────┤
│                     STORAGE LAYER                                    │
│   Vercel Blob (public)           Neon PostgreSQL                     │
│   map-images/{id}-{hash}.jpg     Article.imageUrl / imageCredit     │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Status |
|-----------|---------------|--------|
| `lib/images/map/location-extractor.ts` | Extract place names from German article text via regex; LLM fallback when regex finds nothing | NEW |
| `lib/images/map/geocoder.ts` | Forward geocode location strings via Nominatim; returns lat/lng | NEW |
| `lib/images/map/tile-fetcher.ts` | Fetch individual basemap.at raster PNG tiles by XYZ; returns Buffer or null per tile | NEW |
| `lib/images/map/compositor.ts` | Stitch 3x3 tile grid into single JPEG using sharp composite; add basemap.at attribution | NEW |
| `lib/images/map/blob-upload.ts` | Upload finished Buffer to Vercel Blob with `access: 'public'`; return public URL | NEW |
| `lib/images/map/generate.ts` | Orchestrator facade: extractor → geocoder → tile fetcher → compositor → blob upload → DB write | NEW |
| `app/api/map-image/[articleId]/route.ts` | On-demand Route Handler: idempotent; returns existing URL or triggers generateMapImage | NEW |
| `lib/admin/map-image-actions.ts` | Server Actions for CMS: `generateMapImageAction` with requireAuth() guard | NEW |
| `components/admin/MapPicker.tsx` | Client component: "Karte generieren" button + preview; mirrors UnsplashPicker.tsx structure | NEW |
| `lib/ai/pipeline.ts` | Add generateMapImage call after WRITTEN status in article loop; best-effort try/catch | MODIFIED |
| `app/(admin)/admin/articles/[id]/edit/page.tsx` | Add `<MapPicker>` alongside existing `<UnsplashPicker>` | MODIFIED |

## Recommended Project Structure

```
src/
├── lib/
│   └── images/
│       ├── unsplash.ts                 # EXISTING — unchanged
│       └── map/
│           ├── location-extractor.ts   # regex scan + LLM fallback
│           ├── geocoder.ts             # Nominatim wrapper
│           ├── tile-fetcher.ts         # basemap.at XYZ tile fetch
│           ├── compositor.ts           # sharp stitch + attribution
│           ├── blob-upload.ts          # @vercel/blob put()
│           └── generate.ts             # orchestration facade
├── app/
│   └── api/
│       └── map-image/
│           └── [articleId]/
│               └── route.ts            # on-demand GET handler
└── lib/
    └── admin/
        ├── unsplash-actions.ts         # EXISTING — unchanged
        └── map-image-actions.ts        # NEW Server Actions
└── components/
    └── admin/
        ├── UnsplashPicker.tsx          # EXISTING — unchanged
        └── MapPicker.tsx               # NEW — parallel structure
```

### Structure Rationale

- **`lib/images/map/`:** Parallel to `lib/images/unsplash.ts`. A subdirectory is appropriate because map generation is multi-file; unsplash is single-file.
- **`app/api/map-image/[articleId]/`:** Route Handler rather than Server Action because on-demand generation must be callable without CMS authentication (reader-facing trigger).
- **`lib/admin/map-image-actions.ts`:** Server Actions require auth guard; mirrors `unsplash-actions.ts` naming and structure exactly for predictability.
- **`generate.ts` as facade:** All three calling contexts (pipeline, API route, Server Action) use one function. Error handling and DB writes live in one place.

## Architectural Patterns

### Pattern 1: Generate Facade (single entry point for all three modes)

**What:** A single `generateMapImage(articleId, db?)` function orchestrates all sub-steps end-to-end and writes imageUrl/imageCredit to the Article row. All callers delegate to this function.
**When to use:** All three generation modes (auto / on-demand / manual) call this function. No caller reimplements the pipeline.
**Trade-offs:** Individual sub-steps are still independently importable and unit-testable. The facade is thin — it delegates, not implements.

```typescript
// lib/images/map/generate.ts
export async function generateMapImage(
  articleId: number,
  db: PrismaClient = defaultPrisma
): Promise<{ url: string; credit: string } | null> {
  const article = await db.article.findUnique({
    where: { id: articleId },
    select: { title: true, content: true, imageUrl: true },
  })
  if (!article || article.imageUrl) return null  // idempotent guard

  const location = await extractLocation(article.title ?? '', article.content ?? '')
  if (!location) return null

  const coords = await geocodeLocation(location)
  if (!coords) return null

  const imageBuffer = await stitchMapTiles(coords.lat, coords.lng, 12)
  const blobUrl = await uploadToBlob(imageBuffer, articleId)
  const credit = 'Karte: basemap.at \u2013 CC BY 4.0'

  await db.article.update({
    where: { id: articleId },
    data: { imageUrl: blobUrl, imageCredit: credit },
  })
  return { url: blobUrl, credit }
}
```

### Pattern 2: XYZ Tile Fetch + Sharp Composite

**What:** Convert lat/lng to Slippy Map XYZ tile coordinates at zoom 12; fetch a 3x3 grid of 256x256 PNG tiles from basemap.at; composite into 768x432 JPEG with sharp (16:9 crop from centre).
**When to use:** Core of every map generation. Tile fetch failures for individual tiles are handled gracefully (grey fallback for missing tiles via `background` in `sharp.create`).
**Trade-offs:** 9 HTTP requests per generation; each is a separate TCP call from Vercel serverless. Acceptable at current cron frequency (~20-50 articles/day).

```typescript
// lib/images/map/tile-fetcher.ts
// basemap.at URL pattern: /{z}/{y}/{x}.png  (y before x — confirmed from OSM wiki)
const BASE = 'https://maps1.wien.gv.at/basemap/geolandbasemap/normal/google3857'

function latLngToXY(lat: number, lng: number, z: number) {
  const n = 2 ** z
  const x = Math.floor(((lng + 180) / 360) * n)
  const latR = (lat * Math.PI) / 180
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2) * n
  )
  return { x, y }
}

export async function fetchTile(z: number, x: number, y: number): Promise<Buffer | null> {
  const res = await fetch(`${BASE}/${z}/${y}/${x}.png`, {
    headers: { 'User-Agent': 'Wurzelwelt/1.0 (regionalprojekt.vercel.app)' },
  })
  if (!res.ok) return null
  return Buffer.from(await res.arrayBuffer())
}
```

```typescript
// lib/images/map/compositor.ts — 3x3 tile grid → 768x432 JPEG
import sharp from 'sharp'

const T = 256   // basemap.at tiles are 256x256px
const GRID = 3  // 3x3 = 9 tiles → 768x768 → crop to 768x432

export async function stitchMapTiles(lat: number, lng: number, zoom: number): Promise<Buffer> {
  const center = latLngToXY(lat, lng, zoom)
  const tileBuffers = await Promise.all(
    [-1, 0, 1].flatMap(dy =>
      [-1, 0, 1].map(dx => fetchTile(zoom, center.x + dx, center.y + dy))
    )
  )

  const composites: sharp.OverlayOptions[] = tileBuffers
    .map((buf, i) =>
      buf ? { input: buf, left: (i % GRID) * T, top: Math.floor(i / GRID) * T } : null
    )
    .filter((c): c is sharp.OverlayOptions => c !== null)

  const cropTop = Math.floor((T * GRID - 432) / 2)
  return sharp({
    create: { width: T * GRID, height: T * GRID, channels: 3, background: '#e8e0d4' },
  })
    .composite(composites)
    .extract({ left: 0, top: cropTop, width: T * GRID, height: 432 })
    .jpeg({ quality: 85 })
    .toBuffer()
}
```

### Pattern 3: Location Extraction with LLM Fallback

**What:** Regex-first extraction scans article title and lead sentence against a term list built from Bezirk names and `gemeindeSynonyms` (already seeded in DB). LLM fallback uses a minimal single-turn Claude prompt (`max_tokens: 20`) only when regex finds nothing.
**When to use:** Regex handles ~80% of cases at zero cost. LLM fallback handles ambiguous or informal place references. State-wide articles (`isStateWide = true`) skip extraction entirely and use Graz centroid (47.0707, 15.4395) as default.
**Trade-offs:** LLM fallback adds ~0.5s latency and ~100 tokens per invocation. This is acceptable given it fires infrequently. Reuse the existing `_clientFactory.create()` pattern from `pipeline.ts`.

```typescript
// lib/images/map/location-extractor.ts
export function extractLocationRegex(
  title: string,
  content: string,
  terms: string[]   // Bezirk names + gemeindeSynonyms from DB
): string | null {
  const text = `${title} ${content.slice(0, 300)}`
  for (const term of terms) {
    if (new RegExp(`\\b${term}\\b`, 'i').test(text)) return term
  }
  return null
}

export async function extractLocationLLM(
  title: string,
  content: string
): Promise<string | null> {
  // Prompt (German): "Nenne den wichtigsten Ort im folgenden Artikel.
  //   Antworte nur mit dem Ortsnamen, sonst nichts."
  // Model: cheapest configured model; max_tokens: 20
  // Returns trimmed response string or null on error/empty
}
```

## Data Flow

### Flow 1: Automatic Generation (Cron Pipeline)

```
Vercel Cron (1/day on Hobby plan)
  ↓
GET /api/cron  [existing, maxDuration: 300]
  ↓
ingest(source)  [UNCHANGED — creates FETCHED articles]
  ↓
processArticles()  [MODIFIED]
  for each article:
    runStep1Tag()  → TAGGED status
    runStep2Write() → WRITTEN status, sets title/content/seoTitle
    article.update(status: WRITTEN, ...)
    ↓  NEW — best-effort, inner try/catch, non-fatal
    if (!article.imageUrl && !step1.isStateWide):
      generateMapImage(article.id, db)
        extractLocation(title, content, bezirkTerms)  [regex, no I/O]
        geocodeLocation(placeName)
          → GET nominatim.openstreetmap.org/search?q=...&countrycodes=at
        stitchMapTiles(lat, lng, zoom=12)
          → 9x GET maps1.wien.gv.at/basemap/.../{z}/{y}/{x}.png
          → sharp.create().composite([...]).extract().jpeg().toBuffer()
        uploadToBlob(jpegBuffer, articleId)
          → @vercel/blob put('map-images/{id}-{ts}.jpg', buf, { access: 'public' })
        article.update({ imageUrl: blobUrl, imageCredit: 'Karte: basemap.at – CC BY 4.0' })
    catch (mapErr) → console.warn, continue loop (never rethrow)
  ↓
publishArticles()  [UNCHANGED]
```

**Integration point in pipeline.ts:** After step 5f (status update to WRITTEN/REVIEW), before `articlesWritten++`, add the generateMapImage call inside a try/catch. The outer per-article catch block must not swallow map errors into article ERROR status — the inner catch handles it separately.

```typescript
// Addition to pipeline.ts article loop, after step 5f:
if (finalStatus === 'WRITTEN' && !article.imageUrl) {
  try {
    await generateMapImage(article.id, db)
  } catch (mapErr) {
    console.warn(`[map-image] article id=${article.id} — ${String(mapErr)}`)
    // Non-fatal — article publishes without image
  }
}
```

### Flow 2: On-Demand Generation (API Route)

```
Reader article page (client-side, optional enhancement)
  ↓  or: direct URL call from any client
GET /api/map-image/[articleId]
  ↓
Parse articleId → fetch article.imageUrl from DB
  ├─ imageUrl already set: return 200 { url, credit }  [idempotent, no re-generation]
  ├─ article not found:    return 404
  └─ imageUrl null:
       generateMapImage(articleId)
         ↓ success: return 200 { url, credit }
         ↓ no location found: return 422 { error: 'No location found' }
```

The route is idempotent by design: concurrent requests for the same article all return the same URL once the first completes. There is a brief race window (two simultaneous requests both see `imageUrl: null` and both try to generate), but the result is benign — both write the same credit, and one Blob object will be orphaned. Acceptable at current scale; a DB-level mutex is not needed.

```typescript
// app/api/map-image/[articleId]/route.ts
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ articleId: string }> }
) {
  const { articleId } = await params
  const id = Number(articleId)
  const article = await prisma.article.findUnique({
    where: { id },
    select: { imageUrl: true, imageCredit: true },
  })
  if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (article.imageUrl) return NextResponse.json({ url: article.imageUrl, credit: article.imageCredit })

  const result = await generateMapImage(id)
  if (!result) return NextResponse.json({ error: 'No location found' }, { status: 422 })
  return NextResponse.json(result)
}
```

### Flow 3: Manual CMS Generation

```
Editor on /admin/articles/[id]/edit  (Server Component page)
  ↓
Renders <MapPicker articleId={id} headline={article.title} currentImageUrl={article.imageUrl} />
  ↓
Editor clicks "Karte generieren"
  ↓
useTransition → generateMapImageAction(articleId)  [Server Action in map-image-actions.ts]
  ↓  requireAuth() guard (rejects if not logged in)
  generateMapImage(articleId)
  ↓
revalidatePath('/admin/articles/[id]/edit')
  ↓
MapPicker.tsx shows generated image preview
Editor accepts (imageUrl already written to DB) or discards via removeArticleImage() [existing unsplash-actions.ts]
```

`MapPicker.tsx` mirrors `UnsplashPicker.tsx` in structure: same prop interface (articleId, headline, currentImageUrl, currentImageCredit), same useState/useTransition pattern, same use of `saveArticleImage`/`removeArticleImage` from `unsplash-actions.ts` for the final write/clear. No new DB primitives needed.

## Integration Points

### External Services

| Service | Integration | Endpoint | Notes |
|---------|-------------|----------|-------|
| basemap.at | HTTP GET, no auth | `https://maps1.wien.gv.at/basemap/geolandbasemap/normal/google3857/{z}/{y}/{x}.png` | CC BY 4.0 — attribution string required in imageCredit; URL uses `{y}/{x}` order (y before x); no API key; zoom 12 for Bezirk-level view |
| Nominatim (OSM) | HTTP GET, no auth | `https://nominatim.openstreetmap.org/search?q={term}&countrycodes=at&format=json&limit=1` | Must send `User-Agent` header per OSM usage policy; max 1 req/sec; `countrycodes=at` restricts to Austria |
| Vercel Blob | `@vercel/blob` npm SDK | `put(filename, buffer, { access: 'public' })` | Requires `BLOB_READ_WRITE_TOKEN` env var (set in Vercel dashboard, Blob store created there); composite JPEG ~80-120KB — well under 4.5MB server-side limit |
| sharp | npm, pre-compiled binary | n/a | Ships pre-compiled linux-x64 binaries; Next.js already uses sharp for `next/image` optimization — no extra Vercel configuration needed |
| Anthropic Claude | Existing `_clientFactory.create()` from pipeline.ts | Claude API | LLM fallback only; reuse existing factory pattern; use cheapest configured model; ~100 tokens per invocation |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `pipeline.ts` → `generate.ts` | Direct import, best-effort inner try/catch | Map failure must never change article status; outer per-article catch must not intercept map errors |
| `app/api/map-image/[articleId]` → `generate.ts` | Direct import, thin Route Handler | Route Handler handles param parsing and idempotency check only; generate.ts does all work |
| `map-image-actions.ts` → `generate.ts` | Direct import with requireAuth() guard | Auth lives in the action, not in generate.ts; generate.ts is auth-agnostic |
| `MapPicker.tsx` → `map-image-actions.ts` | useTransition + Server Action | Same pattern as UnsplashPicker.tsx → unsplash-actions.ts; no new state management approach |
| `generate.ts` → Prisma | Injected or singleton client | Same overloaded DI pattern as ingest.ts and pipeline.ts: production uses singleton, tests inject pgLite client |
| `generate.ts` → Vercel Blob | via `blob-upload.ts` wrapper | Isolation layer makes blob calls mockable in unit tests without real Blob writes |

### Existing Code: Modified vs Unchanged

| File | Status | Change |
|------|--------|--------|
| `src/lib/ai/pipeline.ts` | MODIFIED | Add `generateMapImage(article.id, db)` after WRITTEN status; inner try/catch; only when `!article.imageUrl` |
| `src/app/(admin)/admin/articles/[id]/edit/page.tsx` | MODIFIED | Add `<MapPicker>` component below `<UnsplashPicker>` |
| `src/lib/ingestion/ingest.ts` | UNCHANGED | Map generation must not run during raw ingestion — content not yet AI-rewritten |
| `src/lib/ingestion/types.ts` | UNCHANGED | `RawItem.imageUrl` already optional; no change needed |
| `src/lib/admin/unsplash-actions.ts` | UNCHANGED | `saveArticleImage` and `removeArticleImage` reused as-is by MapPicker |
| `prisma/schema.prisma` | UNCHANGED | `Article.imageUrl` and `imageCredit` already exist with correct types |
| `src/app/api/cron/route.ts` | UNCHANGED | processArticles() internally handles map generation; cron route is unaware |

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (Hobby plan, 1/day cron, ~20-50 articles/day) | Inline map generation in pipeline loop is sufficient; adds ~2-3s per article; total extra time 40-150s/run; fits within `maxDuration: 300` |
| Pro plan (multiple crons/day, ~200 articles/run) | Monitor cron duration; if approaching 250s, split map generation into separate task after `publishArticles()` or use Vercel Queue |
| High volume (1000+ articles/day) | Cache Nominatim results in DB (`Article.mapLat`/`mapLng` columns); pre-generate tile cache per Bezirk centroid at deploy time; move to background queue |

### Scaling Priorities

1. **First bottleneck:** Nominatim 1 req/sec rate limit. At 50 articles/day this is irrelevant. If cron runs more frequently with many articles in a single run, add a 1-second delay between geocode calls (or cache `placeName → {lat, lng}` in-memory per pipeline run).
2. **Second bottleneck:** Vercel function timeout. `maxDuration: 300` is already set on `/api/cron`. Map generation adds ~2-3s per article. At 50 articles that is 100-150 extra seconds. The baseline pipeline typically runs 30-60s. Total ~180-210s. Leaves ~90s headroom. Measure in production.

## Anti-Patterns

### Anti-Pattern 1: Generating Maps During Raw Ingestion (ingest.ts)

**What people do:** Add map generation inside the `ingest()` loop alongside `db.article.create`.
**Why it's wrong:** At ingestion time, article content is raw/untranslated. Location extraction on raw OTS/RSS payloads is unreliable — titles may be in press-release format or reference non-Austrian locations. Also bloats ingestion duration and conflates two distinct concerns.
**Do this instead:** Generate after `processArticles()` when the AI-rewritten German title and clean content are available. These are significantly higher-quality inputs for location extraction.

### Anti-Pattern 2: Letting Map Generation Fail the Article

**What people do:** Allow `generateMapImage` exceptions to propagate up through the pipeline.ts per-article error handler.
**Why it's wrong:** A Nominatim timeout, basemap.at outage, or sharp error would increment `retryCount` and mark the article ERROR or FAILED, blocking it from ever publishing.
**Do this instead:** Wrap `generateMapImage` in an inner try/catch inside the per-article loop. Log `console.warn`. Continue the loop. Map images are enhancement, not correctness. The article publishes without an image; the on-demand API route handles it later.

### Anti-Pattern 3: Re-Generating Images That Already Exist

**What people do:** Call `generateMapImage` unconditionally on every cron run or every on-demand request.
**Why it's wrong:** Each generation costs 9 tile fetches + 1 Nominatim request + sharp CPU + 1 Blob write. Re-generating wastes all of these on images already stored. The Blob URL is stable — no need to regenerate.
**Do this instead:** Check `article.imageUrl` before calling `generateMapImage`. If set, return null immediately. This guard lives authoritatively in `generate.ts` and is reinforced in the API route handler.

### Anti-Pattern 4: Using Raw Tile URLs as imageUrl

**What people do:** Store a basemap.at tile URL directly as `Article.imageUrl` without compositing.
**Why it's wrong:** Individual tiles are 256x256 and cover a small geographic area. The article header expects a single full-width (768+ px) landscape image. Raw tile URLs require JavaScript slippy-map rendering and cannot be used as `<img src>` for hero images.
**Do this instead:** Composite a 3x3 tile grid into a single JPEG with sharp; upload to Vercel Blob; store the Blob URL. This is a regular image URL compatible with the existing article header component.

### Anti-Pattern 5: Putting Auth Logic Inside generate.ts

**What people do:** Add `requireAuth()` inside `generateMapImage()` to prevent unauthorized generation.
**Why it's wrong:** `generateMapImage` is called from three contexts: the cron pipeline (no user session), the on-demand public API route (no auth), and the CMS Server Action (auth required). A single auth guard inside the function breaks two of the three call sites.
**Do this instead:** Auth belongs in the Server Action (`map-image-actions.ts`). `generate.ts` is auth-agnostic. The public API route relies on idempotency and numeric article ID as its only access control.

## Sources

- basemap.at tile URL pattern (y/x order, CC BY 4.0): [DE:AT/basemap - OpenStreetMap Wiki](https://wiki.openstreetmap.org/wiki/DE:AT/basemap), [basemap.at official](https://basemap.at/en/) — MEDIUM/HIGH confidence
- Nominatim usage policy (1 req/sec, User-Agent required): [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/) — HIGH confidence (official OSM Foundation)
- Nominatim search API `countrycodes` parameter: [Nominatim 5.3.0 Search](https://nominatim.org/release-docs/latest/api/Search/) — HIGH confidence (official docs)
- Vercel Blob `put()` server-side pattern and 4.5MB limit: [Vercel Blob docs](https://vercel.com/docs/vercel-blob), [Server Uploads](https://vercel.com/docs/vercel-blob/server-upload) — HIGH confidence (official Vercel docs)
- sharp composite API: [sharp compositing](https://sharp.pixelplumbing.com/api-composite/) — HIGH confidence (official)
- sharp on Vercel: pre-compiled linux-x64 binaries ship with sharp; Next.js already uses sharp for `next/image` — MEDIUM confidence (standard setup works; issues reported only in non-standard bundling configs)
- Existing codebase (read directly): `ingest.ts`, `pipeline.ts`, `unsplash.ts`, `unsplash-actions.ts`, `UnsplashPicker.tsx`, `schema.prisma`, `/api/cron/route.ts`, `/admin/articles/[id]/edit/page.tsx` — HIGH confidence (primary source)

---
*Architecture research for: v3.1 Basemap Article Images — integration into Regionalprojekt*
*Researched: 2026-04-05*
