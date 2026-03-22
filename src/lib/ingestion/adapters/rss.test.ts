import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import type { Source } from '@prisma/client'
import { computeContentHash } from '../dedup'
// import { rssAdapter } from './rss'  // uncomment when implemented — will fail until module exists

describe('rssAdapter (RSS 2.0)', () => {
  // Fixture loaded once — no real HTTP calls
  const rssFeedXml = fs.readFileSync(
    path.resolve(process.cwd(), 'test/fixtures/rss-sample.xml'),
    'utf8',
  )
  const atomFeedXml = fs.readFileSync(
    path.resolve(process.cwd(), 'test/fixtures/atom-sample.xml'),
    'utf8',
  )

  // Minimal Source stub — only fields the adapter uses
  const rssSource: Source = {
    id: 1,
    type: 'RSS',
    url: 'https://news.example.at/feed.rss',
    enabled: true,
    pollIntervalMinutes: 15,
    consecutiveFailures: 0,
    lastSuccessAt: null,
    healthStatus: 'OK',
    healthFailureThreshold: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const atomSource: Source = {
    ...rssSource,
    url: 'https://aktuell.example.at/feed.atom',
  }

  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(rssFeedXml, { status: 200 }),
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('parses RSS 2.0 fixture into RawItem array with title, body, externalId from guid', async () => {
    const { rssAdapter } = await import('./rss')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(rssFeedXml, { status: 200 }),
    )

    const items = await rssAdapter(rssSource)

    expect(items).toHaveLength(2)
    // First item has a guid
    expect(items[0].title).toBe('Neue Radwege in Graz geplant')
    expect(items[0].externalId).toBe('https://news.example.at/artikel/radwege-graz-2026')
    expect(items[0].body).toContain('15 Kilometern')
    expect(items[0].publishedAt).toBeInstanceOf(Date)
    expect(items[0].sourceUrl).toBe('https://news.example.at/artikel/radwege-graz-2026')
    expect(items[0].rawPayload).toBeDefined()
  })

  it('falls back externalId to link when guid is absent', async () => {
    const { rssAdapter } = await import('./rss')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(rssFeedXml, { status: 200 }),
    )

    const items = await rssAdapter(rssSource)

    // Second item has no guid — falls back to link
    expect(items[1].externalId).toBe('https://news.example.at/artikel/hochwasserschutz-mur')
    expect(items[1].title).toBe('Hochwasserschutz Mur: Bauarbeiten abgeschlossen')
  })

  it('falls back externalId to contentHash when both guid and link are absent', async () => {
    const { rssAdapter } = await import('./rss')
    // Feed with one item that has no guid and no link
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
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(noIdFeedXml, { status: 200 }),
    )

    const items = await rssAdapter(rssSource)

    expect(items).toHaveLength(1)
    const expectedHash = computeContentHash('Orphan Item', 'No guid, no link here.')
    expect(items[0].externalId).toBe(expectedHash)
  })
})

describe('rssAdapter (Atom 1.0)', () => {
  const atomFeedXml = fs.readFileSync(
    path.resolve(process.cwd(), 'test/fixtures/atom-sample.xml'),
    'utf8',
  )

  const atomSource: Source = {
    id: 2,
    type: 'RSS',
    url: 'https://aktuell.example.at/feed.atom',
    enabled: true,
    pollIntervalMinutes: 15,
    consecutiveFailures: 0,
    lastSuccessAt: null,
    healthStatus: 'OK',
    healthFailureThreshold: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('parses Atom 1.0 fixture into RawItem array', async () => {
    const { rssAdapter } = await import('./rss')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(atomFeedXml, { status: 200 }),
    )

    const items = await rssAdapter(atomSource)

    expect(items).toHaveLength(2)
    expect(items[0].title).toBe('Schulgebäude in Liezen wird saniert')
    expect(items[0].body).toContain('thermische Sanierung')
    expect(items[1].title).toBe('Schladming verzeichnet Nächtigungsrekord')
  })

  it('maps atom:id to externalId', async () => {
    const { rssAdapter } = await import('./rss')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(atomFeedXml, { status: 200 }),
    )

    const items = await rssAdapter(atomSource)

    expect(items[0].externalId).toBe(
      'https://aktuell.example.at/meldung/schule-liezen-sanierung',
    )
    expect(items[1].externalId).toBe(
      'https://aktuell.example.at/meldung/tourismus-schladming-rekord',
    )
  })
})

describe('rssAdapter (error handling)', () => {
  const source: Source = {
    id: 3,
    type: 'RSS',
    url: 'https://news.example.at/feed.rss',
    enabled: true,
    pollIntervalMinutes: 15,
    consecutiveFailures: 0,
    lastSuccessAt: null,
    healthStatus: 'OK',
    healthFailureThreshold: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('throws when fetch returns non-200 status', async () => {
    const { rssAdapter } = await import('./rss')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Not Found', { status: 404 }),
    )

    await expect(rssAdapter(source)).rejects.toThrow()
  })
})
