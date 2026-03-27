import config from '@/../bundesland.config'
import { getArticlesByBezirk, listArticles } from '@/lib/content/articles'
import { getBezirkBySlug } from '@/lib/content/bezirke'
import { generateBezirkRssFeed } from '@/lib/reader/rss'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://ennstal-aktuell.at'

/** Map of source channel slugs to ArticleSource enum values */
const SOURCE_CHANNELS: Record<string, 'OTS_AT' | 'RSS' | 'MANUAL'> = {
  'ots': 'OTS_AT',
  'ots-at': 'OTS_AT',
  'rss': 'RSS',
}

/**
 * Route Handler for RSS feeds.
 *
 * GET /rss/liezen.xml       — feed for the Liezen Bezirk (20 most recent PUBLISHED articles)
 * GET /rss/steiermark.xml   — all-Steiermark feed (20 most recent PUBLISHED articles)
 * GET /rss/ots.xml          — OTS.at channel feed (20 most recent PUBLISHED OTS articles)
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
  } else if (slug in SOURCE_CHANNELS) {
    // Source channel feed — articles from a specific ingestion source
    articles = await listArticles({ status: 'PUBLISHED', limit: 20, source: SOURCE_CHANNELS[slug] })
  } else {
    // Validate that the Bezirk exists
    const bezirk = await getBezirkBySlug(slug)
    if (!bezirk) {
      return new Response('Feed not found', { status: 404 })
    }

    articles = await getArticlesByBezirk(slug, { limit: 20 })
  }

  const xml = generateBezirkRssFeed(articles, slug, BASE_URL)

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  })
}
