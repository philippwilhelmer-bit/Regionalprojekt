/**
 * Admin "new doctor" page (Phase 46 / DIR-06).
 *
 * Thin Server Component composing DoctorForm with createDoctorForm.
 * No requireAuth() — (admin)/layout.tsx already gates this route.
 */
import Link from 'next/link'
import { listBezirke } from '@/lib/content/bezirke'
import { createDoctorForm } from '@/lib/admin/doctors-actions'
import DoctorForm from '../DoctorForm'

export const dynamic = 'force-dynamic'

export default async function NewDoctorPage() {
  const bezirke = await listBezirke()
  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-dir-md mb-dir-md">
        <Link href="/admin/aerzte" className="text-sm text-ink-muted hover:text-ink">
          &larr; Zurück
        </Link>
        <h1 className="text-2xl font-bold text-ink font-headline">Neuer Arzt</h1>
      </div>
      <DoctorForm
        bezirke={bezirke}
        formAction={createDoctorForm}
        submitLabel="Anlegen"
      />
    </div>
  )
}
