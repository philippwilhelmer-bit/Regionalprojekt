import type { MetadataRoute } from 'next'

export const dynamic = 'force-dynamic'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://wurzelwelt.at'

/**
 * Next.js 15 robots.ts default export.
 *
 * Served at /robots.txt by Next.js automatically.
 * In test mode (NEXT_PUBLIC_IS_TEST_SITE=true), disallows all crawlers.
 */
export default function robots(): MetadataRoute.Robots {
  if (process.env.NEXT_PUBLIC_IS_TEST_SITE === 'true') {
    return {
      rules: { userAgent: '*', disallow: '/' },
    }
  }

  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
