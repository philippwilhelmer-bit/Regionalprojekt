import { generateRssFeed } from 'feedsmith'
import type { ArticleWithBezirke } from '@/lib/content/articles'
import { slugify } from './slug'
import config from '@/../bundesland.config'

/**
 * Generates an RSS 2.0 feed XML string for a given Bezirk or all of Steiermark.
 *
 * @param articles - Array of published articles to include in the feed (max 20)
 * @param slug - Bezirk slug (e.g. 'liezen') or 'steiermark' for the all-regions feed
 * @param baseUrl - Base URL of the site (e.g. 'https://wurzelwelt.at')
 * @returns RSS XML string with Content-Type: application/rss+xml shape
 */
export function generateBezirkRssFeed(
  articles: ArticleWithBezirke[],
  slug: string,
  baseUrl: string
): string {
  return generateRssFeed({
    title: `${config.siteName} \u2013 ${slug}`,
    link: baseUrl,
    description: `Aktuelle Nachrichten f\u00fcr ${slug} aus der Steiermark`,
    items: articles.map(a => ({
      title: a.title ?? '',
      link: `${baseUrl}/artikel/${a.publicId}/${slugify(a.title ?? '')}`,
      description: a.content ?? '',
      pubDate: a.publishedAt ?? a.createdAt,
      guid: { value: a.publicId ?? String(a.id), isPermaLink: false },
    })),
  })
}
