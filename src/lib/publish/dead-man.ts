/**
 * Dead-Man Monitor
 *
 * checkDeadMan() queries max(Article.publishedAt).
 * If silence exceeds DEAD_MAN_THRESHOLD_HOURS (default 6), emits structured console.warn.
 *
 * Requirements: PUB-03
 */
import type { PrismaClient } from '@prisma/client'

export async function checkDeadMan(): Promise<void>
export async function checkDeadMan(client: PrismaClient): Promise<void>
export async function checkDeadMan(
  _clientOrUndefined?: PrismaClient
): Promise<void> {
  // TODO: implement in Plan 02
  throw new Error('checkDeadMan: not yet implemented')
}
