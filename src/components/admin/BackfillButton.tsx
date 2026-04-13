'use client'

import { useState, useTransition } from 'react'
import { backfillMapImages } from '@/lib/admin/map-actions'
import type { BackfillResult } from '@/lib/admin/map-actions'

export function BackfillButton() {
  const [result, setResult] = useState<BackfillResult | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleBackfill() {
    startTransition(async () => {
      const r = await backfillMapImages()
      setResult(r)
    })
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleBackfill}
        disabled={isPending}
        className="px-4 py-2 border border-surface text-sm text-ink-muted rounded-sm hover:bg-surface disabled:opacity-50"
      >
        {isPending ? 'Karten werden generiert...' : 'Karten-Backfill starten'}
      </button>
      {result && (
        <p className="text-sm text-ink-dim mt-2">
          {result.succeeded} generiert, {result.skipped} kein Ort, {result.failed} Fehler (von {result.processed} Artikeln)
        </p>
      )}
    </div>
  )
}
