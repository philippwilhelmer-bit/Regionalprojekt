import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { listBezirke } from '@/lib/content/bezirke'
import { updateArticle } from '@/lib/admin/articles-actions'
import { UnsplashPicker } from '@/components/admin/UnsplashPicker'
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

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/articles" className="text-sm text-gray-700 hover:text-gray-900">
          &larr; Zurueck
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Artikel bearbeiten</h1>
      </div>

      <form action={updateArticleForm} className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
        <input type="hidden" name="_id" value={article.id} />

        {/* Titel */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Titel <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            defaultValue={article.title ?? ''}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Inhalt */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
            Inhalt <span className="text-red-500">*</span>
          </label>
          <textarea
            id="content"
            name="content"
            required
            rows={12}
            defaultValue={article.content ?? ''}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Bezirke */}
        <div>
          <fieldset>
            <legend className="block text-sm font-medium text-gray-700 mb-2">Bezirke</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {bezirke.map((bezirk) => (
                <label key={bezirk.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    name="bezirkIds"
                    value={bezirk.id}
                    defaultChecked={assignedBezirkIds.has(bezirk.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
          <label htmlFor="seoTitle" className="block text-sm font-medium text-gray-700 mb-1">
            SEO-Titel <span className="text-xs text-gray-600">(optional)</span>
          </label>
          <input
            id="seoTitle"
            name="seoTitle"
            type="text"
            defaultValue={article.seoTitle ?? ''}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Meta-Beschreibung */}
        <div>
          <label htmlFor="metaDescription" className="block text-sm font-medium text-gray-700 mb-1">
            Meta-Beschreibung <span className="text-xs text-gray-600">(optional)</span>
          </label>
          <textarea
            id="metaDescription"
            name="metaDescription"
            rows={3}
            defaultValue={article.metaDescription ?? ''}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
          >
            Speichern
          </button>
          <Link
            href="/admin/articles"
            className="px-4 py-2 border border-gray-300 text-sm text-gray-700 rounded hover:bg-gray-50"
          >
            Abbrechen
          </Link>
        </div>
      </form>
    </div>
  )
}
