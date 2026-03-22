/**
 * Publish Service
 *
 * publishArticles() advances all WRITTEN articles to PUBLISHED status.
 * Logs count of held-back REVIEW articles each cycle.
 *
 * Requirements: PUB-01
 */
import type { PrismaClient } from '@prisma/client'
import { prisma as defaultPrisma } from '../prisma'

export interface PublishResult {
  articlesPublished: number
  reviewBacklog: number
}

export async function publishArticles(): Promise<PublishResult>
export async function publishArticles(client: PrismaClient): Promise<PublishResult>
export async function publishArticles(
  clientOrUndefined?: PrismaClient
): Promise<PublishResult> {
  const db =
    clientOrUndefined !== undefined &&
    clientOrUndefined !== null &&
    '$connect' in clientOrUndefined
      ? clientOrUndefined
      : defaultPrisma

  const now = new Date()

  const published = await db.article.updateMany({
    where: { status: 'WRITTEN' },
    data: { status: 'PUBLISHED', publishedAt: now },
  })

  const reviewCount = await db.article.count({ where: { status: 'REVIEW' } })

  if (reviewCount > 0) {
    console.warn({ type: 'REVIEW_BACKLOG', count: reviewCount })
  }

  return {
    articlesPublished: published.count,
    reviewBacklog: reviewCount,
  }
}
