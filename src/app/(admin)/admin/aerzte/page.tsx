/**
 * Admin list page for the doctor directory (Phase 47 / DIR-06, updated from Phase 46).
 *
 * Phase 47 additions:
 *   - Geocoder progress counter: "X von Y Ärzte geocoded (Z ausstehend)" (D-22)
 *   - "Geocode next 200 (~4 min)" button posting to geocodeBatchForm
 *   - "CSV importieren" link to /admin/aerzte/import
 *   - Success banners for ?imported=N and ?geocoded=N redirects
 *
 * Server Component reading filters from searchParams and dispatching to the
 * read-only DAL (listDoctors). No auth call here — `(admin)/layout.tsx` already
 * gates every /admin/* route via verifySessionCookie + redirect.
 *
 * Mirrors the structural shape of `src/app/(admin)/admin/articles/page.tsx`.
 */
import Link from 'next/link'
import { listDoctors } from '@/lib/content/doctors'
import { listBezirke } from '@/lib/content/bezirke'
import { prisma } from '@/lib/prisma'
import { geocodeBatchForm } from '@/lib/admin/doctors-import-actions'
import { DoctorFilters } from './DoctorFilters'
import { DoctorRow } from './DoctorRow'

export const dynamic = 'force-dynamic'

interface SearchParams {
  bezirk?: string
  isVerified?: string
  fachrichtung?: string
  imported?: string
  geocoded?: string
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
  const isVerified = parseIsVerified(params.isVerified)

  const [doctors, bezirke, total, geocoded] = await Promise.all([
    listDoctors({
      bezirkSlug: params.bezirk,
      isVerified,
      limit: 200,
    }),
    listBezirke(),
    prisma.doctor.count(),
    prisma.doctor.count({ where: { NOT: { lat: null } } }),
  ])

  const pending = total - geocoded

  const importedCount = params.imported ? parseInt(params.imported, 10) : null
  const geocodedCount = params.geocoded ? parseInt(params.geocoded, 10) : null

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-ink font-headline">
          Ärzteverzeichnis · Admin
        </h1>
        <div className="flex items-center gap-dir-sm">
          <Link
            href="/admin/aerzte/import"
            className="px-4 py-2 bg-dir-surface-container text-dir-on-surface text-sm font-medium rounded-sm border border-dir-outline-variant hover:bg-dir-surface-container-high"
          >
            CSV importieren
          </Link>
          <Link
            href="/admin/aerzte/new"
            className="px-4 py-2 bg-gradient-to-br from-ink to-ink-soft text-parchment text-sm font-medium rounded-sm hover:opacity-90"
          >
            Neuer Arzt
          </Link>
        </div>
      </div>

      {/* Success banners */}
      {importedCount !== null && (
        <div className="mb-4">
          <span className="bg-dir-tertiary-container text-dir-on-tertiary-container rounded-dir-full px-dir-sm py-dir-xs text-sm">
            {importedCount} Ärzte importiert
          </span>
        </div>
      )}
      {geocodedCount !== null && (
        <div className="mb-4">
          <span className="bg-dir-tertiary-container text-dir-on-tertiary-container rounded-dir-full px-dir-sm py-dir-xs text-sm">
            {geocodedCount} Ärzte geocoded
          </span>
        </div>
      )}

      {/* Geocoder counter + button */}
      <div className="flex flex-wrap items-center gap-dir-md mb-6">
        <p className="text-sm text-dir-on-surface-variant">
          {geocoded} von {total} Ärzte geocoded ({pending} ausstehend)
        </p>
        <form action={geocodeBatchForm}>
          <button
            type="submit"
            disabled={pending === 0}
            className="px-dir-sm py-dir-xs text-sm rounded-dir-sm border border-dir-outline-variant text-dir-on-surface hover:bg-dir-surface-container disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Geocode next 200 (~4 min)
          </button>
        </form>
      </div>

      <div className="bg-surface-elevated rounded-sm p-4 mb-4">
        <DoctorFilters
          bezirke={bezirke}
          active={{
            bezirk: params.bezirk,
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
