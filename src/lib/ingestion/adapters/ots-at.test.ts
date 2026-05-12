/**
 * Tests for the OTS.at REST API adapter.
 *
 * Requirements (Phase 44 hardening):
 *   ING-01  — Press releases from OTS.at appear in the ingestion queue.
 *   INGEST-01 — Bulk dedup: at most one findMany regardless of list size.
 *   INGEST-02 — AbortController on every external fetch (10s).
 *   INGEST-03 — lastFetchedAt cursor with 30-min overlap (NULL → 24h fallback).
 *
 * All HTTP calls are mocked via vi.spyOn(globalThis, 'fetch') — no real network.
 */
import { describe, it, expect, beforeAll, beforeEach, vi, afterEach } from 'vitest'
import { createTestDb, cleanDb } from '../../../test/setup-db'
import type { PrismaClient, Source } from '@prisma/client'
import { createOtsAtAdapter } from './ots-at'

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

const OTS_LIST_ITEM_1 = {
  OTSKEY: 'OTS_20260321_001',
  TITEL: 'Pressemitteilung Graz',
  ZEITSTEMPEL: 1742587200,
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

describe('createOtsAtAdapter (Phase 44 hardening)', () => {
  let prisma: PrismaClient
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchSpy: any

  beforeAll(async () => {
    prisma = await createTestDb()
  })

  beforeEach(async () => {
    await cleanDb(prisma)
    fetchSpy = vi.spyOn(globalThis, 'fetch')
    process.env.OTS_API_KEY = 'TEST_KEY'
  })

  afterEach(() => {
    delete process.env.OTS_API_KEY
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  // ---------------------------------------------------------------------------
  // INGEST-01 — bulk dedup
  // ---------------------------------------------------------------------------
  it('issues exactly one findMany for dedup (INGEST-01) and returns only new items', async () => {
    const LIST_ITEMS = Array.from({ length: 5 }, (_, i) => ({
      ...OTS_LIST_ITEM_1,
      OTSKEY: `k${i + 1}`,
      WEBLINK: `https://www.ots.at/presseaussendung/k${i + 1}`,
    }))
    const DETAILS = LIST_ITEMS.map((it) => ({ ...it, TEXT: `body-${it.OTSKEY}` }))

    // Pre-insert k1 and k2 as duplicates
    await prisma.article.create({
      data: {
        externalId: 'k1',
        source: 'OTS_AT',
        title: 'dup1',
        content: 'x',
      },
    })
    await prisma.article.create({
      data: {
        externalId: 'k2',
        source: 'OTS_AT',
        title: 'dup2',
        content: 'x',
      },
    })

    fetchSpy.mockResolvedValueOnce(makeJsonResponse(LIST_ITEMS))
    // Detail fetches for k3, k4, k5 (in order)
    fetchSpy.mockResolvedValueOnce(makeJsonResponse(DETAILS[2]))
    fetchSpy.mockResolvedValueOnce(makeJsonResponse(DETAILS[3]))
    fetchSpy.mockResolvedValueOnce(makeJsonResponse(DETAILS[4]))

    // Wrap prisma in a proxy that counts findMany calls and forwards to the
    // real implementation. vi.spyOn on the Prisma model proxy is unreliable
    // because `prisma.article` is a getter and replacing it leaks across tests.
    const findManyCalls: unknown[] = []
    const wrappedPrisma = new Proxy(prisma, {
      get(target, prop, receiver) {
        if (prop === 'article') {
          const article = Reflect.get(target, prop, receiver)
          return new Proxy(article, {
            get(t, p, r) {
              if (p === 'findMany') {
                const original = Reflect.get(t, p, r) as (...args: unknown[]) => unknown
                return (...args: unknown[]) => {
                  findManyCalls.push(args[0])
                  return original.apply(t, args)
                }
              }
              return Reflect.get(t, p, r)
            },
          })
        }
        return Reflect.get(target, prop, receiver)
      },
    }) as unknown as PrismaClient

    const adapter = createOtsAtAdapter(wrappedPrisma)
    const result = await adapter(makeSource())

    expect(findManyCalls).toHaveLength(1)
    expect(findManyCalls[0]).toEqual({
      where: { source: 'OTS_AT', externalId: { in: ['k1', 'k2', 'k3', 'k4', 'k5'] } },
      select: { externalId: true },
    })

    expect(result.items).toHaveLength(3)
    expect(result.items.map((i) => i.externalId).sort()).toEqual(['k3', 'k4', 'k5'])
  })

  // ---------------------------------------------------------------------------
  // INGEST-03 — lastFetchedAt cursor
  // ---------------------------------------------------------------------------
  it('uses (lastFetchedAt - 30min) as the von= cursor when set (INGEST-03)', async () => {
    const lastFetchedAt = new Date('2026-05-12T10:00:00Z')
    const expectedVon = Math.floor(lastFetchedAt.getTime() / 1000) - 30 * 60

    fetchSpy.mockResolvedValueOnce(makeJsonResponse([]))

    const adapter = createOtsAtAdapter(prisma)
    await adapter(makeSource({ lastFetchedAt }))

    const listCall = fetchSpy.mock.calls[0][0] as string
    expect(listCall).toContain(`von=${expectedVon}`)
  })

  it('falls back to Date.now() - 24h when lastFetchedAt is null (INGEST-03)', async () => {
    const fixedNow = new Date('2026-05-12T10:00:00Z')
    vi.useFakeTimers()
    vi.setSystemTime(fixedNow)

    const expectedVon = Math.floor(fixedNow.getTime() / 1000) - 24 * 60 * 60

    fetchSpy.mockResolvedValueOnce(makeJsonResponse([]))

    const adapter = createOtsAtAdapter(prisma)
    await adapter(makeSource({ lastFetchedAt: null }))

    const listCall = fetchSpy.mock.calls[0][0] as string
    expect(listCall).toContain(`von=${expectedVon}`)
  })

  // ---------------------------------------------------------------------------
  // INGEST-02 — AbortController on every external fetch
  // ---------------------------------------------------------------------------
  it('attaches an AbortSignal to the /api/liste fetch (INGEST-02)', async () => {
    fetchSpy.mockResolvedValueOnce(makeJsonResponse([]))

    const adapter = createOtsAtAdapter(prisma)
    await adapter(makeSource())

    const [, init] = fetchSpy.mock.calls[0]
    expect((init as RequestInit).signal).toBeInstanceOf(AbortSignal)
  })

  it('attaches an AbortSignal to each /api/detail fetch (INGEST-02)', async () => {
    fetchSpy.mockResolvedValueOnce(makeJsonResponse([OTS_LIST_ITEM_1, OTS_LIST_ITEM_2]))
    fetchSpy.mockResolvedValueOnce(makeJsonResponse(OTS_DETAIL_1))
    fetchSpy.mockResolvedValueOnce(makeJsonResponse(OTS_DETAIL_2))

    const adapter = createOtsAtAdapter(prisma)
    await adapter(makeSource())

    // calls[0] = list, calls[1] = detail1, calls[2] = detail2
    expect(fetchSpy).toHaveBeenCalledTimes(3)
    for (const call of fetchSpy.mock.calls.slice(1)) {
      expect((call[1] as RequestInit).signal).toBeInstanceOf(AbortSignal)
    }
  })

  // ---------------------------------------------------------------------------
  // Return shape (Option A unified envelope)
  // ---------------------------------------------------------------------------
  it('returns AdapterResult with null etag/lastModified (OTS has no conditional GET)', async () => {
    fetchSpy.mockResolvedValueOnce(makeJsonResponse([]))

    const adapter = createOtsAtAdapter(prisma)
    const result = await adapter(makeSource())

    expect(result.items).toEqual([])
    expect(result.etag).toBeNull()
    expect(result.lastModified).toBeNull()
  })

  // ---------------------------------------------------------------------------
  // Existing behaviour preserved
  // ---------------------------------------------------------------------------
  it('preserves keyword-prefilter on TITEL + UTL fields', async () => {
    const items = [
      { ...OTS_LIST_ITEM_1, OTSKEY: 'kA', TITEL: 'Pressemitteilung Graz', UTL: '' },
      { ...OTS_LIST_ITEM_2, OTSKEY: 'kB', TITEL: 'Sport Linz', UTL: '' },
      { ...OTS_LIST_ITEM_1, OTSKEY: 'kC', TITEL: 'irrelevant', UTL: 'special-keyword-in-utl' },
    ]

    fetchSpy.mockResolvedValueOnce(makeJsonResponse(items))
    // Only kA and kC should pass; their details get fetched
    fetchSpy.mockResolvedValueOnce(makeJsonResponse({ ...items[0], TEXT: 'body A' }))
    fetchSpy.mockResolvedValueOnce(makeJsonResponse({ ...items[2], TEXT: 'body C' }))

    const adapter = createOtsAtAdapter(prisma)
    const result = await adapter(makeSource({ keywords: ['graz', 'special-keyword'] }))

    expect(result.items).toHaveLength(2)
    expect(result.items.map((i) => i.externalId).sort()).toEqual(['kA', 'kC'])
  })

  it('maps OTSKEY→externalId, ZEITSTEMPEL→publishedAt, TITEL→title, WEBLINK→sourceUrl', async () => {
    fetchSpy.mockResolvedValueOnce(makeJsonResponse([OTS_LIST_ITEM_1]))
    fetchSpy.mockResolvedValueOnce(makeJsonResponse(OTS_DETAIL_1))

    const adapter = createOtsAtAdapter(prisma)
    const result = await adapter(makeSource())

    expect(result.items).toHaveLength(1)
    const item = result.items[0]
    expect(item.externalId).toBe(OTS_LIST_ITEM_1.OTSKEY)
    expect(item.title).toBe(OTS_LIST_ITEM_1.TITEL)
    expect(item.sourceUrl).toBe(OTS_LIST_ITEM_1.WEBLINK)
    expect(item.publishedAt).toBeInstanceOf(Date)
    expect(item.publishedAt!.getTime()).toBe(OTS_LIST_ITEM_1.ZEITSTEMPEL * 1000)
  })

  it('skips the findMany call entirely when filteredList is empty (defensive)', async () => {
    fetchSpy.mockResolvedValueOnce(makeJsonResponse([]))

    let findManyCallCount = 0
    const wrappedPrisma = new Proxy(prisma, {
      get(target, prop, receiver) {
        if (prop === 'article') {
          const article = Reflect.get(target, prop, receiver)
          return new Proxy(article, {
            get(t, p, r) {
              if (p === 'findMany') {
                const original = Reflect.get(t, p, r) as (...args: unknown[]) => unknown
                return (...args: unknown[]) => {
                  findManyCallCount++
                  return original.apply(t, args)
                }
              }
              return Reflect.get(t, p, r)
            },
          })
        }
        return Reflect.get(target, prop, receiver)
      },
    }) as unknown as PrismaClient

    const adapter = createOtsAtAdapter(wrappedPrisma)
    const result = await adapter(makeSource())

    expect(findManyCallCount).toBe(0)
    expect(result.items).toEqual([])
  })

  it('throws when /api/liste returns a non-200 status', async () => {
    fetchSpy.mockResolvedValueOnce(makeJsonResponse({ error: 'unauthorized' }, 401))

    const adapter = createOtsAtAdapter(prisma)
    await expect(adapter(makeSource())).rejects.toThrow()
  })
})
