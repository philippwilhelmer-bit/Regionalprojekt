/**
 * Tests for mapgen.ts — basemap.at tile pipeline module.
 *
 * Plan 40-01: Pure function tests + Sharp smoke test.
 * Plan 40-02: Async tile-fetch, stitching, Blob upload, and generateMapImage behaviors.
 */

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import {
  latLonToTile,
  selectLayer,
  selectZoom,
  tileUrl,
  buildAttributionSvg,
  generateMapImage,
  fetchTileWithRetry,
  fetchTileGrid,
} from './mapgen'

// ---------------------------------------------------------------------------
// latLonToTile — Spherical Mercator tile coordinate math
// ---------------------------------------------------------------------------
describe('latLonToTile', () => {
  it('returns correct tile for Graz at zoom 13', () => {
    // Verified via OSM Slippy Map formula: lat=47.07, lon=15.43, zoom=13
    // https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
    const result = latLonToTile(47.07, 15.43, 13)
    expect(result).toEqual({ x: 4447, y: 2879 })
  })

  it('returns correct tile for Vienna at zoom 13', () => {
    // Verified via OSM Slippy Map formula: lat=48.21, lon=16.37, zoom=13
    const result = latLonToTile(48.21, 16.37, 13)
    expect(result).toEqual({ x: 4468, y: 2840 })
    // Vienna is north and east of Graz — x is higher, y is lower (tile y increases southward)
    expect(result.x).toBeGreaterThan(4447) // Graz x
    expect(result.y).toBeLessThan(2879)    // Graz y
  })
})

// ---------------------------------------------------------------------------
// selectLayer — keyword-based layer selection
// ---------------------------------------------------------------------------
describe('selectLayer', () => {
  it('returns aerial layer for article with aerial keyword "Brücke"', () => {
    expect(selectLayer('Neue Brücke über die Mur')).toBe('bmaporthofoto30cm')
  })

  it('returns terrain layer for article with terrain keywords "Wandern" and "Nationalpark"', () => {
    expect(selectLayer('Wandern im Nationalpark Gesäuse')).toBe('bmapgelaende')
  })

  it('returns default greyscale layer when no keywords match', () => {
    expect(selectLayer('Gemeinderatswahl in Graz')).toBe('bmapgrau')
  })

  it('returns aerial layer (checked first) when headline has both aerial and terrain keywords', () => {
    // "Hochwasser" is a terrain keyword, "Verkehr" is an aerial keyword
    expect(selectLayer('Hochwasser und Verkehr')).toBe('bmaporthofoto30cm')
  })

  it('returns greyscale for empty headline', () => {
    expect(selectLayer('')).toBe('bmapgrau')
  })
})

// ---------------------------------------------------------------------------
// selectZoom — location type to zoom level mapping
// ---------------------------------------------------------------------------
describe('selectZoom', () => {
  it('returns 12 for city', () => {
    expect(selectZoom('city')).toBe(12)
  })

  it('returns 13 for town', () => {
    expect(selectZoom('town')).toBe(13)
  })

  it('returns 14 for village', () => {
    expect(selectZoom('village')).toBe(14)
  })

  it('returns 15 for street', () => {
    expect(selectZoom('street')).toBe(15)
  })

  it('returns default 13 for unknown location type', () => {
    expect(selectZoom('hamlet')).toBe(13)
  })

  it('returns default 13 when locationType is undefined', () => {
    expect(selectZoom(undefined)).toBe(13)
  })
})

// ---------------------------------------------------------------------------
// tileUrl — URL construction for basemap.at tile service
// ---------------------------------------------------------------------------
describe('tileUrl', () => {
  it('uses z/y/x ordering in URL (not z/x/y)', () => {
    // Tile y=2879, x=4447 for Graz — URL must have /13/2879/4447 (y before x)
    const url = tileUrl('bmapgrau', 13, 2879, 4447)
    expect(url).toMatch(/\/13\/2879\/4447/)
  })

  it('does NOT use z/x/y ordering', () => {
    // If x/y were swapped, we'd get /13/4447/2879 — this must not happen
    const url = tileUrl('bmapgrau', 13, 2879, 4447)
    expect(url).not.toMatch(/\/13\/4447\/2879/)
  })

  it('produces a wien.gv.at/basemap URL (basemap.at official tile service)', () => {
    // basemap.at tiles are served from maps*.wien.gv.at/basemap/...
    // Source: https://www.basemap.at/wmts/1.0.0/WMTSCapabilities.xml
    const url = tileUrl('bmapgrau', 13, 2879, 4447)
    expect(url).toMatch(/wien\.gv\.at\/basemap/)
  })

  it('uses different servers for round-robin (calling multiple times)', () => {
    // Call enough times to cycle through all 5 servers (maps, maps1–maps4)
    const urls = Array.from({ length: 10 }, (_, i) => tileUrl('bmapgrau', 13, 2879, 4447 + i))
    // Extract subdomain (maps, maps1, maps2, maps3, maps4)
    const servers = urls.map((u) => {
      const match = u.match(/https:\/\/(maps\d?)\.wien/)
      return match ? match[1] : null
    })
    // There should be variation in server subdomains (not all the same)
    const uniqueServers = new Set(servers.filter(Boolean))
    expect(uniqueServers.size).toBeGreaterThan(1)
  })
})

// ---------------------------------------------------------------------------
// buildAttributionSvg — SVG buffer for "© basemap.at" attribution overlay
// ---------------------------------------------------------------------------
describe('buildAttributionSvg', () => {
  it('returns a Buffer', () => {
    const buf = buildAttributionSvg(1200, 630)
    expect(Buffer.isBuffer(buf)).toBe(true)
  })

  it('contains valid SVG root element', () => {
    const svg = buildAttributionSvg(1200, 630).toString('utf8')
    expect(svg).toContain('<svg')
  })

  it('does NOT contain <text elements (font-free requirement)', () => {
    const svg = buildAttributionSvg(1200, 630).toString('utf8')
    expect(svg).not.toContain('<text')
  })

  it('contains <path or <rect elements (path-based rendering)', () => {
    const svg = buildAttributionSvg(1200, 630).toString('utf8')
    const hasPath = svg.includes('<path')
    const hasRect = svg.includes('<rect')
    expect(hasPath || hasRect).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Sharp smoke test — confirms binary loads and can produce JPEG
// ---------------------------------------------------------------------------
describe('sharp smoke test', () => {
  it('can create a 1200x630 JPEG buffer from a blank canvas', async () => {
    const sharp = (await import('sharp')).default
    const buf = await sharp({
      create: {
        width: 1200,
        height: 630,
        channels: 3,
        background: { r: 200, g: 200, b: 200 },
      },
    })
      .jpeg({ quality: 80 })
      .toBuffer()

    expect(Buffer.isBuffer(buf)).toBe(true)
    expect(buf.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Minimal valid PNG buffer helper (1x1 white pixel PNG)
// ---------------------------------------------------------------------------
let minimalPng: Buffer

beforeAll(async () => {
  const sharp = (await import('sharp')).default
  minimalPng = await sharp({
    create: { width: 256, height: 256, channels: 3, background: { r: 200, g: 200, b: 200 } },
  })
    .png()
    .toBuffer()
})

// ---------------------------------------------------------------------------
// fetchTileWithRetry — single tile fetching with retry on 5xx
// ---------------------------------------------------------------------------
describe('fetchTileWithRetry', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns Buffer on HTTP 200', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => minimalPng.buffer.slice(
        minimalPng.byteOffset,
        minimalPng.byteOffset + minimalPng.byteLength
      ),
    })
    vi.stubGlobal('fetch', mockFetch)

    const result = await fetchTileWithRetry('https://maps.wien.gv.at/basemap/bmapgrau/normal/google3857/13/2879/4447.png')
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('retries once after 500ms on HTTP 500 and succeeds on second attempt', async () => {
    vi.useFakeTimers()
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 500, arrayBuffer: async () => new ArrayBuffer(0) })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        arrayBuffer: async () => minimalPng.buffer.slice(
          minimalPng.byteOffset,
          minimalPng.byteOffset + minimalPng.byteLength
        ),
      })
    vi.stubGlobal('fetch', mockFetch)

    const resultPromise = fetchTileWithRetry('https://maps.wien.gv.at/basemap/bmapgrau/normal/google3857/13/2879/4447.png')
    // Advance 500ms timer so retry fires
    await vi.advanceTimersByTimeAsync(500)
    const result = await resultPromise

    expect(Buffer.isBuffer(result)).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })

  it('throws after two consecutive 500 failures (no infinite retry)', async () => {
    vi.useFakeTimers()
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 500, arrayBuffer: async () => new ArrayBuffer(0) })
      .mockResolvedValueOnce({ ok: false, status: 500, arrayBuffer: async () => new ArrayBuffer(0) })
    vi.stubGlobal('fetch', mockFetch)

    const resultPromise = fetchTileWithRetry('https://maps.wien.gv.at/basemap/bmapgrau/normal/google3857/13/2879/4447.png')
    await vi.advanceTimersByTimeAsync(500)

    await expect(resultPromise).rejects.toThrow()
    expect(mockFetch).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })

  it('throws immediately on HTTP 4xx (no retry)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      arrayBuffer: async () => new ArrayBuffer(0),
    })
    vi.stubGlobal('fetch', mockFetch)

    await expect(
      fetchTileWithRetry('https://maps.wien.gv.at/basemap/bmapgrau/normal/google3857/13/2879/4447.png')
    ).rejects.toThrow()
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// fetchTileGrid — 5x3 tile grid concurrent fetch
// ---------------------------------------------------------------------------
describe('fetchTileGrid', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches exactly 15 tiles for a 5x3 grid', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => minimalPng.buffer.slice(
        minimalPng.byteOffset,
        minimalPng.byteOffset + minimalPng.byteLength
      ),
    })
    vi.stubGlobal('fetch', mockFetch)

    const result = await fetchTileGrid('bmapgrau', 13, 4447, 2879, 5, 3)
    expect(mockFetch).toHaveBeenCalledTimes(15)
    // Result is 3 rows x 5 cols
    expect(result).toHaveLength(3)
    expect(result[0]).toHaveLength(5)
  })

  it('fetches tiles with correct z/y/x coordinate offsets from center', async () => {
    const calls: string[] = []
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      calls.push(url)
      return Promise.resolve({
        ok: true,
        status: 200,
        arrayBuffer: async () => minimalPng.buffer.slice(
          minimalPng.byteOffset,
          minimalPng.byteOffset + minimalPng.byteLength
        ),
      })
    })
    vi.stubGlobal('fetch', mockFetch)

    // Center tile: cx=4447, cy=2879, zoom=13
    // Expected cols: 4445, 4446, 4447, 4448, 4449 (cx-2 to cx+2)
    // Expected rows: 2878, 2879, 2880 (cy-1 to cy+1)
    await fetchTileGrid('bmapgrau', 13, 4447, 2879, 5, 3)

    // Verify all 15 expected tile coordinates appear in the URLs
    const expectedCoords = [
      // row 2878
      '/13/2878/4445', '/13/2878/4446', '/13/2878/4447', '/13/2878/4448', '/13/2878/4449',
      // row 2879
      '/13/2879/4445', '/13/2879/4446', '/13/2879/4447', '/13/2879/4448', '/13/2879/4449',
      // row 2880
      '/13/2880/4445', '/13/2880/4446', '/13/2880/4447', '/13/2880/4448', '/13/2880/4449',
    ]

    for (const coord of expectedCoords) {
      const found = calls.some((url) => url.includes(coord))
      expect(found, `Expected tile ${coord} to be fetched`).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// generateMapImage — full pipeline with Blob upload
// ---------------------------------------------------------------------------
vi.mock('@vercel/blob', () => ({
  put: vi.fn().mockResolvedValue({ url: 'https://blob.example.com/maps/article-1.jpg' }),
}))

describe('generateMapImage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns MapImage with url and credit on successful tile fetch and Blob upload', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => minimalPng.buffer.slice(
        minimalPng.byteOffset,
        minimalPng.byteOffset + minimalPng.byteLength
      ),
    })
    vi.stubGlobal('fetch', mockFetch)

    const result = await generateMapImage(47.07, 15.43, 'Test Headline', 1)
    expect(result).not.toBeNull()
    expect(result?.url).toBe('https://blob.example.com/maps/article-1.jpg')
    expect(result?.credit).toBe('© basemap.at')
  })

  it('includes © basemap.at as credit in returned MapImage', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => minimalPng.buffer.slice(
        minimalPng.byteOffset,
        minimalPng.byteOffset + minimalPng.byteLength
      ),
    })
    vi.stubGlobal('fetch', mockFetch)

    const result = await generateMapImage(47.07, 15.43, 'Test', 1)
    expect(result?.credit).toBe('© basemap.at')
  })

  it('calls Blob put() with correct path pattern "maps/article-{id}.jpg"', async () => {
    const { put } = await import('@vercel/blob')
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => minimalPng.buffer.slice(
        minimalPng.byteOffset,
        minimalPng.byteOffset + minimalPng.byteLength
      ),
    })
    vi.stubGlobal('fetch', mockFetch)

    await generateMapImage(47.07, 15.43, 'Test', 42)
    expect(put).toHaveBeenCalledWith(
      'maps/article-42.jpg',
      expect.any(Buffer),
      expect.objectContaining({ access: 'public', contentType: 'image/jpeg' })
    )
  })

  it('returns null (not throws) when fetch fails', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))
    vi.stubGlobal('fetch', mockFetch)

    const result = await generateMapImage(47.07, 15.43, 'Test', 1)
    expect(result).toBeNull()
  })

  it('returns null (not throws) when Blob put() fails', async () => {
    const { put } = await import('@vercel/blob')
    vi.mocked(put).mockRejectedValueOnce(new Error('Blob upload failed'))

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => minimalPng.buffer.slice(
        minimalPng.byteOffset,
        minimalPng.byteOffset + minimalPng.byteLength
      ),
    })
    vi.stubGlobal('fetch', mockFetch)

    const result = await generateMapImage(47.07, 15.43, 'Test', 1)
    expect(result).toBeNull()
  })

  it('logs console.warn with article ID and coordinates on failure', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))
    vi.stubGlobal('fetch', mockFetch)

    await generateMapImage(47.07, 15.43, 'Test', 99)
    expect(warnSpy).toHaveBeenCalled()
    const warnArg = warnSpy.mock.calls[0][0] as string
    expect(warnArg).toContain('99')  // article ID
    expect(warnArg).toContain('47.07')  // lat
    expect(warnArg).toContain('15.43')  // lon
    warnSpy.mockRestore()
  })

  it('uses zoom 12 for locationType "city" (selectZoom auto-selection)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => minimalPng.buffer.slice(
        minimalPng.byteOffset,
        minimalPng.byteOffset + minimalPng.byteLength
      ),
    })
    vi.stubGlobal('fetch', mockFetch)

    // For zoom=12, Graz tile = latLonToTile(47.07, 15.43, 12) = { x: 2223, y: 1439 }
    // Verify URLs contain zoom 12
    await generateMapImage(47.07, 15.43, 'Test', 1, 'city')
    const urls = mockFetch.mock.calls.map((c: unknown[]) => c[0] as string)
    expect(urls.some((u: string) => u.includes('/12/'))).toBe(true)
    expect(urls.every((u: string) => !u.includes('/13/') && !u.includes('/14/'))).toBe(true)
  })

  it('uses zoom 14 for locationType "village"', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => minimalPng.buffer.slice(
        minimalPng.byteOffset,
        minimalPng.byteOffset + minimalPng.byteLength
      ),
    })
    vi.stubGlobal('fetch', mockFetch)

    await generateMapImage(47.07, 15.43, 'Test', 1, 'village')
    const urls = mockFetch.mock.calls.map((c: unknown[]) => c[0] as string)
    expect(urls.some((u: string) => u.includes('/14/'))).toBe(true)
  })

  it('uses zoom 13 (default) when no locationType provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => minimalPng.buffer.slice(
        minimalPng.byteOffset,
        minimalPng.byteOffset + minimalPng.byteLength
      ),
    })
    vi.stubGlobal('fetch', mockFetch)

    await generateMapImage(47.07, 15.43, 'Test', 1)
    const urls = mockFetch.mock.calls.map((c: unknown[]) => c[0] as string)
    expect(urls.some((u: string) => u.includes('/13/'))).toBe(true)
  })

  it('returns null when tile fetch returns HTTP 5xx twice (single retry exhausted)', async () => {
    vi.useFakeTimers()
    const mockFetch = vi.fn()
      .mockResolvedValue({ ok: false, status: 500, arrayBuffer: async () => new ArrayBuffer(0) })
    vi.stubGlobal('fetch', mockFetch)

    const resultPromise = generateMapImage(47.07, 15.43, 'Test', 1)
    // Advance timers for all retries
    await vi.advanceTimersByTimeAsync(10000)
    const result = await resultPromise
    expect(result).toBeNull()
    vi.useRealTimers()
  })
})
