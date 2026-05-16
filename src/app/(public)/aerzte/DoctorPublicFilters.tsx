'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { Bezirk, Fachrichtung } from '@prisma/client'

type ActiveFilters = {
  bezirk?: string
  fachrichtung?: Fachrichtung
}

type Props = {
  bezirke: Bezirk[]
  active: ActiveFilters
}

/**
 * Client-side filter bar for the public Ärzte list (Phase 47 / updated from Phase 46).
 *
 * Updated from Phase 46: kategorie chips removed (D-03). Fachrichtung free-text input
 * retained for now — full searchable datalist rewrite deferred to Plan 47-04.
 * URL contract: ?fachrichtung=ENUM_ID (enum identifier, not display label).
 *
 * Drives the list by mutating the URL query params (`bezirk`, `fachrichtung`).
 * The server reads them on the next navigation; page.tsx is `force-dynamic`.
 */
export default function DoctorPublicFilters({ bezirke, active }: Props) {
  const router = useRouter()
  const sp = useSearchParams()

  function setParam(key: string, value: string | undefined) {
    const next = new URLSearchParams(sp?.toString() ?? '')
    if (value === undefined || value === '') next.delete(key)
    else next.set(key, value)
    const qs = next.toString()
    router.push(qs ? `/aerzte?${qs}` : '/aerzte')
  }

  const hasActive = Boolean(active.bezirk || active.fachrichtung)

  return (
    <div className="flex flex-col gap-dir-md p-dir-md bg-dir-surface-container rounded-dir-md">
      {/* Bezirk chips */}
      <div className="flex flex-wrap gap-dir-xs">
        {bezirke.map((b) => {
          const isActive = active.bezirk === b.slug
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => setParam('bezirk', isActive ? undefined : b.slug)}
              className={
                isActive
                  ? 'bg-dir-secondary-container text-dir-on-secondary-container rounded-dir-full px-dir-md py-dir-xs text-sm'
                  : 'bg-dir-surface-container-high text-dir-on-surface rounded-dir-full px-dir-md py-dir-xs text-sm hover:bg-dir-surface-container-highest transition-colors'
              }
            >
              {b.name}
            </button>
          )
        })}
      </div>

      {/* Fachrichtung free-text (enum identifier — Plan 47-04 will add datalist UI) */}
      <div className="flex flex-wrap items-center gap-dir-sm">
        <input
          type="text"
          placeholder="Fachrichtung…"
          defaultValue={active.fachrichtung ?? ''}
          onBlur={(e) => setParam('fachrichtung', e.target.value || undefined)}
          className="bg-dir-surface-container-lowest text-dir-on-surface rounded-dir-md px-dir-md py-dir-xs text-sm border border-dir-outline-variant focus:outline-none focus:ring-2 focus:ring-dir-primary"
        />
        {hasActive && (
          <button
            type="button"
            onClick={() => router.push('/aerzte')}
            className="text-dir-on-surface-variant underline text-sm"
          >
            Zurücksetzen
          </button>
        )}
      </div>
    </div>
  )
}
