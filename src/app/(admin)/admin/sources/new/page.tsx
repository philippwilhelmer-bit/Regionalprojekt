import Link from 'next/link'
import { createSourceForm } from '@/lib/admin/sources-actions'

export default function NewSourcePage() {
  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/sources" className="text-sm text-gray-700 hover:text-gray-700">
          &larr; Zurueck
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Neue Quelle</h1>
      </div>

      <form action={createSourceForm} className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
        {/* URL */}
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
            URL <span className="text-red-500">*</span>
          </label>
          <input
            id="url"
            name="url"
            type="text"
            required
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://..."
          />
        </div>

        {/* Typ */}
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
            Typ <span className="text-red-500">*</span>
          </label>
          <select
            id="type"
            name="type"
            required
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="OTS_AT">OTS.at</option>
            <option value="RSS">RSS</option>
          </select>
        </div>

        {/* Poll-Intervall */}
        <div>
          <label htmlFor="pollIntervalMinutes" className="block text-sm font-medium text-gray-700 mb-1">
            Poll-Intervall in Minuten
          </label>
          <input
            id="pollIntervalMinutes"
            name="pollIntervalMinutes"
            type="number"
            min={1}
            defaultValue={60}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
          >
            Quelle speichern
          </button>
          <Link
            href="/admin/sources"
            className="px-4 py-2 border border-gray-300 text-sm text-gray-700 rounded hover:bg-gray-50"
          >
            Abbrechen
          </Link>
        </div>
      </form>
    </div>
  )
}
