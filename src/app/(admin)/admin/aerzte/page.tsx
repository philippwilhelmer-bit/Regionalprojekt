/**
 * Admin list page for the doctor directory (Phase 46 / DIR-06).
 *
 * Server Component reading filters from searchParams and dispatching to the
 * read-only DAL (listDoctors). No auth call here — `(admin)/layout.tsx` already
 * gates every /admin/* route via verifySessionCookie + redirect.
 *
 * Mirrors the structural shape of `src/app/(admin)/admin/articles/page.tsx`.
 */
import Link from 'next/link'
import type { DoctorKategorie } from '@prisma/client'
import { listDoctors } from '@/lib/content/doctors'
import { listBezirke } from '@/lib/content/bezirke'
import { DoctorFilters } from './DoctorFilters'
import { DoctorRow } from './DoctorRow'

export const dynamic = 'force-dynamic'

interface SearchParams {
  bezirk?: string
  kategorie?: string
  isVerified?: string
}

function parseKategorie(raw: string | undefined): DoctorKategorie | undefined {
  if (raw === 'ALLGEMEINMEDIZIN' || raw === 'FACHARZT' || raw === 'ZAHNARZT') {
    return raw
  }
  return undefined
}

function parseIsVerified(raw: string | undefined): boolean | undefined {
  if (raw === 'true') return true
  if (raw === 'false') return false
  return undefined
}

export default async function AdminDoctorsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const kategorie = parseKategorie(params.kategorie)
  const isVerified = parseIsVerified(params.isVerified)

  const [doctors, bezirke] = await Promise.all([
    listDoctors({
      bezirkSlug: params.bezirk,
      kategorie,
      isVerified,
      limit: 200,
    }),
    listBezirke(),
  ])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-ink font-headline">
          Ärzteverzeichnis · Admin
        </h1>
        <Link
          href="/admin/aerzte/new"
          className="px-4 py-2 bg-gradient-to-br from-ink to-ink-soft text-parchment text-sm font-medium rounded-sm hover:opacity-90"
        >
          Neuer Arzt
        </Link>
      </div>

      <div className="bg-surface-elevated rounded-sm p-4 mb-4">
        <DoctorFilters
          bezirke={bezirke}
          active={{
            bezirk: params.bezirk,
            kategorie,
            isVerified,
          }}
        />
      </div>

      {doctors.length === 0 ? (
        <p className="text-center text-ink-muted py-12">
          Keine Ärzte gefunden.
        </p>
      ) : (
        <div className="bg-dir-surface-container-lowest rounded-dir-md overflow-hidden">
          <ul className="divide-y divide-dir-outline-variant">
            {doctors.map((d) => (
              <li key={d.id}>
                <DoctorRow doctor={d} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
