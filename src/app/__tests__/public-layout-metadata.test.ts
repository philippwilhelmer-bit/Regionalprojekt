import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock DB dependencies used by the public layout default export
vi.mock('@/lib/content/bezirke', () => ({
  listBezirke: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/content/articles', () => ({
  hasEilmeldung: vi.fn().mockResolvedValue(false),
  listArticles: vi.fn().mockResolvedValue([]),
}))

// Mock all component imports that the layout uses
vi.mock('@/components/TestSiteBanner', () => ({
  TestSiteBanner: () => null,
}))

vi.mock('@/components/reader/RegionalAppBar', () => ({
  RegionalAppBar: () => null,
}))

vi.mock('@/components/reader/RegionalNavBar', () => ({
  RegionalNavBar: () => null,
}))

vi.mock('@/components/reader/Footer', () => ({
  Footer: () => null,
}))

vi.mock('@/components/reader/CookieBanner', () => ({
  CookieBanner: () => null,
}))

vi.mock('@/components/reader/BezirkModal', () => ({
  BezirkModal: () => null,
}))

vi.mock('@/components/reader/EilmeldungBanner', () => ({
  EilmeldungBanner: () => null,
}))

// Import after mocks
import { generateMetadata } from '../(public)/layout'

describe('generateMetadata() in public layout', () => {
  const origEnv = { ...process.env }

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_IS_TEST_SITE
  })

  afterEach(() => {
    process.env = { ...origEnv }
  })

  it('returns noindex/nofollow when NEXT_PUBLIC_IS_TEST_SITE=true', () => {
    process.env.NEXT_PUBLIC_IS_TEST_SITE = 'true'
    const result = generateMetadata()
    expect(result).toEqual({
      robots: { index: false, follow: false },
    })
  })

  it('returns empty object when NEXT_PUBLIC_IS_TEST_SITE is unset', () => {
    const result = generateMetadata()
    expect(result).toEqual({})
  })
})
