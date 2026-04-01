'use client'

import { useState, useTransition } from 'react'
import { searchUnsplashImages } from '@/lib/admin/unsplash-actions'
import type { UnsplashSearchResult } from '@/lib/admin/unsplash-actions'

export function UnsplashPickerNew() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UnsplashSearchResult[]>([])
  const [selected, setSelected] = useState<UnsplashSearchResult | null>(null)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState('')

  function handleSearch() {
    if (!query.trim()) return
    startTransition(async () => {
      setMessage('')
      try {
        const images = await searchUnsplashImages(query.trim())
        setResults(images)
        if (images.length === 0) setMessage('Keine Ergebnisse gefunden.')
      } catch (err) {
        setMessage(err instanceof Error ? err.message : 'Fehler bei der Suche.')
      }
    })
  }

  function handleSelect(image: UnsplashSearchResult) {
    setSelected(image)
    setResults([])
    setMessage('')
  }

  function handleRemove() {
    setSelected(null)
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-ink-muted">
        Artikelbild <span className="text-xs text-ink-dim">(optional)</span>
      </label>

      {/* Hidden fields for form submission */}
      {selected && (
        <>
          <input type="hidden" name="imageUrl" value={selected.url} />
          <input type="hidden" name="imageCredit" value={selected.credit} />
        </>
      )}

      {/* Selected image preview */}
      {selected && (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selected.thumb}
            alt="Ausgewähltes Bild"
            className="w-full h-40 object-cover rounded border border-surface"
          />
          <p className="text-xs text-ink-dim mt-1">{selected.credit}</p>
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 px-2 py-1 bg-red-600 text-white text-xs rounded-sm hover:bg-red-700"
          >
            Entfernen
          </button>
        </div>
      )}

      {/* Search bar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
          placeholder="Bildersuche (z.B. Steiermark, Verkehr)..."
          className="flex-1 border border-parchment-dim rounded-sm px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={isPending || !query.trim()}
          className="px-4 py-2 bg-gradient-to-br from-ink to-ink-soft text-parchment text-sm font-medium rounded-sm hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? '...' : 'Suchen'}
        </button>
      </div>

      {message && <p className="text-sm text-ink-dim">{message}</p>}

      {/* Results grid */}
      {results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {results.map((image) => (
            <button
              key={image.id}
              type="button"
              onClick={() => handleSelect(image)}
              disabled={isPending}
              className="group relative overflow-hidden rounded border border-surface hover:border-ink transition-colors disabled:opacity-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.thumb}
                alt={image.description ?? 'Unsplash Foto'}
                className="w-full h-24 object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Auswählen
                </span>
              </div>
              <p className="text-[10px] text-ink-dim px-1 py-0.5 truncate">{image.credit}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
