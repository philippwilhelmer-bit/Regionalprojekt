import type { Metadata } from 'next'
import type { Fachrichtung } from '@prisma/client'
import { countDoctors, listDoctors } from '@/lib/content/doctors'
import { listBezirke } from '@/lib/content/bezirke'
import { FACHRICHTUNG_LABELS } from '@/lib/admin/import/fachrichtung-mapping'
import DoctorPublicCard from './DoctorPublicCard'
import DoctorPublicFilters from './DoctorPublicFilters'
import Pager from './Pager'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

export const metadata: Metadata = {
  title: 'Ärzteverzeichnis — Loden & Leute',
  description:
    'Allgemeinmediziner und Fachärzte in der Steiermark — kuratiert von der Loden & Leute Redaktion.',
}

type SearchParams = Promise<{
  bezirk?: string
  fachrichtung?: string
  page?: string
}>

export default async function AerztePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  // Validate fachrichtung against allow-list (FACHRICHTUNG_LABELS keys) — T-47-05-INJ-FILTER
  const fachrichtungCandidate = sp.fachrichtung?.toUpperCase()
  const fachrichtungRaw: Fachrichtung | undefined =
    fachrichtungCandidate && fachrichtungCandidate in FACHRICHTUNG_LABELS
      ? (fachrichtungCandidate as Fachrichtung)
      : undefined

  const pageParam = Number.parseInt(sp.page ?? '1', 10)
  const page = Number.isFinite(pageParam) && pageParam >= 1 ? pageParam : 1
  const offset = (page - 1) * PAGE_SIZE

  const filterArgs = {
    bezirkSlug: sp.bezirk,
    fachrichtung: fachrichtungRaw,
  }

  const [doctors, totalCount, bezirke] = await Promise.all([
    listDoctors({ ...filterArgs, limit: PAGE_SIZE, offset }),
    countDoctors(filterArgs),
    listBezirke(),
  ])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  return (
    <main className="bg-dir-surface min-h-screen">
      <div className="max-w-5xl mx-auto p-dir-margin-mobile md:p-dir-margin-desktop">
        <header className="mb-dir-lg">
          <h1 className="text-dir-on-surface font-headline text-4xl md:text-5xl font-bold mb-dir-sm">
            Ärzteverzeichnis
          </h1>
          <p className="text-dir-on-surface-variant text-base md:text-lg">
            Allgemeinmediziner und Fachärzte in der Steiermark —
            kuratiert von unserer Redaktion.
          </p>
        </header>

        <div className="mb-dir-lg">
          <DoctorPublicFilters
            bezirke={bezirke}
            active={{
              bezirk: sp.bezirk,
              fachrichtung: fachrichtungRaw,
            }}
          />
        </div>

        {doctors.length === 0 ? (
          <p className="text-dir-on-surface-variant">Keine Einträge gefunden.</p>
        ) : (
          <>
            <ul className="flex flex-col gap-dir-sm">
              {doctors.map((d) => (
                <li key={d.id}>
                  <DoctorPublicCard doctor={d} />
                </li>
              ))}
            </ul>
            <Pager
              page={safePage}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={PAGE_SIZE}
              params={{ bezirk: sp.bezirk, fachrichtung: sp.fachrichtung }}
            />
          </>
        )}
      </div>
    </main>
  )
}
