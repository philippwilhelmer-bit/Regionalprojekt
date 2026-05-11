/**
 * POST /api/admin/generate-map
 *
 * On-demand map image generation for a single article.
 * Auth: Authorization: Bearer {CRON_SECRET} header (same pattern as cron route).
 *
 * Requirements: INTG-03
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extractLocation, llmLocationFallback } from '@/lib/images/locextract'
import { geocodeLocation } from '@/lib/images/geocode'
import { generateMapImage } from '@/lib/images/mapgen'
import Anthropic from '@anthropic-ai/sdk'

/** Tile fetch + sharp stitching can take 8-15s; 60s is safe for Vercel */
export const maxDuration = 60

export async function POST(request: NextRequest) {
  // Auth: Bearer CRON_SECRET (same pattern as cron route)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { articleId?: unknown }
  try {
    body = (await request.json()) as { articleId?: unknown }
  } catch {
    return NextResponse.json({ error: 'articleId required' }, { status: 400 })
  }

  const articleId = Number(body.articleId)
  if (!articleId || !Number.isFinite(articleId) || articleId <= 0) {
    return NextResponse.json({ error: 'articleId required' }, { status: 400 })
  }

  const article = await prisma.article.findUnique({ where: { id: articleId } })
  if (!article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 })
  }

  const articleContent = [article.title, article.content].filter(Boolean).join('\n\n')
  const anthropicClient = new Anthropic()

  let locationName = extractLocation(articleContent)
  if (!locationName) {
    const fallback = await llmLocationFallback(anthropicClient, articleContent)
    locationName = fallback.location
  }

  if (!locationName) {
    return NextResponse.json({ error: 'No location found in article' }, { status: 422 })
  }

  const geo = await geocodeLocation(prisma, locationName)
  if (!geo) {
    return NextResponse.json(
      { error: `Location "${locationName}" not geocodable` },
      { status: 422 }
    )
  }

  const mapImage = await generateMapImage(
    geo.lat,
    geo.lon,
    article.title ?? '',
    articleId,
    geo.locationType
  )
  if (!mapImage) {
    return NextResponse.json({ error: 'Map generation failed' }, { status: 500 })
  }

  // Persist result
  await prisma.article.update({
    where: { id: articleId },
    data: { imageUrl: mapImage.url, imageCredit: mapImage.credit },
  })

  return NextResponse.json({ url: mapImage.url, credit: mapImage.credit })
}
