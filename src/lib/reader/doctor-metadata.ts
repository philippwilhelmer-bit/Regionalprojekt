/**
 * Doctor metadata + JSON-LD helper module (Phase 46 / DIR-10).
 *
 * Pure helpers for the public Ärzte detail page:
 *   - buildDoctorMetadata: Next.js Metadata object (title / description /
 *     canonical / OG tags) — returns {} for null doctor so generateMetadata
 *     can handle not-found gracefully without throwing.
 *   - buildDoctorJsonLd: schema.org Physician (ALLGEMEINMEDIZIN / FACHARZT)
 *     or Dentist (ZAHNARZT) JSON-LD payload. Optional keys are omitted
 *     (not nulled) when source values are unset.
 *   - kategorieLabel: German display label for the DoctorKategorie enum.
 *
 * No try/catch (pure transforms). No DB calls. No side effects.
 */
import type { Metadata } from 'next'
import type { Doctor, DoctorKategorie } from '@prisma/client'
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
    title: `${titleParts} — ${kategorieLabel(doctor.kategorie)} in ${doctor.bezirk.name}`,
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
  const baseType = doctor.kategorie === 'ZAHNARZT' ? 'Dentist' : 'Physician'
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': baseType,
    name: [doctor.titel, doctor.name].filter(Boolean).join(' '),
    url: canonicalUrl,
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

  if (doctor.kategorie === 'FACHARZT' && doctor.fachrichtung) {
    jsonLd.medicalSpecialty = doctor.fachrichtung
  }

  if (doctor.email) jsonLd.email = doctor.email
  if (doctor.phone) jsonLd.telephone = doctor.phone
  if (doctor.website) jsonLd.sameAs = [doctor.website]

  return jsonLd
}

export function kategorieLabel(k: DoctorKategorie): string {
  switch (k) {
    case 'ALLGEMEINMEDIZIN':
      return 'Allgemeinmediziner:in'
    case 'FACHARZT':
      return 'Facharzt/Fachärztin'
    case 'ZAHNARZT':
      return 'Zahnarzt/Zahnärztin'
  }
}
