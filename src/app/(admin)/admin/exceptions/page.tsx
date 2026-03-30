import { listExceptionQueue } from '@/lib/admin/exceptions-actions'
import { ExceptionCard } from './ExceptionCard'

export default async function ExceptionsPage() {
  const articles = await listExceptionQueue()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text font-headline">Ausnahme-Queue</h1>
        <span className="text-sm text-text/70">
          {articles.length} Artikel zur Ueberpruefung
        </span>
      </div>

      {articles.length === 0 ? (
        <div className="text-center py-16 text-text/70">
          <p className="text-lg">Keine Artikel in der Ausnahme-Queue.</p>
        </div>
      ) : (
        <div>
          {articles.map((article) => (
            <ExceptionCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  )
}
