/**
 * Core ingestion orchestrator.
 *
 * Requirements:
 *   ING-04 — Health tracking: consecutiveFailures, DEGRADED/DOWN/OK transitions, structured logs
 *   ING-05 — Adapter registry: adding a new adapter to registry.ts is the only change needed
 *
 * Flow:
 *   1. Open IngestionRun
 *   2. Resolve adapter from registry — throw if none found
 *   3. Call adapter(source) — catch errors
 *   4. For each RawItem: compute contentHash, isDuplicate check, Article.create if new
 *   5. Close IngestionRun with counts or error
 *   6. Update Source health (consecutiveFailures, healthStatus, lastSuccessAt)
 *
 * Health thresholds (read from source.healthFailureThreshold — configurable per-source via CMS):
 *   consecutiveFailures >= source.healthFailureThreshold → DOWN
 *   consecutiveFailures >= 1 → DEGRADED
 *   0 → OK
 *
 * Alerting: structured console.warn/error (no external alert service in Phase 2).
 */
import type { PrismaClient, Source } from '@prisma/client'
import { prisma as defaultPrisma } from '../prisma'
import { adapterRegistry } from './adapters/registry'
import { computeContentHash, isDuplicate } from './dedup'

export interface IngestResult {
  itemsFound: number
  itemsNew: number
}

/** Production overload */
export async function ingest(source: Source): Promise<IngestResult>
/** Test overload (injected client) */
export async function ingest(client: PrismaClient, source: Source): Promise<IngestResult>
export async function ingest(
  clientOrSource: PrismaClient | Source,
  source?: Source
): Promise<IngestResult> {
  let db: PrismaClient
  let src: Source

  if (
    clientOrSource !== null &&
    clientOrSource !== undefined &&
    typeof clientOrSource === 'object' &&
    '$connect' in clientOrSource
  ) {
    db = clientOrSource as PrismaClient
    src = source!
  } else {
    db = defaultPrisma
    src = clientOrSource as Source
  }

  // Step 1: Open IngestionRun
  const run = await db.ingestionRun.create({
    data: { sourceId: src.id },
  })

  // Step 2: Resolve adapter
  // adapterRegistry maps ArticleSource → AdapterFn; AdapterFn takes Source (Prisma model).
  const adapterFn = adapterRegistry[src.type]
  if (!adapterFn) {
    const errMsg = `No adapter registered for source type: ${src.type} (sourceId=${src.id})`
    await db.ingestionRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), error: errMsg },
    })
    throw new Error(errMsg)
  }

  // Step 3: Call adapter, catch errors
  let rawItems
  try {
    // Call adapter — AdapterFn takes Source so adapters can access source.url if needed
    rawItems = await adapterFn(src)
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)

    // Close IngestionRun with error
    await db.ingestionRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), error: errMsg },
    })

    // Increment failures and update health
    const newFailures = src.consecutiveFailures + 1
    const newHealth =
      newFailures >= src.healthFailureThreshold ? 'DOWN' : 'DEGRADED'

    await db.source.update({
      where: { id: src.id },
      data: { consecutiveFailures: newFailures, healthStatus: newHealth },
    })

    console.warn(
      `[ingest] sourceId=${src.id} health degraded: ${newHealth} (consecutiveFailures=${newFailures}) — ${errMsg}`
    )

    throw err
  }

  // Step 4: Dedup + Article.create
  const itemsFound = rawItems.length
  let itemsNew = 0

  for (const item of rawItems) {
    const contentHash = computeContentHash(item.title, item.body)

    const dup = await isDuplicate(db, src.type, item.externalId, contentHash)
    if (dup) continue

    await db.article.create({
      data: {
        externalId: item.externalId,
        source: src.type,
        sourceId: src.id,
        status: 'FETCHED',
        title: item.title,
        content: item.body,
        contentHash,
        rawPayload: item.rawPayload ?? undefined,
        publishedAt: item.publishedAt ?? undefined,
      },
    })
    itemsNew++
  }

  // Step 5: Close IngestionRun with counts
  await db.ingestionRun.update({
    where: { id: run.id },
    data: { finishedAt: new Date(), itemsFound, itemsNew },
  })

  // Step 6: Reset health on success
  await db.source.update({
    where: { id: src.id },
    data: {
      consecutiveFailures: 0,
      healthStatus: 'OK',
      lastSuccessAt: new Date(),
    },
  })

  return { itemsFound, itemsNew }
}
