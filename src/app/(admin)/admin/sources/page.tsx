import Link from 'next/link'
import { listSourcesAdmin } from '@/lib/admin/sources-actions'
import { SourceCard } from './SourceCard'

export default async function SourcesPage() {
  const sources = await listSourcesAdmin()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quellen</h1>
        <Link
          href="/admin/sources/new"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
        >
          Neue Quelle hinzufuegen
        </Link>
      </div>

      {sources.length === 0 ? (
        <div className="text-center py-16 text-gray-700">
          <p className="text-lg">Keine Quellen konfiguriert.</p>
          <p className="text-sm mt-2">
            <Link href="/admin/sources/new" className="text-blue-600 hover:underline">
              Erste Quelle hinzufuegen
            </Link>
          </p>
        </div>
      ) : (
        <div>
          {sources.map((source) => (
            <SourceCard key={source.id} source={source} />
          ))}
        </div>
      )}
    </div>
  )
}
