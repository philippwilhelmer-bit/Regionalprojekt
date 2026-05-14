import type { MetadataRoute } from 'next'
import { listArticles } from '../lib/content/articles'
import { listBezirke } from '../lib/content/bezirke'
import { listDoctors, type DoctorWithBezirk } from '../lib/content/doctors'
import { slugify } from '../lib/reader/slug'

// Always render the sitemap dynamically (DB query on each request).
// Prevents Next.js from attempting to statically pre-render /sitemap.xml at build time.
export const dynamic = 'force-dynamic'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://lodenundleute.at'

/**
 * Pure helper — maps doctors to sitemap entries.
 *
 * Exported separately from sitemap() so tests can exercise it without
 * coupling to defaultPrisma / Next runtime. Composed into the default
 * sitemap() Promise.all flow below.
 */
export function buildDoctorSitemapEntries(
  doctors: Array<Pick<DoctorWithBezirk, 'publicId' | 'name' | 'updatedAt'>>,
  baseUrl: string,
): MetadataRoute.Sitemap {
  return doctors.map(d => ({
    url: `${baseUrl}/aerzte/${d.publicId}/${slugify(d.name)}`,
    lastModified: d.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))
}

/**
 * Next.js 15 sitemap.ts default export.
 *
 * Generates a complete sitemap including:
 * - Homepage (priority 1.0, hourly)
 * - /impressum (priority 0.3, monthly)
 * - /bezirk/[slug] for all 13 Bezirke (priority 0.6, daily)
 * - /artikel/[publicId]/[slug] for all published articles (priority 0.8, daily)
 * - /aerzte index (priority 0.7, weekly)
 * - /aerzte/[publicId]/[slug] for all doctors (priority 0.7, weekly)
 *
 * Served at /sitemap.xml by Next.js automatically.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (process.env.NEXT_PUBLIC_IS_TEST_SITE === 'true') {
    return []
  }

  const [articles, bezirke, doctors] = await Promise.all([
    listArticles({ status: 'PUBLISHED', limit: 1000 }),
    listBezirke(),
    listDoctors({ limit: 5000 }),
  ])

  const bezirkEntries: MetadataRoute.Sitemap = bezirke.map(b => ({
    url: `${BASE_URL}/bezirk/${b.slug}`,
    changeFrequency: 'daily',
    priority: 0.6,
  }))

  const articleEntries: MetadataRoute.Sitemap = articles.map(a => ({
    url: `${BASE_URL}/artikel/${a.publicId}/${slugify(a.title ?? '')}`,
    lastModified: a.publishedAt ?? a.createdAt,
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  const doctorEntries = buildDoctorSitemapEntries(doctors, BASE_URL)

  return [
    { url: BASE_URL, changeFrequency: 'hourly', priority: 1.0 },
    { url: `${BASE_URL}/impressum`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/aerzte`, changeFrequency: 'weekly', priority: 0.7 },
    ...bezirkEntries,
    ...articleEntries,
    ...doctorEntries,
  ]
}
