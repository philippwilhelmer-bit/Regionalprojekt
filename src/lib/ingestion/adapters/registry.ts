/**
 * Adapter registry for the ingestion pipeline.
 *
 * Requirements:
 *   ING-05 — Adding a new adapter requires only one change: add a new entry here.
 *
 * Design:
 *   adapterRegistry is a Partial<Record<ArticleSource, AdapterFn>> —
 *   MANUAL is intentionally absent (not a polling source).
 *   The ingest() function looks up the adapter by source.type and throws
 *   if no adapter is registered (e.g. an unexpected MANUAL source row).
 */
import type { ArticleSource } from '@prisma/client'
import type { AdapterFn } from '../types'
import { otsAtAdapter } from './ots-at'
import { rssAdapter } from './rss'

export const adapterRegistry: Partial<Record<ArticleSource, AdapterFn>> = {
  OTS_AT: otsAtAdapter,
  RSS: rssAdapter,
  // MANUAL: intentionally absent — MANUAL sources are not polled
}
