import config from '@/../bundesland.config'
import { getArticlesByBezirk, listArticles } from '@/lib/content/articles'
import { getBezirkBySlug } from '@/lib/content/bezirke'
import { generateBezirkRssFeed } from '@/lib/reader/rss'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://ennstal-aktuell.at'

/**
 * Route Handler for per-Bezirk RSS feeds.
 *
 * GET /rss/liezen.xml       — feed for the Liezen Bezirk (20 most recent PUBLISHED articles)
 * GET /rss/steiermark.xml   — all-Steiermark feed (20 most recent PUBLISHED articles)
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!config.features.rss) {
    return new Response(null, { status: 404 })
  }

  // Resolve slug: strip optional .xml suffix (e.g. "liezen.xml" → "liezen")
  const { slug: rawSlug } = await params
  const slug = rawSlug.replace(/\.xml$/, '')

  let articles

  if (slug === 'steiermark') {
    // All-Steiermark feed — most recent published articles across all regions
    articles = await listArticles({ status: 'PUBLISHED', limit: 20 })
  } else {
    // Validate that the Bezirk exists
    const bezirk = await getBezirkBySlug(slug)
    if (!bezirk) {
      return new Response('Feed not found', { status: 404 })
    }

    // getArticlesByBezirk does not filter by status — filter to PUBLISHED only
    const raw = await getArticlesByBezirk(slug, { limit: 20 })
    articles = raw.filter(a => a.status === 'PUBLISHED')
  }

  const xml = generateBezirkRssFeed(articles, slug, BASE_URL)

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  })
}
