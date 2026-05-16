'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import type { Bezirk } from '@prisma/client'
import type { Fachrichtung } from '@prisma/client'
import { FACHRICHTUNG_OPTIONS } from '@/lib/admin/import/fachrichtung-mapping'

/**
 * Admin filter controls for the doctor list (Phase 47 / DIR-06).
 *
 * Updated from Phase 46: the Kategorie chip row is removed (D-03, DoctorKategorie dropped).
 * Phase 47 (47-04): Fachrichtung <select> filter added. Bezirk chips + Verified chips remain.
 *
 * 'use client' — router/searchParams hooks require client context.
 * Each change rewrites the search params and pushes via the router.
 */

const VERIFIED_OPTIONS: Array<{ value: 'true' | 'false'; label: string }> = [
  { value: 'true', label: 'Nur verifizierte' },
  { value: 'false', label: 'Nur unverifizierte' },
]

interface DoctorFiltersProps {
  bezirke: Bezirk[]
  active: {
    bezirk?: string
    isVerified?: boolean
    fachrichtung?: Fachrichtung | string
  }
}

export function DoctorFilters({ bezirke, active }: DoctorFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === null || value === '') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
      const qs = params.toString()
      router.push(qs ? `/admin/aerzte?${qs}` : '/admin/aerzte')
    },
    [router, searchParams],
  )

  const resetAll = () => router.push('/admin/aerzte')

  const activeVerified =
    active.isVerified === true
      ? 'true'
      : active.isVerified === false
        ? 'false'
        : undefined

  return (
    <div className="flex flex-col gap-dir-sm">
      {/* Bezirk row */}
      <div className="flex flex-wrap items-center gap-dir-xs">
        <span className="text-xs font-medium text-dir-on-surface-variant mr-dir-xs">
          Bezirk:
        </span>
        <Chip
          active={!active.bezirk}
          onClick={() => updateParam('bezirk', null)}
          label="Alle"
        />
        {bezirke.map((b) => (
          <Chip
            key={b.id}
            active={active.bezirk === b.slug}
            onClick={() => updateParam('bezirk', b.slug)}
            label={b.name}
          />
        ))}
      </div>

      {/* Fachrichtung select */}
      <div className="flex items-center gap-dir-xs">
        <span className="text-xs font-medium text-dir-on-surface-variant mr-dir-xs">
          Fachrichtung:
        </span>
        <select
          name="fachrichtung"
          value={active.fachrichtung ?? ''}
          onChange={(e) => updateParam('fachrichtung', e.target.value || null)}
          className="border border-dir-outline-variant rounded-dir-sm px-dir-sm py-dir-xs text-sm text-dir-on-surface bg-dir-surface focus:outline-none focus:ring-2 focus:ring-dir-primary"
        >
          <option value="">Alle Fachrichtungen</option>
          {FACHRICHTUNG_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Verified row */}
      <div className="flex flex-wrap items-center gap-dir-xs">
        <span className="text-xs font-medium text-dir-on-surface-variant mr-dir-xs">
          Verifizierung:
        </span>
        <Chip
          active={activeVerified === undefined}
          onClick={() => updateParam('isVerified', null)}
          label="Alle"
        />
        {VERIFIED_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            active={activeVerified === opt.value}
            onClick={() => updateParam('isVerified', opt.value)}
            label={opt.label}
          />
        ))}
      </div>

      {/* Reset */}
      <div>
        <button
          type="button"
          onClick={resetAll}
          className="text-xs text-dir-on-surface-variant underline hover:text-dir-on-surface"
        >
          Filter zurücksetzen
        </button>
      </div>
    </div>
  )
}

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  const baseClass =
    'rounded-dir-full px-dir-sm py-dir-xs text-xs font-medium transition-colors'
  const stateClass = active
    ? 'bg-dir-secondary-container text-dir-on-secondary-container'
    : 'bg-dir-surface-container text-dir-on-surface hover:bg-dir-surface-container-high'
  return (
    <button type="button" onClick={onClick} className={`${baseClass} ${stateClass}`}>
      {label}
    </button>
  )
}
