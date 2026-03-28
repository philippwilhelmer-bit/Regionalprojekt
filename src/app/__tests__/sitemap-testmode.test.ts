import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock DB dependencies
vi.mock('@/lib/content/articles', () => ({
  listArticles: vi.fn().mockResolvedValue([
    { publicId: 'abc', title: 'Test', publishedAt: new Date(), createdAt: new Date() },
  ]),
  hasEilmeldung: vi.fn().mockResolvedValue(false),
}))

vi.mock('@/lib/content/bezirke', () => ({
  listBezirke: vi.fn().mockResolvedValue([{ slug: 'liezen' }]),
}))

vi.mock('@/lib/reader/slug', () => ({
  slugify: vi.fn().mockReturnValue('test'),
}))

// Import after mocks
import sitemap from '../sitemap'

describe('sitemap()', () => {
  const origEnv = { ...process.env }

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_IS_TEST_SITE
  })

  afterEach(() => {
    process.env = { ...origEnv }
  })

  it('returns empty array when NEXT_PUBLIC_IS_TEST_SITE=true', async () => {
    process.env.NEXT_PUBLIC_IS_TEST_SITE = 'true'
    const result = await sitemap()
    expect(result).toEqual([])
  })

  it('returns non-empty array when NEXT_PUBLIC_IS_TEST_SITE is unset', async () => {
    const result = await sitemap()
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })
})
