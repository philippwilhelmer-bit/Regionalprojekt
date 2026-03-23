'use client'

import Link from 'next/link'
import { togglePinForm, toggleFeatureForm, softDeleteForm } from '@/lib/admin/articles-actions'
import type { ArticleWithBezirke } from '@/lib/content/articles'

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: 'bg-green-100 text-green-800',
  REVIEW: 'bg-yellow-100 text-yellow-800',
  FETCHED: 'bg-blue-100 text-blue-800',
  REJECTED: 'bg-red-100 text-red-800',
  FAILED: 'bg-gray-100 text-gray-800',
}

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
  })
}

interface ArticleRowProps {
  article: ArticleWithBezirke
}

export function ArticleRow({ article }: ArticleRowProps) {
  const statusColor = STATUS_COLORS[article.status] ?? 'bg-gray-100 text-gray-800'
  const title = article.title
    ? article.title.length > 80
      ? article.title.slice(0, 80) + '…'
      : article.title
    : '(Kein Titel)'

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-4 py-3 text-sm text-gray-900 max-w-xs">
        <Link
          href={`/admin/articles/${article.id}/edit`}
          className="hover:underline text-blue-700"
        >
          {title}
        </Link>
      </td>
      <td className="px-4 py-3 text-sm">
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColor}`}>
          {article.status}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-700">
        {SOURCE_LABELS[article.source] ?? article.source}
      </td>
      <td className="px-4 py-3 text-sm text-gray-700">
        {formatDate(article.publishedAt)}
      </td>
      <td className="px-4 py-3 text-sm text-gray-700">
        {article.bezirke.map((ab) => ab.bezirk.name).join(', ') || '—'}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <form action={togglePinForm}>
            <input type="hidden" name="id" value={article.id} />
            <button
              type="submit"
              className={`text-xs px-2 py-1 rounded border ${
                article.isPinned
                  ? 'bg-orange-100 border-orange-300 text-orange-700 hover:bg-orange-200'
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {article.isPinned ? 'Entpinnen' : 'Pinnen'}
            </button>
          </form>

          <form action={toggleFeatureForm}>
            <input type="hidden" name="id" value={article.id} />
            <button
              type="submit"
              className={`text-xs px-2 py-1 rounded border ${
                article.isFeatured
                  ? 'bg-purple-100 border-purple-300 text-purple-700 hover:bg-purple-200'
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {article.isFeatured ? 'Entfeaturen' : 'Featuren'}
            </button>
          </form>

          <form
            action={softDeleteForm}
            onSubmit={(e) => {
              if (!window.confirm('Artikel loeschen?')) e.preventDefault()
            }}
          >
            <input type="hidden" name="id" value={article.id} />
            <button
              type="submit"
              className="text-xs px-2 py-1 rounded border bg-white border-red-300 text-red-600 hover:bg-red-50"
            >
              Loeschen
            </button>
          </form>
        </div>
      </td>
    </tr>
  )
}
