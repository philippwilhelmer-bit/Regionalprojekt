import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { listBezirke } from '@/lib/content/bezirke'
import { updateArticle } from '@/lib/admin/articles-actions'
import { UnsplashPicker } from '@/components/admin/UnsplashPicker'
import { slugify } from '@/lib/reader/slug'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

type Props = { params: Promise<{ id: string }> }

async function updateArticleForm(formData: FormData) {
  'use server'
  const id = Number(formData.get('_id'))
  await updateArticle({
    id,
    title: formData.get('title')?.toString() ?? undefined,
    content: formData.get('content')?.toString() ?? undefined,
    seoTitle: formData.get('seoTitle')?.toString() || undefined,
    metaDescription: formData.get('metaDescription')?.toString() || undefined,
    bezirkIds: formData.getAll('bezirkIds').map(Number).filter(Boolean),
  })
  revalidatePath('/admin/articles')
  redirect('/admin/articles')
}

export default async function EditArticlePage({ params }: Props) {
  const { id } = await params
  const [article, bezirke] = await Promise.all([
    prisma.article.findUnique({
      where: { id: Number(id) },
      include: { bezirke: { include: { bezirk: true } } },
    }),
    listBezirke(),
  ])

  if (!article) notFound()

  const assignedBezirkIds = new Set(article.bezirke.map((ab) => ab.bezirkId))
  const articleSlug = slugify(article.title ?? 'artikel')
  const articleUrl = article.publicId ? `/artikel/${article.publicId}/${articleSlug}` : null

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-4">
        <Link href="/admin/articles" className="text-sm text-text/70 hover:text-text">
          &larr; Zurueck
        </Link>
        <h1 className="text-2xl font-bold text-text font-headline">Artikel bearbeiten</h1>
        {articleUrl && (
          <a
            href={articleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-sm text-secondary hover:text-secondary/80 flex items-center gap-1"
          >
            Artikel ansehen
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>

      {/* Preview */}
      {article.status === 'PUBLISHED' && articleUrl && (
        <div className="bg-surface rounded-sm p-4 mb-4">
          <p className="text-xs font-medium text-text/50 uppercase tracking-wide mb-3">Vorschau</p>
          <div className="flex gap-4">
            {article.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={article.imageUrl}
                alt=""
                className="w-32 h-20 object-cover rounded flex-shrink-0"
              />
            )}
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-text line-clamp-2">{article.title}</h2>
              {article.metaDescription && (
                <p className="text-xs text-text/50 mt-1 line-clamp-2">{article.metaDescription}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                {article.bezirke.map((ab) => (
                  <span key={ab.bezirkId} className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                    {ab.bezirk.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <form action={updateArticleForm} className="bg-surface-elevated rounded-sm p-6 space-y-5">
        <input type="hidden" name="_id" value={article.id} />

        {/* Titel */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-text/70 mb-1">
            Titel <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            defaultValue={article.title ?? ''}
            className="w-full border border-surface rounded-sm px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Inhalt */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-text/70 mb-1">
            Inhalt <span className="text-red-500">*</span>
          </label>
          <textarea
            id="content"
            name="content"
            required
            rows={12}
            defaultValue={article.content ?? ''}
            className="w-full border border-surface rounded-sm px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Bezirke */}
        <div>
          <fieldset>
            <legend className="block text-sm font-medium text-text/70 mb-2">Bezirke</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {bezirke.map((bezirk) => (
                <label key={bezirk.id} className="flex items-center gap-2 text-sm text-text/70 cursor-pointer">
                  <input
                    type="checkbox"
                    name="bezirkIds"
                    value={bezirk.id}
                    defaultChecked={assignedBezirkIds.has(bezirk.id)}
                    className="rounded border-surface text-primary focus:ring-primary"
                  />
                  {bezirk.name}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        {/* Artikelbild (Unsplash) */}
        <UnsplashPicker
          articleId={article.id}
          headline={article.title ?? ''}
          currentImageUrl={article.imageUrl}
          currentImageCredit={article.imageCredit}
        />

        {/* SEO-Titel */}
        <div>
          <label htmlFor="seoTitle" className="block text-sm font-medium text-text/70 mb-1">
            SEO-Titel <span className="text-xs text-text/60">(optional)</span>
          </label>
          <input
            id="seoTitle"
            name="seoTitle"
            type="text"
            defaultValue={article.seoTitle ?? ''}
            className="w-full border border-surface rounded-sm px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Meta-Beschreibung */}
        <div>
          <label htmlFor="metaDescription" className="block text-sm font-medium text-text/70 mb-1">
            Meta-Beschreibung <span className="text-xs text-text/60">(optional)</span>
          </label>
          <textarea
            id="metaDescription"
            name="metaDescription"
            rows={3}
            defaultValue={article.metaDescription ?? ''}
            className="w-full border border-surface rounded-sm px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="px-4 py-2 bg-gradient-to-br from-primary to-primary-container text-white text-sm font-medium rounded-full hover:opacity-90"
          >
            Speichern
          </button>
          <Link
            href="/admin/articles"
            className="px-4 py-2 border border-surface text-sm text-text/70 rounded-sm hover:bg-surface"
          >
            Abbrechen
          </Link>
        </div>
      </form>
    </div>
  )
}
