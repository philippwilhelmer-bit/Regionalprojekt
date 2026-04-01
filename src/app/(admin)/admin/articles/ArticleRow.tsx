'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { togglePinAction, toggleFeatureAction, softDeleteAction } from '@/lib/admin/article-form-actions'
import type { ArticleWithBezirke } from '@/lib/content/articles'

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: 'bg-green-100 text-green-800',
  REVIEW: 'bg-yellow-100 text-yellow-800',
  FETCHED: 'bg-surface text-ink-muted',
  REJECTED: 'bg-red-100 text-red-800',
  FAILED: 'bg-surface text-ink-muted',
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
  const statusColor = STATUS_COLORS[article.status] ?? 'bg-surface text-ink-muted'
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
    <tr className={`border-b border-surface hover:bg-surface ${isPending ? 'opacity-50' : ''}`}>
      <td className="px-4 py-3 text-sm text-ink max-w-xs">
        <div className="flex items-center gap-2">
          {article.imageUrl && (
            <svg className="w-3.5 h-3.5 text-green-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-label="Hat Bild">
              <path d="M12 15.2a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4z" />
              <path fillRule="evenodd" d="M9.778 4l-1.5 2H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-4.278l-1.5-2H9.778zM12 16a4 4 0 100-8 4 4 0 000 8z" clipRule="evenodd" />
            </svg>
          )}
          <Link
            href={`/admin/articles/${article.id}/edit`}
            className="hover:underline text-slate"
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
      <td className="px-4 py-3 text-sm text-ink-muted">
        {SOURCE_LABELS[article.source] ?? article.source}
      </td>
      <td className="px-4 py-3 text-sm text-ink-muted">
        {formatDate(article.publishedAt)}
      </td>
      <td className="px-4 py-3 text-sm text-ink-muted">
        {article.bezirke.map((ab) => ab.bezirk.name).join(', ') || '—'}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleAction(togglePinAction, article.id)}
            className={`text-xs px-2 py-1 rounded-sm border ${
              article.isPinned
                ? 'bg-surface border-parchment-dim text-slate hover:bg-parchment-dim'
                : 'bg-surface-elevated border-surface text-ink-dim hover:bg-surface'
            } disabled:opacity-50`}
          >
            {article.isPinned ? 'Entpinnen' : 'Pinnen'}
          </button>

          <button
            type="button"
            disabled={isPending}
            onClick={() => handleAction(toggleFeatureAction, article.id)}
            className={`text-xs px-2 py-1 rounded-sm border ${
              article.isFeatured
                ? 'bg-ink/10 border-ink/20 text-ink hover:bg-ink/20'
                : 'bg-surface-elevated border-surface text-ink-dim hover:bg-surface'
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
            className="text-xs px-2 py-1 rounded-sm border bg-surface-elevated border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Loeschen
          </button>
        </div>
      </td>
    </tr>
  )
}
