/**
 * Tests for src/lib/admin/doctors-actions.ts — Phase 46-02.
 *
 * Three layers exercised:
 *  - *Db functions (pure, accept PrismaClient as first arg — passed pglite client directly).
 *  - Server Actions (`createDoctor`, `updateDoctor`, `toggleVerified`, `softDeleteDoctor`)
 *    which reference `defaultPrisma` internally — mocked via `vi.doMock('../prisma')`
 *    inside `beforeAll` AFTER the pglite db is initialized.
 *  - Form wrappers (FormData → Action delegation + redirect/revalidate).
 *
 * Mocking strategy:
 *  - `vi.mock` (hoisted, synchronous) for `./auth-node`, `../images/geocode`,
 *    `../images/mapgen` — none of these need the test db.
 *  - `vi.doMock` (deferred, inside beforeAll) for `../prisma` — only after the
 *    pglite client has been created so the SUT's `defaultPrisma` import resolves
 *    to the test db.
 *  - The module under test is dynamically imported inside `beforeAll` AFTER the
 *    `vi.doMock` fires.
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

import { createTestDb } from '../../test/setup-db'
import { seedBezirke } from '../../../prisma/seed'
import type { PrismaClient } from '@prisma/client'
import { geocodeLocation } from '../images/geocode'
import { generateMapImage } from '../images/mapgen'

const mockedGeocode = vi.mocked(geocodeLocation)
const mockedMapgen = vi.mocked(generateMapImage)

let db: PrismaClient
let grazId: number
let actions: typeof import('./doctors-actions')

beforeAll(async () => {
  db = await createTestDb()
  await seedBezirke(db, 'steiermark')
  const graz = await db.bezirk.findUnique({ where: { slug: 'graz' } })
  grazId = graz!.id

  // vi.doMock (NOT hoisted) — fires here, AFTER pglite db is ready.
  vi.doMock('../prisma', () => ({ prisma: db }))

  // Dynamic import — module evaluates NOW with the mocked prisma.
  actions = await import('./doctors-actions')
})

beforeEach(async () => {
  await db.doctor.deleteMany({})
  vi.clearAllMocks()
})

afterAll(async () => {
  await db.$disconnect()
  vi.doUnmock('../prisma')
})

// ── Db-layer tests (Task 2.1 behaviours — direct db injection) ────────────────

describe('createDoctorDb', () => {
  it('persists row with required fields; defaults isVerified=false, relatedArticleIds=[]', async () => {
    const doctor = await actions.createDoctorDb(db, {
      name: 'Dr. Anna Schmidt',
      kategorie: 'ALLGEMEINMEDIZIN',
      address: 'Hauptplatz 1, 8010 Graz',
      bezirkId: grazId,
    })

    expect(doctor.name).toBe('Dr. Anna Schmidt')
    expect(doctor.kategorie).toBe('ALLGEMEINMEDIZIN')
    expect(doctor.address).toBe('Hauptplatz 1, 8010 Graz')
    expect(doctor.bezirkId).toBe(grazId)
    expect(doctor.isVerified).toBe(false)
    expect(doctor.relatedArticleIds).toEqual([])
    expect(doctor.publicId).toBeTruthy()
    expect(doctor.lat).toBeNull()
    expect(doctor.lon).toBeNull()
    expect(doctor.mapImageUrl).toBeNull()
  })

  it('sets lat/lon from geo arg', async () => {
    const doctor = await actions.createDoctorDb(
      db,
      {
        name: 'Dr. X',
        kategorie: 'ZAHNARZT',
        address: 'A',
        bezirkId: grazId,
      },
      { lat: 47.07, lon: 15.43 },
    )

    expect(doctor.lat).toBe(47.07)
    expect(doctor.lon).toBe(15.43)
    expect(doctor.mapImageUrl).toBeNull()
  })

  it('sets mapImageUrl from arg', async () => {
    const doctor = await actions.createDoctorDb(
      db,
      {
        name: 'Dr. Y',
        kategorie: 'APOTHEKE',
        address: 'B',
        bezirkId: grazId,
      },
      { lat: 47.07, lon: 15.43 },
      'https://blob.example/maps/doctor-1.jpg',
    )

    expect(doctor.mapImageUrl).toBe('https://blob.example/maps/doctor-1.jpg')
  })

  it('without geo arg sets lat/lon/mapImageUrl = null', async () => {
    const doctor = await actions.createDoctorDb(db, {
      name: 'Dr. Z',
      kategorie: 'ALLGEMEINMEDIZIN',
      address: 'C',
      bezirkId: grazId,
    })

    expect(doctor.lat).toBeNull()
    expect(doctor.lon).toBeNull()
    expect(doctor.mapImageUrl).toBeNull()
  })
})

describe('updateDoctorDb', () => {
  it('updates only provided fields; preserves omitted fields', async () => {
    const created = await actions.createDoctorDb(
      db,
      {
        name: 'Dr. Original',
        kategorie: 'ALLGEMEINMEDIZIN',
        address: 'Old Address',
        bezirkId: grazId,
        email: 'orig@example.at',
      },
      { lat: 47.0, lon: 15.0 },
      'https://blob.example/maps/doctor-original.jpg',
    )

    await actions.updateDoctorDb(db, {
      id: created.id,
      name: 'Dr. Updated',
    })

    const updated = await db.doctor.findUnique({ where: { id: created.id } })
    expect(updated?.name).toBe('Dr. Updated')
    expect(updated?.address).toBe('Old Address') // preserved
    expect(updated?.email).toBe('orig@example.at') // preserved
    expect(updated?.lat).toBe(47.0) // preserved (geo not passed)
    expect(updated?.lon).toBe(15.0)
    expect(updated?.mapImageUrl).toBe('https://blob.example/maps/doctor-original.jpg')
  })

  it('clears lat/lon when geo=null explicitly', async () => {
    const created = await actions.createDoctorDb(
      db,
      { name: 'Dr. Geo', kategorie: 'ALLGEMEINMEDIZIN', address: 'X', bezirkId: grazId },
      { lat: 47.0, lon: 15.0 },
    )

    await actions.updateDoctorDb(db, { id: created.id }, null, null)
    const updated = await db.doctor.findUnique({ where: { id: created.id } })
    expect(updated?.lat).toBeNull()
    expect(updated?.lon).toBeNull()
    expect(updated?.mapImageUrl).toBeNull()
  })
})

describe('toggleVerifiedDb', () => {
  it('flips current isVerified value (false → true)', async () => {
    const created = await actions.createDoctorDb(db, {
      name: 'Dr. Flip',
      kategorie: 'ALLGEMEINMEDIZIN',
      address: 'X',
      bezirkId: grazId,
    })

    expect(created.isVerified).toBe(false)
    const after = await actions.toggleVerifiedDb(db, created.id)
    expect(after.isVerified).toBe(true)
  })

  it('flips again (true → false)', async () => {
    const created = await actions.createDoctorDb(db, {
      name: 'Dr. Flip2',
      kategorie: 'ALLGEMEINMEDIZIN',
      address: 'X',
      bezirkId: grazId,
    })
    await actions.toggleVerifiedDb(db, created.id)
    const after = await actions.toggleVerifiedDb(db, created.id)
    expect(after.isVerified).toBe(false)
  })

  it('throws on non-existent id', async () => {
    await expect(actions.toggleVerifiedDb(db, 999_999)).rejects.toThrow()
  })
})

describe('softDeleteDoctorDb', () => {
  it('deletes the row', async () => {
    const created = await actions.createDoctorDb(db, {
      name: 'Dr. Gone',
      kategorie: 'ALLGEMEINMEDIZIN',
      address: 'X',
      bezirkId: grazId,
    })

    await actions.softDeleteDoctorDb(db, created.id)

    const found = await db.doctor.findUnique({ where: { id: created.id } })
    expect(found).toBeNull()
  })
})

// ── Action-layer tests (Task 2.2 behaviours — vi.mock geocode/mapgen, vi.doMock prisma) ─

describe('createDoctor (Server Action)', () => {
  it('geocode success → row persisted with lat/lon/mapImageUrl all set', async () => {
    mockedGeocode.mockResolvedValueOnce({
      lat: 47.07,
      lon: 15.43,
      locationType: 'house',
      displayName: 'Hauptplatz 1, 8010 Graz, Austria',
    })
    mockedMapgen.mockResolvedValueOnce({
      url: 'https://blob.example/maps/doctor-1.jpg',
      credit: 'basemap.at',
    })

    const doctor = await actions.createDoctor({
      name: 'Dr. Geo',
      kategorie: 'ALLGEMEINMEDIZIN',
      address: 'Hauptplatz 1, 8010 Graz',
      bezirkId: grazId,
    })

    expect(doctor.lat).toBe(47.07)
    expect(doctor.lon).toBe(15.43)
    expect(doctor.mapImageUrl).toBe('https://blob.example/maps/doctor-1.jpg')

    expect(mockedGeocode).toHaveBeenCalledWith(db, 'Hauptplatz 1, 8010 Graz')
    expect(mockedMapgen).toHaveBeenCalledTimes(1)
    // generateMapImage(lat, lon, name, doctorId, locationType, options)
    const mgCall = mockedMapgen.mock.calls[0]
    expect(mgCall[0]).toBe(47.07)
    expect(mgCall[1]).toBe(15.43)
    expect(mgCall[2]).toBe('Dr. Geo')
    expect(mgCall[3]).toBe(doctor.id) // stable id, two-phase create
    expect(mgCall[4]).toBe('house')
    expect(mgCall[5]).toEqual({ pathPrefix: 'doctor' })
  })

  it('geocode returns null → row persisted with all null; no mapgen call', async () => {
    mockedGeocode.mockResolvedValueOnce(null)

    const doctor = await actions.createDoctor({
      name: 'Dr. NoGeo',
      kategorie: 'ALLGEMEINMEDIZIN',
      address: 'Unknown Address That Geocoder Cannot Find',
      bezirkId: grazId,
    })

    expect(doctor.lat).toBeNull()
    expect(doctor.lon).toBeNull()
    expect(doctor.mapImageUrl).toBeNull()
    expect(mockedMapgen).not.toHaveBeenCalled()
  })

  it('geocode throws → row STILL persisted with nulls; warning logged; no mapgen call', async () => {
    mockedGeocode.mockRejectedValueOnce(new Error('Nominatim 5xx'))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const doctor = await actions.createDoctor({
      name: 'Dr. Boom',
      kategorie: 'ALLGEMEINMEDIZIN',
      address: 'Broken Address',
      bezirkId: grazId,
    })

    expect(doctor.lat).toBeNull()
    expect(doctor.lon).toBeNull()
    expect(doctor.mapImageUrl).toBeNull()
    expect(mockedMapgen).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalled()
    const warnArg = String(warnSpy.mock.calls[0]?.[0] ?? '')
    expect(warnArg).toContain('geocode')

    warnSpy.mockRestore()
  })

  it('mapgen returns null → row persists with lat/lon set, mapImageUrl=null; no throw', async () => {
    mockedGeocode.mockResolvedValueOnce({
      lat: 47.0,
      lon: 15.0,
      locationType: 'street',
      displayName: 'Some Street',
    })
    mockedMapgen.mockResolvedValueOnce(null)

    const doctor = await actions.createDoctor({
      name: 'Dr. MapNull',
      kategorie: 'ALLGEMEINMEDIZIN',
      address: 'Some Street',
      bezirkId: grazId,
    })

    expect(doctor.lat).toBe(47.0)
    expect(doctor.lon).toBe(15.0)
    expect(doctor.mapImageUrl).toBeNull()
  })
})

describe('updateDoctor (Server Action)', () => {
  it('address unchanged → no geocode call; lat/lon preserved', async () => {
    // Seed via createDoctor so the row has geo set
    mockedGeocode.mockResolvedValueOnce({
      lat: 47.0,
      lon: 15.0,
      locationType: 'house',
      displayName: 'Existing',
    })
    mockedMapgen.mockResolvedValueOnce({
      url: 'https://blob.example/maps/doctor-existing.jpg',
      credit: 'basemap.at',
    })
    const created = await actions.createDoctor({
      name: 'Dr. Existing',
      kategorie: 'ALLGEMEINMEDIZIN',
      address: 'Existing Address',
      bezirkId: grazId,
    })

    mockedGeocode.mockClear()
    mockedMapgen.mockClear()

    // Update only the name — address omitted
    const updated = await actions.updateDoctor({
      id: created.id,
      name: 'Dr. Existing Updated',
    })

    expect(updated.name).toBe('Dr. Existing Updated')
    expect(updated.lat).toBe(47.0) // preserved
    expect(updated.lon).toBe(15.0)
    expect(updated.mapImageUrl).toBe('https://blob.example/maps/doctor-existing.jpg')
    expect(mockedGeocode).not.toHaveBeenCalled()
    expect(mockedMapgen).not.toHaveBeenCalled()
  })

  it('address changed → geocode called with new address; row updated', async () => {
    mockedGeocode.mockResolvedValueOnce({
      lat: 47.0,
      lon: 15.0,
      locationType: 'house',
      displayName: 'Old',
    })
    mockedMapgen.mockResolvedValueOnce({
      url: 'https://blob.example/maps/doctor-old.jpg',
      credit: 'basemap.at',
    })
    const created = await actions.createDoctor({
      name: 'Dr. Moving',
      kategorie: 'ALLGEMEINMEDIZIN',
      address: 'Old Address',
      bezirkId: grazId,
    })

    mockedGeocode.mockClear()
    mockedMapgen.mockClear()
    mockedGeocode.mockResolvedValueOnce({
      lat: 48.0,
      lon: 16.0,
      locationType: 'house',
      displayName: 'New',
    })
    mockedMapgen.mockResolvedValueOnce({
      url: 'https://blob.example/maps/doctor-new.jpg',
      credit: 'basemap.at',
    })

    const updated = await actions.updateDoctor({
      id: created.id,
      address: 'New Address',
    })

    expect(updated.lat).toBe(48.0)
    expect(updated.lon).toBe(16.0)
    expect(updated.mapImageUrl).toBe('https://blob.example/maps/doctor-new.jpg')
    expect(mockedGeocode).toHaveBeenCalledWith(db, 'New Address')
  })
})

describe('toggleVerified (Server Action)', () => {
  it('delegates to Db layer', async () => {
    const created = await actions.createDoctorDb(db, {
      name: 'Dr. Verify',
      kategorie: 'ALLGEMEINMEDIZIN',
      address: 'X',
      bezirkId: grazId,
    })

    const flipped = await actions.toggleVerified(created.id)
    expect(flipped.isVerified).toBe(true)
  })
})

// ── Form-layer tests ──────────────────────────────────────────────────────────

describe('createDoctorForm', () => {
  it('parses FormData fields correctly and creates the doctor', async () => {
    mockedGeocode.mockResolvedValueOnce(null)

    const fd = new FormData()
    fd.set('name', 'Dr. Form')
    fd.set('titel', 'MR')
    fd.set('kategorie', 'ALLGEMEINMEDIZIN')
    fd.set('fachrichtung', 'Allgemeinmedizin')
    fd.set('address', 'Form Address 1')
    fd.set('bezirkId', String(grazId))
    fd.set('email', 'form@example.at')
    fd.set('website', 'https://example.at')
    fd.set('phone', '+43 316 0000000')
    fd.set('editorialNote', 'Note')
    fd.set('relatedArticleIds', '')

    // redirect() throws NEXT_REDIRECT inside Next.js. In tests we assert it rejects
    // and verify the underlying create happened via DB state.
    await expect(actions.createDoctorForm(fd)).rejects.toThrow()

    const created = await db.doctor.findFirst({ where: { name: 'Dr. Form' } })
    expect(created).not.toBeNull()
    expect(created?.titel).toBe('MR')
    expect(created?.kategorie).toBe('ALLGEMEINMEDIZIN')
    expect(created?.address).toBe('Form Address 1')
    expect(created?.bezirkId).toBe(grazId)
    expect(created?.email).toBe('form@example.at')
    expect(created?.website).toBe('https://example.at')
    expect(created?.phone).toBe('+43 316 0000000')
    expect(created?.editorialNote).toBe('Note')
    expect(created?.relatedArticleIds).toEqual([])
  })

  it('relatedArticleIds: empty string → []', async () => {
    mockedGeocode.mockResolvedValueOnce(null)
    const fd = new FormData()
    fd.set('name', 'Dr. EmptyRel')
    fd.set('kategorie', 'ALLGEMEINMEDIZIN')
    fd.set('address', 'X')
    fd.set('bezirkId', String(grazId))
    fd.set('relatedArticleIds', '')
    await expect(actions.createDoctorForm(fd)).rejects.toThrow()
    const created = await db.doctor.findFirst({ where: { name: 'Dr. EmptyRel' } })
    expect(created?.relatedArticleIds).toEqual([])
  })

  it('relatedArticleIds: "abc,def" → ["abc", "def"]', async () => {
    mockedGeocode.mockResolvedValueOnce(null)
    const fd = new FormData()
    fd.set('name', 'Dr. TwoRel')
    fd.set('kategorie', 'ALLGEMEINMEDIZIN')
    fd.set('address', 'X')
    fd.set('bezirkId', String(grazId))
    fd.set('relatedArticleIds', 'abc,def')
    await expect(actions.createDoctorForm(fd)).rejects.toThrow()
    const created = await db.doctor.findFirst({ where: { name: 'Dr. TwoRel' } })
    expect(created?.relatedArticleIds).toEqual(['abc', 'def'])
  })

  it('relatedArticleIds: "abc, ,def" → ["abc", "def"] (whitespace + empty stripped)', async () => {
    mockedGeocode.mockResolvedValueOnce(null)
    const fd = new FormData()
    fd.set('name', 'Dr. MessyRel')
    fd.set('kategorie', 'ALLGEMEINMEDIZIN')
    fd.set('address', 'X')
    fd.set('bezirkId', String(grazId))
    fd.set('relatedArticleIds', 'abc, ,def')
    await expect(actions.createDoctorForm(fd)).rejects.toThrow()
    const created = await db.doctor.findFirst({ where: { name: 'Dr. MessyRel' } })
    expect(created?.relatedArticleIds).toEqual(['abc', 'def'])
  })
})
