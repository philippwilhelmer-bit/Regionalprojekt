import Link from 'next/link'
import { slugify } from '@/lib/reader/slug'
import { kategorieLabel } from '@/lib/reader/doctor-metadata'
import type { DoctorWithBezirk } from '@/lib/content/doctors'

/**
 * Public list-row card for a doctor.
 *
 * Server Component (no client state). Links to /aerzte/{publicId}/{slug}.
 * Renders verification badge when isVerified. Uses --dir-* design tokens.
 */
export default function DoctorPublicCard({ doctor }: { doctor: DoctorWithBezirk }) {
  const href = `/aerzte/${doctor.publicId}/${slugify(doctor.name)}`
  const display = [doctor.titel, doctor.name].filter(Boolean).join(' ')

  return (
    <Link
      href={href}
      className="block bg-dir-surface-container-lowest rounded-dir-md p-dir-md hover:bg-dir-surface-container-low transition-colors"
    >
      <div className="flex items-baseline gap-dir-sm flex-wrap">
        <h2 className="text-dir-on-surface font-headline text-lg font-semibold">
          {display}
        </h2>
        {doctor.isVerified && (
          <span className="bg-dir-tertiary-container text-dir-on-tertiary-container rounded-dir-full px-dir-sm py-dir-xs text-xs">
            Verifiziert
          </span>
        )}
      </div>
      <p className="text-dir-on-surface-variant text-sm mt-dir-xs">
        {kategorieLabel(doctor.kategorie)}
        {doctor.kategorie === 'FACHARZT' && doctor.fachrichtung
          ? ` · ${doctor.fachrichtung}`
          : ''}
        {' · '}
        {doctor.bezirk.name}
      </p>
      <p className="text-dir-on-surface-variant text-sm mt-dir-xs">{doctor.address}</p>
    </Link>
  )
}
