import Link from 'next/link'
import { createSourceForm } from '@/lib/admin/sources-actions'
import { SourceFormFields } from '../SourceFormFields'

export default function NewSourcePage() {
  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/sources" className="text-sm text-text/70 hover:text-text">
          &larr; Zurueck
        </Link>
        <h1 className="text-2xl font-bold text-text font-headline">Neue Quelle</h1>
      </div>

      <form action={createSourceForm} className="bg-surface-elevated rounded-sm p-6 space-y-5">
        {/* URL */}
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-text/70 mb-1">
            URL <span className="text-red-500">*</span>
          </label>
          <input
            id="url"
            name="url"
            type="text"
            required
            className="w-full border border-surface rounded-sm px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="https://..."
          />
          <p className="text-xs text-text/50 mt-1">
            OTS-Kategorien: https://www.ots.at/rss/wirtschaft, /politik, /kultur, /medien, /chronik, /sport
          </p>
        </div>

        {/* Typ */}
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-text/70 mb-1">
            Typ <span className="text-red-500">*</span>
          </label>
          <select
            id="type"
            name="type"
            required
            className="w-full border border-surface rounded-sm px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="OTS_AT">OTS.at</option>
            <option value="RSS">RSS</option>
          </select>
        </div>

        {/* Poll-Intervall */}
        <div>
          <label htmlFor="pollIntervalMinutes" className="block text-sm font-medium text-text/70 mb-1">
            Poll-Intervall in Minuten
          </label>
          <input
            id="pollIntervalMinutes"
            name="pollIntervalMinutes"
            type="number"
            min={1}
            defaultValue={60}
            className="w-full border border-surface rounded-sm px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <SourceFormFields />

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="px-4 py-2 bg-gradient-to-br from-primary to-primary-container text-white text-sm font-medium rounded-full hover:opacity-90"
          >
            Quelle speichern
          </button>
          <Link
            href="/admin/sources"
            className="px-4 py-2 border border-surface text-sm text-text/70 rounded-sm hover:bg-surface"
          >
            Abbrechen
          </Link>
        </div>
      </form>
    </div>
  )
}
