/**
 * Nominatim geocoding with Postgres cache (MAP-02).
 *
 * Looks up GeocodingCache first. On a cache miss, calls Nominatim
 * and stores the result via upsert (handles P2002 race condition).
 *
 * Requirements: MAP-02
 */
import type { PrismaClient } from '@prisma/client'
import { GEOCODING_QUERY_OVERRIDE } from './locextract'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface GeocodingResult {
  lat: number
  lon: number
  locationType: string
  displayName: string
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface NominatimResult {
  lat: string       // Note: Nominatim returns lat/lon as strings in jsonv2
  lon: string
  type: string
  display_name: string
}

// ---------------------------------------------------------------------------
// geocodeLocation
// ---------------------------------------------------------------------------

export async function geocodeLocation(
  db: PrismaClient,
  placeName: string
): Promise<GeocodingResult | null> {
  // Apply display-name overrides for Nominatim-unfriendly Bezirk names
  const query = GEOCODING_QUERY_OVERRIDE[placeName] ?? placeName

  // Normalize cache key: lowercase + trim
  const normalized = query.trim().toLowerCase()

  // 1. Cache lookup
  const cached = await db.geocodingCache.findUnique({ where: { normalizedName: normalized } })
  if (cached) {
    return {
      lat: cached.lat,
      lon: cached.lon,
      locationType: cached.locationType,
      displayName: cached.displayName,
    }
  }

  // 2. Nominatim HTTP call
  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?q=${encodeURIComponent(query)}&countrycodes=at&format=jsonv2&limit=1`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Wurzelwelt/1.0 (https://wurzelwelt.at)' },
  })

  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`)

  const results = (await res.json()) as NominatimResult[]
  if (!results.length) return null

  const { lat, lon, type, display_name } = results[0]
  const latNum = parseFloat(lat)
  const lonNum = parseFloat(lon)

  // 3. Store in cache via upsert (handles concurrent P2002 unique constraint races)
  await db.geocodingCache.upsert({
    where: { normalizedName: normalized },
    create: {
      normalizedName: normalized,
      displayName: display_name,
      lat: latNum,
      lon: lonNum,
      locationType: type,
    },
    update: {}, // no-op if already exists (concurrent insert won the race)
  })

  return {
    lat: latNum,
    lon: lonNum,
    locationType: type,
    displayName: display_name,
  }
}
