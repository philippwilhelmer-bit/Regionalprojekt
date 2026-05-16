/**
 * Tests for src/lib/admin/doctors-actions.ts — Phase 47-01.
 *
 * Updated from Phase 46: arztNr (required), fachrichtung (Fachrichtung enum, required),
 * profilUrl (renamed from website). All kategorie and website references removed.
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

// ── Db-layer tests (direct db injection) ─────────────────────────────────────

describe('createDoctorDb', () => {
  it('Test 1: persists row with arztNr and fachrichtung; no kategorie attempted', async () => {
    const doctor = await actions.createDoctorDb(db, {
      arztNr: 'A1',
      name: 'Dr. Test',
      fachrichtung: 'ALLGEMEINMEDIZIN',
      address: 'Hauptplatz 1, 8010 Graz',
      bezirkId: grazId,
    })

    expect(doctor.arztNr).toBe('A1')
    expect(doctor.name).toBe('Dr. Test')
    expect(doctor.fachrichtung).toBe('ALLGEMEINMEDIZIN')
    expect(doctor.address).toBe('Hauptplatz 1, 8010 Graz')
    expect(doctor.bezirkId).toBe(grazId)
    expect(doctor.isVerified).toBe(false)
    expect(doctor.relatedArticleIds).toEqual([])
    expect(doctor.publicId).toBeTruthy()
    expect(doctor.lat).toBeNull()
    expect(doctor.lon).toBeNull()
    expect(doctor.mapImageUrl).toBeNull()
    // Ensure no kategorie field
    expect('kategorie' in doctor).toBe(false)
  })

  it('Test 2: persists profilUrl (not website)', async () => {
    const doctor = await actions.createDoctorDb(db, {
      arztNr: 'A2',
      name: 'Dr. ProfilUrl',
      fachrichtung: 'ALLGEMEINMEDIZIN',
      address: 'Hauptplatz 2',
      bezirkId: grazId,
      profilUrl: 'https://www.aekstmk.or.at/aerztesuche-46?arztnr=A2',
    })

    expect(doctor.profilUrl).toBe('https://www.aekstmk.or.at/aerztesuche-46?arztnr=A2')
    expect('website' in doctor).toBe(false)
  })

  it('persists row with required fields; defaults isVerified=false, relatedArticleIds=[]', async () => {
    const doctor = await actions.createDoctorDb(db, {
      arztNr: 'A3',
      name: 'Dr. Anna Schmidt',
      fachrichtung: 'ALLGEMEINMEDIZIN',
      address: 'Hauptplatz 1, 8010 Graz',
      bezirkId: grazId,
    })

    expect(doctor.name).toBe('Dr. Anna Schmidt')
    expect(doctor.fachrichtung).toBe('ALLGEMEINMEDIZIN')
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
        arztNr: 'A4',
        name: 'Dr. X',
        fachrichtung: 'ALLGEMEINMEDIZIN',
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
        arztNr: 'A5',
        name: 'Dr. Y',
        fachrichtung: 'INNERE_MEDIZIN',
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
      arztNr: 'A6',
      name: 'Dr. Z',
      fachrichtung: 'ALLGEMEINMEDIZIN',
      address: 'C',
      bezirkId: grazId,
    })

    expect(doctor.lat).toBeNull()
    expect(doctor.lon).toBeNull()
    expect(doctor.mapImageUrl).toBeNull()
  })
})

describe('updateDoctorDb', () => {
  it('Test 4: accepts partial fachrichtung (Fachrichtung enum) — no kategorie key', async () => {
    const created = await actions.createDoctorDb(db, {
      arztNr: 'B1',
      name: 'Dr. Fach Update',
      fachrichtung: 'ALLGEMEINMEDIZIN',
      address: 'Addr B1',
      bezirkId: grazId,
    })

    await actions.updateDoctorDb(db, {
      id: created.id,
      fachrichtung: 'INNERE_MEDIZIN',
    })

    const updated = await db.doctor.findUnique({ where: { id: created.id } })
    expect(updated?.fachrichtung).toBe('INNERE_MEDIZIN')
    expect('kategorie' in updated!).toBe(false)
  })

  it('updates only provided fields; preserves omitted fields', async () => {
    const created = await actions.createDoctorDb(
      db,
      {
        arztNr: 'B2',
        name: 'Dr. Original',
        fachrichtung: 'ALLGEMEINMEDIZIN',
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
      {
        arztNr: 'B3',
        name: 'Dr. Geo',
        fachrichtung: 'ALLGEMEINMEDIZIN',
        address: 'X',
        bezirkId: grazId,
      },
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
      arztNr: 'C1',
      name: 'Dr. Flip',
      fachrichtung: 'ALLGEMEINMEDIZIN',
      address: 'X',
      bezirkId: grazId,
    })

    expect(created.isVerified).toBe(false)
    const after = await actions.toggleVerifiedDb(db, created.id)
    expect(after.isVerified).toBe(true)
  })

  it('flips again (true → false)', async () => {
    const created = await actions.createDoctorDb(db, {
      arztNr: 'C2',
      name: 'Dr. Flip2',
      fachrichtung: 'ALLGEMEINMEDIZIN',
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
      arztNr: 'D1',
      name: 'Dr. Gone',
      fachrichtung: 'ALLGEMEINMEDIZIN',
      address: 'X',
      bezirkId: grazId,
    })

    await actions.softDeleteDoctorDb(db, created.id)

    const found = await db.doctor.findUnique({ where: { id: created.id } })
    expect(found).toBeNull()
  })
})

// ── Action-layer tests ────────────────────────────────────────────────────────

describe('createDoctor (Server Action)', () => {
  it('Test 5: two-phase create — geocode + mapgen called; lat/lon/mapImageUrl set', async () => {
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
      arztNr: 'E1',
      name: 'Dr. Geo',
      fachrichtung: 'ALLGEMEINMEDIZIN',
      address: 'Hauptplatz 1, 8010 Graz',
      bezirkId: grazId,
    })

    expect(doctor.lat).toBe(47.07)
    expect(doctor.lon).toBe(15.43)
    expect(doctor.mapImageUrl).toBe('https://blob.example/maps/doctor-1.jpg')

    // Assert geocode args positionally — toHaveBeenCalledWith would deep-equal
    // the entire PrismaClient (which is circular) and blow the stack.
    expect(mockedGeocode).toHaveBeenCalledTimes(1)
    const gcCall = mockedGeocode.mock.calls[0]
    expect(gcCall[1]).toBe('Hauptplatz 1, 8010 Graz')

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
      arztNr: 'E2',
      name: 'Dr. NoGeo',
      fachrichtung: 'ALLGEMEINMEDIZIN',
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
      arztNr: 'E3',
      name: 'Dr. Boom',
      fachrichtung: 'ALLGEMEINMEDIZIN',
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
      arztNr: 'E4',
      name: 'Dr. MapNull',
      fachrichtung: 'ALLGEMEINMEDIZIN',
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
      arztNr: 'F1',
      name: 'Dr. Existing',
      fachrichtung: 'ALLGEMEINMEDIZIN',
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
      arztNr: 'F2',
      name: 'Dr. Moving',
      fachrichtung: 'ALLGEMEINMEDIZIN',
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
    // Positional assert — avoid deep-equality of circular PrismaClient.
    expect(mockedGeocode).toHaveBeenCalledTimes(1)
    expect(mockedGeocode.mock.calls[0][1]).toBe('New Address')
  })
})

describe('toggleVerified (Server Action)', () => {
  it('delegates to Db layer', async () => {
    const created = await actions.createDoctorDb(db, {
      arztNr: 'G1',
      name: 'Dr. Verify',
      fachrichtung: 'ALLGEMEINMEDIZIN',
      address: 'X',
      bezirkId: grazId,
    })

    const flipped = await actions.toggleVerified(created.id)
    expect(flipped.isVerified).toBe(true)
  })
})

// ── Form-layer tests ──────────────────────────────────────────────────────────

describe('createDoctorForm', () => {
  it('Test 3: FormData reads arztNr, profilUrl, fachrichtung — no kategorie, no website', async () => {
    mockedGeocode.mockResolvedValueOnce(null)

    const fd = new FormData()
    fd.set('arztNr', 'H1')
    fd.set('name', 'Dr. Form')
    fd.set('titel', 'MR')
    fd.set('fachrichtung', 'ALLGEMEINMEDIZIN')
    fd.set('address', 'Form Address 1')
    fd.set('bezirkId', String(grazId))
    fd.set('email', 'form@example.at')
    fd.set('profilUrl', 'https://www.aekstmk.or.at/aerztesuche-46?arztnr=H1')
    fd.set('phone', '+43 316 0000000')
    fd.set('editorialNote', 'Note')
    fd.set('relatedArticleIds', '')

    // redirect() throws NEXT_REDIRECT inside Next.js. In tests we assert it rejects
    // and verify the underlying create happened via DB state.
    await expect(actions.createDoctorForm(fd)).rejects.toThrow()

    const created = await db.doctor.findFirst({ where: { name: 'Dr. Form' } })
    expect(created).not.toBeNull()
    expect(created?.arztNr).toBe('H1')
    expect(created?.titel).toBe('MR')
    expect(created?.fachrichtung).toBe('ALLGEMEINMEDIZIN')
    expect(created?.address).toBe('Form Address 1')
    expect(created?.bezirkId).toBe(grazId)
    expect(created?.email).toBe('form@example.at')
    expect(created?.profilUrl).toBe('https://www.aekstmk.or.at/aerztesuche-46?arztnr=H1')
    expect(created?.phone).toBe('+43 316 0000000')
    expect(created?.editorialNote).toBe('Note')
    expect(created?.relatedArticleIds).toEqual([])
    // Ensure no kategorie or website
    expect('kategorie' in created!).toBe(false)
    expect('website' in created!).toBe(false)

    // Positional mock.calls assertions for createDoctorDb call
    expect(mockedGeocode).toHaveBeenCalledTimes(1)
    expect(mockedGeocode.mock.calls[0][1]).toBe('Form Address 1')
  })

  it('relatedArticleIds: empty string → []', async () => {
    mockedGeocode.mockResolvedValueOnce(null)
    const fd = new FormData()
    fd.set('arztNr', 'H2')
    fd.set('name', 'Dr. EmptyRel')
    fd.set('fachrichtung', 'ALLGEMEINMEDIZIN')
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
    fd.set('arztNr', 'H3')
    fd.set('name', 'Dr. TwoRel')
    fd.set('fachrichtung', 'ALLGEMEINMEDIZIN')
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
    fd.set('arztNr', 'H4')
    fd.set('name', 'Dr. MessyRel')
    fd.set('fachrichtung', 'ALLGEMEINMEDIZIN')
    fd.set('address', 'X')
    fd.set('bezirkId', String(grazId))
    fd.set('relatedArticleIds', 'abc, ,def')
    await expect(actions.createDoctorForm(fd)).rejects.toThrow()
    const created = await db.doctor.findFirst({ where: { name: 'Dr. MessyRel' } })
    expect(created?.relatedArticleIds).toEqual(['abc', 'def'])
  })
})
