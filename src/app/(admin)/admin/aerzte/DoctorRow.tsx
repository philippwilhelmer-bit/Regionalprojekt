import Link from 'next/link'
import type { DoctorWithBezirk } from '@/lib/content/doctors'
import {
  toggleVerifiedForm,
  softDeleteDoctorForm,
} from '@/lib/admin/doctors-actions'

/**
 * Admin list row for a single doctor (Phase 47 / DIR-06, updated from Phase 46).
 *
 * Updated from Phase 46: kategorie removed (D-03); fachrichtung is now a required
 * Fachrichtung enum — always shown directly (label map ships in Plan 47-00).
 *
 * Server Component. Three action surfaces:
 *   - Edit link → /admin/aerzte/{id}/edit
 *   - Toggle verified → form action={toggleVerifiedForm}
 *   - Delete → form action={softDeleteDoctorForm}
 *
 * The two action forms post id as a hidden input. JS-less by default;
 * mirrors the article-row pattern with simpler chrome.
 */
export function DoctorRow({ doctor }: { doctor: DoctorWithBezirk }) {
  const display = [doctor.titel, doctor.name].filter(Boolean).join(' ')
  const address =
    doctor.address.length > 60 ? doctor.address.slice(0, 60) + '…' : doctor.address

  return (
    <div className="flex flex-wrap items-center gap-dir-md p-dir-md hover:bg-dir-surface-container-low">
      {/* Name + meta column */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-dir-sm flex-wrap">
          <Link
            href={`/admin/aerzte/${doctor.id}/edit`}
            className="text-dir-on-surface font-headline text-base font-semibold hover:underline"
          >
            {display}
          </Link>
          {doctor.isVerified && (
            <span className="bg-dir-tertiary-container text-dir-on-tertiary-container rounded-dir-full px-dir-sm py-dir-xs text-xs">
              Verifiziert
            </span>
          )}
          {doctor.lat === null && (
            <span
              className="bg-dir-error-container text-dir-on-error-container rounded-dir-full px-dir-sm py-dir-xs text-xs"
              title="Adresse konnte nicht geokodiert werden"
            >
              ⚠ keine Koordinaten
            </span>
          )}
        </div>
        <p className="text-dir-on-surface-variant text-sm mt-dir-xs">
          {doctor.fachrichtung}
          {' · '}
          {doctor.bezirk.name}
        </p>
        <p className="text-dir-on-surface-variant text-xs mt-dir-xs">{address}</p>
      </div>

      {/* Action column */}
      <div className="flex items-center gap-dir-sm">
        <Link
          href={`/admin/aerzte/${doctor.id}/edit`}
          className="text-xs px-dir-sm py-dir-xs rounded-dir-sm border border-dir-outline-variant text-dir-on-surface hover:bg-dir-surface-container"
        >
          Bearbeiten
        </Link>

        <form action={toggleVerifiedForm}>
          <input type="hidden" name="id" value={doctor.id} />
          <button
            type="submit"
            className="text-xs px-dir-sm py-dir-xs rounded-dir-sm border border-dir-outline-variant text-dir-on-surface hover:bg-dir-surface-container"
          >
            {doctor.isVerified ? 'Verifizierung entfernen' : 'Verifizieren'}
          </button>
        </form>

        {/*
          DoctorRow is a Server Component, so we can't wire onSubmit with
          confirm(). We use <details> as a JS-less two-step confirmation:
          first click reveals the "Wirklich löschen" submit button.
        */}
        <form action={softDeleteDoctorForm}>
          <input type="hidden" name="id" value={doctor.id} />
          <details className="inline-block">
            <summary className="text-xs px-dir-sm py-dir-xs rounded-dir-sm border border-dir-outline-variant text-dir-error cursor-pointer list-none hover:bg-dir-error-container">
              Löschen
            </summary>
            <button
              type="submit"
              className="mt-dir-xs text-xs px-dir-sm py-dir-xs rounded-dir-sm bg-dir-error text-dir-on-error hover:opacity-90"
            >
              Wirklich löschen
            </button>
          </details>
        </form>
      </div>
    </div>
  )
}
