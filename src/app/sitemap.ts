import type { MetadataRoute } from 'next'
import { listArticles } from '../lib/content/articles'
import { listBezirke } from '../lib/content/bezirke'
import { slugify } from '../lib/reader/slug'

// Always render the sitemap dynamically (DB query on each request).
// Prevents Next.js from attempting to statically pre-render /sitemap.xml at build time.
export const dynamic = 'force-dynamic'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://ennstal-aktuell.at'

/**
 * Next.js 15 sitemap.ts default export.
 *
 * Generates a complete sitemap including:
 * - Homepage (priority 1.0, hourly)
 * - /impressum (priority 0.3, monthly)
 * - /bezirk/[slug] for all 13 Bezirke (priority 0.6, daily)
 * - /artikel/[publicId]/[slug] for all published articles (priority 0.8, daily)
 *
 * Served at /sitemap.xml by Next.js automatically.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, bezirke] = await Promise.all([
    listArticles({ status: 'PUBLISHED', limit: 1000 }),
    listBezirke(),
  ])

  const bezirkEntries: MetadataRoute.Sitemap = bezirke.map(b => ({
    url: `${BASE_URL}/bezirk/${b.slug}`,
    changeFrequency: 'daily',
    priority: 0.6,
  }))

  const articleEntries: MetadataRoute.Sitemap = articles.map(a => ({
    url: `${BASE_URL}/artikel/${a.publicId}/${slugify(a.seoTitle ?? a.title ?? '')}`,
    lastModified: a.publishedAt ?? a.createdAt,
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  return [
    { url: BASE_URL, changeFrequency: 'hourly', priority: 1.0 },
    { url: `${BASE_URL}/impressum`, changeFrequency: 'monthly', priority: 0.3 },
    ...bezirkEntries,
    ...articleEntries,
  ]
}
