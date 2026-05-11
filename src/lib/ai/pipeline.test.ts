/**
 * Integration tests for processArticles() pipeline orchestrator.
 *
 * Uses pgLite in-process test DB (no external services).
 * Anthropic client is mocked by overriding _clientFactory.create before each test.
 *
 * After Plan 43-03, the default code path is the merged tool_use call
 * (AI_USE_MERGED_CALL='true'). Existing assertions are mapped onto the merged
 * mock builder. The legacy two-step path is kept for one rollback milestone
 * and is exercised by the "AI_USE_MERGED_CALL=false" regression test.
 *
 * Requirements: AI-01..05, SEO-02, INTG-01, AIPL-07..09
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import Anthropic from '@anthropic-ai/sdk'
import { createTestDb, cleanDb } from '../../test/setup-db'
import { processArticles, _clientFactory } from './pipeline'

// pgLite spin-up + Prisma migrate apply can occasionally exceed the 10s
// default hook timeout once the test suite grows past ~30 cases (Plan 43-03
// expanded this file from 24 to 33 tests). Lift the hook timeout to 30s so
// the suite is not flaky on slower machines without making the actual tests
// any slower.
const HOOK_TIMEOUT_MS = 30_000

// ---------------------------------------------------------------------------
// Mock location intelligence modules (INTG-01)
// ---------------------------------------------------------------------------

vi.mock('../images/locextract', () => ({
  extractLocation: vi.fn().mockReturnValue(null),
  // AIPL-08: default mock returns the new LocationFallbackResult shape with zero tokens
  llmLocationFallback: vi
    .fn()
    .mockResolvedValue({ location: null, inputTokens: 0, outputTokens: 0 }),
}))

vi.mock('../images/geocode', () => ({
  geocodeLocation: vi.fn().mockResolvedValue(null),
}))

vi.mock('../images/mapgen', () => ({
  generateMapImage: vi.fn().mockResolvedValue(null),
}))

import { extractLocation, llmLocationFallback } from '../images/locextract'
import { geocodeLocation } from '../images/geocode'
import { generateMapImage } from '../images/mapgen'

// ---------------------------------------------------------------------------
// Mock Anthropic clients
// ---------------------------------------------------------------------------

// ---- Merged path (AI_USE_MERGED_CALL='true') -----------------------------

interface MergedToolInput {
  bezirkSlugs: string[]
  isStateWide: boolean
  mentionsPrivateIndividual: boolean
  headline: string
  lead: string
  body: string
  seoTitle: string
  metaDescription: string
}

interface MergedUsage {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
}

const DEFAULT_MERGED_INPUT: MergedToolInput = {
  bezirkSlugs: ['graz'],
  isStateWide: false,
  mentionsPrivateIndividual: false,
  headline: 'Test Headline',
  lead: 'Test lead sentence.',
  body: 'Test body content.',
  seoTitle: 'SEO Test Title',
  metaDescription: 'SEO test meta description.',
}

const DEFAULT_MERGED_USAGE: MergedUsage = {
  input_tokens: 100,
  output_tokens: 200,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
}

/**
 * Single tool_use response — the merged path expects exactly one of these
 * per FETCHED article (AIPL-01 invariant).
 */
function makeMergedToolUseResponse(
  input: Partial<MergedToolInput> = {},
  usage: Partial<MergedUsage> = {},
) {
  return {
    content: [
      {
        type: 'tool_use',
        id: 'tool_test_1',
        name: 'publish_article',
        input: { ...DEFAULT_MERGED_INPUT, ...input },
      },
    ],
    usage: { ...DEFAULT_MERGED_USAGE, ...usage },
    stop_reason: 'tool_use',
  }
}

/**
 * Merged-path mock client — every messages.create call resolves to the SAME
 * tool_use response (NOT alternating; merged path is one-call-per-article).
 */
function makeMockMergedClient(
  input: Partial<MergedToolInput> = {},
  usage: Partial<MergedUsage> = {},
) {
  const mockCreate = vi.fn().mockResolvedValue(makeMergedToolUseResponse(input, usage))
  return { messages: { create: mockCreate } }
}

// ---- Legacy two-step path (AI_USE_MERGED_CALL='false') -------------------

function makeStep1Response(bezirkSlugs: string[], hasNamedPerson: boolean) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ bezirkSlugs, hasNamedPerson }),
      },
    ],
    usage: { input_tokens: 100, output_tokens: 50 },
  }
}

function makeStep2Response() {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          headline: 'Test Headline',
          lead: 'Test lead sentence.',
          body: 'Test body content.',
          seoTitle: 'SEO Test Title',
          metaDescription: 'SEO test meta description.',
        }),
      },
    ],
    usage: { input_tokens: 200, output_tokens: 150 },
  }
}

/**
 * Legacy alternating mock: odd calls → Step 1 response, even → Step 2.
 * Used only by the "AI_USE_MERGED_CALL=false" regression test below.
 */
function makeMockAnthropicClient(
  step1Response = makeStep1Response(['graz'], false),
  step2Response = makeStep2Response(),
) {
  let callCount = 0
  const mockCreate = vi.fn().mockImplementation(() => {
    callCount++
    return Promise.resolve(callCount % 2 === 1 ? step1Response : step2Response)
  })
  return { messages: { create: mockCreate } }
}

/** Creates a mock Anthropic client that always throws. */
function makeFailingAnthropicClient(message = 'AI failure') {
  const mockCreate = vi.fn().mockRejectedValue(new Error(message))
  return { messages: { create: mockCreate } }
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let db: PrismaClient
const originalCreate = _clientFactory.create

beforeEach(async () => {
  db = await createTestDb()
  await cleanDb(db)
  // Default: merged-call path. Individual tests override via vi.stubEnv.
  vi.stubEnv('AI_USE_MERGED_CALL', 'true')
}, HOOK_TIMEOUT_MS)

afterEach(async () => {
  _clientFactory.create = originalCreate
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
}, HOOK_TIMEOUT_MS)

/**
 * Seeds a Bezirk and a FETCHED article into the test DB.
 */
async function seedFetchedArticle(overrides: { bezirkSlug?: string } = {}) {
  const bezirkSlug = overrides.bezirkSlug ?? 'graz'
  const bezirk = await db.bezirk.create({
    data: {
      slug: bezirkSlug,
      name: bezirkSlug === 'graz' ? 'Graz (Stadt)' : bezirkSlug,
      gemeindeSynonyms: [],
    },
  })
  const article = await db.article.create({
    data: {
      source: 'OTS_AT',
      status: 'FETCHED',
      title: 'Original Title',
      content: 'Original article content about something regional.',
      rawPayload: { text: 'raw OTS payload content' },
    },
  })
  return { article, bezirk }
}

/**
 * Seeds a Bezirk (if not yet present) and an article with given status/retryCount.
 */
async function seedArticleWithStatus(
  status: 'FETCHED' | 'ERROR' | 'FAILED' | 'TAGGED',
  retryCount = 0,
) {
  const bezirk = await db.bezirk.upsert({
    where: { slug: 'graz' },
    create: { slug: 'graz', name: 'Graz (Stadt)', gemeindeSynonyms: [] },
    update: {},
  })
  const article = await db.article.create({
    data: {
      source: 'OTS_AT',
      status,
      retryCount,
      title: `Article (${status})`,
      content: 'content',
    },
  })
  return { article, bezirk }
}

// ---------------------------------------------------------------------------
// Tests — default merged path (AI_USE_MERGED_CALL='true')
// ---------------------------------------------------------------------------

describe('processArticles()', () => {
  it('advances a FETCHED article to WRITTEN via a single merged call', async () => {
    const { article } = await seedFetchedArticle()
    _clientFactory.create = () => makeMockMergedClient() as any

    await processArticles(db)

    const updated = await db.article.findUniqueOrThrow({ where: { id: article.id } })
    expect(updated.status).toBe('WRITTEN')
  })

  it('writes headline/lead/body to Article row (AI-01)', async () => {
    const { article } = await seedFetchedArticle()
    _clientFactory.create = () => makeMockMergedClient() as any

    await processArticles(db)

    const updated = await db.article.findUniqueOrThrow({ where: { id: article.id } })
    expect(updated.title).toBe('Test Headline')
    expect(updated.content).toBe('Test lead sentence.\n\nTest body content.')
  })

  it('writes seoTitle and metaDescription to Article row (SEO-02)', async () => {
    const { article } = await seedFetchedArticle()
    _clientFactory.create = () => makeMockMergedClient() as any

    await processArticles(db)

    const updated = await db.article.findUniqueOrThrow({ where: { id: article.id } })
    expect(updated.seoTitle).toBe('SEO Test Title')
    expect(updated.metaDescription).toBe('SEO test meta description.')
  })

  it('creates ArticleBezirk rows for returned bezirkSlugs (AI-02)', async () => {
    const { article, bezirk } = await seedFetchedArticle()
    _clientFactory.create = () => makeMockMergedClient({ bezirkSlugs: ['graz'] }) as any

    await processArticles(db)

    const junction = await db.articleBezirk.findFirst({
      where: { articleId: article.id, bezirkId: bezirk.id },
    })
    expect(junction).not.toBeNull()
    expect(junction?.taggedAt).toBeInstanceOf(Date)
  })

  it('sets status REVIEW (not WRITTEN) when mentionsPrivateIndividual is true (AI-03)', async () => {
    const { article } = await seedFetchedArticle()
    _clientFactory.create = () =>
      makeMockMergedClient({ bezirkSlugs: ['graz'], mentionsPrivateIndividual: true }) as any

    await processArticles(db)

    const updated = await db.article.findUniqueOrThrow({ where: { id: article.id } })
    expect(updated.status).toBe('REVIEW')
  })

  it('records PipelineRun with token totals (merged path)', async () => {
    await seedFetchedArticle()
    _clientFactory.create = () => makeMockMergedClient() as any

    await processArticles(db)

    const run = await db.pipelineRun.findFirst({ orderBy: { id: 'desc' } })
    expect(run).not.toBeNull()
    expect(run?.articlesProcessed).toBe(1)
    // Default merged usage: input_tokens=100, output_tokens=200, no cache reads/writes
    expect(run?.totalInputTokens).toBe(100)
    expect(run?.totalOutputTokens).toBe(200)
    expect(run?.finishedAt).toBeInstanceOf(Date)
  })

  it('returns ProcessResult with articlesProcessed and articlesWritten counts', async () => {
    await seedFetchedArticle()
    _clientFactory.create = () => makeMockMergedClient() as any

    const result = await processArticles(db)

    expect(result.articlesProcessed).toBe(1)
    expect(result.articlesWritten).toBe(1)
    expect(result.totalInputTokens).toBe(100)
    expect(result.totalOutputTokens).toBe(200)
    expect(result.totalCachedInputTokens).toBe(0)
  })

  it('circuit-breaker returns false → returns zero counts without opening PipelineRun', async () => {
    await seedFetchedArticle()

    await db.pipelineRun.create({
      data: {
        startedAt: new Date(),
        finishedAt: new Date(),
        articlesProcessed: 1,
        totalInputTokens: 400_000,
        totalOutputTokens: 200_000, // total = 600_000 >= 500_000 threshold
      },
    })

    const runsBefore = await db.pipelineRun.count()

    const mockClient = makeMockMergedClient()
    _clientFactory.create = () => mockClient as any

    const result = await processArticles(db)

    expect(result.articlesProcessed).toBe(0)
    expect(result.articlesWritten).toBe(0)
    expect(result.totalCachedInputTokens).toBe(0)

    const runsAfter = await db.pipelineRun.count()
    expect(runsAfter).toBe(runsBefore)
  })

  // FLIPPED (was: "TAGGED/WRITTEN/REVIEW articles are NOT reprocessed"). Per
  // AIPL-07, TAGGED rows are now reprocessed; only WRITTEN/REVIEW remain
  // excluded. The separate "TAGGED article is picked up" test below asserts
  // the inclusion side.
  it('WRITTEN/REVIEW articles are NOT reprocessed (only FETCHED/ERROR/TAGGED selected)', async () => {
    await db.bezirk.create({
      data: { slug: 'graz', name: 'Graz (Stadt)', gemeindeSynonyms: [] },
    })

    // Create articles in non-retryable states (TAGGED no longer in this set after AIPL-07)
    await db.article.createMany({
      data: [
        { source: 'OTS_AT', status: 'WRITTEN', title: 'Written', content: 'x' },
        { source: 'OTS_AT', status: 'REVIEW', title: 'Review', content: 'x' },
      ],
    })

    const mockClient = makeMockMergedClient()
    _clientFactory.create = () => mockClient as any

    const result = await processArticles(db)

    expect(result.articlesProcessed).toBe(0)
    expect(mockClient.messages.create).not.toHaveBeenCalled()
  })

  it('per-article error: one article throws → console.error logged → other articles continue', async () => {
    await db.bezirk.create({
      data: { slug: 'graz', name: 'Graz (Stadt)', gemeindeSynonyms: [] },
    })

    await db.article.createMany({
      data: [
        { source: 'OTS_AT', status: 'FETCHED', title: 'Article 1', content: 'content 1' },
        { source: 'OTS_AT', status: 'FETCHED', title: 'Article 2', content: 'content 2' },
      ],
    })

    // First call throws, second succeeds (merged path = one call per article)
    let callCount = 0
    const mockCreate = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) return Promise.reject(new Error('Merged call failure for article 1'))
      return Promise.resolve(makeMergedToolUseResponse())
    })

    _clientFactory.create = () => ({ messages: { create: mockCreate } } as any)
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await processArticles(db)

    expect(result.articlesProcessed).toBe(2)
    expect(result.articlesWritten).toBe(1)
    expect(consoleSpy).toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // ERROR retry and FAILED permanent exclusion (Plan 04-03)
  // ---------------------------------------------------------------------------

  it('ERROR article with retryCount=0 → stays ERROR with retryCount=1 after AI failure', async () => {
    const { article } = await seedArticleWithStatus('ERROR', 0)
    _clientFactory.create = () => makeFailingAnthropicClient('Transient AI error') as any
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await processArticles(db)

    const updated = await db.article.findUniqueOrThrow({ where: { id: article.id } })
    expect(updated.status).toBe('ERROR')
    expect(updated.retryCount).toBe(1)
  })

  it('ERROR article with retryCount=2 (MAX_RETRY_COUNT-1) → becomes FAILED with retryCount=3 after AI failure', async () => {
    const { article } = await seedArticleWithStatus('ERROR', 2)
    _clientFactory.create = () => makeFailingAnthropicClient('Terminal AI error') as any
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await processArticles(db)

    const updated = await db.article.findUniqueOrThrow({ where: { id: article.id } })
    expect(updated.status).toBe('FAILED')
    expect(updated.retryCount).toBe(3)
  })

  it('FAILED article is excluded from processing (articlesProcessed remains 0)', async () => {
    const { article } = await seedArticleWithStatus('FAILED', 3)
    const mockClient = makeMockMergedClient()
    _clientFactory.create = () => mockClient as any

    const result = await processArticles(db)

    expect(result.articlesProcessed).toBe(0)
    expect(mockClient.messages.create).not.toHaveBeenCalled()

    const unchanged = await db.article.findUniqueOrThrow({ where: { id: article.id } })
    expect(unchanged.status).toBe('FAILED')
  })

  it('FETCHED and ERROR articles are both picked up in the same run', async () => {
    await seedArticleWithStatus('FETCHED', 0)
    await seedArticleWithStatus('ERROR', 1)

    // Merged path: 1 call per article = 2 total
    const mockClient = makeMockMergedClient()
    _clientFactory.create = () => mockClient as any

    const result = await processArticles(db)

    expect(result.articlesProcessed).toBe(2)
    expect(mockClient.messages.create).toHaveBeenCalledTimes(2)
  })

  it('after AI failure, errorMessage is non-null and contains the error string', async () => {
    const { article } = await seedArticleWithStatus('FETCHED', 0)
    _clientFactory.create = () => makeFailingAnthropicClient('Network timeout') as any
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await processArticles(db)

    const updated = await db.article.findUniqueOrThrow({ where: { id: article.id } })
    expect(updated.errorMessage).not.toBeNull()
    expect(updated.errorMessage).toContain('Network timeout')
  })

  // ---------------------------------------------------------------------------
  // State-wide article pipeline (Phase 11-01 → merged.ts schema boundary guard)
  // ---------------------------------------------------------------------------

  it('sets isStateWide=true when merged returns isStateWide=true', async () => {
    const { article } = await seedFetchedArticle()
    _clientFactory.create = () =>
      makeMockMergedClient({ bezirkSlugs: [], isStateWide: true }) as any

    await processArticles(db)

    const updated = await db.article.findUniqueOrThrow({ where: { id: article.id } })
    expect(updated.isStateWide).toBe(true)
    expect(updated.status).toBe('WRITTEN')
  })

  it('creates no ArticleBezirk rows for state-wide article', async () => {
    const { article } = await seedFetchedArticle()
    _clientFactory.create = () =>
      makeMockMergedClient({ bezirkSlugs: [], isStateWide: true }) as any

    await processArticles(db)

    const rows = await db.articleBezirk.findMany({ where: { articleId: article.id } })
    expect(rows).toEqual([])
  })

  it('one failing article does not prevent other articles in the batch from succeeding', async () => {
    await db.bezirk.upsert({
      where: { slug: 'graz' },
      create: { slug: 'graz', name: 'Graz (Stadt)', gemeindeSynonyms: [] },
      update: {},
    })

    const failing = await db.article.create({
      data: { source: 'OTS_AT', status: 'FETCHED', title: 'Failing', content: 'content' },
    })
    const succeeding = await db.article.create({
      data: { source: 'OTS_AT', status: 'FETCHED', title: 'Succeeding', content: 'content' },
    })

    // Merged path: first call throws (article 1), second succeeds (article 2)
    let callCount = 0
    const mockCreate = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) return Promise.reject(new Error('Merged call failure'))
      return Promise.resolve(makeMergedToolUseResponse())
    })
    _clientFactory.create = () => ({ messages: { create: mockCreate } } as any)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await processArticles(db)

    expect(result.articlesProcessed).toBe(2)
    expect(result.articlesWritten).toBe(1)

    const failingUpdated = await db.article.findUniqueOrThrow({ where: { id: failing.id } })
    expect(failingUpdated.status).toBe('ERROR')

    const succeedingUpdated = await db.article.findUniqueOrThrow({ where: { id: succeeding.id } })
    expect(succeedingUpdated.status).toBe('WRITTEN')
  })

  // ---------------------------------------------------------------------------
  // INTG-01: Map generation integration tests
  // ---------------------------------------------------------------------------

  it('generates map image for article with recognized place name (INTG-01)', async () => {
    const { article } = await seedFetchedArticle()
    _clientFactory.create = () => makeMockMergedClient() as any

    vi.mocked(extractLocation).mockReturnValue('Graz')
    vi.mocked(geocodeLocation).mockResolvedValue({
      lat: 47.0707,
      lon: 15.4395,
      locationType: 'city',
      displayName: 'Graz, Steiermark, Austria',
    })
    vi.mocked(generateMapImage).mockResolvedValue({
      url: 'https://blob.example.com/maps/article-1.jpg',
      credit: '© basemap.at',
    })

    await processArticles(db)

    const updated = await db.article.findUniqueOrThrow({ where: { id: article.id } })
    expect(updated.imageUrl).toBe('https://blob.example.com/maps/article-1.jpg')
    expect(updated.imageCredit).toBe('© basemap.at')
    expect(updated.status).toBe('WRITTEN')
  })

  it('skips map generation when article.imageUrl already set (INTG-01)', async () => {
    await db.bezirk.upsert({
      where: { slug: 'graz' },
      create: { slug: 'graz', name: 'Graz (Stadt)', gemeindeSynonyms: [] },
      update: {},
    })
    const article = await db.article.create({
      data: {
        source: 'OTS_AT',
        status: 'FETCHED',
        title: 'Article with Unsplash image',
        content: 'Content mentioning Graz.',
        imageUrl: 'https://images.unsplash.com/photo-existing',
        imageCredit: 'Photo by John',
      },
    })
    _clientFactory.create = () => makeMockMergedClient() as any

    await processArticles(db)

    expect(vi.mocked(extractLocation)).not.toHaveBeenCalled()

    const updated = await db.article.findUniqueOrThrow({ where: { id: article.id } })
    expect(updated.imageUrl).toBe('https://images.unsplash.com/photo-existing')
    expect(updated.status).toBe('WRITTEN')
  })

  it('falls back to LLM when regex finds no location (INTG-01)', async () => {
    const { article } = await seedFetchedArticle()
    _clientFactory.create = () => makeMockMergedClient() as any

    vi.mocked(extractLocation).mockReturnValue(null)
    vi.mocked(llmLocationFallback).mockResolvedValue({
      location: 'Kapfenberg',
      inputTokens: 0,
      outputTokens: 0,
    })
    vi.mocked(geocodeLocation).mockResolvedValue({
      lat: 47.4439,
      lon: 15.2981,
      locationType: 'town',
      displayName: 'Kapfenberg, Steiermark, Austria',
    })
    vi.mocked(generateMapImage).mockResolvedValue({
      url: 'https://blob.example.com/maps/article-kapfenberg.jpg',
      credit: '© basemap.at',
    })

    await processArticles(db)

    expect(vi.mocked(geocodeLocation)).toHaveBeenCalledWith(expect.anything(), 'Kapfenberg')

    const updated = await db.article.findUniqueOrThrow({ where: { id: article.id } })
    expect(updated.imageUrl).toBe('https://blob.example.com/maps/article-kapfenberg.jpg')
  })

  it('publishes article normally when no location found (INTG-01)', async () => {
    const { article } = await seedFetchedArticle()
    _clientFactory.create = () => makeMockMergedClient() as any

    vi.mocked(extractLocation).mockReturnValue(null)
    vi.mocked(llmLocationFallback).mockResolvedValue({
      location: null,
      inputTokens: 0,
      outputTokens: 0,
    })

    await processArticles(db)

    const updated = await db.article.findUniqueOrThrow({ where: { id: article.id } })
    expect(updated.status).toBe('WRITTEN')
    expect(updated.imageUrl).toBeNull()
  })

  it('publishes article normally when map generation throws, logs console.warn (INTG-01)', async () => {
    const { article } = await seedFetchedArticle()
    _clientFactory.create = () => makeMockMergedClient() as any

    vi.mocked(extractLocation).mockReturnValue('Graz')
    vi.mocked(geocodeLocation).mockRejectedValue(new Error('Nominatim timeout'))

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await processArticles(db)

    const updated = await db.article.findUniqueOrThrow({ where: { id: article.id } })
    expect(updated.status).toBe('WRITTEN')

    expect(warnSpy).toHaveBeenCalled()
    const warnArg = warnSpy.mock.calls[0][0] as string
    expect(warnArg).toContain(String(article.id))
  })

  // ---------------------------------------------------------------------------
  // Phase 43-03 new: merged-call path invariants (AIPL-01, 05, 07, 08, 09)
  // ---------------------------------------------------------------------------

  describe('merged-call path', () => {
    it('issues exactly ONE messages.create call per FETCHED article (AIPL-01)', async () => {
      await seedFetchedArticle()
      const mockClient = makeMockMergedClient()
      _clientFactory.create = () => mockClient as any

      const result = await processArticles(db)

      expect(mockClient.messages.create).toHaveBeenCalledTimes(1)
      expect(result.articlesWritten).toBe(1)
    })

    it('routes to REVIEW when mentionsPrivateIndividual=true', async () => {
      const { article } = await seedFetchedArticle()
      _clientFactory.create = () =>
        makeMockMergedClient({ mentionsPrivateIndividual: true }) as any

      await processArticles(db)

      const updated = await db.article.findUniqueOrThrow({ where: { id: article.id } })
      expect(updated.status).toBe('REVIEW')
    })

    it('routes to REVIEW when bezirkSlugs is empty AND isStateWide=false (no Steiermark relevance)', async () => {
      const { article } = await seedFetchedArticle()
      _clientFactory.create = () =>
        makeMockMergedClient({ bezirkSlugs: [], isStateWide: false }) as any

      await processArticles(db)

      const updated = await db.article.findUniqueOrThrow({ where: { id: article.id } })
      expect(updated.status).toBe('REVIEW')
    })

    it('isStateWide=true with violation slugs → no ArticleBezirk rows written (schema-boundary guard)', async () => {
      const { article } = await seedFetchedArticle()
      // Model returns isStateWide=true AND a non-empty bezirkSlugs. runMergedCall's
      // schema-boundary guard clears the slugs before the pipeline ever sees them,
      // so the pipeline-level warn for this case is unreachable. We only assert the
      // observable contract: zero ArticleBezirk rows + isStateWide persisted.
      _clientFactory.create = () =>
        makeMockMergedClient({ bezirkSlugs: ['graz'], isStateWide: true }) as any

      await processArticles(db)

      const rows = await db.articleBezirk.findMany({ where: { articleId: article.id } })
      expect(rows).toEqual([])

      const updated = await db.article.findUniqueOrThrow({ where: { id: article.id } })
      expect(updated.isStateWide).toBe(true)
      expect(updated.status).toBe('WRITTEN')
    })

    it('totalInputTokens includes cacheCreationTokens; ProcessResult exposes totalCachedInputTokens (AIPL-05)', async () => {
      await seedFetchedArticle()
      _clientFactory.create = () =>
        makeMockMergedClient(
          {},
          {
            input_tokens: 80,
            output_tokens: 400,
            cache_creation_input_tokens: 1500,
            cache_read_input_tokens: 200,
          },
        ) as any

      const result = await processArticles(db)

      // totalInputTokens absorbs fresh input + cache_creation_input_tokens
      expect(result.totalInputTokens).toBe(80 + 1500)
      expect(result.totalOutputTokens).toBe(400)
      // cache_read_input_tokens surfaces separately for downstream telemetry
      expect(result.totalCachedInputTokens).toBe(200)

      // PipelineRun row mirrors totalInputTokens / totalOutputTokens but does NOT
      // include totalCachedInputTokens (column shape unchanged this phase)
      const run = await db.pipelineRun.findFirst({ orderBy: { id: 'desc' } })
      expect(run?.totalInputTokens).toBe(80 + 1500)
      expect(run?.totalOutputTokens).toBe(400)
    })

    it('TAGGED article IS reprocessed by the merged path (AIPL-07)', async () => {
      const { article } = await seedArticleWithStatus('TAGGED', 0)
      const mockClient = makeMockMergedClient()
      _clientFactory.create = () => mockClient as any

      const result = await processArticles(db)

      expect(result.articlesProcessed).toBe(1)
      const updated = await db.article.findUniqueOrThrow({ where: { id: article.id } })
      expect(updated.status).toBe('WRITTEN')
      expect(mockClient.messages.create).toHaveBeenCalledTimes(1)
    })

    it('location-fallback tokens flow into totals when extractLocation returns null (AIPL-08)', async () => {
      await seedFetchedArticle()
      _clientFactory.create = () =>
        makeMockMergedClient(
          {},
          { input_tokens: 100, output_tokens: 200, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
        ) as any

      vi.mocked(extractLocation).mockReturnValue(null)
      vi.mocked(llmLocationFallback).mockResolvedValue({
        location: 'Graz',
        inputTokens: 50,
        outputTokens: 5,
      })
      vi.mocked(geocodeLocation).mockResolvedValue({
        lat: 47.07,
        lon: 15.44,
        locationType: 'city',
        displayName: 'Graz',
      })
      vi.mocked(generateMapImage).mockResolvedValue({
        url: 'https://blob.example.com/maps/g.jpg',
        credit: '© basemap.at',
      })

      const result = await processArticles(db)

      // Merged baseline: 100 in, 200 out. Plus fallback: 50 in, 5 out.
      expect(result.totalInputTokens).toBe(100 + 50)
      expect(result.totalOutputTokens).toBe(200 + 5)
    })

    it('location-fallback tokens NOT added when extractLocation succeeded (AIPL-08 pitfall guard)', async () => {
      await seedFetchedArticle()
      _clientFactory.create = () =>
        makeMockMergedClient(
          {},
          { input_tokens: 100, output_tokens: 200, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
        ) as any

      vi.mocked(extractLocation).mockReturnValue('Graz')
      // High-token mock — must NOT be invoked or summed
      vi.mocked(llmLocationFallback).mockResolvedValue({
        location: 'should-not-be-used',
        inputTokens: 9999,
        outputTokens: 9999,
      })
      vi.mocked(geocodeLocation).mockResolvedValue({
        lat: 47.07,
        lon: 15.44,
        locationType: 'city',
        displayName: 'Graz',
      })
      vi.mocked(generateMapImage).mockResolvedValue(null)

      const result = await processArticles(db)

      // Only the merged-call usage; fallback never invoked
      expect(result.totalInputTokens).toBe(100)
      expect(result.totalOutputTokens).toBe(200)
      expect(vi.mocked(llmLocationFallback)).not.toHaveBeenCalled()
    })

    it('Anthropic client is constructed with maxRetries: 2 (AIPL-09)', () => {
      // Source-level assertion — the factory's string form must encode the
      // maxRetries: 2 literal. This is brittle to formatting but stable to
      // SDK API drift (more reliable than monkey-patching Anthropic.prototype
      // which has private constructor internals).
      const source = _clientFactory.create.toString()
      expect(source).toMatch(/maxRetries:\s*2/)

      // Functional: factory returns an Anthropic instance (no throw)
      const client = _clientFactory.create()
      expect(client).toBeInstanceOf(Anthropic)
    })
  })

  // ---------------------------------------------------------------------------
  // Phase 43-03 new: legacy two-step path regression guard
  // ---------------------------------------------------------------------------

  describe('legacy two-step path (AI_USE_MERGED_CALL=false)', () => {
    it('issues exactly TWO messages.create calls per article (Step 1 + Step 2)', async () => {
      vi.stubEnv('AI_USE_MERGED_CALL', 'false')

      await seedFetchedArticle()
      const mockClient = makeMockAnthropicClient()
      _clientFactory.create = () => mockClient as any

      const result = await processArticles(db)

      expect(mockClient.messages.create).toHaveBeenCalledTimes(2)
      expect(result.articlesWritten).toBe(1)
      // Legacy path token totals: Step1 (100 in + 50 out) + Step2 (200 in + 150 out)
      expect(result.totalInputTokens).toBe(300)
      expect(result.totalOutputTokens).toBe(200)
      // Legacy path never contributes to cached input
      expect(result.totalCachedInputTokens).toBe(0)
    })

    it('writes intermediate TAGGED status between Step 1 and Step 2 (legacy regression)', async () => {
      vi.stubEnv('AI_USE_MERGED_CALL', 'false')

      const { article } = await seedFetchedArticle()

      // Snapshot article status mid-pipeline: after the legacy path's Step 1
      // (call 1, which writes TAGGED) but BEFORE Step 2 (call 2, which writes
      // the final status). Hooking the mock client is reliable here because
      // it suspends pipeline progress between the two messages.create calls.
      let midRunStatus: string | null = null
      let callCount = 0
      const mockCreate = vi.fn().mockImplementation(async () => {
        callCount++
        if (callCount === 1) {
          // Step 1 has completed by the time this Promise resolves
          return makeStep1Response(['graz'], false)
        }
        // Between Step 1 and Step 2 — sample DB state
        const mid = await db.article.findUnique({ where: { id: article.id } })
        midRunStatus = mid?.status ?? null
        return makeStep2Response()
      })

      _clientFactory.create = () => ({ messages: { create: mockCreate } } as any)

      await processArticles(db)

      expect(midRunStatus).toBe('TAGGED')
      const updated = await db.article.findUniqueOrThrow({ where: { id: article.id } })
      expect(updated.status).toBe('WRITTEN')
    })
  })
})
