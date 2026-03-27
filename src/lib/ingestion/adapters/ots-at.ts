/**
 * OTS.at REST API adapter.
 *
 * Requirements:
 *   ING-01 — Press releases from OTS.at appear in the ingestion queue within one polling cycle.
 *
 * Design:
 *   - Uses a factory function createOtsAtAdapter(db) to allow DI of PrismaClient in tests
 *     without violating the AdapterFn interface (which takes only ArticleSource)
 *   - Reads OTS_API_KEY from process.env — never stored in the Source row
 *   - Deduplicates by externalId BEFORE fetching /api/detail to respect the 2,500 req/day limit
 *   - Body field extracted defensively from a candidate list — OTS API body field name is MEDIUM confidence
 */
import type { PrismaClient } from '@prisma/client'
import { prisma as defaultPrisma } from '../../prisma'
import type { AdapterFn, RawItem } from '../types'

const OTS_BASE_URL = 'https://www.ots.at/api'
const LIST_SIZE = 50
// 24 hours in seconds — look back one full polling window
const LOOKBACK_SECONDS = 24 * 60 * 60

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
 * Throws Error if the response is not 2xx.
 */
async function fetchOtsList(apiKey: string): Promise<OtsListItem[]> {
  const sinceTimestamp = Math.floor(Date.now() / 1000) - LOOKBACK_SECONDS
  const url = `${OTS_BASE_URL}/liste?app=${encodeURIComponent(apiKey)}&anz=${LIST_SIZE}&von=${sinceTimestamp}`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(
      `OTS /api/liste returned HTTP ${response.status} — aborting ingestion run`
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

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(
      `OTS /api/detail returned HTTP ${response.status} for OTSKEY=${otsKey} — aborting ingestion run`
    )
  }

  return response.json()
}

/** Candidate field names for an image URL in the OTS detail response. */
const CANDIDATE_IMAGE_FIELDS = ['BILD', 'IMAGE', 'FOTO', 'bild', 'image', 'foto', 'BILDURL', 'bildurl'] as const

/**
 * Extract an image URL from a detail response object.
 * Returns the first non-empty URL string found, or undefined.
 */
function extractImageUrl(detail: Record<string, unknown>): string | undefined {
  for (const field of CANDIDATE_IMAGE_FIELDS) {
    const value = detail[field]
    if (typeof value === 'string' && value.startsWith('http')) {
      return value
    }
  }
  return undefined
}

/**
 * Extract the body text from a detail response object.
 * Tries CANDIDATE_BODY_FIELDS in order; logs a warning and returns "" if none found.
 */
function extractBody(detail: Record<string, unknown>): string {
  for (const field of CANDIDATE_BODY_FIELDS) {
    const value = detail[field]
    if (typeof value === 'string' && value.length > 0) {
      return value
    }
  }

  console.warn(
    `[ots-at] Body field not found in detail response. Tried: ${CANDIDATE_BODY_FIELDS.join(', ')}. Falling back to empty string.`
  )
  return ''
}

/**
 * Factory that creates an OTS.at AdapterFn with an injected PrismaClient.
 *
 * Usage in production:
 *   const otsAtAdapter = createOtsAtAdapter()
 *
 * Usage in tests (DI):
 *   const adapter = createOtsAtAdapter(testPrisma)
 */
export function createOtsAtAdapter(db?: PrismaClient): AdapterFn {
  const prismaClient = db ?? defaultPrisma

  return async (_source): Promise<RawItem[]> => {
    const apiKey = process.env.OTS_API_KEY
    if (!apiKey) {
      throw new Error('OTS_API_KEY environment variable is not set')
    }

    // Step 1: Fetch the list of recent press releases
    const listItems = await fetchOtsList(apiKey)

    // Step 2: Deduplicate — filter out items already in Article DB by source+externalId
    const newItems: OtsListItem[] = []
    for (const item of listItems) {
      const existing = await prismaClient.article.findFirst({
        where: { source: 'OTS_AT', externalId: item.OTSKEY },
        select: { id: true },
      })
      if (existing === null) {
        newItems.push(item)
      }
    }

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

    return rawItems
  }
}

/**
 * Default production adapter instance.
 * Uses the singleton PrismaClient from ../../prisma.
 */
export const otsAtAdapter: AdapterFn = createOtsAtAdapter()
