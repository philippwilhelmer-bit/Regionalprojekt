/**
 * Tests for Server Actions: generateMapForArticle and backfillMapImages
 *
 * Requirements: INTG-03, INTG-04
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — must be at module level
// ---------------------------------------------------------------------------

vi.mock('@/lib/prisma', () => ({
  prisma: {
    article: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('./auth-node', () => ({
  requireAuth: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../images/locextract', () => ({
  extractLocation: vi.fn(),
  llmLocationFallback: vi.fn(),
}))

vi.mock('../images/geocode', () => ({
  geocodeLocation: vi.fn(),
}))

vi.mock('../images/mapgen', () => ({
  generateMapImage: vi.fn(),
}))

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({})),
}))

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { prisma } from '@/lib/prisma'
import { extractLocation, llmLocationFallback } from '../images/locextract'
import { geocodeLocation } from '../images/geocode'
import { generateMapImage } from '../images/mapgen'
import { generateMapForArticle, backfillMapImages } from './map-actions'

// ---------------------------------------------------------------------------
// generateMapForArticle tests
// ---------------------------------------------------------------------------

describe('generateMapForArticle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns { url, credit } when full pipeline succeeds', async () => {
    vi.mocked(prisma.article.findUnique).mockResolvedValue({
      id: 5,
      title: 'Graz news',
      content: 'News from Graz',
    } as any)
    vi.mocked(extractLocation).mockReturnValue('Graz')
    vi.mocked(geocodeLocation).mockResolvedValue({
      lat: 47.0707,
      lon: 15.4395,
      locationType: 'city',
      displayName: 'Graz, Austria',
    })
    vi.mocked(generateMapImage).mockResolvedValue({
      url: 'https://blob.example.com/map-5.png',
      credit: '© basemap.at',
    })
    vi.mocked(prisma.article.update).mockResolvedValue({} as any)

    const result = await generateMapForArticle(5)

    expect(result).toEqual({
      url: 'https://blob.example.com/map-5.png',
      credit: '© basemap.at',
    })
    expect(prisma.article.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: {
        imageUrl: 'https://blob.example.com/map-5.png',
        imageCredit: '© basemap.at',
      },
    })
  })

  it('returns { error } when article not found', async () => {
    vi.mocked(prisma.article.findUnique).mockResolvedValue(null)

    const result = await generateMapForArticle(999)

    expect(result).toHaveProperty('error')
    expect((result as { error: string }).error).toBeTruthy()
  })

  it('returns { error } when no location found (extractLocation null and llmFallback null)', async () => {
    vi.mocked(prisma.article.findUnique).mockResolvedValue({
      id: 7,
      title: 'Mystery article',
      content: 'No location mentioned anywhere',
    } as any)
    vi.mocked(extractLocation).mockReturnValue(null)
    vi.mocked(llmLocationFallback).mockResolvedValue({
      location: null,
      inputTokens: 0,
      outputTokens: 0,
    })

    const result = await generateMapForArticle(7)

    expect(result).toHaveProperty('error')
    expect((result as { error: string }).error).toBeTruthy()
  })

  it('returns { error } when geocodeLocation returns null', async () => {
    vi.mocked(prisma.article.findUnique).mockResolvedValue({
      id: 8,
      title: 'Graz article',
      content: 'Graz news',
    } as any)
    vi.mocked(extractLocation).mockReturnValue('Graz')
    vi.mocked(geocodeLocation).mockResolvedValue(null)

    const result = await generateMapForArticle(8)

    expect(result).toHaveProperty('error')
  })

  it('uses llmLocationFallback when extractLocation returns null', async () => {
    vi.mocked(prisma.article.findUnique).mockResolvedValue({
      id: 10,
      title: 'Vienna news',
      content: 'A long article about some Austrian city',
    } as any)
    vi.mocked(extractLocation).mockReturnValue(null)
    vi.mocked(llmLocationFallback).mockResolvedValue({
      location: 'Wien',
      inputTokens: 0,
      outputTokens: 0,
    })
    vi.mocked(geocodeLocation).mockResolvedValue({
      lat: 48.2082,
      lon: 16.3738,
      locationType: 'city',
      displayName: 'Wien, Austria',
    })
    vi.mocked(generateMapImage).mockResolvedValue({
      url: 'https://blob.example.com/map-10.png',
      credit: '© basemap.at',
    })
    vi.mocked(prisma.article.update).mockResolvedValue({} as any)

    const result = await generateMapForArticle(10)

    expect(result).toEqual({
      url: 'https://blob.example.com/map-10.png',
      credit: '© basemap.at',
    })
    expect(llmLocationFallback).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// backfillMapImages tests
// ---------------------------------------------------------------------------

describe('backfillMapImages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('only queries PUBLISHED articles with imageUrl null', async () => {
    vi.mocked(prisma.article.findMany).mockResolvedValue([])

    await backfillMapImages()

    expect(prisma.article.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'PUBLISHED',
          imageUrl: null,
        }),
      })
    )
  })

  it('caps query at take: 10', async () => {
    vi.mocked(prisma.article.findMany).mockResolvedValue([])

    await backfillMapImages()

    expect(prisma.article.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
      })
    )
  })

  it('does NOT process articles that already have imageUrl set (enforced by query filter)', async () => {
    // The filter is on the query level — we verify that if findMany returns empty,
    // no pipeline calls are made
    vi.mocked(prisma.article.findMany).mockResolvedValue([])

    const result = await backfillMapImages()

    expect(extractLocation).not.toHaveBeenCalled()
    expect(geocodeLocation).not.toHaveBeenCalled()
    expect(generateMapImage).not.toHaveBeenCalled()
    expect(result.processed).toBe(0)
  })

  it('returns correct counts: succeeded, skipped, failed', async () => {
    const articles = [
      { id: 1, title: 'Graz article', content: 'Graz news' },
      { id: 2, title: 'Mystery article', content: 'No location' },
      { id: 3, title: 'Leoben article', content: 'Leoben news' },
    ]
    vi.mocked(prisma.article.findMany).mockResolvedValue(articles as any)

    // Article 1: success
    vi.mocked(extractLocation)
      .mockReturnValueOnce('Graz')   // article 1
      .mockReturnValueOnce(null)     // article 2
      .mockReturnValueOnce('Leoben') // article 3

    vi.mocked(llmLocationFallback).mockResolvedValueOnce({
      location: null,
      inputTokens: 0,
      outputTokens: 0,
    }) // article 2 fallback

    vi.mocked(geocodeLocation)
      .mockResolvedValueOnce({ lat: 47.07, lon: 15.44, locationType: 'city', displayName: 'Graz' }) // article 1
      .mockResolvedValueOnce({ lat: 47.38, lon: 15.09, locationType: 'city', displayName: 'Leoben' }) // article 3

    vi.mocked(generateMapImage)
      .mockResolvedValueOnce({ url: 'https://blob.example.com/map-1.png', credit: '© basemap.at' }) // article 1
      .mockResolvedValueOnce(null) // article 3 fails

    vi.mocked(prisma.article.update).mockResolvedValue({} as any)

    const resultPromise = backfillMapImages()
    // Advance timers to handle all the setTimeout(r, 1100) calls
    await vi.runAllTimersAsync()
    const result = await resultPromise

    expect(result.processed).toBe(3)
    expect(result.succeeded).toBe(1)  // article 1
    expect(result.skipped).toBe(1)    // article 2 (no location)
    expect(result.failed).toBe(1)     // article 3 (generateMapImage returned null)
  })

  it('calls setTimeout with 1100ms after each geocoding call', async () => {
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout')

    const articles = [
      { id: 1, title: 'Graz article', content: 'Graz news' },
      { id: 2, title: 'Liezen article', content: 'Liezen news' },
    ]
    vi.mocked(prisma.article.findMany).mockResolvedValue(articles as any)

    vi.mocked(extractLocation)
      .mockReturnValueOnce('Graz')
      .mockReturnValueOnce('Liezen')

    vi.mocked(geocodeLocation)
      .mockResolvedValueOnce({ lat: 47.07, lon: 15.44, locationType: 'city', displayName: 'Graz' })
      .mockResolvedValueOnce({ lat: 47.56, lon: 14.11, locationType: 'city', displayName: 'Liezen' })

    vi.mocked(generateMapImage).mockResolvedValue(null) // doesn't matter for this test

    vi.mocked(prisma.article.update).mockResolvedValue({} as any)

    const resultPromise = backfillMapImages()
    await vi.runAllTimersAsync()
    await resultPromise

    // Verify setTimeout was called with 1100ms for each article
    const calls1100 = setTimeoutSpy.mock.calls.filter(
      (call) => call[1] === 1100
    )
    expect(calls1100.length).toBeGreaterThanOrEqual(2)
  })

  it('returns { processed: 0, succeeded: 0, failed: 0, skipped: 0 } when no articles found', async () => {
    vi.mocked(prisma.article.findMany).mockResolvedValue([])

    const result = await backfillMapImages()

    expect(result).toEqual({ processed: 0, succeeded: 0, failed: 0, skipped: 0 })
  })

  it('counts article as skipped when geocodeLocation returns null', async () => {
    vi.mocked(prisma.article.findMany).mockResolvedValue([
      { id: 1, title: 'Graz article', content: 'Graz news' },
    ] as any)
    vi.mocked(extractLocation).mockReturnValue('Graz')
    vi.mocked(geocodeLocation).mockResolvedValue(null)

    const resultPromise = backfillMapImages()
    await vi.runAllTimersAsync()
    const result = await resultPromise

    expect(result.skipped).toBe(1)
    expect(result.failed).toBe(0)
    expect(result.succeeded).toBe(0)
  })

  it('counts article as failed when generateMapImage returns null', async () => {
    vi.mocked(prisma.article.findMany).mockResolvedValue([
      { id: 1, title: 'Graz article', content: 'Graz news' },
    ] as any)
    vi.mocked(extractLocation).mockReturnValue('Graz')
    vi.mocked(geocodeLocation).mockResolvedValue({
      lat: 47.07, lon: 15.44, locationType: 'city', displayName: 'Graz',
    })
    vi.mocked(generateMapImage).mockResolvedValue(null)

    const resultPromise = backfillMapImages()
    await vi.runAllTimersAsync()
    const result = await resultPromise

    expect(result.failed).toBe(1)
    expect(result.succeeded).toBe(0)
  })

  it('logs progress per article to console', async () => {
    const consoleSpy = vi.spyOn(console, 'log')

    vi.mocked(prisma.article.findMany).mockResolvedValue([
      { id: 42, title: 'Graz article', content: 'Graz news' },
    ] as any)
    vi.mocked(extractLocation).mockReturnValue('Graz')
    vi.mocked(geocodeLocation).mockResolvedValue({
      lat: 47.07, lon: 15.44, locationType: 'city', displayName: 'Graz',
    })
    vi.mocked(generateMapImage).mockResolvedValue({
      url: 'https://blob.example.com/map-42.png',
      credit: '© basemap.at',
    })
    vi.mocked(prisma.article.update).mockResolvedValue({} as any)

    const resultPromise = backfillMapImages()
    await vi.runAllTimersAsync()
    await resultPromise

    // Should log progress start and result for article 42
    const calls = consoleSpy.mock.calls.map((c) => c.join(' '))
    expect(calls.some((c) => c.includes('42'))).toBe(true)
  })
})
