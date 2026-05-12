/**
 * Tests for the RSS/Atom feed adapter.
 *
 * Requirements (Phase 44 hardening):
 *   ING-02     — RSS/Atom feed ingestion.
 *   INGEST-02  — AbortController on every external fetch (10s).
 *   INGEST-04  — Conditional GET: If-None-Match + If-Modified-Since; 304
 *                short-circuit; persist new etag/lastModified on 200 only.
 *
 * All HTTP calls are mocked via vi.spyOn(globalThis, 'fetch') — no real network.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import type { Source } from '@prisma/client'
import { computeContentHash } from '../dedup'
import { rssAdapter } from './rss'

function makeSource(overrides: Partial<Source> = {}): Source {
  return {
    id: 1,
    type: 'RSS',
    url: 'https://news.example.at/feed.rss',
    enabled: true,
    pollIntervalMinutes: 15,
    consecutiveFailures: 0,
    lastSuccessAt: null,
    healthStatus: 'OK',
    healthFailureThreshold: 3,
    category: null,
    keywords: [],
    lastFetchedAt: null,
    etag: null,
    lastModified: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Source
}

const rssFeedXml = fs.readFileSync(
  path.resolve(process.cwd(), 'test/fixtures/rss-sample.xml'),
  'utf8',
)

const atomFeedXml = fs.readFileSync(
  path.resolve(process.cwd(), 'test/fixtures/atom-sample.xml'),
  'utf8',
)

describe('rssAdapter (Phase 44 hardening — conditional GET + AbortController)', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchSpy: any

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ---------------------------------------------------------------------------
  // INGEST-04a — conditional-GET headers
  // ---------------------------------------------------------------------------
  it('sends If-None-Match and If-Modified-Since when source has both validators', async () => {
    const source = makeSource({
      etag: '"abc123"',
      lastModified: 'Wed, 12 May 2026 10:00:00 GMT',
    })
    fetchSpy.mockResolvedValue(new Response(rssFeedXml, { status: 200 }))

    await rssAdapter(source)

    const [, init] = fetchSpy.mock.calls[0]
    const headers = (init as RequestInit).headers as Record<string, string>
    expect(headers['If-None-Match']).toBe('"abc123"')
    expect(headers['If-Modified-Since']).toBe('Wed, 12 May 2026 10:00:00 GMT')
  })

  it('omits conditional headers entirely when validators are null (pitfall #7)', async () => {
    const source = makeSource({ etag: null, lastModified: null })
    fetchSpy.mockResolvedValue(new Response(rssFeedXml, { status: 200 }))

    await rssAdapter(source)

    const [, init] = fetchSpy.mock.calls[0]
    const headers = (init as RequestInit).headers as Record<string, string>
    expect(headers['If-None-Match']).toBeUndefined()
    expect(headers['If-Modified-Since']).toBeUndefined()
  })

  // ---------------------------------------------------------------------------
  // INGEST-04b — 304 short-circuit
  // ---------------------------------------------------------------------------
  it('short-circuits on 304: returns empty items + undefined validators (preserve, do not clear)', async () => {
    const source = makeSource({ etag: '"abc"', lastModified: 'Wed, 12 May 2026 10:00:00 GMT' })
    fetchSpy.mockResolvedValue(new Response(null, { status: 304 }))

    const result = await rssAdapter(source)

    expect(result.items).toEqual([])
    expect(result.etag).toBeUndefined()
    expect(result.lastModified).toBeUndefined()
  })

  it('does NOT call response.text() when fetch returns 304', async () => {
    const source = makeSource({ etag: '"abc"' })
    // 304 has no body per spec; verify the adapter does not even reach .text()
    const response = new Response(null, { status: 304 })
    const textSpy = vi.spyOn(response, 'text')
    fetchSpy.mockResolvedValue(response)

    const result = await rssAdapter(source)

    expect(textSpy).not.toHaveBeenCalled()
    expect(result.items).toEqual([])
  })

  // ---------------------------------------------------------------------------
  // INGEST-04 — 200 returns new validators
  // ---------------------------------------------------------------------------
  it('on 200, returns the server-provided etag and last-modified verbatim', async () => {
    const source = makeSource()
    fetchSpy.mockResolvedValue(
      new Response(rssFeedXml, {
        status: 200,
        headers: {
          etag: '"xyz789"',
          'last-modified': 'Wed, 13 May 2026 10:00:00 GMT',
        },
      }),
    )

    const result = await rssAdapter(source)

    expect(result.etag).toBe('"xyz789"')
    expect(result.lastModified).toBe('Wed, 13 May 2026 10:00:00 GMT')
    expect(result.items.length).toBeGreaterThan(0)
  })

  it('on 200 without etag/last-modified headers, returns null for both', async () => {
    const source = makeSource()
    fetchSpy.mockResolvedValue(new Response(rssFeedXml, { status: 200 }))

    const result = await rssAdapter(source)

    expect(result.etag).toBeNull()
    expect(result.lastModified).toBeNull()
  })

  // ---------------------------------------------------------------------------
  // INGEST-02 — AbortController
  // ---------------------------------------------------------------------------
  it('attaches an AbortSignal to the fetch call', async () => {
    fetchSpy.mockResolvedValue(new Response(rssFeedXml, { status: 200 }))

    await rssAdapter(makeSource())

    const [, init] = fetchSpy.mock.calls[0]
    expect((init as RequestInit).signal).toBeInstanceOf(AbortSignal)
  })

  // ---------------------------------------------------------------------------
  // Preserved existing behaviour — RSS 2.0
  // ---------------------------------------------------------------------------
  it('parses RSS 2.0 into RawItem array with guid → externalId mapping', async () => {
    fetchSpy.mockResolvedValue(new Response(rssFeedXml, { status: 200 }))

    const result = await rssAdapter(makeSource())

    expect(result.items).toHaveLength(2)
    expect(result.items[0].title).toBe('Neue Radwege in Graz geplant')
    expect(result.items[0].externalId).toBe('https://news.example.at/artikel/radwege-graz-2026')
    expect(result.items[0].body).toContain('15 Kilometern')
    expect(result.items[0].publishedAt).toBeInstanceOf(Date)
    expect(result.items[0].sourceUrl).toBe('https://news.example.at/artikel/radwege-graz-2026')
    expect(result.items[0].rawPayload).toBeDefined()
  })

  it('falls back to link when guid is absent', async () => {
    fetchSpy.mockResolvedValue(new Response(rssFeedXml, { status: 200 }))

    const result = await rssAdapter(makeSource())

    expect(result.items[1].externalId).toBe('https://news.example.at/artikel/hochwasserschutz-mur')
    expect(result.items[1].title).toBe('Hochwasserschutz Mur: Bauarbeiten abgeschlossen')
  })

  it('falls back to contentHash when both guid and link are absent', async () => {
    const noIdFeedXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test</title>
    <description>Test feed</description>
    <item>
      <title>Orphan Item</title>
      <description>No guid, no link here.</description>
    </item>
  </channel>
</rss>`
    fetchSpy.mockResolvedValue(new Response(noIdFeedXml, { status: 200 }))

    const result = await rssAdapter(makeSource())

    expect(result.items).toHaveLength(1)
    const expectedHash = computeContentHash('Orphan Item', 'No guid, no link here.')
    expect(result.items[0].externalId).toBe(expectedHash)
  })

  // ---------------------------------------------------------------------------
  // Preserved existing behaviour — Atom 1.0
  // ---------------------------------------------------------------------------
  it('parses Atom 1.0 into RawItem array', async () => {
    const atomSource = makeSource({
      id: 2,
      url: 'https://aktuell.example.at/feed.atom',
    })
    fetchSpy.mockResolvedValue(new Response(atomFeedXml, { status: 200 }))

    const result = await rssAdapter(atomSource)

    expect(result.items).toHaveLength(2)
    expect(result.items[0].title).toBe('Schulgebäude in Liezen wird saniert')
    expect(result.items[0].body).toContain('thermische Sanierung')
    expect(result.items[1].title).toBe('Schladming verzeichnet Nächtigungsrekord')
  })

  it('maps atom:id to externalId', async () => {
    const atomSource = makeSource({ url: 'https://aktuell.example.at/feed.atom' })
    fetchSpy.mockResolvedValue(new Response(atomFeedXml, { status: 200 }))

    const result = await rssAdapter(atomSource)

    expect(result.items[0].externalId).toBe(
      'https://aktuell.example.at/meldung/schule-liezen-sanierung',
    )
    expect(result.items[1].externalId).toBe(
      'https://aktuell.example.at/meldung/tourismus-schladming-rekord',
    )
  })

  // ---------------------------------------------------------------------------
  // Preserved existing behaviour — keyword filter
  // ---------------------------------------------------------------------------
  it('preserves keyword filter (items must match at least one keyword)', async () => {
    fetchSpy.mockResolvedValue(new Response(rssFeedXml, { status: 200 }))

    const source = makeSource({ keywords: ['radwege'] })
    const result = await rssAdapter(source)

    expect(result.items).toHaveLength(1)
    expect(result.items[0].title).toBe('Neue Radwege in Graz geplant')
  })

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------
  it('throws on non-2xx, non-304 HTTP status', async () => {
    fetchSpy.mockResolvedValue(new Response('Not Found', { status: 404 }))

    await expect(rssAdapter(makeSource())).rejects.toThrow()
  })
})
