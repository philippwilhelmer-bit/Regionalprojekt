'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

const SOURCES = [
  { value: '', label: 'Alle Quellen' },
  { value: 'OTS_AT', label: 'OTS.at' },
  { value: 'RSS', label: 'RSS' },
  { value: 'MANUAL', label: 'Manuell' },
]

const STATUSES = [
  { value: '', label: 'Alle Status' },
  { value: 'FETCHED', label: 'Fetched' },
  { value: 'REVIEW', label: 'Review' },
  { value: 'PUBLISHED', label: 'Publiziert' },
  { value: 'REJECTED', label: 'Abgelehnt' },
  { value: 'FAILED', label: 'Fehlgeschlagen' },
]

interface Bezirk {
  id: number
  name: string
}

interface ArticleFiltersProps {
  bezirke: Bezirk[]
}

export function ArticleFilters({ bezirke }: ArticleFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      // Reset to page 1 on filter change
      params.delete('page')
      router.push(`/admin/articles?${params.toString()}`)
    },
    [router, searchParams]
  )

  const resetFilters = () => {
    router.push('/admin/articles')
  }

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Bezirk</label>
        <select
          value={searchParams.get('bezirkId') ?? ''}
          onChange={(e) => updateParam('bezirkId', e.target.value)}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Alle Bezirke</option>
          {bezirke.map((b) => (
            <option key={b.id} value={String(b.id)}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Quelle</label>
        <select
          value={searchParams.get('source') ?? ''}
          onChange={(e) => updateParam('source', e.target.value)}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {SOURCES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
        <select
          value={searchParams.get('status') ?? ''}
          onChange={(e) => updateParam('status', e.target.value)}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Von</label>
        <input
          type="date"
          value={searchParams.get('from') ?? ''}
          onChange={(e) => updateParam('from', e.target.value)}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Bis</label>
        <input
          type="date"
          value={searchParams.get('to') ?? ''}
          onChange={(e) => updateParam('to', e.target.value)}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        onClick={resetFilters}
        className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
      >
        Filter zuruecksetzen
      </button>
    </div>
  )
}
