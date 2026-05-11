/**
 * RSS / Atom feed extractor — produces clean LLM-input text from a feed item rawPayload.
 *
 * Requirements:
 *   AIPL-06 — Strip source metadata at the extractor boundary so the prompt's
 *             "no Presseformular-Floskeln" rule is not the only line of defense.
 *
 * Behavior:
 *   - Reads only `title` + body field (`description` / `summary` / `content`) from rawPayload.
 *   - Discriminates by field presence: RSS uses `description`, Atom uses `summary`,
 *     some feeds use `content`.
 *   - Falls back to (title, content) args when rawPayload is empty or not an object.
 */

/**
 * Extract clean article text from an RSS or Atom feed item rawPayload.
 *
 * @param rawPayload — the feed item object (RSS item or Atom entry).
 * @param title — fallback title when rawPayload.title is missing.
 * @param content — fallback body when no description/summary/content field is present.
 * @returns "${title}\n\n${body}" with no feed metadata bleed.
 */
export function extractRss(rawPayload: unknown, title?: string, content?: string): string {
  if (!rawPayload || typeof rawPayload !== 'object') {
    return [title, content].filter(Boolean).join('\n\n')
  }

  const item = rawPayload as Record<string, unknown>
  const rssTitle = typeof item['title'] === 'string' ? item['title'] : (title ?? '')

  let body: string
  if (typeof item['description'] === 'string') {
    body = item['description']
  } else if (typeof item['summary'] === 'string') {
    body = item['summary']
  } else if (typeof item['content'] === 'string') {
    body = item['content']
  } else {
    body = content ?? ''
  }

  return [rssTitle, body].filter(Boolean).join('\n\n').trim()
}
