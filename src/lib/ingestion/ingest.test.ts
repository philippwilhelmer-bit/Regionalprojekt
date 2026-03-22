/**
 * Tests for the core ingest() orchestrator.
 *
 * Requirements:
 *   ING-04 — Health tracking: consecutiveFailures, DEGRADED/DOWN/OK transitions
 *   ING-05 — Adapter registry: ingest() resolves adapter from registry
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { createTestDb, cleanDb } from '../../test/setup-db'
import type { PrismaClient, Source } from '@prisma/client'
import { ingest } from './ingest'

// healthFailureThreshold default = 3 (from source.healthFailureThreshold field default)
const HEALTH_FAILURE_THRESHOLD = 3
import { adapterRegistry } from './adapters/registry'
import type { RawItem } from './types'

// Helper: build a minimal RawItem for testing
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

// Helper: mock adapterRegistry.OTS_AT with a vi.fn() returning resolvedValue/rejectedValue.
// Returns the mock so tests can assert on it if needed.
function mockOtsAdapter(
  resolvedValue?: RawItem[],
  rejectedError?: Error,
) {
  const mockFn = resolvedValue !== undefined
    ? vi.fn().mockResolvedValue(resolvedValue)
    : vi.fn().mockRejectedValue(rejectedError ?? new Error('adapter error'))
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
    // Restore original adapter after each test
    adapterRegistry.OTS_AT = originalAdapter
    vi.restoreAllMocks()
  })

  it('creates an IngestionRun record at start and closes it on success', async () => {
    // Arrange: mock adapter returns one item
    mockOtsAdapter([makeRawItem()])

    // Act
    await ingest(prisma, source)

    // Assert: IngestionRun exists and is closed
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

  it('skips duplicate items (isDuplicate returns true) and does not write to Article table', async () => {
    // Pre-seed an existing article with the same externalId
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

    // Only the pre-seeded article exists
    const articles = await prisma.article.findMany()
    expect(articles).toHaveLength(1)
  })

  it('resets consecutiveFailures to 0 and updates lastSuccessAt on success', async () => {
    // Start with some pre-existing failures
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
    // Simulate source already at threshold - 1 failures
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
})
