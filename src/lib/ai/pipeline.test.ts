/**
 * Integration tests for processArticles() pipeline orchestrator.
 *
 * Uses pgLite in-process test DB (no external services).
 * Anthropic client is mocked by overriding _clientFactory.create before each test.
 *
 * Requirements: AI-01, AI-02, AI-03, AI-04, AI-05, SEO-02
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { createTestDb, cleanDb } from '../../test/setup-db'
import { processArticles, _clientFactory } from './pipeline'

// ---------------------------------------------------------------------------
// Mock Anthropic client factory
// ---------------------------------------------------------------------------

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
 * Creates a mock Anthropic client that alternates responses:
 * odd calls → Step 1 response, even calls → Step 2 response.
 */
function makeMockAnthropicClient(
  step1Response = makeStep1Response(['graz'], false),
  step2Response = makeStep2Response()
) {
  let callCount = 0
  const mockCreate = vi.fn().mockImplementation(() => {
    callCount++
    return Promise.resolve(callCount % 2 === 1 ? step1Response : step2Response)
  })
  return {
    messages: { create: mockCreate },
  }
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let db: PrismaClient
const originalCreate = _clientFactory.create

beforeEach(async () => {
  db = await createTestDb()
  await cleanDb(db)
})

afterEach(async () => {
  // Restore factory after each test
  _clientFactory.create = originalCreate
  vi.restoreAllMocks()
})

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
  status: 'FETCHED' | 'ERROR' | 'FAILED',
  retryCount = 0
) {
  // Upsert bezirk so multiple calls in one test are safe
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

/** Creates a mock Anthropic client that always throws. */
function makeFailingAnthropicClient(message = 'AI failure') {
  const mockCreate = vi.fn().mockRejectedValue(new Error(message))
  return { messages: { create: mockCreate } }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('processArticles()', () => {
  it('advances a FETCHED article to TAGGED after Step 1', async () => {
    const { article } = await seedFetchedArticle()
    _clientFactory.create = () => makeMockAnthropicClient() as any

    await processArticles(db)

    const updated = await db.article.findUniqueOrThrow({ where: { id: article.id } })
    expect(updated.status).toBe('WRITTEN') // advances all the way through
  })

  it('advances a TAGGED article to WRITTEN after Step 2 (AI-01, SEO-02)', async () => {
    const { article } = await seedFetchedArticle()
    _clientFactory.create = () => makeMockAnthropicClient() as any

    await processArticles(db)

    const updated = await db.article.findUniqueOrThrow({ where: { id: article.id } })
    expect(updated.status).toBe('WRITTEN')
    expect(updated.title).toBe('Test Headline')
    expect(updated.content).toBe('Test lead sentence.\n\nTest body content.')
  })

  it('writes seoTitle and metaDescription to Article row (SEO-02)', async () => {
    const { article } = await seedFetchedArticle()
    _clientFactory.create = () => makeMockAnthropicClient() as any

    await processArticles(db)

    const updated = await db.article.findUniqueOrThrow({ where: { id: article.id } })
    expect(updated.seoTitle).toBe('SEO Test Title')
    expect(updated.metaDescription).toBe('SEO test meta description.')
  })

  it('creates ArticleBezirk rows for returned bezirkSlugs (AI-02)', async () => {
    const { article, bezirk } = await seedFetchedArticle()
    _clientFactory.create = () => makeMockAnthropicClient(makeStep1Response(['graz'], false)) as any

    await processArticles(db)

    const junction = await db.articleBezirk.findFirst({
      where: { articleId: article.id, bezirkId: bezirk.id },
    })
    expect(junction).not.toBeNull()
    expect(junction?.taggedAt).toBeInstanceOf(Date)
  })

  it('sets status REVIEW (not WRITTEN) when hasNamedPerson is true (AI-03)', async () => {
    const { article } = await seedFetchedArticle()
    _clientFactory.create = () => makeMockAnthropicClient(makeStep1Response(['graz'], true)) as any

    await processArticles(db)

    const updated = await db.article.findUniqueOrThrow({ where: { id: article.id } })
    expect(updated.status).toBe('REVIEW')
  })

  it('records PipelineRun with token totals', async () => {
    await seedFetchedArticle()
    _clientFactory.create = () => makeMockAnthropicClient() as any

    await processArticles(db)

    const run = await db.pipelineRun.findFirst({ orderBy: { id: 'desc' } })
    expect(run).not.toBeNull()
    expect(run?.articlesProcessed).toBe(1)
    // Step 1: 100 input + 50 output; Step 2: 200 input + 150 output
    expect(run?.totalInputTokens).toBe(300)
    expect(run?.totalOutputTokens).toBe(200)
    expect(run?.finishedAt).toBeInstanceOf(Date)
  })

  it('returns ProcessResult with articlesProcessed and articlesWritten counts', async () => {
    await seedFetchedArticle()
    _clientFactory.create = () => makeMockAnthropicClient() as any

    const result = await processArticles(db)

    expect(result.articlesProcessed).toBe(1)
    expect(result.articlesWritten).toBe(1)
    expect(result.totalInputTokens).toBe(300)
    expect(result.totalOutputTokens).toBe(200)
  })

  it('circuit-breaker returns false → returns zero counts without opening PipelineRun', async () => {
    await seedFetchedArticle()

    // Inject enough existing token usage to trip the circuit breaker
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

    const mockClient = makeMockAnthropicClient()
    _clientFactory.create = () => mockClient as any

    const result = await processArticles(db)

    expect(result.articlesProcessed).toBe(0)
    expect(result.articlesWritten).toBe(0)

    // No new PipelineRun should have been opened
    const runsAfter = await db.pipelineRun.count()
    expect(runsAfter).toBe(runsBefore)
  })

  it('TAGGED/WRITTEN/REVIEW articles are NOT reprocessed (only FETCHED selected)', async () => {
    await db.bezirk.create({
      data: { slug: 'graz', name: 'Graz (Stadt)', gemeindeSynonyms: [] },
    })

    // Create articles in non-FETCHED states
    await db.article.createMany({
      data: [
        { source: 'OTS_AT', status: 'TAGGED', title: 'Tagged', content: 'x' },
        { source: 'OTS_AT', status: 'WRITTEN', title: 'Written', content: 'x' },
        { source: 'OTS_AT', status: 'REVIEW', title: 'Review', content: 'x' },
      ],
    })

    const mockClient = makeMockAnthropicClient()
    _clientFactory.create = () => mockClient as any

    const result = await processArticles(db)

    expect(result.articlesProcessed).toBe(0)
    // Anthropic client should never have been called
    expect(mockClient.messages.create).not.toHaveBeenCalled()
  })

  it('per-article error: one article throws in Step 1 → console.error logged → other articles continue', async () => {
    // Create two FETCHED articles
    await db.bezirk.create({
      data: { slug: 'graz', name: 'Graz (Stadt)', gemeindeSynonyms: [] },
    })

    await db.article.createMany({
      data: [
        { source: 'OTS_AT', status: 'FETCHED', title: 'Article 1', content: 'content 1' },
        { source: 'OTS_AT', status: 'FETCHED', title: 'Article 2', content: 'content 2' },
      ],
    })

    // First call throws (step1 for article 1), then step1 ok for article 2, then step2 for article 2
    let callCount = 0
    const mockCreate = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) return Promise.reject(new Error('Step 1 failure for article 1'))
      if (callCount === 2) return Promise.resolve(makeStep1Response(['graz'], false))
      return Promise.resolve(makeStep2Response())
    })

    _clientFactory.create = () => ({ messages: { create: mockCreate } } as any)

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await processArticles(db)

    // One article processed successfully, one failed
    expect(result.articlesProcessed).toBe(2) // both attempted
    expect(result.articlesWritten).toBe(1)   // only second succeeded

    // console.error was called for the failing article
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
    const mockClient = makeMockAnthropicClient()
    _clientFactory.create = () => mockClient as any

    const result = await processArticles(db)

    expect(result.articlesProcessed).toBe(0)
    expect(mockClient.messages.create).not.toHaveBeenCalled()

    // Article should remain FAILED, untouched
    const unchanged = await db.article.findUniqueOrThrow({ where: { id: article.id } })
    expect(unchanged.status).toBe('FAILED')
  })

  it('FETCHED and ERROR articles are both picked up in the same run', async () => {
    await seedArticleWithStatus('FETCHED', 0)
    await seedArticleWithStatus('ERROR', 1)

    // Both succeed: alternating mock handles both articles (2 Step1 + 2 Step2 calls)
    let callCount = 0
    const mockCreate = vi.fn().mockImplementation(() => {
      callCount++
      return Promise.resolve(callCount % 2 === 1 ? makeStep1Response(['graz'], false) : makeStep2Response())
    })
    _clientFactory.create = () => ({ messages: { create: mockCreate } } as any)

    const result = await processArticles(db)

    expect(result.articlesProcessed).toBe(2)
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

  it('one failing article does not prevent other articles in the batch from succeeding', async () => {
    await db.bezirk.upsert({
      where: { slug: 'graz' },
      create: { slug: 'graz', name: 'Graz (Stadt)', gemeindeSynonyms: [] },
      update: {},
    })

    // Two FETCHED articles
    const failing = await db.article.create({
      data: { source: 'OTS_AT', status: 'FETCHED', title: 'Failing', content: 'content' },
    })
    const succeeding = await db.article.create({
      data: { source: 'OTS_AT', status: 'FETCHED', title: 'Succeeding', content: 'content' },
    })

    // First AI call (step1 for failing article) throws; remaining calls succeed
    let callCount = 0
    const mockCreate = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) return Promise.reject(new Error('Step 1 failure'))
      return Promise.resolve(callCount % 2 === 0 ? makeStep1Response(['graz'], false) : makeStep2Response())
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
})
