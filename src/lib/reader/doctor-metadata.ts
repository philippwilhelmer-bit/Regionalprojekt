/**
 * Doctor metadata + JSON-LD helper module (Phase 47 / DIR-10, DIR-14, DIR-17).
 *
 * Updated from Phase 46: kategorie + DoctorKategorie removed (D-03). fachrichtung
 * is now a required Fachrichtung enum (D-04). profilUrl replaces website (D-02).
 * JSON-LD always @type: 'Physician' (D-27). medicalSpecialty always set (D-04).
 *
 * Pure helpers for the public Ärzte detail page:
 *   - buildDoctorMetadata: Next.js Metadata object (title / description /
 *     canonical / OG tags) — returns {} for null doctor so generateMetadata
 *     can handle not-found gracefully without throwing.
 *   - buildDoctorJsonLd: schema.org Physician JSON-LD payload. Optional keys
 *     are omitted (not nulled) when source values are unset.
 *
 * No try/catch (pure transforms). No DB calls. No side effects.
 */
import type { Metadata } from 'next'
import type { Doctor } from '@prisma/client'
import { slugify } from './slug'

type DoctorForMetadata = Doctor & { bezirk: { name: string } }

export function buildDoctorMetadata(
  doctor: DoctorForMetadata | null,
  baseUrl: string,
): Metadata {
  if (!doctor) return {}

  const slug = slugify(doctor.name)
  const canonical = `${baseUrl}/aerzte/${doctor.publicId}/${slug}`
  const titleParts = [doctor.titel, doctor.name].filter(Boolean).join(' ')
  const description =
    doctor.editorialNote?.slice(0, 160) ??
    `${titleParts}: ${doctor.address}`

  return {
    title: `${titleParts} — ${doctor.bezirk.name}`,
    description,
    alternates: { canonical },
    openGraph: {
      title: titleParts,
      description: doctor.editorialNote?.slice(0, 160),
      url: canonical,
      type: 'profile',
    },
  }
}

export function buildDoctorJsonLd(
  doctor: DoctorForMetadata,
  canonicalUrl: string,
): Record<string, unknown> {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Physician',
    name: [doctor.titel, doctor.name].filter(Boolean).join(' '),
    url: canonicalUrl,
    medicalSpecialty: doctor.fachrichtung as string,
    address: {
      '@type': 'PostalAddress',
      streetAddress: doctor.address,
      addressLocality: doctor.bezirk.name,
      addressRegion: 'Steiermark',
      addressCountry: 'AT',
    },
  }

  if (doctor.lat !== null && doctor.lon !== null) {
    jsonLd.geo = {
      '@type': 'GeoCoordinates',
      latitude: doctor.lat,
      longitude: doctor.lon,
    }
  }

  if (doctor.email) jsonLd.email = doctor.email
  if (doctor.phone) jsonLd.telephone = doctor.phone
  if (doctor.profilUrl) jsonLd.sameAs = [doctor.profilUrl]

  return jsonLd
}
