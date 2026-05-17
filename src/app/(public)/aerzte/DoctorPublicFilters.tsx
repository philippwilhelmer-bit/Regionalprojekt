'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { Bezirk, Fachrichtung } from '@prisma/client'
import { FACHRICHTUNG_OPTIONS } from '@/lib/admin/import/fachrichtung-mapping'

type ActiveFilters = {
  bezirk?: string
  fachrichtung?: Fachrichtung
}

type Props = {
  bezirke: Bezirk[]
  active: ActiveFilters
}

/**
 * Client-side filter bar for the public Ärzte list (Phase 47 / D-25).
 *
 * Bezirk chips unchanged from Phase 46. Fachrichtung uses a native <select>
 * dropdown over 51 options. URL contract: ?fachrichtung=ENUM_ID (enum
 * identifier emitted directly as the option value — no label round-trip).
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

      {/* Fachrichtung dropdown */}
      <div className="flex flex-wrap items-center gap-dir-sm">
        <select
          value={active.fachrichtung ?? ''}
          onChange={(e) => setParam('fachrichtung', e.target.value || undefined)}
          className="bg-dir-surface-container-lowest text-dir-on-surface rounded-dir-md px-dir-md py-dir-xs text-sm border border-dir-outline-variant focus:outline-none focus:ring-2 focus:ring-dir-primary"
        >
          <option value="">Alle Fachrichtungen</option>
          {FACHRICHTUNG_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
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
