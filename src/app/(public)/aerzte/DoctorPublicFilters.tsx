'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { Bezirk } from '@prisma/client'

type ActiveFilters = {
  bezirk?: string
  kategorie?: string
  fachrichtung?: string
}

type Props = {
  bezirke: Bezirk[]
  active: ActiveFilters
}

const KATEGORIEN: Array<{ id: string; label: string }> = [
  { id: 'ALLGEMEINMEDIZIN', label: 'Allgemeinmedizin' },
  { id: 'FACHARZT', label: 'Facharzt' },
  { id: 'ZAHNARZT', label: 'Zahnarzt' },
]

/**
 * Client-side filter chip bar for the public Ärzte list.
 *
 * Drives the list by mutating the URL query params (`bezirk`,
 * `kategorie`, `fachrichtung`). The server reads them on the next
 * navigation, the page.tsx is `force-dynamic`. Kategorie chips emit
 * lowercase strings; the server uppercases them for the Prisma enum.
 *
 * localStorage `bezirk_selection` auto-prefill is deferred to a
 * polish task — query params are the source of truth for now.
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

  const hasActive = Boolean(active.bezirk || active.kategorie || active.fachrichtung)

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

      {/* Kategorie chips */}
      <div className="flex flex-wrap gap-dir-xs">
        {KATEGORIEN.map((k) => {
          const isActive = (active.kategorie ?? '').toUpperCase() === k.id
          return (
            <button
              key={k.id}
              type="button"
              onClick={() =>
                setParam(
                  'kategorie',
                  isActive ? undefined : k.id.toLowerCase(),
                )
              }
              className={
                isActive
                  ? 'bg-dir-primary-container text-dir-on-primary-container rounded-dir-full px-dir-md py-dir-xs text-sm'
                  : 'bg-dir-surface-container-high text-dir-on-surface rounded-dir-full px-dir-md py-dir-xs text-sm hover:bg-dir-surface-container-highest transition-colors'
              }
            >
              {k.label}
            </button>
          )
        })}
      </div>

      {/* Fachrichtung free-text */}
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
