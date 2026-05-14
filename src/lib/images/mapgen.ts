/**
 * mapgen.ts — basemap.at tile pipeline for generating map images.
 *
 * Phase 40-01: Module skeleton with types, constants, and pure functions.
 * Phase 40-02: Implements the full generateMapImage async pipeline.
 *
 * Return shape matches UnsplashImage: { url: string; credit: string }
 * so the pipeline can treat both image sources uniformly.
 */

import sharp from 'sharp'
import { put } from '@vercel/blob'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Available basemap.at tile layers */
export type LayerName = 'bmapgrau' | 'bmapgelaende' | 'bmaporthofoto30cm'

/** Configuration for a single tile layer */
export interface LayerConfig {
  /** Tile file extension */
  ext: 'png' | 'jpeg'
  /** Maximum supported zoom level */
  maxZoom: number
}

/** Generated map image — same shape as UnsplashImage for pipeline compatibility */
export interface MapImage {
  url: string
  credit: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const TILE_SIZE = 256
export const OUTPUT_WIDTH = 1200
export const OUTPUT_HEIGHT = 630

/**
 * basemap.at tile server subdomain prefixes for round-robin load distribution.
 * Full URL: https://{server}.wien.gv.at/basemap/{layer}/normal/google3857/{z}/{y}/{x}.{ext}
 * Source: https://www.basemap.at/wmts/1.0.0/WMTSCapabilities.xml
 */
// Only 'maps.wien.gv.at' resolves; maps1-4 returned NXDOMAIN as of 2026-05-09.
export const BASEMAP_SERVERS = ['maps']

/** Layer configuration — extension and max zoom per layer */
export const LAYER_CONFIG: Record<LayerName, LayerConfig> = {
  bmapgrau: { ext: 'png', maxZoom: 19 },
  bmapgelaende: { ext: 'png', maxZoom: 19 },
  bmaporthofoto30cm: { ext: 'jpeg', maxZoom: 20 },
}

/**
 * German nature/terrain keywords → bmapgelaende (hillshade/terrain layer).
 * Match against article headline only. Case-sensitive (German nouns capitalized).
 */
export const TERRAIN_KEYWORDS = [
  'Natur',
  'Umwelt',
  'Wald',
  'Wandern',
  'Alm',
  'Landwirtschaft',
  'Klima',
  'Hochwasser',
  'Lawine',
  'Nationalpark',
]

/**
 * German infrastructure keywords → bmaporthofoto30cm (aerial photo layer).
 * Checked BEFORE terrain keywords — aerial takes priority.
 */
export const AERIAL_KEYWORDS = [
  'Bau',
  'Baustelle',
  'Straße',
  'Brücke',
  'Tunnel',
  'Verkehr',
  'Autobahn',
  'Gebäude',
  'Abriss',
  'Sanierung',
]

/** Zoom levels by OSM location_type — implements MAP-04 */
export const ZOOM_BY_LOCATION_TYPE: Record<string, number> = {
  city: 12,
  town: 13,
  village: 14,
  street: 15,
}

/** Default zoom when location type is unknown or undefined */
const DEFAULT_ZOOM = 13

// ---------------------------------------------------------------------------
// Round-robin server state
// ---------------------------------------------------------------------------

let _serverIndex = 0

// ---------------------------------------------------------------------------
// Pure functions
// ---------------------------------------------------------------------------

/**
 * Convert geographic coordinates to OSM tile numbers using Spherical Mercator.
 * Formula from: https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
 *
 * @param lat - Latitude in decimal degrees
 * @param lon - Longitude in decimal degrees
 * @param zoom - Zoom level (integer)
 * @returns Tile grid coordinates { x, y }
 */
export function latLonToTile(lat: number, lon: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom)
  const x = Math.floor(((lon + 180) / 360) * n)
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n)
  return { x, y }
}

/**
 * Select the most appropriate basemap.at layer based on article headline keywords.
 *
 * Priority: aerial (infrastructure) > terrain (nature) > greyscale (default)
 *
 * @param headline - Article headline (checked for German keywords, case-sensitive)
 * @returns Layer name for tile requests
 */
export function selectLayer(headline: string): LayerName {
  // Check aerial keywords first — infrastructure takes priority over terrain
  for (const keyword of AERIAL_KEYWORDS) {
    if (headline.includes(keyword)) {
      return 'bmaporthofoto30cm'
    }
  }

  // Check terrain keywords
  for (const keyword of TERRAIN_KEYWORDS) {
    if (headline.includes(keyword)) {
      return 'bmapgelaende'
    }
  }

  // Default: greyscale — editorial/muted feel for politics, culture, etc.
  return 'bmapgrau'
}

/**
 * Select appropriate zoom level for a given OSM location type.
 * Implements MAP-04: city→12, town→13, village→14, street→15.
 *
 * @param locationType - OSM place type string (optional)
 * @returns Zoom level integer
 */
export function selectZoom(locationType?: string): number {
  if (locationType === undefined) return DEFAULT_ZOOM
  return ZOOM_BY_LOCATION_TYPE[locationType] ?? DEFAULT_ZOOM
}

/**
 * Construct a basemap.at tile URL with z/y/x path ordering.
 *
 * basemap.at uses /{layer}/{style}/{z}/{y}/{x}.{ext} — note y before x.
 * Round-robin across BASEMAP_SERVERS for load distribution.
 *
 * @param layer - Tile layer name
 * @param z - Zoom level
 * @param y - Tile Y coordinate
 * @param x - Tile X coordinate
 * @returns Full tile URL
 */
export function tileUrl(layer: LayerName, z: number, y: number, x: number): string {
  const server = BASEMAP_SERVERS[_serverIndex % BASEMAP_SERVERS.length]
  _serverIndex++
  const { ext } = LAYER_CONFIG[layer]
  // basemap.at URL pattern: /{z}/{TileRow}/{TileCol} = z/y/x (y before x — non-standard)
  // Source: https://www.basemap.at/wmts/1.0.0/WMTSCapabilities.xml
  return `https://${server}.wien.gv.at/basemap/${layer}/normal/google3857/${z}/${y}/${x}.${ext}`
}

// ---------------------------------------------------------------------------
// Attribution SVG — path-based "© basemap.at" overlay (no <text> elements)
//
// Rendered as pre-outlined glyph paths to avoid system font dependency on
// Vercel lambda environments. Bottom-right strip with dark semi-transparent
// background and white path glyphs.
//
// Glyph path data generated from a 18px sans-serif font trace.
// Glyphs: © (copyright), space, b, a, s, e, m, p, ., a, t
// ---------------------------------------------------------------------------

/**
 * Build a "© basemap.at" attribution SVG buffer for compositing.
 *
 * Returns a Buffer containing SVG XML with:
 * - Semi-transparent dark rect (rgba 0,0,0,0.6) bottom-right strip
 * - White fill path elements spelling "© basemap.at"
 * - NO <text elements (font-free for Vercel compatibility)
 *
 * @param width - Image width (used for positioning bottom-right)
 * @param height - Image height (used for positioning bottom-right)
 * @returns SVG as a Buffer
 */
export function buildAttributionSvg(width: number, height: number): Buffer {
  // Strip dimensions: 228px wide, 28px tall, positioned bottom-right with 4px padding
  const stripW = 228
  const stripH = 28
  const stripX = width - stripW - 4
  const stripY = height - stripH - 4

  // Glyph baseline at stripY + 20 (18px cap height + 2px top padding)
  const baseline = stripY + 20
  // Left edge of text starts 6px from strip left
  const textLeft = stripX + 6

  // Pre-outlined glyph paths for "© basemap.at" at ~18px size
  // Each glyph is defined relative to (0, 0) at its left edge / baseline
  // Paths use SVG path data notation (absolute coords after translation)

  // Helper: translate a path string by (dx, dy)
  // We embed translated paths directly for each character
  function glyph(paths: string[]): string {
    return paths.join(' ')
  }

  // Cursor tracks current x position as we add glyphs
  let cx = textLeft

  // © symbol (copyright) — circle with C inside, ~14px wide
  // Simplified: outer ring + inner C arc approximated with bezier paths
  const copyrightPaths = buildCopyrightGlyph(cx, baseline)
  cx += 16

  // space
  cx += 5

  // "b"
  const bPaths = buildGlyphB(cx, baseline)
  cx += 10

  // "a"
  const aPaths1 = buildGlyphA(cx, baseline)
  cx += 9

  // "s"
  const sPaths = buildGlyphS(cx, baseline)
  cx += 8

  // "e"
  const ePaths = buildGlyphE(cx, baseline)
  cx += 9

  // "m"
  const mPaths = buildGlyphM(cx, baseline)
  cx += 14

  // "a"
  const aPaths2 = buildGlyphA(cx, baseline)
  cx += 9

  // "p"
  const pPaths = buildGlyphP(cx, baseline)
  cx += 10

  // "."
  const dotPaths1 = buildGlyphDot(cx, baseline)
  cx += 5

  // "a"
  const aPaths3 = buildGlyphA(cx, baseline)
  cx += 9

  // "t"
  const tPaths = buildGlyphT(cx, baseline)
  cx += 7

  // Combine all path data
  const allPaths = [
    copyrightPaths,
    bPaths,
    aPaths1,
    sPaths,
    ePaths,
    mPaths,
    aPaths2,
    pPaths,
    dotPaths1,
    aPaths3,
    tPaths,
  ]
    .filter(Boolean)
    .join('\n    ')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect x="${stripX}" y="${stripY}" width="${stripW}" height="${stripH}" fill="rgba(0,0,0,0.6)" rx="3"/>
  ${allPaths}
</svg>`

  return Buffer.from(svg, 'utf8')
}

// ---------------------------------------------------------------------------
// Glyph builders — each returns an SVG <path> string
// Coordinate system: x is left edge, y is baseline
// All glyphs ~18px cap height, 2px stroke width paths
// ---------------------------------------------------------------------------

/** © copyright symbol — circle ring with open C */
function buildCopyrightGlyph(x: number, baseline: number): string {
  const cx = x + 7
  const cy = baseline - 8
  // Outer circle approximated with 4 cubic bezier arcs, radius 7
  const r = 7
  // Inner C arc radius 4
  const ir = 4
  // Outer ring as path
  const outerRing = `M ${cx - r},${cy} a${r},${r} 0 1,0 ${r * 2},0 a${r},${r} 0 1,0 -${r * 2},0`
  // Fill ring (stroke simulation): use two nested paths with fill-rule evenodd
  // For simplicity use a slightly smaller inner circle
  const r2 = r - 1.5
  const innerRing = `M ${cx - r2},${cy} a${r2},${r2} 0 1,0 ${r2 * 2},0 a${r2},${r2} 0 1,0 -${r2 * 2},0`
  // Inner C letter — arc from ~45deg to ~315deg (leaving gap on right)
  const cPath = `M ${cx + ir * 0.7},${cy - ir * 0.7} a${ir},${ir} 0 1,0 0,${ir * 1.4}`
  const cStroke = `<path d="${cPath}" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round"/>`
  return `<path d="${outerRing} ${innerRing}" fill="white" fill-rule="evenodd"/>
  ${cStroke}`
}

/** "b" — vertical stem + right bowl */
function buildGlyphB(x: number, baseline: number): string {
  const top = baseline - 14
  const mid = baseline - 7
  // Stem
  const stem = `M ${x + 1},${top} L ${x + 1},${baseline}`
  // Upper bowl (top half of b)
  const bowl1 = `M ${x + 1},${top + 2} Q ${x + 10},${top + 2} ${x + 10},${top + 5} Q ${x + 10},${mid} ${x + 1},${mid}`
  // Lower bowl (lower half of b) — the main bowl of lowercase b
  const bowl2 = `M ${x + 1},${mid} Q ${x + 11},${mid} ${x + 11},${baseline - 3.5} Q ${x + 11},${baseline} ${x + 1},${baseline}`
  const d = `${stem} ${bowl1} ${bowl2}`
  return `<path d="${d}" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`
}

/** "a" — oval + right stem */
function buildGlyphA(x: number, baseline: number): string {
  const top = baseline - 10
  const midY = baseline - 5
  // Oval (counter-clockwise from bottom-right)
  const oval = `M ${x + 8},${baseline} Q ${x + 8},${top} ${x + 4},${top} Q ${x},${top} ${x},${midY} Q ${x},${baseline} ${x + 4},${baseline} Q ${x + 8},${baseline} ${x + 8},${baseline - 3}`
  // Right stem
  const stem = `M ${x + 8},${top + 2} L ${x + 8},${baseline}`
  return `<path d="${oval} ${stem}" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`
}

/** "s" — double reverse-C shape */
function buildGlyphS(x: number, baseline: number): string {
  const top = baseline - 10
  const mid = baseline - 5
  const d = `M ${x + 7},${top + 1.5} Q ${x},${top} ${x},${top + 3} Q ${x},${mid} ${x + 7},${mid} Q ${x + 7.5},${mid} ${x + 7.5},${baseline - 3} Q ${x + 7.5},${baseline} ${x},${baseline - 1.5}`
  return `<path d="${d}" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`
}

/** "e" — circle with horizontal bar cutting through middle */
function buildGlyphE(x: number, baseline: number): string {
  const cy = baseline - 5
  const r = 5
  // Circle with open right side (from midpoint rightward)
  const arc = `M ${x + r},${cy} a${r},${r} 0 1,0 ${r * 0.7},${r * 0.7}`
  // Horizontal bar through middle
  const bar = `M ${x},${cy} L ${x + r * 2},${cy}`
  return `<path d="${arc}" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
  <path d="${bar}" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round"/>`
}

/** "m" — two arches */
function buildGlyphM(x: number, baseline: number): string {
  const top = baseline - 10
  // Left arch
  const arch1 = `M ${x + 1},${top} Q ${x + 1},${top - 1} ${x + 4},${top} Q ${x + 7},${top} ${x + 7},${top + 3} L ${x + 7},${baseline}`
  // Right arch
  const arch2 = `M ${x + 7},${top + 1} Q ${x + 7},${top - 1} ${x + 10},${top} Q ${x + 13},${top} ${x + 13},${top + 3} L ${x + 13},${baseline}`
  // Left stem
  const stem = `M ${x + 1},${top} L ${x + 1},${baseline}`
  return `<path d="${stem} ${arch1} ${arch2}" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`
}

/** "p" — vertical stem (descends below baseline) + right bowl */
function buildGlyphP(x: number, baseline: number): string {
  const top = baseline - 10
  const mid = baseline - 5
  // Stem (extends below baseline for descender)
  const stem = `M ${x + 1},${top} L ${x + 1},${baseline + 4}`
  // Bowl
  const bowl = `M ${x + 1},${top + 1} Q ${x + 11},${top + 1} ${x + 11},${mid} Q ${x + 11},${baseline} ${x + 1},${baseline}`
  return `<path d="${stem} ${bowl}" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`
}

/** "." — small filled circle */
function buildGlyphDot(x: number, baseline: number): string {
  return `<circle cx="${x + 1.5}" cy="${baseline - 1}" r="1.5" fill="white"/>`
}

/** "t" — vertical stem + horizontal crossbar */
function buildGlyphT(x: number, baseline: number): string {
  const top = baseline - 13
  const crossY = baseline - 9
  // Stem with slight curve at bottom
  const stem = `M ${x + 3},${top} L ${x + 3},${baseline - 1} Q ${x + 3},${baseline} ${x + 4},${baseline}`
  // Crossbar
  const cross = `M ${x},${crossY} L ${x + 6},${crossY}`
  return `<path d="${stem} ${cross}" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`
}

// ---------------------------------------------------------------------------
// Tile fetching — HTTP fetch with 5xx retry
// ---------------------------------------------------------------------------

/**
 * Fetch a single tile with one retry on HTTP 5xx errors.
 *
 * - HTTP 200: return Buffer
 * - HTTP 5xx: wait 500ms and retry once; throw on second failure
 * - HTTP 4xx: throw immediately (no retry — client error)
 * - Network error: throw immediately
 *
 * @param url - Full tile URL
 * @returns Buffer containing raw tile image data
 */
export async function fetchTileWithRetry(url: string): Promise<Buffer> {
  async function attempt(): Promise<Buffer> {
    const res = await fetch(url)
    if (res.ok) {
      return Buffer.from(await res.arrayBuffer())
    }
    if (res.status >= 400 && res.status < 500) {
      // 4xx: client error — no retry
      throw new Error(`Tile fetch HTTP ${res.status}: ${url}`)
    }
    // 5xx: server error — signal for retry
    throw new ServerError(`Tile fetch HTTP ${res.status}: ${url}`)
  }

  try {
    return await attempt()
  } catch (err) {
    if (err instanceof ServerError) {
      // Wait 500ms then retry once
      await new Promise((resolve) => setTimeout(resolve, 500))
      return await attempt()
    }
    throw err
  }
}

/** Sentinel error class for HTTP 5xx responses (triggers retry) */
class ServerError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ServerError'
  }
}

// ---------------------------------------------------------------------------
// Tile grid fetching — concurrent 5x3 grid
// ---------------------------------------------------------------------------

/**
 * Fetch a rectangular grid of tiles centered on (cx, cy).
 *
 * Grid extends from cx-floor(cols/2) to cx+floor(cols/2) in x,
 * and cy-floor(rows/2) to cy+floor(rows/2) in y.
 * All tiles fetched concurrently via Promise.all.
 *
 * @param layer - Tile layer name
 * @param zoom - Zoom level
 * @param cx - Center tile x coordinate
 * @param cy - Center tile y coordinate
 * @param cols - Number of columns (must be odd for symmetric grid)
 * @param rows - Number of rows (must be odd for symmetric grid)
 * @returns 2D array of tile Buffers: result[row][col]
 */
export async function fetchTileGrid(
  layer: LayerName,
  zoom: number,
  cx: number,
  cy: number,
  cols: number,
  rows: number,
): Promise<Buffer[][]> {
  const halfCols = Math.floor(cols / 2)
  const halfRows = Math.floor(rows / 2)

  const rowPromises = []
  for (let dy = -halfRows; dy <= halfRows; dy++) {
    const y = cy + dy
    const colPromises = []
    for (let dx = -halfCols; dx <= halfCols; dx++) {
      const x = cx + dx
      const url = tileUrl(layer, zoom, y, x)
      colPromises.push(fetchTileWithRetry(url))
    }
    rowPromises.push(Promise.all(colPromises))
  }

  return Promise.all(rowPromises)
}

// ---------------------------------------------------------------------------
// Image stitching — composite tile grid to 1200x630 JPEG
// ---------------------------------------------------------------------------

/**
 * Stitch a tile grid into a center-cropped 1200x630 JPEG with attribution.
 *
 * Process (3 sharp passes to work around pipeline limitations):
 * 1. Create blank canvas (cols*256 x rows*256), composite all tiles
 * 2. Resize/crop to 1200x630 (cover, centre)
 * 3. Composite attribution SVG, encode JPEG quality 80
 *
 * @param tiles - 2D array of tile Buffers (rows x cols)
 * @param cols - Number of tile columns
 * @param rows - Number of tile rows
 * @returns JPEG Buffer at 1200x630, quality 80
 */
async function stitchTiles(tiles: Buffer[][], cols: number, rows: number): Promise<Buffer> {
  const canvasW = cols * TILE_SIZE
  const canvasH = rows * TILE_SIZE

  // Build composite inputs: [{input: Buffer, left: x, top: y}, ...]
  const compositeInputs: sharp.OverlayOptions[] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      compositeInputs.push({
        input: tiles[row][col],
        left: col * TILE_SIZE,
        top: row * TILE_SIZE,
      })
    }
  }

  // Step 1: blank canvas + composite tiles → encode as PNG for next step
  const stitched = await sharp({
    create: {
      width: canvasW,
      height: canvasH,
      channels: 3,
      background: { r: 200, g: 200, b: 200 },
    },
  })
    .composite(compositeInputs)
    .png()
    .toBuffer()

  // Step 2: resize/crop to 1200x630 → encode as PNG for next step
  const cropped = await sharp(stitched)
    .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer()

  // Step 3: composite attribution + encode JPEG q80
  const attribution = buildAttributionSvg(OUTPUT_WIDTH, OUTPUT_HEIGHT)
  return sharp(cropped)
    .composite([{ input: attribution }])
    .jpeg({ quality: 80 })
    .toBuffer()
}

// ---------------------------------------------------------------------------
// Blob upload
// ---------------------------------------------------------------------------

/**
 * Upload a JPEG image buffer to Vercel Blob storage.
 *
 * Path pattern: `maps/${prefix}-${id}.jpg` where prefix defaults to `'article'`.
 * The `|| 'article'` guard covers BOTH undefined and empty-string inputs —
 * a JS default parameter (`pathPrefix: string = 'article'`) would only fire
 * on undefined, leaving `''` to produce the broken path `maps/-{id}.jpg`.
 *
 * @param id - Entity ID used in the storage path
 * @param imageBuffer - JPEG image buffer
 * @param pathPrefix - Optional Blob path prefix; falls back to `'article'`
 *   when undefined OR empty string. Phase 46 introduces `'doctor'` for
 *   doctor-directory maps; existing article callers pass nothing.
 * @returns Public URL of the uploaded blob
 */
async function uploadToBlob(
  id: number,
  imageBuffer: Buffer,
  pathPrefix?: string,
): Promise<string> {
  // `||` not `??` — empty string MUST also fall back to 'article' so a misuse
  // like `{ pathPrefix: '' }` cannot produce the broken path `maps/-{id}.jpg`.
  const prefix = pathPrefix || 'article'
  const blob = await put(`maps/${prefix}-${id}.jpg`, imageBuffer, {
    access: 'public',
    contentType: 'image/jpeg',
    allowOverwrite: true,
  } as Parameters<typeof put>[2])
  return blob.url
}

// ---------------------------------------------------------------------------
// generateMapImage — full pipeline
// ---------------------------------------------------------------------------

/**
 * Generate a map image for an entity (article by default, or e.g. doctor) and
 * upload to Vercel Blob.
 *
 * Full pipeline:
 * 1. Auto-select zoom via selectZoom(locationType) — MAP-04
 * 2. Convert lat/lon to center tile coordinates
 * 3. Select layer from headline keywords
 * 4. Fetch 5x3 tile grid concurrently
 * 5. Stitch tiles, crop to 1200x630, overlay attribution
 * 6. Upload JPEG to Vercel Blob at `maps/${options.pathPrefix || 'article'}-${id}.jpg`
 * 7. Return { url, credit: '© basemap.at' }
 *
 * Any failure returns null (does not throw). Failures are logged via console.warn.
 *
 * @param lat - Location latitude
 * @param lon - Location longitude
 * @param headline - Headline (for layer selection)
 * @param id - Entity ID (for Blob path naming)
 * @param locationType - OSM place type (for zoom selection via MAP-04)
 * @param options - Optional Blob path config:
 *   - `pathPrefix`: namespace under `maps/` (e.g. `'doctor'`). Defaults to
 *     `'article'`. Empty string ALSO falls back to `'article'` via the
 *     `|| 'article'` guard in `uploadToBlob` — a JS default-param would
 *     only catch `undefined`, leaving `''` to produce `maps/-{id}.jpg`.
 * @returns MapImage with url and credit, or null on any failure
 */
export async function generateMapImage(
  lat: number,
  lon: number,
  headline: string,
  id: number,
  locationType?: string,
  options?: { pathPrefix?: string },
): Promise<MapImage | null> {
  try {
    // 1. Select zoom level based on location type (MAP-04)
    const zoom = selectZoom(locationType)

    // 2. Calculate center tile coordinates
    const { x: cx, y: cy } = latLonToTile(lat, lon, zoom)

    // 3. Select tile layer from headline keywords
    const layer = selectLayer(headline)

    // 4. Fetch 5x3 tile grid (1280x768 raw canvas)
    const tiles = await fetchTileGrid(layer, zoom, cx, cy, 5, 3)

    // 5. Stitch, crop to 1200x630, overlay attribution SVG
    const imageBuffer = await stitchTiles(tiles, 5, 3)

    // 6. Upload to Vercel Blob — `uploadToBlob` applies `|| 'article'` fallback
    const url = await uploadToBlob(id, imageBuffer, options?.pathPrefix)

    // 7. Return result
    return { url, credit: '© basemap.at' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[mapgen] id=${id} -- ${msg} -- lat=${lat} lon=${lon}`)
    return null
  }
}
