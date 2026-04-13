/**
 * Tests for mapgen.ts — basemap.at tile pipeline module.
 *
 * Plan 40-01: Pure function tests + Sharp smoke test.
 * Plan 40-02 will fill in stub tests for async tile-fetch behaviors.
 */

import { describe, it, expect } from 'vitest'
import {
  latLonToTile,
  selectLayer,
  selectZoom,
  tileUrl,
  buildAttributionSvg,
  generateMapImage,
} from './mapgen'

// ---------------------------------------------------------------------------
// latLonToTile — Spherical Mercator tile coordinate math
// ---------------------------------------------------------------------------
describe('latLonToTile', () => {
  it('returns correct tile for Graz at zoom 13', () => {
    const result = latLonToTile(47.07, 15.43, 13)
    expect(result).toEqual({ x: 4468, y: 2873 })
  })

  it('returns correct tile for Vienna at zoom 13', () => {
    const result = latLonToTile(48.21, 16.37, 13)
    // Vienna should produce different coords than Graz
    expect(result.x).toBeGreaterThan(0)
    expect(result.y).toBeGreaterThan(0)
    // Vienna is ~50km north and ~1deg east of Graz — x should be higher, y lower
    expect(result.x).toBeGreaterThan(4468)
    expect(result.y).toBeLessThan(2873)
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
    const url = tileUrl('bmapgrau', 13, 2873, 4468)
    // URL should have format: .../13/2873/4468.png or .../13/2873/4468.jpeg
    expect(url).toMatch(/\/13\/2873\/4468/)
  })

  it('does NOT use z/x/y ordering', () => {
    // If x/y were swapped, we'd get /13/4468/2873 — this must not happen
    const url = tileUrl('bmapgrau', 13, 2873, 4468)
    expect(url).not.toMatch(/\/13\/4468\/2873/)
  })

  it('produces a basemap.at URL', () => {
    const url = tileUrl('bmapgrau', 13, 2873, 4468)
    expect(url).toMatch(/basemap\.at/)
  })

  it('uses different servers for round-robin (calling multiple times)', () => {
    // Call enough times to see different server numbers
    const urls = Array.from({ length: 6 }, (_, i) => tileUrl('bmapgrau', 13, 2873, 4468 + i))
    const servers = urls.map((u) => {
      const match = u.match(/maps(\d)/)
      return match ? match[1] : null
    })
    // There should be variation in server numbers (not all the same)
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
// Stub tests for Plan 40-02 async behaviors
// ---------------------------------------------------------------------------
describe('generateMapImage (async — implemented in Plan 40-02)', () => {
  it.todo('returns MapImage with url and credit on successful tile fetch and Blob upload')
  it.todo('returns null when tile fetch returns HTTP 5xx twice (single retry exhausted)')
  it.todo('returns null when sharp throws during compositing')
  it.todo('returns null when Blob upload fails')
  it.todo('includes © basemap.at as credit in returned MapImage')
})

describe('tile grid fetch (async — implemented in Plan 40-02)', () => {
  it.todo('fetches a 3x3 grid of tiles centered on lat/lon')
  it.todo('retries once after 500ms on HTTP 5xx from tile server')
  it.todo('fails through to null on second 5xx (no further retries)')
})
