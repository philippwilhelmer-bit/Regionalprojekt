import Link from 'next/link'

interface PagerProps {
  page: number
  totalPages: number
  totalCount: number
  pageSize: number
  params: { bezirk?: string; fachrichtung?: string }
}

function buildHref(page: number, params: PagerProps['params']) {
  const sp = new URLSearchParams()
  if (params.bezirk) sp.set('bezirk', params.bezirk)
  if (params.fachrichtung) sp.set('fachrichtung', params.fachrichtung)
  if (page > 1) sp.set('page', String(page))
  const qs = sp.toString()
  return qs ? `/aerzte?${qs}` : '/aerzte'
}

export default function Pager({ page, totalPages, totalCount, pageSize, params }: PagerProps) {
  if (totalPages <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalCount)
  const hasPrev = page > 1
  const hasNext = page < totalPages

  const linkClass =
    'px-dir-md py-dir-xs rounded-dir-md border border-dir-outline-variant text-dir-on-surface bg-dir-surface-container-lowest hover:bg-dir-surface-container-low text-sm transition-colors'
  const disabledClass =
    'px-dir-md py-dir-xs rounded-dir-md border border-dir-outline-variant text-dir-on-surface-variant opacity-50 text-sm cursor-not-allowed'

  return (
    <nav
      aria-label="Seitennavigation"
      className="mt-dir-lg flex flex-wrap items-center justify-between gap-dir-md"
    >
      <p className="text-dir-on-surface-variant text-sm">
        Zeige {from}–{to} von {totalCount} Ärzten
      </p>
      <div className="flex items-center gap-dir-sm">
        {hasPrev ? (
          <Link href={buildHref(page - 1, params)} rel="prev" className={linkClass}>
            ← Zurück
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled="true">
            ← Zurück
          </span>
        )}
        <span className="text-dir-on-surface-variant text-sm">
          Seite {page} von {totalPages}
        </span>
        {hasNext ? (
          <Link href={buildHref(page + 1, params)} rel="next" className={linkClass}>
            Weiter →
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled="true">
            Weiter →
          </span>
        )}
      </div>
    </nav>
  )
}
