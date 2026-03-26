/**
 * Phase 7 validation test suite.
 *
 * Four describe blocks mirror the four Phase 7 success criteria:
 *   1. Adapter Extensibility (ING-02)
 *   2. Cross-Source Deduplication (ING-03)
 *   3. Operator Alerts (circuit-breaker, dead-man, source health)
 *   4. Reader Query Performance
 *
 * Pitfall notes addressed in this file:
 * - ingest() THROWS after adapter failure — all health tests wrap calls in try/catch
 * - src.consecutiveFailures is read from the passed object (not re-fetched from DB):
 *   seed the source with the right starting count to reach the desired health state in one call
 * - console.warn fires for BOTH DEGRADED and DOWN (not just DOWN at threshold)
 * - Dead-man fires when lastPublishedAt is null (no articles → Infinity >= threshold):
 *   the NO-FIRE case must have a recently-published article, not an empty DB
 * - Criterion 4 uses its own beforeAll for bulk seeding (not beforeEach)
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { PrismaClient } from '@prisma/client'
import { createTestDb, cleanDb, seedBulkArticles } from './setup-db'
import { adapterRegistry } from '../lib/ingestion/adapters/registry'
import { ingest } from '../lib/ingestion/ingest'
import { computeContentHash } from '../lib/ingestion/dedup'
import { checkCostCircuitBreaker } from '../lib/ai/circuit-breaker'
import { checkDeadMan } from '../lib/publish/dead-man'
import { listArticlesReader, getArticleByPublicId, getArticlesByBezirk } from '../lib/content/articles'

let db: PrismaClient

beforeAll(async () => {
  db = await createTestDb()
})

// ─── Criterion 1: Adapter Extensibility (ING-02) ─────────────────────────────

describe('Criterion 1: Adapter Extensibility', () => {
  beforeEach(async () => { await cleanDb(db) })

  const fixtureXml = readFileSync(
    join(process.cwd(), 'src/test/fixtures/orf-steiermark.rss.xml'),
    'utf-8'
  )

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('ingests ORF Steiermark via RSS adapter with no new adapter code', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => fixtureXml,
    } as Response)

    const source = await db.source.create({
      data: {
        type: 'RSS',
        url: 'https://steiermark.orf.at/rss',
        enabled: true,
        pollIntervalMinutes: 30,
      },
    })

    const result = await ingest(db, source)

    expect(result.itemsNew).toBeGreaterThan(0)

    const articles = await db.article.findMany({ where: { source: 'RSS' } })
    expect(articles.length).toBeGreaterThan(0)
  })
})

// ─── Criterion 2: Cross-Source Deduplication (ING-03) ────────────────────────

describe('Criterion 2: Cross-Source Deduplication', () => {
  beforeEach(async () => { await cleanDb(db) })

  const originalRss = adapterRegistry.RSS

  afterEach(() => {
    adapterRegistry.RSS = originalRss
  })

  it('blocks duplicate when same article arrives via OTS_AT then RSS', async () => {
    const title = 'Unwetter in Graz: Starke Regenfälle'
    const body = 'Starke Regenfälle haben in Graz zu Überflutungen geführt.'
    const contentHash = computeContentHash(title, body)

    // Pre-seed the OTS_AT article
    await db.article.create({
      data: {
        externalId: 'ots-123',
        source: 'OTS_AT',
        status: 'FETCHED',
        title,
        content: body,
        contentHash,
      },
    })

    adapterRegistry.RSS = vi.fn().mockResolvedValue([
      {
        externalId: 'rss-999',
        title,
        body,
        sourceUrl: 'https://steiermark.orf.at/stories/999',
        publishedAt: new Date(),
      },
    ])

    const rssSource = await db.source.create({
      data: { type: 'RSS', url: 'https://steiermark.orf.at/rss', enabled: true, pollIntervalMinutes: 30 },
    })

    const result = await ingest(db, rssSource)

    expect(result.itemsNew).toBe(0)
    const allArticles = await db.article.findMany()
    expect(allArticles).toHaveLength(1)
  })

  it('allows article that has different content via RSS', async () => {
    adapterRegistry.RSS = vi.fn().mockResolvedValue([
      {
        externalId: 'rss-new-1',
        title: 'Anderer Artikel in Leoben',
        body: 'Völlig andere Nachricht aus Leoben.',
        sourceUrl: 'https://steiermark.orf.at/stories/new-1',
        publishedAt: new Date(),
      },
    ])

    const rssSource = await db.source.create({
      data: { type: 'RSS', url: 'https://steiermark.orf.at/rss', enabled: true, pollIntervalMinutes: 30 },
    })

    const result = await ingest(db, rssSource)

    expect(result.itemsNew).toBe(1)
  })
})

// ─── Criterion 3: Operator Alerts ────────────────────────────────────────────

describe('Criterion 3: Operator Alerts', () => {
  beforeEach(async () => { await cleanDb(db) })

  const originalRss = adapterRegistry.RSS

  afterEach(() => {
    adapterRegistry.RSS = originalRss
    vi.restoreAllMocks()
  })

  // Source health —————————————————————————————————————————————————————————————
  //
  // PITFALL: console.warn fires for BOTH DEGRADED and DOWN — there is no "no-fire"
  // case based on failure count alone. We test both states.
  //
  // PITFALL: ingest() re-reads consecutiveFailures from the src OBJECT passed in,
  // not from DB. To reach DOWN in a single call, seed the source with
  // consecutiveFailures = healthFailureThreshold - 1.

  it('emits DEGRADED alert on first adapter failure', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const source = await db.source.create({
      data: {
        type: 'RSS',
        url: 'https://steiermark.orf.at/rss',
        enabled: true,
        pollIntervalMinutes: 30,
        consecutiveFailures: 0,
        healthFailureThreshold: 3,
      },
    })

    adapterRegistry.RSS = vi.fn().mockRejectedValue(new Error('Network error'))

    try { await ingest(db, source) } catch { /* expected */ }

    expect(warnSpy).toHaveBeenCalledOnce()
    expect(warnSpy.mock.calls[0][0]).toContain('DEGRADED')
  })

  it('emits DOWN alert when consecutive failures reach threshold', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // consecutiveFailures = threshold - 1 so that one more failure tips to DOWN
    const source = await db.source.create({
      data: {
        type: 'RSS',
        url: 'https://steiermark.orf.at/rss',
        enabled: true,
        pollIntervalMinutes: 30,
        consecutiveFailures: 2,
        healthFailureThreshold: 3,
      },
    })

    adapterRegistry.RSS = vi.fn().mockRejectedValue(new Error('Network error'))

    try { await ingest(db, source) } catch { /* expected */ }

    expect(warnSpy).toHaveBeenCalledOnce()
    expect(warnSpy.mock.calls[0][0]).toContain('DOWN')
  })

  // Circuit breaker ——————————————————————————————————————————————————————————

  it('fires circuit-breaker alert when daily token threshold exceeded', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await db.pipelineRun.create({
      data: { totalInputTokens: 300_000, totalOutputTokens: 300_000 },
    })

    const result = await checkCostCircuitBreaker(db)

    expect(result).toBe(false)
    expect(warnSpy).toHaveBeenCalledOnce()
    expect(warnSpy.mock.calls[0][0]).toContain('CIRCUIT_BREAKER')
  })

  it('does not fire circuit-breaker alert when below threshold', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await db.pipelineRun.create({
      data: { totalInputTokens: 50_000, totalOutputTokens: 50_000 },
    })

    const result = await checkCostCircuitBreaker(db)

    expect(result).toBe(true)
    expect(warnSpy).not.toHaveBeenCalled()
  })

  // Dead-man monitor ————————————————————————————————————————————————————————
  //
  // PITFALL: checkDeadMan fires when there are NO articles because
  // lastPublishedAt = null → silenceDurationHours = Infinity >= threshold.
  // The NO-FIRE case MUST have a recently-published article.

  it('fires dead-man alert when last publish exceeds threshold', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await db.pipelineConfig.create({ data: { maxRetryCount: 3, deadManThresholdHours: 6 } })

    const sevenHoursAgo = new Date(Date.now() - 7 * 60 * 60 * 1000)
    await db.article.create({
      data: {
        source: 'MANUAL',
        status: 'PUBLISHED',
        publishedAt: sevenHoursAgo,
        isAutoGenerated: false,
      },
    })

    await checkDeadMan(db)

    expect(warnSpy).toHaveBeenCalledOnce()
    expect(warnSpy.mock.calls[0][0]).toEqual(
      expect.objectContaining({ type: 'DEAD_MAN_ALERT' })
    )
  })

  it('does not fire dead-man alert when recently published', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await db.pipelineConfig.create({ data: { maxRetryCount: 3, deadManThresholdHours: 6 } })

    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)
    await db.article.create({
      data: {
        source: 'MANUAL',
        status: 'PUBLISHED',
        publishedAt: oneHourAgo,
        isAutoGenerated: false,
      },
    })

    await checkDeadMan(db)

    expect(warnSpy).not.toHaveBeenCalled()
  })
})

// ─── Criterion 4: Reader Query Performance ───────────────────────────────────

describe('Criterion 4: Reader Query Performance', () => {
  // PITFALL: use a nested beforeAll (not beforeEach) to seed 1000 articles once
  // per describe block. Seeding 1000 rows per test would time out.
  beforeAll(async () => {
    await cleanDb(db)
    await seedBulkArticles(db, 1000)
  }, 60_000)

  it('listArticlesReader completes in under 500ms against 1000 articles', async () => {
    const bezirke = await db.bezirk.findMany({ take: 1 })
    const bezirkIds = bezirke.map((b) => b.id)

    const start = performance.now()
    const articles = await listArticlesReader(db, { bezirkIds, limit: 20 })
    const elapsed = performance.now() - start

    expect(articles.length).toBeGreaterThan(0)
    expect(elapsed).toBeLessThan(500)
  })

  it('getArticleByPublicId completes in under 500ms', async () => {
    const sample = await db.article.findFirst({ where: { publicId: { not: null } } })
    expect(sample?.publicId).toBeTruthy()

    const start = performance.now()
    const article = await getArticleByPublicId(db, sample!.publicId!)
    const elapsed = performance.now() - start

    expect(article).not.toBeNull()
    expect(elapsed).toBeLessThan(500)
  })

  it('getArticlesByBezirk completes in under 500ms', async () => {
    const bezirk = await db.bezirk.findFirst()
    expect(bezirk).not.toBeNull()

    const start = performance.now()
    const articles = await getArticlesByBezirk(db, bezirk!.slug, { limit: 20 })
    const elapsed = performance.now() - start

    expect(articles.length).toBeGreaterThan(0)
    expect(elapsed).toBeLessThan(500)
  })
})
