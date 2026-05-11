'use server'

/**
 * Server Actions for map image generation.
 *
 * generateMapForArticle: On-demand single-article map generation (called from CMS picker).
 * backfillMapImages: Bulk backfill for PUBLISHED articles missing imageUrl.
 *
 * Requirements: INTG-03, INTG-04
 */

import { prisma } from '../prisma'
import { requireAuth } from './auth-node'
import { extractLocation, llmLocationFallback } from '../images/locextract'
import { geocodeLocation } from '../images/geocode'
import { generateMapImage } from '../images/mapgen'
import Anthropic from '@anthropic-ai/sdk'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BackfillResult {
  processed: number
  succeeded: number
  failed: number
  skipped: number
}

// ---------------------------------------------------------------------------
// generateMapForArticle
// ---------------------------------------------------------------------------

/**
 * Generate a map image for a single article. Called from the CMS MapPicker.
 * Runs the full extractLocation → geocodeLocation → generateMapImage pipeline
 * and persists the result to the article.
 */
export async function generateMapForArticle(
  articleId: number
): Promise<{ url: string; credit: string } | { error: string }> {
  await requireAuth()

  const article = await prisma.article.findUnique({ where: { id: articleId } })
  if (!article) {
    return { error: 'Article not found' }
  }

  const articleContent = [article.title, article.content].filter(Boolean).join('\n\n')
  const client = new Anthropic()

  let locationName = extractLocation(articleContent)
  if (!locationName) {
    const fallback = await llmLocationFallback(client, articleContent)
    locationName = fallback.location
  }

  if (!locationName) {
    return { error: 'No location found in article' }
  }

  const geo = await geocodeLocation(prisma, locationName)
  if (!geo) {
    return { error: `Location "${locationName}" not geocodable` }
  }

  const mapImage = await generateMapImage(
    geo.lat,
    geo.lon,
    article.title ?? '',
    articleId,
    geo.locationType
  )
  if (!mapImage) {
    return { error: 'Map generation failed' }
  }

  await prisma.article.update({
    where: { id: articleId },
    data: { imageUrl: mapImage.url, imageCredit: mapImage.credit },
  })

  return { url: mapImage.url, credit: mapImage.credit }
}

// ---------------------------------------------------------------------------
// backfillMapImages
// ---------------------------------------------------------------------------

/**
 * Bulk backfill: generates map images for all PUBLISHED articles with no imageUrl.
 * Processes articles sequentially to respect Nominatim's 1 req/s rate limit.
 * Caps at 10 articles per invocation (conservative Vercel Server Action timeout limit).
 */
export async function backfillMapImages(): Promise<BackfillResult> {
  await requireAuth()

  const articles = await prisma.article.findMany({
    where: {
      status: 'PUBLISHED',
      imageUrl: null,
    },
    select: { id: true, title: true, content: true },
    orderBy: { publishedAt: 'desc' },
    take: 10,
  })

  const client = new Anthropic()
  let succeeded = 0
  let failed = 0
  let skipped = 0

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i]
    console.log(`[backfill] Processing article ${article.id} (${i + 1}/${articles.length})`)

    try {
      const articleContent = [article.title, article.content].filter(Boolean).join('\n\n')
      let locationName = extractLocation(articleContent)
      if (!locationName) {
        const fallback = await llmLocationFallback(client, articleContent)
        locationName = fallback.location
      }

      if (!locationName) {
        skipped++
        console.log(`[backfill] Article ${article.id}: skipped (no location)`)
        // Still wait after a skip — we may have called llmLocationFallback which could
        // result in future geocoding; and we want uniform loop pacing.
        await new Promise((r) => setTimeout(r, 1100))
        continue
      }

      const geo = await geocodeLocation(prisma, locationName)

      // Rate-limit: wait 1100ms after each geocodeLocation call (Nominatim 1 req/s policy).
      // This delay applies even when GeocodingCache returns a cached result, because
      // the cache-hit path is indistinguishable at this layer.
      await new Promise((r) => setTimeout(r, 1100))

      if (!geo) {
        skipped++
        console.log(`[backfill] Article ${article.id}: skipped (no location)`)
        continue
      }

      const mapImage = await generateMapImage(
        geo.lat,
        geo.lon,
        article.title ?? '',
        article.id,
        geo.locationType
      )

      if (!mapImage) {
        failed++
        console.log(`[backfill] Article ${article.id}: failed: map generation returned null`)
        continue
      }

      await prisma.article.update({
        where: { id: article.id },
        data: { imageUrl: mapImage.url, imageCredit: mapImage.credit },
      })

      succeeded++
      console.log(`[backfill] Article ${article.id}: succeeded`)
    } catch (err) {
      failed++
      console.log(`[backfill] Article ${article.id}: failed: ${String(err)}`)
    }
  }

  console.log(
    `[backfill] Done: ${succeeded} succeeded, ${skipped} skipped, ${failed} failed out of ${articles.length}`
  )

  return {
    processed: articles.length,
    succeeded,
    failed,
    skipped,
  }
}
