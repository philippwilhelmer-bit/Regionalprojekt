/**
 * Tests for POST /api/admin/generate-map route handler
 *
 * Requirements: INTG-03
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks — must be at module level
// ---------------------------------------------------------------------------

vi.mock('@/lib/prisma', () => ({
  prisma: {
    article: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/images/locextract', () => ({
  extractLocation: vi.fn(),
  llmLocationFallback: vi.fn(),
}))

vi.mock('@/lib/images/geocode', () => ({
  geocodeLocation: vi.fn(),
}))

vi.mock('@/lib/images/mapgen', () => ({
  generateMapImage: vi.fn(),
}))

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({})),
}))

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { prisma } from '@/lib/prisma'
import { extractLocation, llmLocationFallback } from '@/lib/images/locextract'
import { geocodeLocation } from '@/lib/images/geocode'
import { generateMapImage } from '@/lib/images/mapgen'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown, authHeader?: string): NextRequest {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (authHeader !== undefined) {
    headers['authorization'] = authHeader
  }
  return new NextRequest('http://localhost/api/admin/generate-map', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/admin/generate-map', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = 'test-secret'
  })

  it('returns 401 when Authorization header is missing', async () => {
    const { POST } = await import('./route')
    const req = makeRequest({ articleId: 1 })
    const res = await POST(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toEqual({ error: 'Unauthorized' })
  })

  it('returns 401 when Authorization header is wrong', async () => {
    const { POST } = await import('./route')
    const req = makeRequest({ articleId: 1 }, 'Bearer wrong-secret')
    const res = await POST(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toEqual({ error: 'Unauthorized' })
  })

  it('returns 400 when articleId is missing', async () => {
    const { POST } = await import('./route')
    const req = makeRequest({}, 'Bearer test-secret')
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toEqual({ error: 'articleId required' })
  })

  it('returns 400 when articleId is not a valid number', async () => {
    const { POST } = await import('./route')
    const req = makeRequest({ articleId: 'abc' }, 'Bearer test-secret')
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toEqual({ error: 'articleId required' })
  })

  it('returns 404 when article is not found', async () => {
    vi.mocked(prisma.article.findUnique).mockResolvedValue(null)
    const { POST } = await import('./route')
    const req = makeRequest({ articleId: 99 }, 'Bearer test-secret')
    const res = await POST(req)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body).toEqual({ error: 'Article not found' })
  })

  it('returns 422 when no location found in article (both extractLocation and llmFallback return null)', async () => {
    vi.mocked(prisma.article.findUnique).mockResolvedValue({
      id: 1,
      title: 'Some article',
      content: 'No location here',
    } as any)
    vi.mocked(extractLocation).mockReturnValue(null)
    vi.mocked(llmLocationFallback).mockResolvedValue({
      location: null,
      inputTokens: 0,
      outputTokens: 0,
    })

    const { POST } = await import('./route')
    const req = makeRequest({ articleId: 1 }, 'Bearer test-secret')
    const res = await POST(req)
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body).toEqual({ error: 'No location found in article' })
  })

  it('returns 422 when location found but geocoding returns null', async () => {
    vi.mocked(prisma.article.findUnique).mockResolvedValue({
      id: 1,
      title: 'Graz article',
      content: 'Story about Graz',
    } as any)
    vi.mocked(extractLocation).mockReturnValue('Graz')
    vi.mocked(geocodeLocation).mockResolvedValue(null)

    const { POST } = await import('./route')
    const req = makeRequest({ articleId: 1 }, 'Bearer test-secret')
    const res = await POST(req)
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toContain('not geocodable')
  })

  it('returns 200 with { url, credit } and updates article when pipeline succeeds', async () => {
    vi.mocked(prisma.article.findUnique).mockResolvedValue({
      id: 1,
      title: 'Graz news',
      content: 'News from Graz city center',
    } as any)
    vi.mocked(extractLocation).mockReturnValue('Graz')
    vi.mocked(geocodeLocation).mockResolvedValue({
      lat: 47.0707,
      lon: 15.4395,
      locationType: 'city',
      displayName: 'Graz, Austria',
    })
    vi.mocked(generateMapImage).mockResolvedValue({
      url: 'https://blob.example.com/map-1.png',
      credit: '© basemap.at',
    })
    vi.mocked(prisma.article.update).mockResolvedValue({} as any)

    const { POST } = await import('./route')
    const req = makeRequest({ articleId: 1 }, 'Bearer test-secret')
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({
      url: 'https://blob.example.com/map-1.png',
      credit: '© basemap.at',
    })

    // Verify article was updated in DB
    expect(prisma.article.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        imageUrl: 'https://blob.example.com/map-1.png',
        imageCredit: '© basemap.at',
      },
    })
  })

  it('exports maxDuration = 60', async () => {
    const module = await import('./route')
    expect(module.maxDuration).toBe(60)
  })
})
