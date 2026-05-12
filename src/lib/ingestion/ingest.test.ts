/**
 * Tests for the core ingest() orchestrator.
 *
 * Requirements:
 *   ING-04     — Health tracking: consecutiveFailures, DEGRADED/DOWN/OK transitions.
 *   ING-05     — Adapter registry: ingest() resolves adapter from registry.
 *   INGEST-03  — Persist Source.lastFetchedAt on success.
 *   INGEST-04  — Tri-state etag/lastModified persistence (null=skip, undefined=preserve, string=write).
 *   INGEST-05  — IngestionRun + Source updates wrapped in a single db.$transaction.
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { createTestDb, cleanDb } from '../../test/setup-db'
import type { PrismaClient, Source } from '@prisma/client'
import { ingest } from './ingest'

const HEALTH_FAILURE_THRESHOLD = 3
import { adapterRegistry } from './adapters/registry'
import type { AdapterResult, RawItem } from './types'

function makeRawItem(overrides: Partial<RawItem> = {}): RawItem {
  return {
    externalId: 'item-001',
    title: 'Test Article',
    body: 'Test body content',
    sourceUrl: 'https://example.com/article',
    publishedAt: new Date('2024-01-15T10:00:00Z'),
    rawPayload: { original: true },
    ...overrides,
  }
}

/**
 * Mock adapterRegistry.OTS_AT with a function that resolves to an AdapterResult.
 * `result` is either an AdapterResult or a shortcut RawItem[] (wrapped here).
 */
function mockOtsAdapter(
  result?: RawItem[] | AdapterResult,
  rejectedError?: Error,
) {
  if (rejectedError) {
    const mockFn = vi.fn().mockRejectedValue(rejectedError)
    adapterRegistry.OTS_AT = mockFn
    return mockFn
  }
  const envelope: AdapterResult = Array.isArray(result)
    ? { items: result, etag: null, lastModified: null }
    : (result ?? { items: [], etag: null, lastModified: null })
  const mockFn = vi.fn().mockResolvedValue(envelope)
  adapterRegistry.OTS_AT = mockFn
  return mockFn
}

describe('ingest()', () => {
  let prisma: PrismaClient
  let source: Source
  const originalAdapter = adapterRegistry.OTS_AT

  beforeAll(async () => {
    prisma = await createTestDb()
  })

  beforeEach(async () => {
    await cleanDb(prisma)

    source = await prisma.source.create({
      data: {
        type: 'OTS_AT',
        url: 'https://ots.at/api',
        enabled: true,
        consecutiveFailures: 0,
        healthStatus: 'OK',
      },
    })
  })

  afterEach(() => {
    adapterRegistry.OTS_AT = originalAdapter
    vi.restoreAllMocks()
  })

  // ---------------------------------------------------------------------------
  // Pre-existing behaviour (still in scope post-refactor)
  // ---------------------------------------------------------------------------
  it('creates an IngestionRun record at start and closes it on success', async () => {
    mockOtsAdapter([makeRawItem()])

    await ingest(prisma, source)

    const runs = await prisma.ingestionRun.findMany({ where: { sourceId: source.id } })
    expect(runs).toHaveLength(1)
    expect(runs[0].finishedAt).not.toBeNull()
    expect(runs[0].error).toBeNull()
    expect(runs[0].itemsFound).toBe(1)
    expect(runs[0].itemsNew).toBe(1)
  })

  it('writes Article with status FETCHED for new non-duplicate items', async () => {
    mockOtsAdapter([
      makeRawItem({ externalId: 'new-001', title: 'New Article', body: 'New body' }),
    ])

    await ingest(prisma, source)

    const articles = await prisma.article.findMany()
    expect(articles).toHaveLength(1)
    expect(articles[0].status).toBe('FETCHED')
    expect(articles[0].externalId).toBe('new-001')
    expect(articles[0].source).toBe('OTS_AT')
  })

  it('skips duplicate items and does not write to Article table', async () => {
    await prisma.article.create({
      data: {
        externalId: 'dup-001',
        source: 'OTS_AT',
        title: 'Existing Article',
        content: 'Existing body',
      },
    })

    mockOtsAdapter([
      makeRawItem({ externalId: 'dup-001', title: 'Existing Article', body: 'Existing body' }),
    ])

    const result = await ingest(prisma, source)

    expect(result.itemsFound).toBe(1)
    expect(result.itemsNew).toBe(0)

    const articles = await prisma.article.findMany()
    expect(articles).toHaveLength(1)
  })

  it('resets consecutiveFailures to 0 and updates lastSuccessAt on success', async () => {
    await prisma.source.update({
      where: { id: source.id },
      data: { consecutiveFailures: 2, healthStatus: 'DEGRADED' },
    })
    const updatedSource = await prisma.source.findUniqueOrThrow({ where: { id: source.id } })

    mockOtsAdapter([])

    await ingest(prisma, updatedSource)

    const after = await prisma.source.findUniqueOrThrow({ where: { id: source.id } })
    expect(after.consecutiveFailures).toBe(0)
    expect(after.healthStatus).toBe('OK')
    expect(after.lastSuccessAt).not.toBeNull()
  })

  it('increments consecutiveFailures when adapter throws', async () => {
    mockOtsAdapter(undefined, new Error('Network failure'))

    await expect(ingest(prisma, source)).rejects.toThrow('Network failure')

    const after = await prisma.source.findUniqueOrThrow({ where: { id: source.id } })
    expect(after.consecutiveFailures).toBe(1)
  })

  it('sets healthStatus to DEGRADED after 1-2 failures', async () => {
    mockOtsAdapter(undefined, new Error('Adapter down'))

    await expect(ingest(prisma, source)).rejects.toThrow()

    const after = await prisma.source.findUniqueOrThrow({ where: { id: source.id } })
    expect(after.healthStatus).toBe('DEGRADED')
    expect(after.consecutiveFailures).toBe(1)
  })

  it(`sets healthStatus to DOWN after ${HEALTH_FAILURE_THRESHOLD} consecutive failures`, async () => {
    const preFailures = HEALTH_FAILURE_THRESHOLD - 1
    await prisma.source.update({
      where: { id: source.id },
      data: { consecutiveFailures: preFailures, healthStatus: 'DEGRADED' },
    })
    const failingSource = await prisma.source.findUniqueOrThrow({ where: { id: source.id } })

    mockOtsAdapter(undefined, new Error('Adapter down'))

    await expect(ingest(prisma, failingSource)).rejects.toThrow()

    const after = await prisma.source.findUniqueOrThrow({ where: { id: source.id } })
    expect(after.consecutiveFailures).toBe(HEALTH_FAILURE_THRESHOLD)
    expect(after.healthStatus).toBe('DOWN')
  })

  it('records error string in IngestionRun.error when adapter throws', async () => {
    mockOtsAdapter(undefined, new Error('Connection refused'))

    await expect(ingest(prisma, source)).rejects.toThrow()

    const run = await prisma.ingestionRun.findFirst({ where: { sourceId: source.id } })
    expect(run?.error).toBe('Connection refused')
    expect(run?.finishedAt).not.toBeNull()
  })

  // ---------------------------------------------------------------------------
  // INGEST-05 — transactional success path
  // ---------------------------------------------------------------------------
  it('wraps IngestionRun.update + Source.update in a single db.$transaction on success', async () => {
    mockOtsAdapter([
      makeRawItem({ externalId: 'tx-001', title: 'Tx One', body: 'body-one' }),
      makeRawItem({ externalId: 'tx-002', title: 'Tx Two', body: 'body-two' }),
    ])

    // vi.spyOn on prisma.$transaction is unreliable: the Prisma client is a
    // Proxy and the property has `value: undefined` until accessed through
    // the trap. Wrap the client in a Proxy that intercepts $transaction.
    const txCalls: unknown[][] = []
    const wrappedPrisma = new Proxy(prisma, {
      get(target, prop, receiver) {
        if (prop === '$transaction') {
          const original = Reflect.get(target, prop, receiver) as (
            ...args: unknown[]
          ) => unknown
          return (...args: unknown[]) => {
            txCalls.push(args)
            return original.apply(target, args)
          }
        }
        return Reflect.get(target, prop, receiver)
      },
    }) as unknown as PrismaClient

    await ingest(wrappedPrisma, source)

    // At least one call with an array of 2 (the closing IngestionRun + Source updates)
    const arrayCalls = txCalls.filter(
      (call) => Array.isArray(call[0]) && (call[0] as unknown[]).length === 2,
    )
    expect(arrayCalls.length).toBeGreaterThanOrEqual(1)

    const run = await prisma.ingestionRun.findFirstOrThrow({ where: { sourceId: source.id } })
    expect(run.finishedAt).not.toBeNull()
    expect(run.itemsFound).toBe(2)
    expect(run.itemsNew).toBe(2)
    const after = await prisma.source.findUniqueOrThrow({ where: { id: source.id } })
    expect(after.consecutiveFailures).toBe(0)
    expect(after.healthStatus).toBe('OK')
    expect(after.lastSuccessAt).not.toBeNull()
    expect(after.lastFetchedAt).not.toBeNull()
  })

  // ---------------------------------------------------------------------------
  // INGEST-05 — transactional failure path
  // ---------------------------------------------------------------------------
  it('wraps IngestionRun.update + Source.update in a single db.$transaction on failure', async () => {
    mockOtsAdapter(undefined, new Error('boom'))

    const txCalls: unknown[][] = []
    const wrappedPrisma = new Proxy(prisma, {
      get(target, prop, receiver) {
        if (prop === '$transaction') {
          const original = Reflect.get(target, prop, receiver) as (
            ...args: unknown[]
          ) => unknown
          return (...args: unknown[]) => {
            txCalls.push(args)
            return original.apply(target, args)
          }
        }
        return Reflect.get(target, prop, receiver)
      },
    }) as unknown as PrismaClient

    await expect(ingest(wrappedPrisma, source)).rejects.toThrow('boom')

    const arrayCalls = txCalls.filter(
      (call) => Array.isArray(call[0]) && (call[0] as unknown[]).length === 2,
    )
    expect(arrayCalls.length).toBeGreaterThanOrEqual(1)

    const run = await prisma.ingestionRun.findFirstOrThrow({ where: { sourceId: source.id } })
    expect(run.finishedAt).not.toBeNull()
    expect(run.error).toBe('boom')
    const after = await prisma.source.findUniqueOrThrow({ where: { id: source.id } })
    expect(after.consecutiveFailures).toBe(1)
    expect(after.healthStatus).toBe('DEGRADED')
  })

  // ---------------------------------------------------------------------------
  // INGEST-03 — lastFetchedAt persisted on success
  // ---------------------------------------------------------------------------
  it('persists lastFetchedAt = new Date() on success', async () => {
    mockOtsAdapter([])

    const before = Date.now()
    await ingest(prisma, source)
    const after = Date.now()

    const reloaded = await prisma.source.findUniqueOrThrow({ where: { id: source.id } })
    expect(reloaded.lastFetchedAt).not.toBeNull()
    const ts = reloaded.lastFetchedAt!.getTime()
    expect(ts).toBeGreaterThanOrEqual(before)
    expect(ts).toBeLessThanOrEqual(after + 1000)
  })

  // ---------------------------------------------------------------------------
  // INGEST-04 — etag / lastModified tri-state semantics
  // ---------------------------------------------------------------------------
  it('persists new etag and lastModified when adapter returns string values (RSS 200)', async () => {
    mockOtsAdapter({
      items: [],
      etag: '"abc"',
      lastModified: 'Wed, 12 May 2026 10:00:00 GMT',
    })

    await ingest(prisma, source)

    const reloaded = await prisma.source.findUniqueOrThrow({ where: { id: source.id } })
    expect(reloaded.etag).toBe('"abc"')
    expect(reloaded.lastModified).toBe('Wed, 12 May 2026 10:00:00 GMT')
    expect(reloaded.lastFetchedAt).not.toBeNull()
  })

  it('preserves prior etag when adapter returns undefined (RSS 304)', async () => {
    // Pre-seed an etag on the Source
    await prisma.source.update({
      where: { id: source.id },
      data: { etag: '"old"', lastModified: 'Wed, 01 May 2026 10:00:00 GMT' },
    })
    const seeded = await prisma.source.findUniqueOrThrow({ where: { id: source.id } })

    mockOtsAdapter({ items: [], etag: undefined, lastModified: undefined })

    await ingest(prisma, seeded)

    const reloaded = await prisma.source.findUniqueOrThrow({ where: { id: source.id } })
    expect(reloaded.etag).toBe('"old"')
    expect(reloaded.lastModified).toBe('Wed, 01 May 2026 10:00:00 GMT')
    // lastFetchedAt MUST still update even on 304 (we did make a successful round-trip)
    expect(reloaded.lastFetchedAt).not.toBeNull()
  })

  it('leaves etag/lastModified untouched (null) when adapter returns null (OTS)', async () => {
    mockOtsAdapter({ items: [], etag: null, lastModified: null })

    await ingest(prisma, source)

    const reloaded = await prisma.source.findUniqueOrThrow({ where: { id: source.id } })
    expect(reloaded.etag).toBeNull()
    expect(reloaded.lastModified).toBeNull()
    expect(reloaded.lastFetchedAt).not.toBeNull()
  })
})
