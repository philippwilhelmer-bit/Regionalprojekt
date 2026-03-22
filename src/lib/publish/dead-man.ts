/**
 * Dead-Man Monitor
 *
 * checkDeadMan() queries max(Article.publishedAt).
 * If silence exceeds DEAD_MAN_THRESHOLD_HOURS (default 6), emits structured console.warn.
 *
 * Requirements: PUB-03
 */
import type { PrismaClient } from '@prisma/client'
import { prisma as defaultPrisma } from '../prisma'

export async function checkDeadMan(): Promise<void>
export async function checkDeadMan(client: PrismaClient): Promise<void>
export async function checkDeadMan(
  clientOrUndefined?: PrismaClient
): Promise<void> {
  const db =
    clientOrUndefined !== undefined &&
    clientOrUndefined !== null &&
    '$connect' in clientOrUndefined
      ? clientOrUndefined
      : defaultPrisma

  const thresholdHours = parseInt(process.env.DEAD_MAN_THRESHOLD_HOURS ?? '6', 10)

  const agg = await db.article.aggregate({ _max: { publishedAt: true } })
  const lastPublishedAt = agg._max.publishedAt

  const silenceMs = lastPublishedAt
    ? Date.now() - lastPublishedAt.getTime()
    : Infinity

  const silenceDurationHours = silenceMs / (1000 * 60 * 60)

  if (silenceDurationHours >= thresholdHours) {
    console.warn({
      type: 'DEAD_MAN_ALERT',
      lastPublishedAt: lastPublishedAt?.toISOString() ?? null,
      silenceDurationHours: Math.round(silenceDurationHours),
    })
  }
}
