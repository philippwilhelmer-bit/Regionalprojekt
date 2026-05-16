import { notFound, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getDoctorByPublicId } from '@/lib/content/doctors'
import { slugify } from '@/lib/reader/slug'
import {
  buildDoctorMetadata,
  buildDoctorJsonLd,
} from '@/lib/reader/doctor-metadata'
import { getArticleByPublicId } from '@/lib/content/articles'
import { EditorialStackCard } from '@/components/reader/EditorialStackCard'
import DoctorMap from './DoctorMap'

export const dynamic = 'force-dynamic'

// BASE_URL — IDENTICAL expression to src/app/sitemap.ts:10 so the canonical
// host is consistent across detail metadata, JSON-LD, and the sitemap.
// Do NOT change — see plan 46-04 frontmatter "key_links" canonical-host
// pattern.
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://lodenundleute.at'

type Props = { params: Promise<{ publicId: string; slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { publicId } = await params
  const doctor = await getDoctorByPublicId(publicId)
  return buildDoctorMetadata(doctor, BASE_URL)
}

export default async function DoctorDetailPage({ params }: Props) {
  const { publicId, slug } = await params

  const doctor = await getDoctorByPublicId(publicId)
  if (!doctor) notFound()

  const canonical = slugify(doctor.name)
  if (slug !== canonical) {
    permanentRedirect(`/aerzte/${publicId}/${canonical}`)
  }

  const canonicalUrl = `${BASE_URL}/aerzte/${publicId}/${canonical}`
  const jsonLd = buildDoctorJsonLd(doctor, canonicalUrl)

  // Resolve related articles — manual list, skip refs that no longer
  // resolve (article unpublished/deleted). .catch(() => null) keeps the
  // detail page resilient even if a single related lookup fails.
  const relatedArticles = (
    await Promise.all(
      doctor.relatedArticleIds.map((id) =>
        getArticleByPublicId(id).catch(() => null),
      ),
    )
  ).filter((a): a is NonNullable<typeof a> => a !== null)

  // Split editorialNote on blank lines to render as paragraphs (same
  // pattern as article-body rendering).
  const editorialParagraphs = (doctor.editorialNote ?? '')
    .split('\n\n')
    .filter(Boolean)

  const displayName = [doctor.titel, doctor.name].filter(Boolean).join(' ')

  return (
    <main className="bg-dir-surface min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="max-w-3xl mx-auto p-dir-margin-mobile md:p-dir-margin-desktop">
        <header className="mb-dir-lg">
          <div className="flex items-baseline gap-dir-sm flex-wrap">
            <h1 className="text-dir-on-surface font-headline text-3xl md:text-5xl font-bold">
              {displayName}
            </h1>
            {doctor.isVerified && (
              <span className="bg-dir-tertiary-container text-dir-on-tertiary-container rounded-dir-full px-dir-md py-dir-xs text-sm">
                Verifiziert
              </span>
            )}
          </div>
          <p className="text-dir-on-surface-variant text-base md:text-lg mt-dir-sm">
            {doctor.fachrichtung}
            {' · '}
            {doctor.bezirk.name}
          </p>
        </header>

        <section className="mt-dir-lg space-y-dir-xs">
          <p className="text-dir-on-surface">{doctor.address}</p>
          {doctor.phone && (
            <p className="text-dir-on-surface">
              Telefon:{' '}
              <a href={`tel:${doctor.phone}`} className="text-dir-primary underline">
                {doctor.phone}
              </a>
            </p>
          )}
          {doctor.email && (
            <p className="text-dir-on-surface">
              E-Mail:{' '}
              <a href={`mailto:${doctor.email}`} className="text-dir-primary underline">
                {doctor.email}
              </a>
            </p>
          )}
          {doctor.profilUrl && (
            <p className="text-dir-on-surface">
              <a
                href={doctor.profilUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-dir-primary underline"
              >
                Profil auf aekstmk.or.at
              </a>
            </p>
          )}
        </section>

        <section className="mt-dir-lg">
          <DoctorMap
            mapImageUrl={doctor.mapImageUrl}
            doctorName={doctor.name}
            address={doctor.address}
          />
        </section>

        {editorialParagraphs.length > 0 && (
          <section className="mt-dir-lg">
            <h2 className="text-dir-on-surface font-headline text-2xl font-semibold mb-dir-sm">
              Aus der Redaktion
            </h2>
            <div className="space-y-dir-sm">
              {editorialParagraphs.map((p, i) => (
                <p key={i} className="text-dir-on-surface leading-relaxed">
                  {p}
                </p>
              ))}
            </div>
          </section>
        )}

        {relatedArticles.length > 0 && (
          <section className="mt-dir-lg">
            <h2 className="text-dir-on-surface font-headline text-2xl font-semibold mb-dir-sm">
              Mehr zum Thema
            </h2>
            <div className="grid gap-dir-md">
              {relatedArticles.map((a) => (
                <EditorialStackCard key={a.id} article={a} variant="row" />
              ))}
            </div>
          </section>
        )}

        <footer className="mt-dir-xl text-dir-on-surface-variant text-sm">
          <p>
            Angaben ohne Gewähr. Diese Daten werden redaktionell gepflegt und
            können veraltet sein. Bitte vor einem Besuch direkt beim Arzt
            nachfragen.
          </p>
          <p className="mt-dir-xs">
            Stand: {doctor.updatedAt.toLocaleDateString('de-AT')}
          </p>
        </footer>
      </article>
    </main>
  )
}
