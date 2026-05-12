/**
 * Core ingestion orchestrator.
 *
 * Requirements:
 *   ING-04     — Health tracking: consecutiveFailures, DEGRADED/DOWN/OK transitions.
 *   ING-05     — Adapter registry: adding a new adapter to registry.ts is the
 *                only change needed.
 *   INGEST-03  — Persist Source.lastFetchedAt on every successful round-trip
 *                (used by OTS as the cursor for the next list-window).
 *   INGEST-04  — Persist RSS conditional-GET validators (etag/lastModified)
 *                only when the adapter returned new ones (tri-state semantics).
 *   INGEST-05  — Wrap IngestionRun.update + Source.update in a single
 *                db.$transaction (both success and failure paths) so a crash
 *                between them never leaves Source.healthStatus divergent from
 *                IngestionRun.finishedAt.
 *
 * Adapter return shape (see types.ts → AdapterResult):
 *   AdapterResult = { items, etag, lastModified }
 *     etag: null       → adapter has no conditional-GET support (OTS).
 *                        Do NOT touch the Source.etag column.
 *     etag: undefined  → adapter sent conditional GET, got 304.
 *                        Preserve the previously stored Source.etag value.
 *     etag: <string>   → adapter sent conditional GET, got 200.
 *                        Persist the new value to Source.etag.
 *   Same tri-state applies to `lastModified`. Mapping to Prisma uses a
 *   conditional spread so the update payload only includes the column when
 *   we actually intend to write — `{ etag: null }` would clear the column,
 *   which is the wrong behaviour on 304.
 *
 * Flow:
 *   1. Open IngestionRun.
 *   2. Resolve adapter from registry — throw if none found.
 *   3. Call adapter(source) — catch errors.
 *   4. For each RawItem: compute contentHash, isDuplicate check, Article.create if new.
 *   5+6. Transactional close: IngestionRun update + Source health/cursor update.
 *
 * Health thresholds (per-source via source.healthFailureThreshold):
 *   consecutiveFailures >= threshold → DOWN
 *   consecutiveFailures >= 1         → DEGRADED
 *   0                                 → OK
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
  source?: Source,
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
  // adapterRegistry maps ArticleSource → AdapterFn; AdapterFn takes Source.
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
  let adapterResult
  try {
    adapterResult = await adapterFn(src)
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)

    // INGEST-05: failure path — IngestionRun.update + Source.update in one transaction.
    const newFailures = src.consecutiveFailures + 1
    const newHealth =
      newFailures >= src.healthFailureThreshold ? 'DOWN' : 'DEGRADED'

    await db.$transaction([
      db.ingestionRun.update({
        where: { id: run.id },
        data: { finishedAt: new Date(), error: errMsg },
      }),
      db.source.update({
        where: { id: src.id },
        data: { consecutiveFailures: newFailures, healthStatus: newHealth },
      }),
    ])

    console.warn(
      `[ingest] sourceId=${src.id} health degraded: ${newHealth} (consecutiveFailures=${newFailures}) — ${errMsg}`,
    )

    throw err
  }

  // Step 4: Dedup + Article.create
  const rawItems = adapterResult.items
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
        imageUrl: item.imageUrl ?? undefined,
      },
    })
    itemsNew++
  }

  // Step 5+6: INGEST-05 — transactional close + Source health/cursor update.
  // Conditional spreads implement the etag/lastModified tri-state:
  //   undefined → omit key (Prisma leaves column unchanged) — RSS 304 preserve
  //   null      → omit key (OTS has no conditional GET, don't clobber)
  //   string    → include key (RSS 200 persist new validator)
  const etagPatch =
    typeof adapterResult.etag === 'string' ? { etag: adapterResult.etag } : {}
  const lastModifiedPatch =
    typeof adapterResult.lastModified === 'string'
      ? { lastModified: adapterResult.lastModified }
      : {}

  await db.$transaction([
    db.ingestionRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), itemsFound, itemsNew },
    }),
    db.source.update({
      where: { id: src.id },
      data: {
        consecutiveFailures: 0,
        healthStatus: 'OK',
        lastSuccessAt: new Date(),
        lastFetchedAt: new Date(), // INGEST-03
        ...etagPatch, // INGEST-04
        ...lastModifiedPatch, // INGEST-04
      },
    }),
  ])

  return { itemsFound, itemsNew }
}
