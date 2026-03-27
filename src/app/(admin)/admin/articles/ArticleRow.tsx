'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { togglePinAction, toggleFeatureAction, softDeleteAction } from '@/lib/admin/article-form-actions'
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
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const statusColor = STATUS_COLORS[article.status] ?? 'bg-gray-100 text-gray-800'
  const title = article.title
    ? article.title.length > 80
      ? article.title.slice(0, 80) + '…'
      : article.title
    : '(Kein Titel)'

  function handleAction(action: (formData: FormData) => Promise<void>, id: number) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('id', String(id))
      await action(fd)
      router.refresh()
    })
  }

  return (
    <tr className={`border-b border-gray-100 hover:bg-gray-50 ${isPending ? 'opacity-50' : ''}`}>
      <td className="px-4 py-3 text-sm text-gray-900 max-w-xs">
        <div className="flex items-center gap-2">
          {article.imageUrl && (
            <svg className="w-3.5 h-3.5 text-green-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-label="Hat Bild">
              <path d="M12 15.2a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4z" />
              <path fillRule="evenodd" d="M9.778 4l-1.5 2H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-4.278l-1.5-2H9.778zM12 16a4 4 0 100-8 4 4 0 000 8z" clipRule="evenodd" />
            </svg>
          )}
          <Link
            href={`/admin/articles/${article.id}/edit`}
            className="hover:underline text-blue-700"
          >
            {title}
          </Link>
        </div>
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
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleAction(togglePinAction, article.id)}
            className={`text-xs px-2 py-1 rounded border ${
              article.isPinned
                ? 'bg-orange-100 border-orange-300 text-orange-700 hover:bg-orange-200'
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
            } disabled:opacity-50`}
          >
            {article.isPinned ? 'Entpinnen' : 'Pinnen'}
          </button>

          <button
            type="button"
            disabled={isPending}
            onClick={() => handleAction(toggleFeatureAction, article.id)}
            className={`text-xs px-2 py-1 rounded border ${
              article.isFeatured
                ? 'bg-purple-100 border-purple-300 text-purple-700 hover:bg-purple-200'
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
            } disabled:opacity-50`}
          >
            {article.isFeatured ? 'Entfeaturen' : 'Featuren'}
          </button>

          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (window.confirm('Artikel loeschen?')) {
                handleAction(softDeleteAction, article.id)
              }
            }}
            className="text-xs px-2 py-1 rounded border bg-white border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Loeschen
          </button>
        </div>
      </td>
    </tr>
  )
}
