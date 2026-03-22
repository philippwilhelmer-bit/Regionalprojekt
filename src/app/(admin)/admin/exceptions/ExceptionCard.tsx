import type { Article } from '@prisma/client'
import { approveArticleForm, rejectArticleForm } from '@/lib/admin/exceptions-actions'

const SOURCE_LABELS: Record<string, string> = {
  OTS_AT: 'OTS.at',
  RSS: 'RSS',
  MANUAL: 'Manuell',
}

function formatDate(date: Date | null): string {
  if (!date) return '—'
  return date.toLocaleDateString('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface ExceptionCardProps {
  article: Article
}

export function ExceptionCard({ article }: ExceptionCardProps) {
  const rawPayloadStr = article.rawPayload != null
    ? JSON.stringify(article.rawPayload, null, 2)
    : '(kein Rohdaten vorhanden)'

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {article.title ?? '(Kein Titel)'}
          </h2>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-gray-500">
              Erstellt: {formatDate(article.createdAt)}
            </span>
            <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
              {SOURCE_LABELS[article.source] ?? article.source}
            </span>
          </div>
        </div>
        {/* Approve / Reject */}
        <div className="flex gap-2">
          <form action={approveArticleForm}>
            <input type="hidden" name="id" value={article.id} />
            <button
              type="submit"
              className="px-4 py-1.5 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700"
            >
              Genehmigen
            </button>
          </form>
          <form action={rejectArticleForm}>
            <input type="hidden" name="id" value={article.id} />
            <button
              type="submit"
              className="px-4 py-1.5 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700"
            >
              Ablehnen
            </button>
          </form>
        </div>
      </div>

      {/* Side-by-side content */}
      <div className="grid grid-cols-2 divide-x divide-gray-100">
        {/* Left: rewritten article content */}
        <div className="p-6">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            KI-generierter Artikel
          </h3>
          <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
            {article.content ?? '(Kein Inhalt)'}
          </div>
        </div>

        {/* Right: raw source payload */}
        <div className="p-6 bg-gray-50">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Rohdaten (Quelle)
          </h3>
          <pre className="text-xs text-gray-600 overflow-auto max-h-96 leading-relaxed font-mono whitespace-pre-wrap">
            {rawPayloadStr}
          </pre>
        </div>
      </div>
    </div>
  )
}
