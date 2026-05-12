import type { Source } from '@prisma/client'

export interface RawItem {
  externalId: string
  sourceUrl: string
  title: string
  body: string
  publishedAt: Date | null
  rawPayload: unknown
  imageUrl?: string
}

/**
 * Adapter return envelope.
 *
 * Phase 44 (INGEST-04) widened AdapterFn from `RawItem[]` to `AdapterResult` so
 * RSS can return new HTTP cache validators without an out-of-band side-channel
 * write to the Source row — ingest.ts is the single transaction site.
 *
 * Tri-state semantics of `etag` / `lastModified` (consumed by ingest.ts):
 *   null      → adapter has no conditional-GET support (OTS); do NOT touch the column.
 *   undefined → adapter sent a conditional GET and got 304; preserve the prior stored value.
 *   string    → adapter sent a conditional GET and got 200; persist this new value.
 */
export interface AdapterResult {
  items: RawItem[]
  /** RSS: server's ETag verbatim on 200, undefined on 304, null when N/A (OTS). */
  etag?: string | null
  /** RSS: server's Last-Modified on 200, undefined on 304, null when N/A (OTS). */
  lastModified?: string | null
}

export type AdapterFn = (source: Source) => Promise<AdapterResult>
