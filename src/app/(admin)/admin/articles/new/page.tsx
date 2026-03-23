import Link from 'next/link'
import { listBezirke } from '@/lib/content/bezirke'
import { createManualArticleForm } from '@/lib/admin/articles-actions'

export default async function NewArticlePage() {
  const bezirke = await listBezirke()

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/articles" className="text-sm text-gray-700 hover:text-gray-700">
          &larr; Zurueck
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Neuer Artikel</h1>
      </div>

      <form action={createManualArticleForm} className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
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
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Artikeltitel"
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
            rows={10}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Artikelinhalt…"
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
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  {bezirk.name}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        {/* SEO-Titel */}
        <div>
          <label htmlFor="seoTitle" className="block text-sm font-medium text-gray-700 mb-1">
            SEO-Titel <span className="text-xs text-gray-600">(optional)</span>
          </label>
          <input
            id="seoTitle"
            name="seoTitle"
            type="text"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="SEO-optimierter Titel"
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
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Kurze Beschreibung fuer Suchmaschinen…"
          />
        </div>

        {/* Toggles */}
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              name="isPinned"
              className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
            />
            Angepinnt
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              name="isFeatured"
              className="rounded border-gray-300 text-purple-500 focus:ring-purple-500"
            />
            Hervorgehoben
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
          >
            Artikel speichern
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
