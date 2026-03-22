/**
 * Publish Service
 *
 * publishArticles() advances all WRITTEN articles to PUBLISHED status.
 * Logs count of held-back REVIEW articles each cycle.
 *
 * Requirements: PUB-01
 */
import type { PrismaClient } from '@prisma/client'

export interface PublishResult {
  articlesPublished: number
  reviewBacklog: number
}

export async function publishArticles(): Promise<PublishResult>
export async function publishArticles(client: PrismaClient): Promise<PublishResult>
export async function publishArticles(
  _clientOrUndefined?: PrismaClient
): Promise<PublishResult> {
  // TODO: implement in Plan 02
  throw new Error('publishArticles: not yet implemented')
}
