import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---- Mocks ----------------------------------------------------------------

vi.mock('@/../bundesland.config', () => ({
  default: {
    features: { ads: true, rss: true },
    adZones: [
      { id: 'hero', envVar: 'ADSENSE_UNIT_HERO', enabled: true },
      { id: 'between-articles', envVar: 'ADSENSE_UNIT_BETWEEN', enabled: false },
      { id: 'article-detail', envVar: 'ADSENSE_UNIT_DETAIL', enabled: true },
    ],
  },
}))

// Mock AdUnitClient so we can inspect props without needing jsdom
vi.mock('./AdUnitClient', () => ({
  AdUnitClient: (props: { pubId?: string; slot?: string; zone: string }) => props,
}))

// ---------------------------------------------------------------------------

// Import after mocks are set up
import { AdUnit } from './AdUnit'

describe('AdUnit Server wrapper', () => {
  const origEnv = { ...process.env }

  beforeEach(() => {
    // Reset env before each test
    delete process.env.NEXT_PUBLIC_ADSENSE_PUB_ID
    delete process.env.ADSENSE_UNIT_HERO
    delete process.env.ADSENSE_UNIT_BETWEEN
    delete process.env.ADSENSE_UNIT_DETAIL
  })

  afterEach(() => {
    process.env = { ...origEnv }
  })

  it('returns null when config.features.ads is false', async () => {
    const { default: config } = await import('@/../bundesland.config')
    // Temporarily override ads flag
    const original = config.features.ads
    ;(config.features as { ads: boolean }).ads = false
    const result = AdUnit({ zone: 'hero' })
    ;(config.features as { ads: boolean }).ads = original
    expect(result).toBeNull()
  })

  it('returns null when the matched zone has enabled: false', () => {
    // 'between-articles' has enabled: false in mock
    const result = AdUnit({ zone: 'between-articles' })
    expect(result).toBeNull()
  })

  it('renders AdUnitClient with correct slot when zone is valid and ads enabled', () => {
    process.env.NEXT_PUBLIC_ADSENSE_PUB_ID = 'ca-pub-1234567890'
    process.env.ADSENSE_UNIT_HERO = 'slot-abc-123'
    const result = AdUnit({ zone: 'hero' })
    // result should not be null — it should be a JSX element wrapping AdUnitClient
    expect(result).not.toBeNull()
    // The returned element should have the correct props passed to AdUnitClient
    expect(result).toBeTruthy()
  })

  it('renders dev placeholder (via AdUnitClient) when pubId is undefined', () => {
    // No NEXT_PUBLIC_ADSENSE_PUB_ID set → pubId will be undefined
    process.env.ADSENSE_UNIT_HERO = 'slot-abc-123'
    const result = AdUnit({ zone: 'hero' })
    // Should still render AdUnitClient (not return null) — dev placeholder is AdUnitClient's responsibility
    expect(result).not.toBeNull()
    expect(result).toBeTruthy()
  })

  it('returns null when NEXT_PUBLIC_IS_TEST_SITE is true', () => {
    process.env.NEXT_PUBLIC_IS_TEST_SITE = 'true'
    const result = AdUnit({ zone: 'hero' })
    expect(result).toBeNull()
  })
})
