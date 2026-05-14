/**
 * Admin "edit doctor" page (Phase 46 / DIR-06).
 *
 * Thin Server Component reading the doctor by id and composing DoctorForm
 * with updateDoctorForm. notFound() on invalid or missing id. No requireAuth()
 * — (admin)/layout.tsx already gates this route group.
 */
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { listBezirke } from '@/lib/content/bezirke'
import { getDoctorById } from '@/lib/content/doctors'
import { updateDoctorForm } from '@/lib/admin/doctors-actions'
import DoctorForm from '../../DoctorForm'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export default async function EditDoctorPage({ params }: Props) {
  const { id } = await params
  const doctorId = Number(id)
  if (!Number.isFinite(doctorId)) notFound()

  const [doctor, bezirke] = await Promise.all([
    getDoctorById(doctorId),
    listBezirke(),
  ])
  if (!doctor) notFound()

  const display = [doctor.titel, doctor.name].filter(Boolean).join(' ')

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-dir-md mb-dir-md">
        <Link href="/admin/aerzte" className="text-sm text-ink-muted hover:text-ink">
          &larr; Zurück
        </Link>
        <h1 className="text-2xl font-bold text-ink font-headline">
          Arzt bearbeiten: {display}
        </h1>
      </div>
      <DoctorForm
        doctor={doctor}
        bezirke={bezirke}
        formAction={updateDoctorForm}
        submitLabel="Speichern"
      />
    </div>
  )
}
