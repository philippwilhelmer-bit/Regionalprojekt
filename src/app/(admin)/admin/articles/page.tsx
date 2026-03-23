import Link from 'next/link'
import { Suspense } from 'react'
import type { ArticleSource, ArticleStatus } from '@prisma/client'
import { listArticlesAdmin } from '@/lib/admin/articles-actions'
import { listBezirke } from '@/lib/content/bezirke'
import { ArticleFilters } from './ArticleFilters'
import { ArticleRow } from './ArticleRow'

const PAGE_SIZE = 50

interface SearchParams {
  bezirkId?: string
  source?: string
  status?: string
  from?: string
  to?: string
  page?: string
}

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const offset = (page - 1) * PAGE_SIZE

  const bezirkId = params.bezirkId ? Number(params.bezirkId) : undefined
  const sourceType = params.source as ArticleSource | undefined
  const status = params.status as ArticleStatus | undefined
  const fromDate = params.from ? new Date(params.from) : undefined
  const toDate = params.to ? new Date(params.to + 'T23:59:59') : undefined

  const [articles, bezirke] = await Promise.all([
    listArticlesAdmin({
      bezirkId,
      sourceType,
      status,
      fromDate,
      toDate,
      limit: PAGE_SIZE,
      offset,
    }),
    listBezirke(),
  ])

  const prevPage = page > 1 ? page - 1 : null
  const nextPage = articles.length === PAGE_SIZE ? page + 1 : null

  function buildPageUrl(p: number) {
    const qs = new URLSearchParams()
    if (params.bezirkId) qs.set('bezirkId', params.bezirkId)
    if (params.source) qs.set('source', params.source)
    if (params.status) qs.set('status', params.status)
    if (params.from) qs.set('from', params.from)
    if (params.to) qs.set('to', params.to)
    qs.set('page', String(p))
    return `/admin/articles?${qs.toString()}`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Artikel</h1>
        <Link
          href="/admin/articles/new"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
        >
          Neuer Artikel
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <Suspense fallback={<div className="text-sm text-gray-600">Lade Filter…</div>}>
          <ArticleFilters bezirke={bezirke} />
        </Suspense>
      </div>

      {articles.length === 0 ? (
        <p className="text-center text-gray-700 py-12">Keine Artikel gefunden.</p>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide">Titel</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide">Quelle</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide">Datum</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide">Bezirke</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => (
                  <ArticleRow key={article.id} article={article} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4 text-sm text-gray-700">
            <span>Seite {page}</span>
            <div className="flex gap-2">
              {prevPage && (
                <Link
                  href={buildPageUrl(prevPage)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-gray-900 hover:bg-gray-50"
                >
                  Zurueck
                </Link>
              )}
              {nextPage && (
                <Link
                  href={buildPageUrl(nextPage)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-gray-900 hover:bg-gray-50"
                >
                  Weiter
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
