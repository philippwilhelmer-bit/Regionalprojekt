import Link from 'next/link'
import { listSourcesAdmin } from '@/lib/admin/sources-actions'
import { SourceCard } from './SourceCard'

export default async function SourcesPage() {
  const sources = await listSourcesAdmin()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text font-headline">Quellen</h1>
        <Link
          href="/admin/sources/new"
          className="px-4 py-2 bg-gradient-to-br from-primary to-primary-container text-white text-sm font-medium rounded-full hover:opacity-90"
        >
          Neue Quelle hinzufuegen
        </Link>
      </div>

      {sources.length === 0 ? (
        <div className="text-center py-16 text-text/70">
          <p className="text-lg">Keine Quellen konfiguriert.</p>
          <p className="text-sm mt-2">
            <Link href="/admin/sources/new" className="text-secondary hover:underline">
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
