/**
 * OTS.at REST API adapter.
 *
 * Requirements:
 *   ING-01     — Press releases from OTS.at appear in the ingestion queue.
 *   INGEST-01  — Bulk dedup: single Prisma findMany regardless of list size.
 *   INGEST-02  — AbortController + 10s timeout on every external fetch.
 *   INGEST-03  — Cursor: `Source.lastFetchedAt - 30min` overlap, NULL → 24h fallback.
 *
 * Design:
 *   - Factory `createOtsAtAdapter(db)` injects PrismaClient for tests.
 *   - Reads OTS_API_KEY from process.env — never stored in the Source row.
 *   - Pre-filters by keywords before fetching /api/detail (rate-limit protection).
 *   - Returns AdapterResult (Phase 44 unified envelope); OTS has no conditional
 *     GET support, so etag/lastModified are always null.
 */
import type { PrismaClient } from '@prisma/client'
import { prisma as defaultPrisma } from '../../prisma'
import type { AdapterFn, AdapterResult, RawItem } from '../types'
import { fetchWithTimeout } from '../fetch-utils'

const OTS_BASE_URL = 'https://www.ots.at/api'
const LIST_SIZE = 50
// 24 hours in seconds — used only when source.lastFetchedAt is null (first run / new source)
const LOOKBACK_SECONDS = 24 * 60 * 60
// INGEST-03: overlap window when cursor is set, prevents missed items at the seam
const CURSOR_OVERLAP_SECONDS = 30 * 60

/**
 * Candidate field names for the article body in the OTS detail response.
 * The actual field name is MEDIUM confidence — try each in order, warn if none found.
 */
const CANDIDATE_BODY_FIELDS = ['TEXT', 'BODY', 'INHALT', 'text', 'body'] as const

/** Shape of a single item in the OTS /api/liste response */
interface OtsListItem {
  OTSKEY: string
  TITEL: string
  ZEITSTEMPEL: number
  WEBLINK: string
  UTL?: string
  DATUM?: string
  ZEIT?: string
  EMITTENT?: string
}

/**
 * Fetch the OTS list endpoint.
 * Caller computes `vonEpochSeconds` from Source.lastFetchedAt (INGEST-03).
 * Throws Error if the response is not 2xx.
 */
async function fetchOtsList(
  apiKey: string,
  vonEpochSeconds: number,
): Promise<OtsListItem[]> {
  const url = `${OTS_BASE_URL}/liste?app=${encodeURIComponent(apiKey)}&anz=${LIST_SIZE}&von=${vonEpochSeconds}`

  const response = await fetchWithTimeout(url)
  if (!response.ok) {
    throw new Error(
      `OTS /api/liste returned HTTP ${response.status} — aborting ingestion run`,
    )
  }

  return response.json() as Promise<OtsListItem[]>
}

/**
 * Fetch the OTS detail endpoint for a single item.
 * Throws Error if the response is not 2xx.
 */
async function fetchOtsDetail(apiKey: string, otsKey: string): Promise<unknown> {
  const url = `${OTS_BASE_URL}/detail?app=${encodeURIComponent(apiKey)}&id=${encodeURIComponent(otsKey)}`

  const response = await fetchWithTimeout(url)
  if (!response.ok) {
    throw new Error(
      `OTS /api/detail returned HTTP ${response.status} for OTSKEY=${otsKey} — aborting ingestion run`,
    )
  }

  return response.json()
}

/** Candidate field names for an image URL in the OTS detail response. */
const CANDIDATE_IMAGE_FIELDS = [
  'BILD',
  'IMAGE',
  'FOTO',
  'bild',
  'image',
  'foto',
  'BILDURL',
  'bildurl',
] as const

function extractImageUrl(detail: Record<string, unknown>): string | undefined {
  for (const field of CANDIDATE_IMAGE_FIELDS) {
    const value = detail[field]
    if (typeof value === 'string' && value.startsWith('http')) {
      return value
    }
  }
  return undefined
}

function extractBody(detail: Record<string, unknown>): string {
  for (const field of CANDIDATE_BODY_FIELDS) {
    const value = detail[field]
    if (typeof value === 'string' && value.length > 0) {
      return value
    }
  }

  console.warn(
    `[ots-at] Body field not found in detail response. Tried: ${CANDIDATE_BODY_FIELDS.join(', ')}. Falling back to empty string.`,
  )
  return ''
}

/**
 * Factory that creates an OTS.at AdapterFn with an injected PrismaClient.
 *
 * Production: const otsAtAdapter = createOtsAtAdapter()
 * Tests (DI): const adapter = createOtsAtAdapter(testPrisma)
 */
export function createOtsAtAdapter(db?: PrismaClient): AdapterFn {
  const prismaClient = db ?? defaultPrisma

  return async (source): Promise<AdapterResult> => {
    const apiKey = process.env.OTS_API_KEY
    if (!apiKey) {
      throw new Error('OTS_API_KEY environment variable is not set')
    }

    const keywords = source.keywords ?? []

    // INGEST-03: compute the list-window cursor.
    // - lastFetchedAt set    → look back to lastFetchedAt - 30min (overlap to cover seam)
    // - lastFetchedAt null   → first run / new source: fall back to 24h window
    const von = source.lastFetchedAt
      ? Math.floor(source.lastFetchedAt.getTime() / 1000) - CURSOR_OVERLAP_SECONDS
      : Math.floor(Date.now() / 1000) - LOOKBACK_SECONDS

    // Step 1: Fetch the list of recent press releases
    const listItems = await fetchOtsList(apiKey, von)

    // Step 1b: Pre-filter by keywords (before expensive detail fetches)
    const filteredList =
      keywords.length > 0
        ? listItems.filter((item) => {
            const text = `${item.TITEL} ${item.UTL ?? ''}`.toLowerCase()
            return keywords.some((kw) => text.includes(kw.toLowerCase()))
          })
        : listItems

    // INGEST-01: bulk dedup via single findMany + Set diff.
    // Defensive: when filteredList is empty, skip the DB roundtrip entirely.
    const externalIds = filteredList.map((item) => item.OTSKEY)
    const existing =
      externalIds.length === 0
        ? []
        : await prismaClient.article.findMany({
            where: { source: 'OTS_AT', externalId: { in: externalIds } },
            select: { externalId: true },
          })
    const existingKeys = new Set(existing.map((e) => e.externalId))
    const newItems = filteredList.filter((item) => !existingKeys.has(item.OTSKEY))

    // Step 3: Fetch detail only for new items (rate limit protection)
    const rawItems: RawItem[] = []
    for (const item of newItems) {
      const detail = await fetchOtsDetail(apiKey, item.OTSKEY)
      const detailRecord = detail as Record<string, unknown>

      rawItems.push({
        externalId: item.OTSKEY,
        title: item.TITEL,
        sourceUrl: item.WEBLINK,
        publishedAt: new Date(item.ZEITSTEMPEL * 1000),
        body: extractBody(detailRecord),
        imageUrl: extractImageUrl(detailRecord),
        rawPayload: detail,
      })
    }

    // OTS has no conditional GET — etag/lastModified are always null.
    // ingest.ts treats null as "do not touch the column" (see AdapterResult docs).
    return { items: rawItems, etag: null, lastModified: null }
  }
}

/**
 * Default production adapter instance.
 * Uses the singleton PrismaClient from ../../prisma.
 */
export const otsAtAdapter: AdapterFn = createOtsAtAdapter()
