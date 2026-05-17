/**
 * Unit tests for geocode.ts
 *
 * Covers MAP-02: geocodeLocation with Postgres cache and Nominatim fallback.
 * Uses vi.fn() stubs for PrismaClient and global fetch.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { geocodeLocation } from './geocode'

// ---------------------------------------------------------------------------
// Nominatim response fixture
// ---------------------------------------------------------------------------

const GRAZ_NOMINATIM_RESULT = {
  lat: '47.0707918',
  lon: '15.4382786',
  type: 'city',
  display_name: 'Graz, Steiermark, Österreich',
}

// ---------------------------------------------------------------------------
// Mock PrismaClient factory
// ---------------------------------------------------------------------------

function makeMockDb(cachedRow: object | null = null): PrismaClient {
  return {
    geocodingCache: {
      findUnique: vi.fn().mockResolvedValue(cachedRow),
      upsert: vi.fn().mockResolvedValue({}),
    },
  } as unknown as PrismaClient
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('geocodeLocation', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('calls Nominatim and returns result on cache miss', async () => {
    const db = makeMockDb(null)
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [GRAZ_NOMINATIM_RESULT],
    } as Response)

    const result = await geocodeLocation(db, 'Graz')

    expect(result).not.toBeNull()
    expect(result!.lat).toBeCloseTo(47.07, 1)
    expect(result!.lon).toBeCloseTo(15.44, 1)
    expect(result!.locationType).toBe('city')
    expect(result!.displayName).toBe('Graz, Steiermark, Österreich')
    expect(fetchSpy).toHaveBeenCalledOnce()
  })

  it('returns cached result without HTTP call on second invocation', async () => {
    const cachedRow = {
      normalizedName: 'graz',
      displayName: 'Graz, Steiermark, Österreich',
      lat: 47.07,
      lon: 15.44,
      locationType: 'city',
      cachedAt: new Date(),
    }
    const db = makeMockDb(cachedRow)
    const fetchSpy = vi.spyOn(global, 'fetch')

    const result = await geocodeLocation(db, 'Graz')

    expect(result).not.toBeNull()
    expect(result!.lat).toBe(47.07)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('normalizes cache key: "GRAZ" and "graz" resolve to same row', async () => {
    const cachedRow = {
      normalizedName: 'graz',
      displayName: 'Graz, Steiermark, Österreich',
      lat: 47.07,
      lon: 15.44,
      locationType: 'city',
      cachedAt: new Date(),
    }
    const db = makeMockDb(cachedRow)
    vi.spyOn(global, 'fetch')

    await geocodeLocation(db, 'GRAZ')

    expect((db.geocodingCache.findUnique as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith({
      where: { normalizedName: 'graz' },
    })
  })

  it('returns null when Nominatim returns empty array', async () => {
    const db = makeMockDb(null)
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response)

    const result = await geocodeLocation(db, 'Neverland')
    expect(result).toBeNull()
  })

  it('throws immediately on non-429 HTTP error (no retry)', async () => {
    const db = makeMockDb(null)
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
    } as Response)

    await expect(geocodeLocation(db, 'Graz')).rejects.toThrow('Nominatim HTTP 500')
    expect(fetchSpy).toHaveBeenCalledOnce()
  })

  it('retries once on 429 — succeeds if second attempt is ok', async () => {
    const db = makeMockDb(null)
    // Make the 5s back-off instant for the test
    const setTimeoutSpy = vi
      .spyOn(global, 'setTimeout')
      .mockImplementation(((cb: () => void) => {
        cb()
        return 0 as unknown as NodeJS.Timeout
      }) as typeof setTimeout)
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({ ok: false, status: 429 } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [GRAZ_NOMINATIM_RESULT],
      } as Response)

    const result = await geocodeLocation(db, 'Graz')

    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(result).not.toBeNull()
    setTimeoutSpy.mockRestore()
  })

  it('throws if 429 persists after retry', async () => {
    const db = makeMockDb(null)
    const setTimeoutSpy = vi
      .spyOn(global, 'setTimeout')
      .mockImplementation(((cb: () => void) => {
        cb()
        return 0 as unknown as NodeJS.Timeout
      }) as typeof setTimeout)
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: false, status: 429 } as Response)

    await expect(geocodeLocation(db, 'Graz')).rejects.toThrow('Nominatim HTTP 429')
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    setTimeoutSpy.mockRestore()
  })

  it('stores result via upsert on cache miss', async () => {
    const db = makeMockDb(null)
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [GRAZ_NOMINATIM_RESULT],
    } as Response)

    await geocodeLocation(db, 'Graz')

    const upsertFn = db.geocodingCache.upsert as ReturnType<typeof vi.fn>
    expect(upsertFn).toHaveBeenCalledOnce()
    const callArg = upsertFn.mock.calls[0][0]
    expect(callArg.where.normalizedName).toBe('graz')
    expect(callArg.create.lat).toBeCloseTo(47.07, 1)
    expect(callArg.create.lon).toBeCloseTo(15.44, 1)
    expect(callArg.create.locationType).toBe('city')
  })

  it('applies GEOCODING_QUERY_OVERRIDE before Nominatim call', async () => {
    const db = makeMockDb(null)
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [GRAZ_NOMINATIM_RESULT],
    } as Response)

    await geocodeLocation(db, 'Graz (Stadt)')

    // Should have queried Nominatim with "Graz" not "Graz (Stadt)"
    const calledUrl = (fetchSpy.mock.calls[0][0] as string)
    expect(calledUrl).toContain(encodeURIComponent('Graz'))
    expect(calledUrl).not.toContain(encodeURIComponent('Graz (Stadt)'))
  })

  it('uses parseFloat for lat/lon from Nominatim string values', async () => {
    const db = makeMockDb(null)
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [{ lat: '47.0707918', lon: '15.4382786', type: 'city', display_name: 'Graz' }],
    } as Response)

    const result = await geocodeLocation(db, 'Graz')

    expect(typeof result!.lat).toBe('number')
    expect(typeof result!.lon).toBe('number')
  })
})
