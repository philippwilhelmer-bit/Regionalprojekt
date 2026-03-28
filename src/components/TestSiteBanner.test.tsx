import { describe, it, expect, beforeEach, afterEach } from 'vitest'

// Import after env setup
import { TestSiteBanner } from './TestSiteBanner'

describe('TestSiteBanner', () => {
  const origEnv = { ...process.env }

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_IS_TEST_SITE
  })

  afterEach(() => {
    process.env = { ...origEnv }
  })

  it('renders a banner with "TESTSEITE" text when NEXT_PUBLIC_IS_TEST_SITE is "true"', () => {
    process.env.NEXT_PUBLIC_IS_TEST_SITE = 'true'
    const result = TestSiteBanner()
    expect(result).not.toBeNull()
    // Check role="banner"
    expect(result).toHaveProperty('props.role', 'banner')
    // Check text content
    const children = result?.props?.children as string
    expect(children).toContain('TESTSEITE')
  })

  it('returns null when NEXT_PUBLIC_IS_TEST_SITE is undefined', () => {
    // env var not set (deleted in beforeEach)
    const result = TestSiteBanner()
    expect(result).toBeNull()
  })

  it('returns null when NEXT_PUBLIC_IS_TEST_SITE is "false"', () => {
    process.env.NEXT_PUBLIC_IS_TEST_SITE = 'false'
    const result = TestSiteBanner()
    expect(result).toBeNull()
  })
})
