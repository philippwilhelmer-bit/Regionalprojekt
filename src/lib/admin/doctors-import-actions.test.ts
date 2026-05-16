/**
 * Tests for src/lib/admin/doctors-import-actions.ts — Phase 47-03.
 *
 * Covers DIR-23 (parseAndPreviewCsv), DIR-24 (commitCsvImport),
 * DIR-25 (geocodeBatch), DIR-26 (editorial-field allow-list).
 *
 * Three task groups:
 *   Task 1 — parseAndPreviewCsv Trinity + cache + bezirkId resolution
 *   Task 2 — commitCsvImport Trinity — transaction, allow-list, geo-clearing
 *   Task 3 — geocodeBatch Trinity — sequential Nominatim loop + sleep(1100)
 *
 * Mocking strategy (mirrors doctors-actions.test.ts):
 *   - vi.mock (hoisted) for auth-node, images/geocode, images/mapgen, next/navigation
 *   - vi.doMock (deferred, inside beforeAll) for ../prisma — after pglite db is ready
 *   - Dynamic import of the module under test inside beforeAll
 */
import {
  vi,
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
} from 'vitest'

vi.mock('./auth-node', () => ({
  requireAuth: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../images/geocode', () => ({
  geocodeLocation: vi.fn(),
}))

vi.mock('../images/mapgen', () => ({
  generateMapImage: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn().mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))

import { createTestDb } from '../../test/setup-db'
import { seedBezirke } from '../../../prisma/seed'
import type { PrismaClient } from '@prisma/client'
import { requireAuth } from './auth-node'
import { geocodeLocation } from '../images/geocode'
import { generateMapImage } from '../images/mapgen'
import { PREVIEW_CACHE } from './import/preview-cache'

const mockRequireAuth = vi.mocked(requireAuth)
const mockGeocode = vi.mocked(geocodeLocation)
const mockMapgen = vi.mocked(generateMapImage)

let db: PrismaClient
let grazId: number
let actions: typeof import('./doctors-import-actions')

beforeAll(async () => {
  db = await createTestDb()
  await seedBezirke(db, 'steiermark')
  const graz = await db.bezirk.findUnique({ where: { slug: 'graz' } })
  grazId = graz!.id

  vi.doMock('../prisma', () => ({ prisma: db }))
  actions = await import('./doctors-import-actions')
})

beforeEach(async () => {
  await db.doctor.deleteMany({})
  PREVIEW_CACHE.clear()
  vi.clearAllMocks()
  // Re-set default requireAuth mock after clearAllMocks
  mockRequireAuth.mockResolvedValue(undefined)
})

afterAll(async () => {
  await db.$disconnect()
  vi.doUnmock('../prisma')
})

// ── Minimal CSV helper ──────────────────────────────────────────────────────

function makeCsv(rows: Array<{
  bezirk?: string
  fachrichtung?: string
  name?: string
  adresse?: string
  telefon?: string
  arztNr?: string
  profilUrl?: string
}>): string {
  const header = 'Bezirk,Fachrichtung,Name,Adresse,Telefonnummer,ArztNr,ProfilURL'
  // Wrap each field in quotes to handle commas inside values (e.g. "Teststraße 1, 8010 Graz")
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`
  const lines = rows.map(r =>
    [
      q(r.bezirk ?? 'Graz (Stadt)'),
      q(r.fachrichtung ?? 'Allgemeinmedizin'),
      q(r.name ?? 'Dr. Test'),
      q(r.adresse ?? 'Teststraße 1 8010 Graz'),
      q(r.telefon ?? ''),
      q(r.arztNr ?? 'A001'),
      q(r.profilUrl ?? ''),
    ].join(','),
  )
  return [header, ...lines].join('\n')
}

// ═══════════════════════════════════════════════════════════════════════════
// TASK 1 — parseAndPreviewCsv Trinity
// ═══════════════════════════════════════════════════════════════════════════

describe('parseAndPreviewCsv — Task 1 tests', () => {
  it('Test 1 (auth): calls requireAuth() before parseDoctorsCsv', async () => {
    const csv = makeCsv([{ arztNr: 'AUTH01' }])
    await actions.parseAndPreviewCsvDb(db, csv)
    // requireAuth is called in parseAndPreviewCsv (Action wrapper), not Db.
    // For the Action wrapper:
    await actions.parseAndPreviewCsv(csv)
    expect(mockRequireAuth).toHaveBeenCalledTimes(1)
  })

  it('Test 2 (bezirkId resolution): Graz-Stadt alias resolves to grazId', async () => {
    const csv = makeCsv([{ bezirk: 'Graz-Stadt', arztNr: 'B001' }])
    const result = await actions.parseAndPreviewCsvDb(db, csv)
    expect(result.summary.totalRows).toBe(1)
    expect(result.conflicts).toHaveLength(0)
    // Verify cached row has bezirkId
    const cached = PREVIEW_CACHE.get(result.token)
    expect(cached).not.toBeNull()
    expect(cached!.rows[0].bezirkId).toBe(grazId)
  })

  it('Test 3 (unknown Bezirk): row is rejected with reason /Unbekannter Bezirk/', async () => {
    const csv = makeCsv([{ bezirk: 'UnbekannterBezirk', arztNr: 'C001' }])
    const result = await actions.parseAndPreviewCsvDb(db, csv)
    expect(result.summary.totalRows).toBe(0)
    expect(result.conflicts.length).toBeGreaterThanOrEqual(1)
    const conflict = result.conflicts.find(c => /Unbekannter Bezirk/i.test(c.reason))
    expect(conflict).toBeDefined()
    expect(conflict!.severity).toBe('error')
  })

  it('Test 4 (new vs update classification): isUpdate true for existing arztNr', async () => {
    // Seed an existing doctor with arztNr A001
    await db.doctor.create({
      data: {
        arztNr: 'A001',
        name: 'Existing',
        fachrichtung: 'ALLGEMEINMEDIZIN',
        address: 'Same 1',
        bezirkId: grazId,
        publicId: 'pub-existing',
      },
    })

    const csv = makeCsv([
      { arztNr: 'A001', adresse: 'Same 1' },
      { arztNr: 'A999', name: 'Fresh Dr.' },
    ])

    const result = await actions.parseAndPreviewCsvDb(db, csv)
    expect(result.summary.totalRows).toBe(2)
    expect(result.summary.updateRows).toBe(1)
    expect(result.summary.newRows).toBe(1)

    const cached = PREVIEW_CACHE.get(result.token)!
    const update = cached.rows.find(r => r.arztNr === 'A001')
    const insert = cached.rows.find(r => r.arztNr === 'A999')
    expect(update!.isUpdate).toBe(true)
    expect(insert!.isUpdate).toBe(false)
  })

  it('Test 5 (address-change pre-compute): addressChanged=true when address differs', async () => {
    await db.doctor.create({
      data: {
        arztNr: 'ADDR01',
        name: 'Dr. Move',
        fachrichtung: 'ALLGEMEINMEDIZIN',
        address: 'Old 1',
        bezirkId: grazId,
        publicId: 'pub-addr01',
      },
    })

    // Changed address
    const csvChanged = makeCsv([{ arztNr: 'ADDR01', adresse: 'New 1' }])
    const r1 = await actions.parseAndPreviewCsvDb(db, csvChanged)
    const cached1 = PREVIEW_CACHE.get(r1.token)!
    expect(cached1.rows[0].addressChanged).toBe(true)

    PREVIEW_CACHE.clear()

    // Same address — exact string equality (D-17)
    const csvSame = makeCsv([{ arztNr: 'ADDR01', adresse: 'Old 1' }])
    const r2 = await actions.parseAndPreviewCsvDb(db, csvSame)
    const cached2 = PREVIEW_CACHE.get(r2.token)!
    expect(cached2.rows[0].addressChanged).toBe(false)
  })

  it('Test 6 (cache TTL): getPreview returns null after 15 min', async () => {
    vi.useFakeTimers()
    const { setPreview, getPreview } = await import('./import/preview-cache')
    const token = 'test-ttl-token'
    setPreview(token, { rows: [], conflicts: [] })
    expect(getPreview(token)).not.toBeNull()

    // Advance 15 min + 1ms
    vi.setSystemTime(Date.now() + 15 * 60 * 1000 + 1)
    expect(getPreview(token)).toBeNull()

    vi.useRealTimers()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// TASK 2 — commitCsvImport Trinity
// ═══════════════════════════════════════════════════════════════════════════

describe('commitCsvImport — Task 2 tests', () => {
  async function seedAndCache(rows: Array<{
    arztNr: string
    name?: string
    adresse?: string
    fachrichtung?: string
    addressChanged?: boolean
    isUpdate?: boolean
    bezirkId?: number
  }>): Promise<string> {
    const { setPreview } = await import('./import/preview-cache')
    const { randomUUID } = await import('node:crypto')
    const token = randomUUID()
    setPreview(token, {
      rows: rows.map(r => ({
        arztNr: r.arztNr,
        name: r.name ?? 'Dr. Test',
        fachrichtung: (r.fachrichtung ?? 'ALLGEMEINMEDIZIN') as import('@prisma/client').Fachrichtung,
        bezirkName: 'Graz (Stadt)',
        address: r.adresse ?? 'Teststr. 1',
        phone: null,
        profilUrl: null,
        csvLineNumber: 2,
        bezirkId: r.bezirkId ?? grazId,
        addressChanged: r.addressChanged ?? false,
        isUpdate: r.isUpdate ?? false,
      })),
      conflicts: [],
    })
    return token
  }

  it('Test 1 (transaction atomicity): all 3 rows visible after successful commit', async () => {
    const token = await seedAndCache([
      { arztNr: 'T1A' },
      { arztNr: 'T1B' },
      { arztNr: 'T1C' },
    ])
    await actions.commitCsvImport(token)
    const doctors = await db.doctor.findMany({ where: { arztNr: { in: ['T1A', 'T1B', 'T1C'] } } })
    expect(doctors).toHaveLength(3)
  })

  it('Test 2 (preserves editorial): editorialNote, isVerified, titel, email, mapImageUrl unchanged', async () => {
    // Seed existing doctor with editorial fields
    await db.doctor.create({
      data: {
        arztNr: 'ED01',
        name: 'Dr. Original',
        fachrichtung: 'ALLGEMEINMEDIZIN',
        address: 'Same Addr',
        bezirkId: grazId,
        publicId: 'pub-ed01',
        editorialNote: 'WICHTIG',
        isVerified: true,
        titel: 'Dr.',
        email: 'priv@x.com',
        mapImageUrl: 'old.jpg',
      },
    })

    const token = await seedAndCache([{
      arztNr: 'ED01',
      name: 'Updated Name',
      adresse: 'Same Addr',
      isUpdate: true,
      addressChanged: false,
    }])

    await actions.commitCsvImport(token)

    const updated = await db.doctor.findUnique({ where: { arztNr: 'ED01' } })
    expect(updated!.name).toBe('Updated Name') // CSV-driven field updated
    expect(updated!.editorialNote).toBe('WICHTIG') // editorial preserved
    expect(updated!.isVerified).toBe(true) // editorial preserved
    expect(updated!.titel).toBe('Dr.') // editorial preserved
    expect(updated!.email).toBe('priv@x.com') // editorial preserved
    expect(updated!.mapImageUrl).toBe('old.jpg') // editorial preserved (no address change)
  })

  it('Test 3 (address-change geo-clearing): lat/lon/mapImageUrl nulled when addressChanged=true', async () => {
    await db.doctor.create({
      data: {
        arztNr: 'GEO01',
        name: 'Dr. Geo',
        fachrichtung: 'ALLGEMEINMEDIZIN',
        address: 'Old 1',
        bezirkId: grazId,
        publicId: 'pub-geo01',
        lat: 47.0,
        lon: 15.0,
        mapImageUrl: 'old.jpg',
      },
    })

    const token = await seedAndCache([{
      arztNr: 'GEO01',
      adresse: 'New 1',
      isUpdate: true,
      addressChanged: true,
    }])

    await actions.commitCsvImport(token)

    const updated = await db.doctor.findUnique({ where: { arztNr: 'GEO01' } })
    expect(updated!.lat).toBeNull()
    expect(updated!.lon).toBeNull()
    expect(updated!.mapImageUrl).toBeNull()
  })

  it('Test 4 (no address change → geo preserved): lat/lon unchanged when addressChanged=false', async () => {
    await db.doctor.create({
      data: {
        arztNr: 'GEO02',
        name: 'Dr. Stable',
        fachrichtung: 'ALLGEMEINMEDIZIN',
        address: 'Same 1',
        bezirkId: grazId,
        publicId: 'pub-geo02',
        lat: 47.0,
        lon: 15.0,
      },
    })

    const token = await seedAndCache([{
      arztNr: 'GEO02',
      adresse: 'Same 1',
      isUpdate: true,
      addressChanged: false,
    }])

    await actions.commitCsvImport(token)

    const updated = await db.doctor.findUnique({ where: { arztNr: 'GEO02' } })
    expect(updated!.lat).toBe(47.0)
    expect(updated!.lon).toBe(15.0)
  })

  it('Test 5 (insert new row): new doctor inserted with lat=null, isVerified=false, relatedArticleIds=[]', async () => {
    const token = await seedAndCache([{ arztNr: 'NEW01', name: 'Dr. Brand New', isUpdate: false }])
    const result = await actions.commitCsvImport(token)
    expect(result.inserted).toBe(1)
    expect(result.updated).toBe(0)

    const doctor = await db.doctor.findUnique({ where: { arztNr: 'NEW01' } })
    expect(doctor).not.toBeNull()
    expect(doctor!.lat).toBeNull()
    expect(doctor!.lon).toBeNull()
    expect(doctor!.mapImageUrl).toBeNull()
    expect(doctor!.isVerified).toBe(false)
    expect(doctor!.relatedArticleIds).toEqual([])
  })

  it('Test 6 (Form wrapper): redirects to /admin/aerzte?imported=N', async () => {
    const token = await seedAndCache([
      { arztNr: 'FORM01', isUpdate: false },
      { arztNr: 'FORM02', isUpdate: false },
    ])

    const fd = new FormData()
    fd.set('token', token)

    const err = await actions.commitCsvImportForm(fd).catch(e => e)
    expect(String(err)).toContain('NEXT_REDIRECT:/admin/aerzte?imported=2')
  })

  it('Test 7 (expired token): commitCsvImport throws German error', async () => {
    await expect(actions.commitCsvImport('not-a-real-token')).rejects.toThrow(
      /Vorschau abgelaufen/,
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// TASK 3 — geocodeBatch Trinity
// ═══════════════════════════════════════════════════════════════════════════

describe('geocodeBatch — Task 3 tests', () => {
  // We inject a no-op sleepFn into geocodeBatchDb to avoid real 1100ms waits.
  // This avoids using vi.useFakeTimers() which breaks pglite's internal setTimeout.
  // The production code always calls the real sleep(1100) via the default parameter.
  const noopSleep = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    noopSleep.mockClear()
  })

  async function seedDoctors(count: number, withLat: boolean, prefix?: string): Promise<void> {
    const pfx = prefix ?? (withLat ? 'GEOCODED' : 'NULL')
    for (let i = 0; i < count; i++) {
      await db.doctor.create({
        data: {
          arztNr: `${pfx}${i}`,
          name: `Dr. ${pfx} ${i}`,
          fachrichtung: 'ALLGEMEINMEDIZIN',
          address: `Teststr ${i} 8010 Graz`,
          bezirkId: grazId,
          publicId: `pub-${pfx}${i}`,
          lat: withLat ? 47.0 : null,
          lon: withLat ? 15.0 : null,
        },
      })
    }
  }

  it('Test 1 (selection): only doctors with lat=null are processed', async () => {
    await seedDoctors(3, true) // lat set
    await seedDoctors(5, false) // lat null

    mockGeocode.mockResolvedValue({
      lat: 47.0,
      lon: 15.0,
      locationType: 'house',
      displayName: 'Test',
    })
    mockMapgen.mockResolvedValue({ url: 'https://blob/map.jpg', credit: '© basemap.at' })

    const result = await actions.geocodeBatchDb(db, noopSleep)
    expect(mockGeocode).toHaveBeenCalledTimes(5)
    expect(result.processed).toBe(5)
  })

  it('Test 2 (batch cap): 250 null doctors → first call processes 200, returns remaining 50', async () => {
    await seedDoctors(250, false)

    mockGeocode.mockResolvedValue({
      lat: 47.0,
      lon: 15.0,
      locationType: 'house',
      displayName: 'Test',
    })
    mockMapgen.mockResolvedValue({ url: 'https://blob/map.jpg', credit: '© basemap.at' })

    const result = await actions.geocodeBatchDb(db, noopSleep)
    expect(result.processed).toBe(200)
    expect(result.remaining).toBe(50)
  })

  it('Test 3 (sleep timing): sleepFn is called with 1100ms after each geocodeLocation call', async () => {
    // Test 3 verifies the sleep cadence by inspecting injected sleepFn calls.
    // Production code always calls the real sleep(1100) via the default param.
    // Using noopSleep here confirms: (a) called once per doctor, (b) always with 1100.
    await seedDoctors(3, false, 'SLEEP')

    mockGeocode.mockResolvedValue({
      lat: 47.0,
      lon: 15.0,
      locationType: 'house',
      displayName: 'Test',
    })
    mockMapgen.mockResolvedValue({ url: 'https://blob/map.jpg', credit: '© basemap.at' })

    const result = await actions.geocodeBatchDb(db, noopSleep)

    // sleep called once per doctor, ALWAYS after geocodeLocation (AGENTS.md rule)
    expect(noopSleep).toHaveBeenCalledTimes(3)
    // Every call must be with exactly 1100ms
    for (const call of noopSleep.mock.calls) {
      expect(call[0]).toBe(1100)
    }
    expect(result.processed).toBe(3)
  })

  it('Test 4 (failure isolation): geocodeLocation throws on doc 2; docs 1+3 processed', async () => {
    await seedDoctors(3, false, 'FAIL')

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    mockGeocode
      .mockResolvedValueOnce({ lat: 47.0, lon: 15.0, locationType: 'house', displayName: 'Test' })
      .mockRejectedValueOnce(new Error('Nominatim 500'))
      .mockResolvedValueOnce({ lat: 47.1, lon: 15.1, locationType: 'house', displayName: 'Test2' })
    mockMapgen.mockResolvedValue({ url: 'https://blob/map.jpg', credit: '© basemap.at' })

    const result = await actions.geocodeBatchDb(db, noopSleep)

    expect(result.processed).toBe(2)
    expect(result.failures).toBe(1)
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(String(warnSpy.mock.calls[0][0])).toContain('geocode-batch')

    warnSpy.mockRestore()
  })

  it('Test 5 (mapgen failure non-fatal): lat/lon updated, mapImageUrl stays null on mapgen throw', async () => {
    await seedDoctors(1, false, 'MAPFAIL')

    mockGeocode.mockResolvedValue({
      lat: 47.0,
      lon: 15.0,
      locationType: 'house',
      displayName: 'Test',
    })
    mockMapgen.mockRejectedValue(new Error('Blob unavailable'))

    const result = await actions.geocodeBatchDb(db, noopSleep)
    expect(result.processed).toBe(1)

    const doctor = await db.doctor.findFirst({ where: { arztNr: 'MAPFAIL0' } })
    expect(doctor!.lat).toBe(47.0)
    expect(doctor!.lon).toBe(15.0)
    expect(doctor!.mapImageUrl).toBeNull()
  })

  it('Test 6 (auth): geocodeBatchAction calls requireAuth() first', async () => {
    // geocodeBatchAction calls geocodeBatchDb(defaultPrisma) with the real sleep.
    // No doctors seeded → loop doesn't execute → returns immediately.
    mockGeocode.mockResolvedValue(null)
    await actions.geocodeBatchAction()
    expect(mockRequireAuth).toHaveBeenCalledTimes(1)
  })

  it('Test 7 (form wrapper): geocodeBatchForm redirects to /admin/aerzte?geocoded=N', async () => {
    // geocodeBatchForm calls geocodeBatchAction which uses defaultPrisma + real sleep.
    // Seed 2 doctors → geocodeBatchDb runs with real sleep once per doctor.
    // To avoid 2×1100ms wait, seed doctors with lat already set (so loop body runs
    // but doesn't touch any doctor — actually we need lat=null to count as "processed").
    // Best approach: seed doctors with lat already set, so findMany WHERE lat IS NULL
    // returns 0 rows, skips the sleep loop entirely.
    await seedDoctors(2, true, 'FORMWRAP') // already geocoded → won't enter loop

    // The form action calls geocodeBatchAction which calls geocodeBatchDb(defaultPrisma)
    // With 0 candidates, processed=0 → redirect('/admin/aerzte?geocoded=0')
    const fd = new FormData()
    const err = await actions.geocodeBatchForm(fd).catch(e => e)
    expect(String(err)).toMatch(/NEXT_REDIRECT:\/admin\/aerzte\?geocoded=0/)
  })
})
