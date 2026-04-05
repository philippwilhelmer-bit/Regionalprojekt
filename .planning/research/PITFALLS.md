# Pitfalls Research

**Domain:** Adding basemap.at tile stitching, Nominatim geocoding, and sharp image compositing to an existing Vercel-hosted Next.js news platform
**Milestone:** v3.1 Basemap Article Images
**Researched:** 2026-04-05
**Confidence:** HIGH for Nominatim policy (official OSM policy page); HIGH for Vercel memory limits (official docs); HIGH for sharp/Vercel binary issue (multiple GitHub issues); MEDIUM for basemap.at attribution (OSM wiki + data.gv.at license); MEDIUM for Vercel Blob Hobby limits (community forums + docs); MEDIUM for German umlaut geocoding (general geocoding docs, no Austrian-specific official source)

---

## Critical Pitfalls

### Pitfall 1: Nominatim IP Ban From Serverless Burst Requests

**What goes wrong:**
The Nominatim public API enforces a hard limit of 1 request per second — measured as the sum of all requests originating from the same IP, not per user. Vercel serverless functions do not have a stable egress IP. During a cron-triggered batch ingestion run, all geocoding calls fire from Vercel's infrastructure in rapid succession. The Nominatim policy distinguishes between "bulk use" and normal use; systematic batch geocoding (e.g., geocoding every article in a processing run) qualifies as bulk use even if each individual call is spaced at 1 second in-process.

The ban is applied at the IP level and can affect all Vercel-hosted projects sharing that egress IP. Access is blocked with HTTP 403. Recovery requires contacting OSM operations — there is no self-service unban.

**Why it happens:**
Developers implement per-request delays correctly in their Node.js code but do not account for concurrent serverless invocations. If two ingestion jobs run simultaneously (e.g., a cron trigger and a manual API call), each calls Nominatim independently. The 1 req/s limit is not per-process; it is per source IP at the Nominatim servers.

A second failure mode: Vercel cold starts launch fresh Node.js processes with no shared state. A module-level rate limiter or in-memory queue does not persist across invocations, meaning multiple concurrent cold starts bypass any in-process throttle.

**How to avoid:**
1. Never call Nominatim directly from within the main ingestion pipeline. Decouple geocoding into a separate step with explicit serialization.
2. Cache geocoding results in the database by normalized place name. A location like "Leoben, Steiermark" should only ever be geocoded once. Before calling Nominatim, always check the cache.
3. Implement a database-backed geocoding queue (a simple `pending_geocoding` status on articles) processed by the cron job one article at a time with explicit 1100ms delays between calls.
4. Always set a custom `User-Agent` header identifying the application: `User-Agent: Wurzelwelt/1.0 (regionalprojekt.vercel.app)`. Requests without a custom User-Agent identifying the application are considered policy violations and accelerate bans.
5. Consider self-hosting Nominatim on a free-tier VPS or using the Photon geocoder (powered by OSM data, no rate limit policy) as an alternative for batch use.

**Warning signs:**
- HTTP 403 responses from `nominatim.openstreetmap.org` in Vercel function logs
- Geocoding results suddenly empty for all new articles
- Vercel functions logging "Usage limit reached" in the response body

**Phase to address:**
Phase implementing the geocoding pipeline — the caching + queuing architecture must be designed before writing the first geocoding call.

---

### Pitfall 2: sharp Binary Incompatibility on Vercel (macOS Dev vs Linux Runtime)

**What goes wrong:**
sharp is a native Node.js module backed by libvips. On macOS (ARM64, the likely dev machine), `npm install` installs the `@img/sharp-darwin-arm64` native binary. On Vercel's Linux x64 runtime, this binary does not load and throws: `Could not load the "sharp" module using the linux-x64 runtime`.

This error only appears at runtime on Vercel, not during local development or in the build step. The error causes the map generation API route to fail with a 500 on every invocation.

**Why it happens:**
npm resolves native dependencies based on the current platform at install time. The `package-lock.json` generated on macOS ARM64 specifies the ARM64 optional dependency. When Vercel runs `npm ci`, it uses the lock file and installs the macOS binary rather than the Linux one.

**How to avoid:**
Add an explicit `postinstall` or `vercel-install` step, or add the following to `package.json`:
```json
{
  "optionalDependencies": {
    "@img/sharp-linux-x64": "^0.33.0"
  }
}
```
The correct install command for Vercel compatibility:
```bash
npm install --cpu=x64 --os=linux --libc=glibc sharp
```
Alternatively, add to `vercel.json`:
```json
{
  "installCommand": "npm install --cpu=x64 --os=linux sharp"
}
```
Verify by checking Vercel build logs that `@img/sharp-linux-x64` is listed in installed packages, not `@img/sharp-darwin-arm64`.

**Warning signs:**
- `Could not load the "sharp" module using the linux-x64 runtime` in Vercel function logs
- Map generation routes return 500 locally but work fine
- Build succeeds but runtime fails on first image compositing call

**Phase to address:**
Phase 1 of the milestone (infrastructure / dependency setup) — add the correct sharp dependency configuration before writing any image compositing code.

---

### Pitfall 3: Map Generation Failure Blocking Article Creation

**What goes wrong:**
The map image generation is added to the ingestion pipeline as an additional step after article creation. If this step throws an unhandled error (Nominatim ban, basemap.at tile fetch timeout, sharp memory spike, Vercel Blob write failure), the entire ingestion job for that article fails. The article is not saved to the database, or its status is left in an inconsistent state. The pipeline alert system triggers, operators investigate, and the root cause is a transient map image failure — not a content issue.

**Why it happens:**
Adding a new feature to an existing pipeline without explicit failure isolation. The ingestion pipeline was designed as a sequential chain — if any step fails, the chain stops. Map image generation introduces five new failure points (location extraction, geocoding, tile fetch, image compositing, blob upload) all of which can fail independently and transiently.

**How to avoid:**
Treat map image generation as a best-effort step with explicit try/catch isolation:
```typescript
let mapImageUrl: string | null = null;
try {
  mapImageUrl = await generateMapImage(article);
} catch (err) {
  logger.warn('Map image generation failed for article, continuing without image', {
    articleId,
    error: err,
  });
  // Article saves successfully with mapImageUrl = null
}
await saveArticle({ ...articleData, mapImageUrl });
```
The article creation must always succeed regardless of map image outcome. Map images should be generatable on-demand after publication via the CMS map image picker as a fallback.

**Warning signs:**
- Ingestion pipeline alerts firing for articles that otherwise have valid content
- Database shows articles with `status: error` when the article text is valid
- Cron logs show exceptions originating from `generateMapImage` functions, not from AI generation

**Phase to address:**
Every phase that touches the ingestion pipeline — this isolation pattern must be the first thing implemented, before any map generation logic is written.

---

### Pitfall 4: Vercel Hobby Plan Cron Timeout With Tile Fetching + Image Compositing

**What goes wrong:**
The Hobby plan default function duration is 10 seconds, with a maximum of 60 seconds (requires `export const maxDuration = 60` in the route). The ingestion cron already calls the AI generation API (Claude), which takes 5–15 seconds per article. Adding tile fetching (4–9 HTTP requests to basemap.at, each 100–500ms) plus sharp compositing (CPU-intensive, 500ms–2s on a cold 256×256 tile grid) can push total execution time over 60 seconds for a single article with map image generation.

The cron runs once per day. If it times out mid-run, some articles are saved without map images and the pipeline enters a partial-completion state.

**Why it happens:**
Map image generation is synchronous in the happy path. Developers test with fast tile responses on their local machine and do not account for Vercel cold start overhead, network latency to Austrian tile servers from Vercel's US/EU edge, and the cumulative cost of all pipeline steps in a single function invocation.

**How to avoid:**
1. Set `export const maxDuration = 60` on the cron route handler immediately.
2. Decouple map image generation from the cron: the cron saves articles, then enqueues them for map image generation. A separate API route handles map generation per article (triggered by a CMS "generate" button or a lightweight queue processor).
3. For the on-demand map image API route, set `export const maxDuration = 30` — tile fetch + compositing should complete in under 10 seconds under normal conditions, 30 seconds provides buffer.
4. Parallelize the tile fetches using `Promise.all` rather than sequential `await` calls — fetching all tiles in parallel reduces tile fetch time from 4×300ms sequential to ~300ms total.

**Warning signs:**
- Vercel function logs showing `504 FUNCTION_INVOCATION_TIMEOUT` on cron executions
- Articles saving successfully but all have `mapImageUrl: null`
- Cron log shows fewer articles processed than source ingested

**Phase to address:**
Phase designing the pipeline integration — decouple map image generation before implementing it.

---

### Pitfall 5: Vercel Blob Hobby Plan Storage Exhaustion Blocks All Blob Access

**What goes wrong:**
Vercel Blob storage on the Hobby plan is capped at 250 MB. A basemap.at map image for an article at 800×450px (zoom level 13–14, 3×3 tile grid) saved as JPEG at 80% quality is approximately 150–250 KB. At that size, 250 MB holds roughly 1,000–1,600 map images before the limit is reached. On a platform generating multiple articles per day, this limit is reachable within months.

When the Hobby plan Blob limit is exceeded, Vercel blocks all access to the Blob store — including reads of already-stored images. Articles that previously displayed map images show broken image links. The blockage persists until 30 days after the overage, or until upgrading to Pro.

**Why it happens:**
The Blob store grows monotonically. Old map images for outdated articles are never pruned. Developers do not account for cumulative storage growth or implement any cleanup strategy.

**How to avoid:**
1. Implement a Blob cleanup job that deletes map images for articles older than 90 days or articles that have been removed.
2. Optimize image output aggressively: JPEG at 75% quality, 800×400px max, progressive encoding via sharp. This targets ~80–120 KB per image, extending the 250 MB limit to 2,000+ images.
3. Monitor Blob usage via Vercel dashboard; set up a manual alert threshold at 200 MB.
4. For the Hobby plan, consider storing only the most recent N images in Blob and serving older articles with a gradient fallback. Alternatively, upgrade to Pro ($20/month) which includes 10 GB Blob storage.
5. Never store intermediate tile images or debug composites in Blob — only the final map image.

**Warning signs:**
- Vercel dashboard shows Blob usage above 200 MB
- "Blob storage blocked" error in function logs
- All article map images showing as broken links simultaneously

**Phase to address:**
Phase implementing Blob storage integration — define and implement the cleanup strategy before the first image is written.

---

### Pitfall 6: basemap.at CC-BY 4.0 Attribution Missing From Generated Images

**What goes wrong:**
basemap.at is licensed under the Open Government Data License Austria (CC-BY 4.0). The required attribution text is: "Datenquelle: basemap.at" with a link to basemap.at. For static generated images (where hyperlinks cannot be embedded), the attribution must be rendered visibly on the image itself. Omitting this attribution violates the CC-BY 4.0 license terms, which is an IP compliance issue — particularly relevant if the platform is eventually monetized (AdSense is already present).

A secondary violation risk: basemap.at attribution requires the data source to be credited on every derivative work. An article page that displays a generated map image must also show the attribution text on the page, since a generated PNG cannot contain a hyperlink.

**Why it happens:**
Developers treat basemap.at as "free to use" without reading the license terms carefully. The CC-BY attribution requirement is easy to miss when tiles are fetched without an API key (no key = no account = no terms-of-service reminder).

**How to avoid:**
1. Burn attribution text into every generated image using sharp's `composite` with a text overlay, or add a semi-transparent attribution bar at the bottom of the composited image.
2. Use sharp to render a PNG text strip: white text "© basemap.at" on a semi-transparent black bar, composited at the bottom-left of the final image before saving to Blob.
3. On article pages displaying the map image, render `<figcaption>Kartendaten: <a href="https://basemap.at">basemap.at</a></figcaption>` beneath the image — this satisfies the hyperlink requirement that cannot be met in the image itself.
4. Document the attribution requirement as a phase done-condition: the milestone is not complete until attribution is visible on all generated images and on article pages.

**Warning signs:**
- Map images display without any text attribution overlay
- Article pages show the map image but no data source credit
- Image compositing code has no step for overlaying attribution text

**Phase to address:**
Phase implementing the image compositing step — attribution overlay must be part of the initial compositing implementation, not added later.

---

### Pitfall 7: Nominatim German Umlaut and Austrian Place Name Mismatches

**What goes wrong:**
Nominatim accepts UTF-8 queries and generally handles German umlauts correctly when the query string is properly encoded. However, two failure modes exist in the Wurzelwelt pipeline:

1. **Encoding failure in the fetch call:** If article text is decoded from an RSS feed with incorrect encoding handling and umlauts are represented as HTML entities (`&ouml;`, `&auml;`, `&uuml;`) or mangled characters, passing these directly to Nominatim returns zero results. "Gr&auml;z" instead of "Graz" will not match.

2. **Austrian Bezirk name ambiguity:** Austrian district names are frequently ambiguous. "Leoben" is both a Bezirk (district) and a city within that Bezirk. "Liezen" is a Bezirk that shares its name with the principal town. Nominatim geocodes the city, not the administrative district. The resulting coordinates are correct for the city but may be at the wrong zoom level for a map showing the district.

3. **Common noun vs. place name confusion:** Location extraction from German news text will extract place names, but German common nouns are capitalized, making them easy to confuse with proper nouns. "Das Tal" (the valley) may be extracted as a place name and geocoded incorrectly.

**Why it happens:**
RSS feed parsers may return incorrectly encoded text, especially from older Austrian news sources. Location extraction without NER context conflates capitalized common nouns with place names. Nominatim's Austria coverage is strong for cities but less reliable for administrative boundaries at the Bezirk level.

**How to avoid:**
1. Normalize article text through a decode step before any location extraction: convert all HTML entities to UTF-8, strip diacritics fallback characters.
2. Append ", Österreich" or ", Steiermark" to all Nominatim queries to restrict results to Austria, reducing ambiguity and preventing matches on identically named places in Germany or Switzerland.
3. Add `countrycodes=at` parameter to all Nominatim API calls: `&countrycodes=at`.
4. For extracted locations, filter against the known 13 Bezirk names from `bundesland.config.ts` before geocoding — a confirmed Bezirk name is far more reliable than a regex-extracted string.
5. Implement a confidence threshold: if Nominatim returns multiple results or a result with a low relevance score, fall back to the article's tagged Bezirk centroid from config rather than using an uncertain geocoded location.

**Warning signs:**
- Nominatim queries returning zero results for Austrian city names
- Map images showing locations outside Austria
- Map images centered on German cities instead of Austrian places with the same name

**Phase to address:**
Phase implementing the geocoding and location extraction logic — the `countrycodes=at` parameter and Bezirk-based fallback must be in the initial implementation.

---

### Pitfall 8: basemap.at Tile Coordinate System and Zoom Level Miscalculation

**What goes wrong:**
basemap.at WMTS supports two coordinate systems: EPSG:3857 (Web Mercator, same as Google Maps and OpenStreetMap) and EPSG:31256 (Austrian national grid). Using the wrong tile matrix set causes tiles to be fetched for the wrong geographic area.

Additionally, the tile URL format for basemap.at's REST-style WMTS endpoint uses a specific path structure. Developers often reference generic WMTS documentation and construct incorrect tile URLs, resulting in HTTP 400 or 404 responses from the tile server.

Zoom level selection also has pitfalls: zoom level 13–14 is appropriate for Bezirk-level context (shows town + surrounding region). Zoom level 17–18 shows individual buildings but requires 25+ tiles for a useful area, making stitching expensive. Using the wrong zoom level produces either useless (too zoomed out, all of Austria visible) or broken (too many tiles, timeout) map images.

**Why it happens:**
basemap.at's official documentation is primarily in German and oriented toward GIS professionals. Developers adapt OpenStreetMap tile URL patterns which differ from basemap.at's WMTS conventions. WMTS tile coordinates (row, column, zoom) are specified differently than OSM's slippy map tile conventions.

**How to avoid:**
1. Use the EPSG:3857 tile matrix set exclusively — it matches the Web Mercator coordinates returned by Nominatim (lat/lon → tile x/y calculation uses the standard OSM slippy map formula).
2. The correct basemap.at tile URL pattern:
   `https://mapsneu.wien.gv.at/basemap/{layer}/normal/google3857/{zoom}/{y}/{x}.{format}`
   Note: y comes before x in basemap.at's path structure (TMS convention), which is the inverse of many other tile services.
3. Default to zoom level 13 for Bezirk-level maps (town in context, ~3×3 tile grid). Zoom 14 for city-center detail. Never exceed zoom 15 for generated article headers.
4. Validate tile coordinates: for any location in Austria, valid zoom 13 tile x values are roughly 4300–4500 and y values are roughly 2750–2900. Values outside this range indicate a coordinate calculation error.

**Warning signs:**
- HTTP 404 responses from basemap.at tile fetch calls
- Generated images showing sea, water, or land far outside Austria
- Tile fetch succeeds but stitched image is visually scrambled (x/y transposition)

**Phase to address:**
Phase implementing tile fetching — include a coordinate validation test with known Graz coordinates before writing stitching logic.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Call Nominatim inline in ingestion pipeline without caching | Simpler code | IP ban risk; geocoding same place repeatedly; blocks article creation | Never — always check DB cache first |
| Skip attribution overlay on map images | Faster compositing code | CC-BY license violation; legal risk if platform is monetized | Never |
| Store raw tile images in Blob alongside final composites | Easier debugging | Exhausts 250 MB Hobby limit faster; tiles are reproducible from basemap.at on demand | Never in production |
| In-process Node.js rate limiter for Nominatim | Simple to implement | Does not work across concurrent Vercel invocations; provides false safety | Never — use DB-backed queue |
| Hardcode zoom level 14 for all articles | Fewer decisions | Cities and villages look wrong at the same zoom level; a major city needs lower zoom for context | Only as starting default, with per-size adjustment planned |
| Run map image generation synchronously in cron | Simpler pipeline | Cron timeout risk; map failure blocks article creation | Never — isolate as best-effort step |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Nominatim | No User-Agent header set | Always set `User-Agent: Wurzelwelt/1.0 (regionalprojekt.vercel.app)` in every fetch call |
| Nominatim | No `countrycodes=at` filter | Add `&countrycodes=at` to restrict results to Austria and prevent false matches on German cities |
| Nominatim | Geocoding the same location on every article | Cache geocoding results in Postgres by normalized place name; only call API for cache misses |
| basemap.at | Using x/y in wrong order | basemap.at REST path is `/{zoom}/{y}/{x}` — y before x, matching TMS convention |
| basemap.at | Using EPSG:31256 tile matrix set | Use EPSG:3857 (google3857) which matches Nominatim's lat/lon output |
| sharp | Installing on macOS without Linux optional dependency | Add `@img/sharp-linux-x64` to `optionalDependencies` in `package.json` |
| sharp | Loading all tiles into memory before compositing | Pipe tile fetches through sharp stream rather than buffering all tiles first |
| Vercel Blob | Writing every intermediate artifact | Write only the final composited image; intermediate tiles are discarded |
| Vercel Blob | No cleanup strategy | Implement periodic cleanup of images for articles older than 90 days |
| Ingestion pipeline | Awaiting map generation before saving article | Wrap in try/catch; save article regardless; `mapImageUrl` defaults to `null` |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Sequential tile fetches (await each tile) | Map generation takes 2–4 seconds instead of 300ms | Use `Promise.all` to fetch all tiles in parallel | Any tile grid larger than 1×1 |
| Fetching high-resolution tiles (zoom 16+) at 3×3 grid | 9 tiles × 512KB each = 4.5 MB in memory; compositing OOM or timeout | Limit to zoom 13–14; 256px tiles; 3×3 grid max = ~500 KB total | Always — Hobby plan 10 sec default timeout |
| Reprocessing all articles for map images on each cron run | Nominatim rate limit exhaustion; redundant tile fetches | Only process articles with `mapImageUrl = null` | After ~5 articles if no status check |
| Storing full-resolution composited JPEG (1200×675px) | ~400 KB per image; hits 250 MB Blob limit in ~600 articles | Optimize: 800×450px, JPEG 75%, progressive | After ~12 months of daily article generation |
| Calling Nominatim for every location mention in article text | Multiple API calls per article; rate limit hit on any non-trivial run | Extract primary location only; check DB cache; call API at most once per article | On any article mentioning more than 1 place name |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing Vercel Blob token in client-side code | Unauthorized Blob writes; storage exhaustion | Blob token must only be used in server-side API routes, never in `NEXT_PUBLIC_` variables |
| Unvalidated location string passed to Nominatim query | SSRF-style URL injection if location is not sanitized (low risk, but query is user-visible in logs) | Sanitize extracted location text: strip URL metacharacters, limit length to 100 chars before encoding |
| No rate limiting on the on-demand map image API route (`/api/map-image`) | The route fetches from basemap.at and calls Nominatim; a crawler hitting it exhausts both limits | Add request signature verification (e.g., HMAC of article ID, consistent with existing CRON_SECRET pattern) or rate limit by IP |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Map image generation failure shows broken image placeholder | Article header looks broken; degrades editorial quality | Always fall back to the existing gradient fallback if `mapImageUrl = null`; never show broken `<img>` |
| Map centered on wrong location (geocoding error) | Article about Leoben shows map of a German city | Show the article's tagged Bezirk centroid from config as fallback when geocoding confidence is low |
| Attribution text overlaid too small to read on mobile | CC-BY license technically satisfied but practically invisible | Minimum 11px font size in attribution overlay; semi-transparent background ensures contrast |
| Map image shows very generic Austria-wide view (wrong zoom) | Map provides no useful geographic context | Validate that the geocoded coordinates fall within the article's tagged Bezirk bounding box; if not, use Bezirk centroid |
| CMS map image picker shows no preview before saving | Editor selects wrong crop or wrong location without feedback | Show a preview thumbnail in the CMS before saving the map image URL to the article |

---

## "Looks Done But Isn't" Checklist

- [ ] **sharp binary:** Deploy to Vercel and confirm `@img/sharp-linux-x64` loads correctly — test with a live map generation request, not just a local build
- [ ] **Nominatim User-Agent:** Verify all Nominatim fetch calls include the custom User-Agent header in Vercel function logs
- [ ] **Nominatim cache:** Confirm that geocoding the same place name twice does not produce two API calls — check DB for cached geocoding rows
- [ ] **Attribution overlay:** Open a generated map image and confirm "© basemap.at" text is visible on the image itself
- [ ] **Attribution on article page:** Verify that article pages displaying a map image also render a `<figcaption>` with a link to basemap.at
- [ ] **Pipeline isolation:** Simulate a Nominatim failure (return 503) and confirm the article is still saved with `mapImageUrl = null` — not with an error status
- [ ] **Blob cleanup:** Confirm a cleanup strategy exists (manual, cron, or TTL) before Blob usage approaches 200 MB
- [ ] **Tile coordinate order:** Generate a map for Graz (47.07°N, 15.43°E) and confirm the tile shows Graz, not an ocean or foreign location
- [ ] **Cron timeout:** Set `maxDuration = 60` on the cron route and confirm the pipeline completes within 45 seconds for a typical single-article run
- [ ] **Fallback to gradient:** Set `mapImageUrl = null` on an article and confirm the article header renders the gradient fallback, not a broken image

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Nominatim IP ban | HIGH | Contact OSM Operations (ops@osmfoundation.org); implement DB-backed cache and queue before resuming; consider switching to Photon geocoder |
| sharp binary error on Vercel | LOW | Add `@img/sharp-linux-x64` to `optionalDependencies`; redeploy; no data loss |
| Cron timeout with map generation | LOW | Add `maxDuration = 60`; decouple map generation to separate step; redeploy |
| Vercel Blob storage blocked | MEDIUM | Delete old blobs via Vercel dashboard or API to get under 250 MB; implement cleanup cron; articles show gradient fallback during blockage |
| CC-BY attribution missing at launch | MEDIUM | Regenerate all existing map images with attribution overlay; update sharp compositing step; re-upload to Blob |
| Map images showing wrong locations | MEDIUM | Clear `mapImageUrl` for affected articles; re-run map generation with fixed coordinate logic; validate with Bezirk bounding box check |
| Blob URL rotted (image deleted externally) | LOW | On-demand map image API route regenerates and re-saves; article page requests regeneration on broken image |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| sharp Linux binary incompatibility | Phase 1: Dependency setup | Live Vercel deployment test with map generation request before any other phases |
| Pipeline failure blocking article creation | Phase 1: Pipeline integration design | Simulate Nominatim 503; confirm article saves with mapImageUrl null |
| Nominatim IP ban from burst requests | Phase 2: Geocoding implementation | DB cache check in place before any Nominatim call; confirm no burst on test run |
| Nominatim missing User-Agent | Phase 2: Geocoding implementation | Inspect fetch headers in Vercel logs |
| German umlaut / Austrian place name mismatch | Phase 2: Geocoding implementation | countrycodes=at parameter present; test with "Graz", "Bruck an der Mur", "Leoben" |
| Tile coordinate x/y order error | Phase 3: Tile fetching | Generate map for Graz coordinates; visually confirm location |
| basemap.at CC-BY attribution missing | Phase 3: Image compositing | Attribution text visible on generated image; figcaption present on article page |
| Cron timeout | Phase 4: Pipeline integration | maxDuration=60 set; single article map generation completes in <30 seconds |
| Vercel Blob storage exhaustion | Phase 4: Blob storage integration | Cleanup strategy implemented before first image written; image size <120 KB |
| Map fallback broken (no gradient on null) | Phase 5: Article page integration | Test article with mapImageUrl=null renders gradient header |

---

## Sources

- [Nominatim Usage Policy — OSM Foundation Operations](https://operations.osmfoundation.org/policies/nominatim/) — official rate limit, User-Agent requirement, ban policy (HIGH confidence)
- [Nominatim 403 error discussion — osm-search/Nominatim GitHub #3801](https://github.com/osm-search/Nominatim/discussions/3801) — community confirmed ban triggers (MEDIUM confidence)
- [sharp installation — official docs](https://sharp.pixelplumbing.com/install/) — Linux binary installation requirement (HIGH confidence)
- [Could not load sharp module linux-x64 — vercel/vercel GitHub #11052](https://github.com/vercel/vercel/issues/11052) — confirmed Vercel-specific binary issue (HIGH confidence)
- [Vercel Functions Memory — official docs](https://vercel.com/docs/functions/configuring-functions/memory) — Hobby plan 2 GB default, not configurable (HIGH confidence)
- [Vercel Functions Limits — official docs](https://vercel.com/docs/functions/limitations) — duration limits, max 60 seconds Hobby (HIGH confidence)
- [Vercel Blob Usage and Pricing — official docs](https://vercel.com/docs/vercel-blob/usage-and-pricing) — Hobby plan 250 MB limit (HIGH confidence)
- [Vercel Blob storage blocked community thread](https://community.vercel.com/t/vercel-blob-storage-blocked-despite-usage-being-below-hobby-plan-limits/37011) — 30-day block on overage confirmed (MEDIUM confidence)
- [basemap.at dataset — data.gv.at](https://www.data.gv.at/katalog/en/dataset/basemap-at) — CC-BY 4.0 license, attribution requirement "Datenquelle: basemap.at" (MEDIUM confidence)
- [DE:AT/basemap — OpenStreetMap Wiki](https://wiki.openstreetmap.org/wiki/DE:AT/basemap) — WMTS URL structure, coordinate system support (MEDIUM confidence)
- [basemap.at Standard layer — basemap.at official](https://basemap.at/en/standard/) — tile availability, zoom levels, EPSG:3857 support (MEDIUM confidence)

---
*Pitfalls research for: v3.1 Basemap Article Images — adding basemap.at tile stitching, Nominatim geocoding, and sharp image compositing to Vercel-hosted Next.js news platform*
*Milestone: v3.1 Basemap Article Images*
*Researched: 2026-04-05*
