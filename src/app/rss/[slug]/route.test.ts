/**
 * Tests for RSS route handler feature flag.
 * CONF-01 — features.rss: false disables all /rss/* routes with a silent 404.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock is hoisted — must appear before any imports that use the mocked module.
// Mock the config module to control features.rss in tests.
vi.mock('@/../bundesland.config', () => ({
  default: {
    bundesland: 'steiermark',
    siteName: 'Test Site',
    features: { ads: true, rss: false }, // rss: false for these tests
    regions: [],
  },
}))

// Mock DB-dependent imports so the handler doesn't need a real database
vi.mock('@/lib/content/articles', () => ({
  listArticles: vi.fn().mockResolvedValue([]),
  getArticlesByBezirk: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/lib/content/bezirke', () => ({
  getBezirkBySlug: vi.fn().mockResolvedValue({ id: 1, slug: 'liezen', name: 'Liezen' }),
}))
vi.mock('@/lib/reader/rss', () => ({
  generateBezirkRssFeed: vi.fn().mockReturnValue('<rss/>'),
}))

import { GET } from './route'

function makeRequest(slug: string) {
  const request = new Request(`http://localhost/rss/${slug}`)
  const params = Promise.resolve({ slug })
  return GET(request, { params })
}

describe('RSS route — features.rss: false', () => {
  it('returns 404 for a Bezirk slug when rss feature flag is false', async () => {
    const response = await makeRequest('liezen')
    expect(response.status).toBe(404)
  })

  it('returns 404 for the state-wide steiermark feed when rss feature flag is false', async () => {
    const response = await makeRequest('steiermark')
    expect(response.status).toBe(404)
  })

  it('returns an empty/null body (silent 404)', async () => {
    const response = await makeRequest('liezen')
    const text = await response.text()
    expect(text).toBe('')
  })
})
