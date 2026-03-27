/**
 * Generic RSS/Atom feed adapter using feedsmith.
 *
 * Requirements:
 *   ING-02 — RSS/Atom source ingestion
 *
 * Any RSS 2.0 or Atom 1.0 feed can be added as a new Source DB row
 * without code changes — the adapter handles both formats automatically.
 */
import { parseFeed } from 'feedsmith'
import type { Source } from '@prisma/client'
import type { RawItem } from '../types'
import { computeContentHash } from '../dedup'

/**
 * Fetch and parse an RSS or Atom feed from source.url.
 *
 * - Throws on non-200 HTTP response
 * - Returns empty array if feed parses successfully but has 0 items/entries
 * - externalId fallback chain: guid → link → computeContentHash(title, description)
 */
/**
 * Check if an item matches at least one keyword (case-insensitive).
 * If no keywords configured, all items pass.
 */
function matchesKeywords(text: string, keywords: string[]): boolean {
  if (keywords.length === 0) return true
  const lower = text.toLowerCase()
  return keywords.some((kw) => lower.includes(kw.toLowerCase()))
}

export async function rssAdapter(source: Source): Promise<RawItem[]> {
  const response = await fetch(source.url)
  if (!response.ok) {
    throw new Error(
      `rssAdapter: HTTP ${response.status} fetching ${source.url}`,
    )
  }

  const xml = await response.text()
  const parsed = parseFeed(xml)
  const keywords = source.keywords ?? []

  if (parsed.format === 'rss') {
    const items = parsed.feed.items ?? []
    return items
      .filter((item) => matchesKeywords(`${item.title ?? ''} ${item.description ?? ''}`, keywords))
      .map((item) => {
        const title = item.title ?? ''
        const description = item.description ?? ''
        const guid = item.guid?.value
        const link = item.link
        const externalId = guid ?? link ?? computeContentHash(title, description)

        return {
          externalId,
          sourceUrl: link ?? source.url,
          title,
          body: description,
          publishedAt: item.pubDate ? new Date(item.pubDate) : null,
          rawPayload: item,
        } satisfies RawItem
      })
  }

  if (parsed.format === 'atom') {
    const entries = parsed.feed.entries ?? []
    return entries
      .filter((entry) => matchesKeywords(`${entry.title ?? ''} ${entry.summary ?? ''}`, keywords))
      .map((entry) => {
      const title = entry.title ?? ''
      const summary = entry.summary ?? ''
      // Prefer the first alternate link for sourceUrl
      const link =
        entry.links?.find((l) => !l.rel || l.rel === 'alternate')?.href ??
        source.url

      return {
        externalId: entry.id ?? computeContentHash(title, summary),
        sourceUrl: link,
        title,
        body: summary,
        publishedAt: entry.published ? new Date(entry.published) : null,
        rawPayload: entry,
      } satisfies RawItem
    })
  }

  // rdf/json feed formats: return empty for now (not required by ING-02)
  return []
}
