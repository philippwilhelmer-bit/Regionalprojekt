/**
 * Generic RSS/Atom feed adapter using feedsmith.
 *
 * Requirements:
 *   ING-02     — RSS/Atom source ingestion.
 *   INGEST-02  — AbortController + 10s timeout on every external fetch.
 *   INGEST-04  — Conditional GET (If-None-Match + If-Modified-Since), 304
 *                short-circuit, persist new etag/lastModified on 200.
 *
 * Any RSS 2.0 or Atom 1.0 feed can be added as a new Source DB row
 * without code changes — the adapter handles both formats automatically.
 */
import { parseFeed } from 'feedsmith'
import type { Source } from '@prisma/client'
import type { AdapterResult, RawItem } from '../types'
import { computeContentHash } from '../dedup'
import { fetchWithTimeout } from '../fetch-utils'

/**
 * Check if an item matches at least one keyword (case-insensitive).
 * If no keywords configured, all items pass.
 */
function matchesKeywords(text: string, keywords: string[]): boolean {
  if (keywords.length === 0) return true
  const lower = text.toLowerCase()
  return keywords.some((kw) => lower.includes(kw.toLowerCase()))
}

/**
 * Fetch and parse an RSS or Atom feed from source.url.
 *
 * Conditional GET:
 *   - If source.etag is non-null, sends `If-None-Match: <etag>`.
 *   - If source.lastModified is non-null, sends `If-Modified-Since: <lastModified>`.
 *   - On 304: returns { items: [], etag: undefined, lastModified: undefined }
 *     so ingest.ts preserves the previously stored validators.
 *   - On 200: returns the server's etag/last-modified verbatim (or null when absent)
 *     so ingest.ts persists the new values.
 *
 * Throws on any non-2xx, non-304 response.
 */
export async function rssAdapter(source: Source): Promise<AdapterResult> {
  // Build headers conditionally — sending literal "null" would trigger 412 on
  // strict servers (research pitfall #7).
  const headers: Record<string, string> = {
    Accept: 'application/rss+xml, application/atom+xml, application/xml',
  }
  if (source.etag) headers['If-None-Match'] = source.etag
  if (source.lastModified) headers['If-Modified-Since'] = source.lastModified

  const response = await fetchWithTimeout(source.url, { headers })

  // INGEST-04b: 304 short-circuit — skip body parse entirely, preserve prior validators.
  if (response.status === 304) {
    return { items: [], etag: undefined, lastModified: undefined }
  }

  if (!response.ok) {
    throw new Error(
      `rssAdapter: HTTP ${response.status} fetching ${source.url}`,
    )
  }

  // INGEST-04: capture fresh validators BEFORE parsing (forward verbatim — no W/ stripping).
  const newEtag = response.headers.get('etag') ?? null
  const newLastModified = response.headers.get('last-modified') ?? null

  const xml = await response.text()
  const parsed = parseFeed(xml)
  const keywords = source.keywords ?? []

  let parsedItems: RawItem[] = []

  if (parsed.format === 'rss') {
    const items = parsed.feed.items ?? []
    parsedItems = items
      .filter((item) =>
        matchesKeywords(`${item.title ?? ''} ${item.description ?? ''}`, keywords),
      )
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
  } else if (parsed.format === 'atom') {
    const entries = parsed.feed.entries ?? []
    parsedItems = entries
      .filter((entry) =>
        matchesKeywords(`${entry.title ?? ''} ${entry.summary ?? ''}`, keywords),
      )
      .map((entry) => {
        const title = entry.title ?? ''
        const summary = entry.summary ?? ''
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
  // rdf/json feed formats: parsedItems stays empty (not required by ING-02)

  return { items: parsedItems, etag: newEtag, lastModified: newLastModified }
}
