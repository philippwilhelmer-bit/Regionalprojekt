import type { Metadata } from 'next'
import type { DoctorKategorie } from '@prisma/client'
import { listDoctors } from '@/lib/content/doctors'
import { listBezirke } from '@/lib/content/bezirke'
import DoctorPublicCard from './DoctorPublicCard'
import DoctorPublicFilters from './DoctorPublicFilters'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Ärzteverzeichnis — Loden & Leute',
  description:
    'Allgemeinmediziner, Fachärzte und Zahnärzte in der Steiermark — kuratiert von der Loden & Leute Redaktion.',
}

type SearchParams = Promise<{
  bezirk?: string
  kategorie?: string
  fachrichtung?: string
}>

export default async function AerztePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  const kategorieRaw = sp.kategorie?.toUpperCase() as DoctorKategorie | undefined
  const validKategorie =
    kategorieRaw === 'ALLGEMEINMEDIZIN' ||
    kategorieRaw === 'FACHARZT' ||
    kategorieRaw === 'ZAHNARZT'
      ? kategorieRaw
      : undefined

  const [doctors, bezirke] = await Promise.all([
    listDoctors({
      bezirkSlug: sp.bezirk,
      kategorie: validKategorie,
      fachrichtung: sp.fachrichtung,
      limit: 200,
    }),
    listBezirke(),
  ])

  return (
    <main className="bg-dir-surface min-h-screen">
      <div className="max-w-5xl mx-auto p-dir-margin-mobile md:p-dir-margin-desktop">
        <header className="mb-dir-lg">
          <h1 className="text-dir-on-surface font-headline text-4xl md:text-5xl font-bold mb-dir-sm">
            Ärzteverzeichnis
          </h1>
          <p className="text-dir-on-surface-variant text-base md:text-lg">
            Allgemeinmediziner, Fachärzte und Zahnärzte in der Steiermark —
            kuratiert von unserer Redaktion.
          </p>
        </header>

        <div className="mb-dir-lg">
          <DoctorPublicFilters
            bezirke={bezirke}
            active={{
              bezirk: sp.bezirk,
              kategorie: validKategorie,
              fachrichtung: sp.fachrichtung,
            }}
          />
        </div>

        {doctors.length === 0 ? (
          <p className="text-dir-on-surface-variant">Keine Einträge gefunden.</p>
        ) : (
          <ul className="flex flex-col gap-dir-sm">
            {doctors.map((d) => (
              <li key={d.id}>
                <DoctorPublicCard doctor={d} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
