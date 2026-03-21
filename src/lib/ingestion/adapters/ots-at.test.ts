/**
 * Tests for the OTS.at REST API adapter.
 *
 * Requirements:
 *   ING-01 — Press releases from OTS.at appear in the ingestion queue within one polling cycle.
 *
 * All HTTP calls are mocked via vi.spyOn(globalThis, 'fetch') — no real network requests.
 */
import { describe, it, expect, beforeAll, beforeEach, vi, afterEach } from 'vitest'
import { createTestDb, cleanDb } from '../../../test/setup-db'
import type { PrismaClient, Source } from '@prisma/client'
import { createOtsAtAdapter } from './ots-at'

// OTS adapter ignores the source param (uses OTS_API_KEY env var instead).
// Provide a minimal Source shape to satisfy the AdapterFn type.
function makeSource(overrides: Partial<Source> = {}): Source {
  return {
    id: 1,
    type: 'OTS_AT',
    url: 'https://www.ots.at/api',
    enabled: true,
    pollIntervalMinutes: 60,
    consecutiveFailures: 0,
    lastSuccessAt: null,
    healthStatus: 'OK',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Source
}

// Minimal fixture data matching OTS.at confirmed field names
const OTS_LIST_ITEM_1 = {
  OTSKEY: 'OTS_20260321_001',
  TITEL: 'Pressemitteilung Graz',
  ZEITSTEMPEL: 1742587200, // 2025-03-21 12:00:00 UTC as unix timestamp
  WEBLINK: 'https://www.ots.at/presseaussendung/OTS_20260321_001',
  DATUM: '21.03.2026',
  ZEIT: '12:00',
  UTL: 'Untertitel der Pressemitteilung',
  EMITTENT: 'Stadtgemeinde Graz',
}

const OTS_LIST_ITEM_2 = {
  OTSKEY: 'OTS_20260321_002',
  TITEL: 'Wirtschaftsnews Steiermark',
  ZEITSTEMPEL: 1742590800,
  WEBLINK: 'https://www.ots.at/presseaussendung/OTS_20260321_002',
  DATUM: '21.03.2026',
  ZEIT: '13:00',
  UTL: '',
  EMITTENT: 'WKO Steiermark',
}

const OTS_DETAIL_1 = {
  ...OTS_LIST_ITEM_1,
  TEXT: 'Volltext der ersten Pressemitteilung aus Graz.',
}

const OTS_DETAIL_2 = {
  ...OTS_LIST_ITEM_2,
  TEXT: 'Volltext der zweiten Pressemitteilung aus der Steiermark.',
}

function makeJsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as unknown as Response
}

describe('createOtsAtAdapter', () => {
  let prisma: PrismaClient
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchSpy: any

  beforeAll(async () => {
    prisma = await createTestDb()
  })

  beforeEach(async () => {
    await cleanDb(prisma)
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches list from OTS /api/liste with correct app param and anz=50', async () => {
    // Arrange: list returns 2 items, detail returns corresponding objects
    fetchSpy
      .mockResolvedValueOnce(makeJsonResponse([OTS_LIST_ITEM_1, OTS_LIST_ITEM_2]))
      .mockResolvedValueOnce(makeJsonResponse(OTS_DETAIL_1))
      .mockResolvedValueOnce(makeJsonResponse(OTS_DETAIL_2))

    const apiKey = 'TEST_KEY_123'
    process.env.OTS_API_KEY = apiKey

    const adapter = createOtsAtAdapter(prisma)
    await adapter(makeSource())

    // Assert: first call must be to /api/liste with app= and anz=50
    const listCall = fetchSpy.mock.calls[0][0] as string
    expect(listCall).toContain('https://www.ots.at/api/liste')
    expect(listCall).toContain(`app=${apiKey}`)
    expect(listCall).toContain('anz=50')

    delete process.env.OTS_API_KEY
  })

  it('maps OTSKEY to externalId, ZEITSTEMPEL to publishedAt, TITEL to title, WEBLINK to sourceUrl', async () => {
    fetchSpy
      .mockResolvedValueOnce(makeJsonResponse([OTS_LIST_ITEM_1]))
      .mockResolvedValueOnce(makeJsonResponse(OTS_DETAIL_1))

    process.env.OTS_API_KEY = 'TEST_KEY'

    const adapter = createOtsAtAdapter(prisma)
    const items = await adapter(makeSource())

    expect(items).toHaveLength(1)
    const item = items[0]
    expect(item.externalId).toBe(OTS_LIST_ITEM_1.OTSKEY)
    expect(item.title).toBe(OTS_LIST_ITEM_1.TITEL)
    expect(item.sourceUrl).toBe(OTS_LIST_ITEM_1.WEBLINK)
    expect(item.publishedAt).toBeInstanceOf(Date)
    expect(item.publishedAt!.getTime()).toBe(OTS_LIST_ITEM_1.ZEITSTEMPEL * 1000)

    delete process.env.OTS_API_KEY
  })

  it('does NOT fetch /api/detail for an item whose OTSKEY already exists in the Article DB', async () => {
    // Pre-insert item 1 to simulate it already being in the DB
    await prisma.article.create({
      data: {
        externalId: OTS_LIST_ITEM_1.OTSKEY,
        source: 'OTS_AT',
        title: OTS_LIST_ITEM_1.TITEL,
        content: 'existing content',
      },
    })

    // List returns both items; only item 2 should have detail fetched
    fetchSpy
      .mockResolvedValueOnce(makeJsonResponse([OTS_LIST_ITEM_1, OTS_LIST_ITEM_2]))
      .mockResolvedValueOnce(makeJsonResponse(OTS_DETAIL_2))

    process.env.OTS_API_KEY = 'TEST_KEY'

    const adapter = createOtsAtAdapter(prisma)
    const items = await adapter(makeSource())

    // fetch called twice: once for list, once for detail of item 2 only
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    const detailCall = fetchSpy.mock.calls[1][0] as string
    expect(detailCall).toContain(OTS_LIST_ITEM_2.OTSKEY)
    expect(detailCall).not.toContain(OTS_LIST_ITEM_1.OTSKEY)

    // Only the new item is returned
    expect(items).toHaveLength(1)
    expect(items[0].externalId).toBe(OTS_LIST_ITEM_2.OTSKEY)

    delete process.env.OTS_API_KEY
  })

  it('throws an Error when /api/liste returns a non-200 status', async () => {
    fetchSpy.mockResolvedValueOnce(makeJsonResponse({ error: 'unauthorized' }, 401))

    process.env.OTS_API_KEY = 'BAD_KEY'

    const adapter = createOtsAtAdapter(prisma)
    await expect(adapter(makeSource())).rejects.toThrow()

    delete process.env.OTS_API_KEY
  })
})
