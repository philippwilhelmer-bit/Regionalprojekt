import Link from 'next/link'
import { listBezirke } from '@/lib/content/bezirke'
import { createManualArticleForm } from '@/lib/admin/articles-actions'
import { UnsplashPickerNew } from '@/components/admin/UnsplashPickerNew'

export default async function NewArticlePage() {
  const bezirke = await listBezirke()

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/articles" className="text-sm text-ink-muted hover:text-ink">
          &larr; Zurueck
        </Link>
        <h1 className="text-2xl font-bold text-ink font-headline">Neuer Artikel</h1>
      </div>

      <form action={createManualArticleForm} className="bg-surface-elevated rounded-sm p-6 space-y-5">
        {/* Titel */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-ink-muted mb-1">
            Titel <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            className="w-full border border-parchment-dim rounded-sm px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink"
            placeholder="Artikeltitel"
          />
        </div>

        {/* Inhalt */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-ink-muted mb-1">
            Inhalt <span className="text-red-500">*</span>
          </label>
          <textarea
            id="content"
            name="content"
            required
            rows={10}
            className="w-full border border-parchment-dim rounded-sm px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink"
            placeholder="Artikelinhalt…"
          />
        </div>

        {/* Bezirke */}
        <div>
          <fieldset>
            <legend className="block text-sm font-medium text-ink-muted mb-2">Bezirke</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {bezirke.map((bezirk) => (
                <label key={bezirk.id} className="flex items-center gap-2 text-sm text-ink-muted cursor-pointer">
                  <input
                    type="checkbox"
                    name="bezirkIds"
                    value={bezirk.id}
                    className="rounded border-parchment-dim text-ink focus:ring-ink"
                  />
                  {bezirk.name}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        {/* Artikelbild (Unsplash) */}
        <UnsplashPickerNew />

        {/* SEO-Titel */}
        <div>
          <label htmlFor="seoTitle" className="block text-sm font-medium text-ink-muted mb-1">
            SEO-Titel <span className="text-xs text-ink-dim">(optional)</span>
          </label>
          <input
            id="seoTitle"
            name="seoTitle"
            type="text"
            className="w-full border border-parchment-dim rounded-sm px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink"
            placeholder="SEO-optimierter Titel"
          />
        </div>

        {/* Meta-Beschreibung */}
        <div>
          <label htmlFor="metaDescription" className="block text-sm font-medium text-ink-muted mb-1">
            Meta-Beschreibung <span className="text-xs text-ink-dim">(optional)</span>
          </label>
          <textarea
            id="metaDescription"
            name="metaDescription"
            rows={3}
            className="w-full border border-parchment-dim rounded-sm px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink"
            placeholder="Kurze Beschreibung fuer Suchmaschinen…"
          />
        </div>

        {/* Toggles */}
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-ink-muted cursor-pointer">
            <input
              type="checkbox"
              name="isPinned"
              className="rounded border-parchment-dim text-slate focus:ring-ink"
            />
            Angepinnt
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-muted cursor-pointer">
            <input
              type="checkbox"
              name="isFeatured"
              className="rounded border-parchment-dim text-ink focus:ring-ink"
            />
            Hervorgehoben
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="px-4 py-2 bg-gradient-to-br from-ink to-ink-soft text-parchment text-sm font-medium rounded-sm hover:opacity-90"
          >
            Artikel speichern
          </button>
          <Link
            href="/admin/articles"
            className="px-4 py-2 border border-surface text-sm text-ink-muted rounded-sm hover:bg-surface"
          >
            Abbrechen
          </Link>
        </div>
      </form>
    </div>
  )
}
