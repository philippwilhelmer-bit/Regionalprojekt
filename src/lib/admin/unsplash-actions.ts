'use server'

import { prisma } from '../prisma'
import { requireAuth } from './auth-node'
import { fetchTopicImage, extractKeywords } from '../images/unsplash'

export interface UnsplashSearchResult {
  id: string
  url: string
  thumb: string
  credit: string
  description: string | null
}

/**
 * Search Unsplash for images matching a query.
 * Returns up to 6 results for the editor to pick from.
 */
export async function searchUnsplashImages(query: string): Promise<UnsplashSearchResult[]> {
  await requireAuth()

  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) {
    throw new Error('UNSPLASH_ACCESS_KEY ist nicht konfiguriert. Bitte in Vercel Environment Variables hinzufügen.')
  }

  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=6&orientation=landscape`
  const response = await fetch(url, {
    headers: { Authorization: `Client-ID ${accessKey}` },
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    console.error(`[unsplash] HTTP ${response.status}: ${body}`)
    return []
  }

  const data = (await response.json()) as {
    results: Array<{
      id: string
      urls: { raw: string; small: string }
      user: { name: string }
      description: string | null
      alt_description: string | null
    }>
  }

  return (data.results ?? []).map((photo) => ({
    id: photo.id,
    url: `${photo.urls.raw}&w=1280&q=80&fit=crop`,
    thumb: photo.urls.small,
    credit: `Foto: ${photo.user.name} / Unsplash`,
    description: photo.alt_description ?? photo.description,
  }))
}

/**
 * Suggest search keywords from an article headline.
 */
export async function suggestKeywords(headline: string): Promise<string[]> {
  await requireAuth()
  return extractKeywords(headline)
}

/**
 * Save a selected Unsplash image to an article.
 */
export async function saveArticleImage(
  articleId: number,
  imageUrl: string,
  imageCredit: string,
): Promise<void> {
  await requireAuth()
  await prisma.article.update({
    where: { id: articleId },
    data: { imageUrl, imageCredit },
  })
}

/**
 * Remove the image from an article.
 */
export async function removeArticleImage(articleId: number): Promise<void> {
  await requireAuth()
  await prisma.article.update({
    where: { id: articleId },
    data: { imageUrl: null, imageCredit: null },
  })
}
