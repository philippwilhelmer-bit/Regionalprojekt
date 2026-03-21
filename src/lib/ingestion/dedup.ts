/**
 * Deduplication service for ingested articles.
 *
 * Requirements:
 *   ING-03 — Duplicate detection before DB write
 *
 * Uses two strategies:
 *   1. Fast path: source + externalId composite lookup (same article from same source)
 *   2. Slow path: contentHash lookup (same content from different source)
 */
import { createHash } from 'node:crypto'
import type { ArticleSource, PrismaClient } from '@prisma/client'
import { prisma as defaultPrisma } from '../prisma'

/**
 * Compute a normalized SHA-256 hash for deduplication.
 *
 * Normalization: lowercase, collapse internal whitespace to a single space, trim.
 * Title and body are joined with "||" before hashing.
 *
 * This ensures that whitespace and case differences don't produce false misses.
 */
export function computeContentHash(title: string, body: string): string {
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
  const combined = `${normalize(title)}||${normalize(body)}`
  return createHash('sha256').update(combined, 'utf8').digest('hex')
}

/**
 * Check whether an article is a duplicate of an existing DB row.
 *
 * Production overload (uses default PrismaClient singleton):
 *   isDuplicate(source, externalId, contentHash)
 *
 * Test overload (injected client for pgLite isolation):
 *   isDuplicate(client, source, externalId, contentHash)
 */
export async function isDuplicate(
  source: ArticleSource,
  externalId: string,
  contentHash: string
): Promise<boolean>
export async function isDuplicate(
  client: PrismaClient,
  source: ArticleSource,
  externalId: string,
  contentHash: string
): Promise<boolean>
export async function isDuplicate(
  clientOrSource: PrismaClient | ArticleSource,
  sourceOrExternalId: ArticleSource | string,
  externalIdOrContentHash: string,
  contentHash?: string
): Promise<boolean> {
  let db: PrismaClient
  let source: ArticleSource
  let externalId: string
  let hash: string

  if (
    clientOrSource !== null &&
    typeof clientOrSource === 'object' &&
    '$connect' in clientOrSource
  ) {
    // Test overload: first arg is the injected client
    db = clientOrSource as PrismaClient
    source = sourceOrExternalId as ArticleSource
    externalId = externalIdOrContentHash
    hash = contentHash!
  } else {
    // Production overload: first arg is the source enum value
    db = defaultPrisma
    source = clientOrSource as ArticleSource
    externalId = sourceOrExternalId as string
    hash = externalIdOrContentHash
  }

  // Fast path: same source + externalId (exact duplicate from same source)
  const bySourceId = await db.article.findFirst({
    where: { source, externalId },
    select: { id: true },
  })
  if (bySourceId !== null) return true

  // Slow path: same contentHash (cross-source duplicate)
  const byHash = await db.article.findFirst({
    where: { contentHash: hash },
    select: { id: true },
  })
  return byHash !== null
}
