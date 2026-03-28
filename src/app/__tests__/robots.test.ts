import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('robots()', () => {
  const origEnv = { ...process.env }

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_IS_TEST_SITE
  })

  afterEach(() => {
    process.env = { ...origEnv }
  })

  it('returns Disallow: / when NEXT_PUBLIC_IS_TEST_SITE=true', async () => {
    process.env.NEXT_PUBLIC_IS_TEST_SITE = 'true'
    const { default: robots } = await import('../robots')
    const result = robots()
    expect(result).toEqual({
      rules: { userAgent: '*', disallow: '/' },
    })
  })

  it('returns Allow: / with sitemap URL when NEXT_PUBLIC_IS_TEST_SITE is unset', async () => {
    const { default: robots } = await import('../robots')
    const result = robots()
    expect(result).toMatchObject({
      rules: { userAgent: '*', allow: '/' },
    })
    expect(result.sitemap).toBeDefined()
    expect(typeof result.sitemap).toBe('string')
    expect((result.sitemap as string)).toContain('sitemap.xml')
  })
})
