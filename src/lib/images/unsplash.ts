/**
 * Unsplash image fetcher for automatic article illustration.
 *
 * Three-tier search: headline keywords → category fallback → generic "news austria".
 * In-memory cache prevents duplicate API calls for the same query.
 *
 * Requires UNSPLASH_ACCESS_KEY in env.
 */

const UNSPLASH_API = 'https://api.unsplash.com/search/photos'

/** German stop words to strip from headlines */
const STOP_WORDS = new Set([
  'der', 'die', 'das', 'und', 'oder', 'in', 'von', 'zu', 'mit', 'bei',
  'für', 'ein', 'eine', 'ist', 'sind', 'hat', 'haben', 'wird', 'den',
  'dem', 'des', 'als', 'an', 'auf', 'aus', 'nach', 'nur', 'auch', 'sich',
  'über', 'unter', 'vor', 'hinter', 'zwischen', 'durch', 'ohne', 'gegen',
  'bis', 'seit', 'wegen', 'trotz', 'nicht', 'noch', 'schon', 'sehr',
  'neue', 'neuer', 'neues', 'neue', 'werden', 'wurde', 'können',
])

/** Category → English fallback queries */
const CATEGORY_FALLBACKS: Record<string, string> = {
  politik: 'politics parliament government',
  wirtschaft: 'business economy finance',
  technologie: 'technology innovation',
  kultur: 'culture arts theater',
  panorama: 'austria vienna city',
  sport: 'sport stadium competition',
  regional: 'austria city landscape',
}

const GENERIC_FALLBACK = 'news austria'

export interface UnsplashImage {
  url: string
  credit: string
}

/** In-memory cache: query string → result */
const queryCache = new Map<string, UnsplashImage | null>()

/**
 * Extract up to 4 keywords from a German headline.
 * Removes stop words, special characters, and words shorter than 4 chars.
 */
export function extractKeywords(headline: string): string[] {
  return headline
    .toLowerCase()
    .replace(/[^a-zäöüß\s-]/g, '')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w))
    .slice(0, 4)
}

/**
 * Call Unsplash search API for a query string.
 * Returns the first landscape result or null.
 */
async function searchUnsplash(query: string, accessKey: string): Promise<UnsplashImage | null> {
  // Check cache first
  if (queryCache.has(query)) {
    return queryCache.get(query) ?? null
  }

  const url = `${UNSPLASH_API}?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`
  const response = await fetch(url, {
    headers: { Authorization: `Client-ID ${accessKey}` },
  })

  if (!response.ok) {
    console.warn(`[unsplash] HTTP ${response.status} for query="${query}"`)
    queryCache.set(query, null)
    return null
  }

  const data = (await response.json()) as {
    results: Array<{
      urls: { raw: string }
      user: { name: string }
    }>
  }

  if (!data.results || data.results.length === 0) {
    queryCache.set(query, null)
    return null
  }

  const photo = data.results[0]
  const result: UnsplashImage = {
    url: `${photo.urls.raw}&w=1280&q=80&fit=crop`,
    credit: `Foto: ${photo.user.name} / Unsplash`,
  }

  queryCache.set(query, result)
  return result
}

/**
 * Fetch a topic image for an article headline.
 *
 * Search cascade:
 *   1. Headline keywords (top 4)
 *   2. Category fallback (English terms)
 *   3. Generic "news austria"
 *
 * @returns { url, credit } or null if UNSPLASH_ACCESS_KEY is missing or all tiers fail
 */
export async function fetchTopicImage(
  headline: string,
  category?: string,
): Promise<UnsplashImage | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) {
    return null
  }

  // Tier 1: headline keywords
  const keywords = extractKeywords(headline)
  if (keywords.length > 0) {
    const result = await searchUnsplash(keywords.join(' '), accessKey)
    if (result) return result
  }

  // Tier 2: category fallback
  if (category) {
    const fallbackQuery = CATEGORY_FALLBACKS[category.toLowerCase()]
    if (fallbackQuery) {
      const result = await searchUnsplash(fallbackQuery, accessKey)
      if (result) return result
    }
  }

  // Tier 3: generic
  return searchUnsplash(GENERIC_FALLBACK, accessKey)
}
