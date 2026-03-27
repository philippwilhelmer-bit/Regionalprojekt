'use client'

import { useState, useTransition } from 'react'
import {
  searchUnsplashImages,
  suggestKeywords,
  saveArticleImage,
  removeArticleImage,
} from '@/lib/admin/unsplash-actions'
import type { UnsplashSearchResult } from '@/lib/admin/unsplash-actions'

interface UnsplashPickerProps {
  articleId: number
  headline: string
  currentImageUrl: string | null
  currentImageCredit: string | null
}

export function UnsplashPicker({
  articleId,
  headline,
  currentImageUrl,
  currentImageCredit,
}: UnsplashPickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UnsplashSearchResult[]>([])
  const [savedUrl, setSavedUrl] = useState(currentImageUrl)
  const [savedCredit, setSavedCredit] = useState(currentImageCredit)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState('')

  function handleSuggest() {
    startTransition(async () => {
      const keywords = await suggestKeywords(headline)
      setQuery(keywords.join(' '))
    })
  }

  function handleSearch() {
    if (!query.trim()) return
    startTransition(async () => {
      setMessage('')
      try {
        const images = await searchUnsplashImages(query.trim())
        setResults(images)
        if (images.length === 0) {
          setMessage('Keine Ergebnisse gefunden.')
        }
      } catch (err) {
        setMessage(err instanceof Error ? err.message : 'Fehler bei der Suche.')
      }
    })
  }

  function handleSelect(image: UnsplashSearchResult) {
    startTransition(async () => {
      await saveArticleImage(articleId, image.url, image.credit)
      setSavedUrl(image.url)
      setSavedCredit(image.credit)
      setResults([])
      setMessage('Bild gespeichert.')
    })
  }

  function handleRemove() {
    startTransition(async () => {
      await removeArticleImage(articleId)
      setSavedUrl(null)
      setSavedCredit(null)
      setMessage('Bild entfernt.')
    })
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Artikelbild
      </label>

      {/* Current image preview */}
      {savedUrl && (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={savedUrl}
            alt="Artikelbild"
            className="w-full h-40 object-cover rounded border border-gray-200"
          />
          {savedCredit && (
            <p className="text-xs text-gray-400 mt-1">{savedCredit}</p>
          )}
          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            className="absolute top-2 right-2 px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
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
          placeholder="Suchbegriff eingeben..."
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={handleSuggest}
          disabled={isPending}
          className="px-3 py-2 border border-gray-300 text-sm text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50"
          title="Keywords aus Titel generieren"
        >
          Auto
        </button>
        <button
          type="button"
          onClick={handleSearch}
          disabled={isPending || !query.trim()}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? '...' : 'Suchen'}
        </button>
      </div>

      {/* Status message */}
      {message && (
        <p className="text-sm text-gray-500">{message}</p>
      )}

      {/* Results grid */}
      {results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {results.map((image) => (
            <button
              key={image.id}
              type="button"
              onClick={() => handleSelect(image)}
              disabled={isPending}
              className="group relative overflow-hidden rounded border border-gray-200 hover:border-blue-500 transition-colors disabled:opacity-50"
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
              <p className="text-[10px] text-gray-400 px-1 py-0.5 truncate">
                {image.credit}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
