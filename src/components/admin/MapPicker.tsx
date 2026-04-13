'use client'

import { useState, useTransition } from 'react'
import { generateMapForArticle } from '@/lib/admin/map-actions'
import { removeArticleImage } from '@/lib/admin/unsplash-actions'

interface MapPickerProps {
  articleId: number
  currentImageUrl: string | null
  currentImageCredit: string | null
}

export function MapPicker({
  articleId,
  currentImageUrl,
  currentImageCredit,
}: MapPickerProps) {
  const isMapImage = currentImageCredit === '© basemap.at'
  const [savedUrl, setSavedUrl] = useState<string | null>(isMapImage ? currentImageUrl : null)
  const [savedCredit, setSavedCredit] = useState<string | null>(isMapImage ? currentImageCredit : null)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState('')

  function handleGenerate() {
    startTransition(async () => {
      setMessage('Karte wird generiert...')
      const result = await generateMapForArticle(articleId)
      if ('error' in result) {
        setMessage(result.error)
      } else {
        setSavedUrl(result.url)
        setSavedCredit(result.credit)
        setMessage('Karte gespeichert.')
      }
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
      {savedUrl && (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={savedUrl}
            alt="Kartenbild"
            className="w-full h-40 object-cover rounded border border-surface"
          />
          {savedCredit && (
            <p className="text-xs text-ink-dim mt-1">{savedCredit}</p>
          )}
          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            className="absolute top-2 right-2 px-2 py-1 bg-red-600 text-white text-xs rounded-sm hover:bg-red-700 disabled:opacity-50"
          >
            Entfernen
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={handleGenerate}
        disabled={isPending}
        className="px-4 py-2 bg-gradient-to-br from-ink to-ink-soft text-parchment text-sm font-medium rounded-sm hover:opacity-90 disabled:opacity-50"
      >
        {savedUrl ? 'Karte neu generieren' : 'Karte generieren'}
      </button>

      {message && (
        <p className="text-sm text-ink-dim">{message}</p>
      )}
    </div>
  )
}
