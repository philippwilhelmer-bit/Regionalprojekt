import { describe, it, expect } from 'vitest'
import type { Doctor } from '@prisma/client'
import {
  buildDoctorMetadata,
  buildDoctorJsonLd,
} from './doctor-metadata'
import { FACHRICHTUNG_LABELS } from '@/lib/admin/import/fachrichtung-mapping'

type DoctorForMetadata = Doctor & { bezirk: { name: string } }

function makeDoctor(overrides: Partial<DoctorForMetadata> = {}): DoctorForMetadata {
  return {
    id: 1,
    publicId: 'abc123',
    arztNr: 'A1234',
    name: 'Maria Müller',
    titel: null,
    fachrichtung: 'ALLGEMEINMEDIZIN',
    address: 'Herrengasse 16, 8010 Graz',
    lat: null,
    lon: null,
    bezirkId: 1,
    email: null,
    profilUrl: null,
    phone: null,
    editorialNote: null,
    relatedArticleIds: [],
    mapImageUrl: null,
    isVerified: false,
    createdAt: new Date('2026-05-14T10:00:00Z'),
    updatedAt: new Date('2026-05-14T10:00:00Z'),
    bezirk: { name: 'Graz Stadt' },
    ...overrides,
  }
}

const BASE_URL = 'https://example.com'

describe('buildDoctorJsonLd', () => {
  it('Test 1: always @type === "Physician" (no Dentist branch — D-27)', () => {
    const doctor = makeDoctor({ fachrichtung: 'ALLGEMEINMEDIZIN' })
    const jsonLd = buildDoctorJsonLd(doctor, `${BASE_URL}/aerzte/abc123/maria-mueller`)
    expect(jsonLd['@type']).toBe('Physician')
  })

  it('Test 2: medicalSpecialty is the German label from FACHRICHTUNG_LABELS (D-27)', () => {
    const doctor = makeDoctor({ fachrichtung: 'INNERE_MEDIZIN_UND_KARDIOLOGIE' })
    const jsonLd = buildDoctorJsonLd(doctor, `${BASE_URL}/aerzte/abc123/maria-mueller`)
    expect(jsonLd['@type']).toBe('Physician')
    expect(jsonLd.medicalSpecialty).toBe(FACHRICHTUNG_LABELS['INNERE_MEDIZIN_UND_KARDIOLOGIE'])
    expect(jsonLd.medicalSpecialty).toBe('Innere Medizin und Kardiologie')
  })

  it('Test 3: medicalSpecialty uses FACHRICHTUNG_LABELS for any fachrichtung value', () => {
    const doctor = makeDoctor({ fachrichtung: 'ALLGEMEINMEDIZIN' })
    const jsonLd = buildDoctorJsonLd(doctor, `${BASE_URL}/aerzte/abc123/maria-mueller`)
    expect(jsonLd.medicalSpecialty).toBe(FACHRICHTUNG_LABELS['ALLGEMEINMEDIZIN'])
    expect(jsonLd.medicalSpecialty).toBe('Allgemeinmedizin')
  })

  it('Test 4: doctor with lat/lon set → JSON-LD includes geo GeoCoordinates', () => {
    const doctor = makeDoctor({ lat: 47.0707, lon: 15.4395 })
    const jsonLd = buildDoctorJsonLd(doctor, `${BASE_URL}/aerzte/abc123/maria-mueller`)
    expect(jsonLd.geo).toEqual({
      '@type': 'GeoCoordinates',
      latitude: 47.0707,
      longitude: 15.4395,
    })
  })

  it('Test 5: doctor with lat=null → JSON-LD has no geo key', () => {
    const doctor = makeDoctor({ lat: null, lon: null })
    const jsonLd = buildDoctorJsonLd(doctor, `${BASE_URL}/aerzte/abc123/maria-mueller`)
    expect(jsonLd).not.toHaveProperty('geo')
  })

  it('Test 6: doctor with email set → JSON-LD has email; without → no email key', () => {
    const withEmail = makeDoctor({ email: 'praxis@example.at' })
    const withoutEmail = makeDoctor({ email: null })
    const j1 = buildDoctorJsonLd(withEmail, `${BASE_URL}/aerzte/abc123/maria-mueller`)
    const j2 = buildDoctorJsonLd(withoutEmail, `${BASE_URL}/aerzte/abc123/maria-mueller`)
    expect(j1.email).toBe('praxis@example.at')
    expect(j2).not.toHaveProperty('email')
  })

  it('Test 7: doctor with phone set → telephone key; without → no telephone', () => {
    const withPhone = makeDoctor({ phone: '+43 316 12345' })
    const withoutPhone = makeDoctor({ phone: null })
    const j1 = buildDoctorJsonLd(withPhone, `${BASE_URL}/aerzte/abc123/maria-mueller`)
    const j2 = buildDoctorJsonLd(withoutPhone, `${BASE_URL}/aerzte/abc123/maria-mueller`)
    expect(j1.telephone).toBe('+43 316 12345')
    expect(j2).not.toHaveProperty('telephone')
  })

  it('Test 8: doctor with profilUrl set → sameAs: [profilUrl] (D-28); without → no sameAs', () => {
    const withProfilUrl = makeDoctor({ profilUrl: 'https://www.aekstmk.or.at/aerztesuche-46?arztnr=A1234' })
    const withoutProfilUrl = makeDoctor({ profilUrl: null })
    const j1 = buildDoctorJsonLd(withProfilUrl, `${BASE_URL}/aerzte/abc123/maria-mueller`)
    const j2 = buildDoctorJsonLd(withoutProfilUrl, `${BASE_URL}/aerzte/abc123/maria-mueller`)
    expect(j1.sameAs).toEqual(['https://www.aekstmk.or.at/aerztesuche-46?arztnr=A1234'])
    expect(j2).not.toHaveProperty('sameAs')
  })

  it('Test 9: titel + name combine into displayed JSON-LD name', () => {
    const doctor = makeDoctor({
      titel: 'Univ.-Doz. Dr.',
      name: 'Maria Müller',
    })
    const jsonLd = buildDoctorJsonLd(doctor, `${BASE_URL}/aerzte/abc123/maria-mueller`)
    expect(jsonLd.name).toBe('Univ.-Doz. Dr. Maria Müller')
  })

  it('Test 10: address fields populate PostalAddress correctly', () => {
    const doctor = makeDoctor({
      address: 'Herrengasse 16, 8010 Graz',
      bezirk: { name: 'Graz Stadt' },
    })
    const jsonLd = buildDoctorJsonLd(doctor, `${BASE_URL}/aerzte/abc123/maria-mueller`)
    expect(jsonLd.address).toEqual({
      '@type': 'PostalAddress',
      streetAddress: 'Herrengasse 16, 8010 Graz',
      addressLocality: 'Graz Stadt',
      addressRegion: 'Steiermark',
      addressCountry: 'AT',
    })
  })
})

describe('buildDoctorMetadata', () => {
  it('Test 11: buildDoctorMetadata(null, baseUrl) returns {}', () => {
    const result = buildDoctorMetadata(null, BASE_URL)
    expect(result).toEqual({})
  })

  it('Test 12: canonical = {baseUrl}/aerzte/{publicId}/{slug}', () => {
    const doctor = makeDoctor({ publicId: 'abc123', name: 'Maria Müller' })
    const result = buildDoctorMetadata(doctor, BASE_URL)
    expect(result.alternates?.canonical).toBe(
      'https://example.com/aerzte/abc123/maria-mueller',
    )
  })
})
