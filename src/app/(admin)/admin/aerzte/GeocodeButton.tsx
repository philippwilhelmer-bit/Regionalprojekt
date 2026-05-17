'use client'

import { useFormStatus } from 'react-dom'

interface GeocodeButtonProps {
  disabled: boolean
}

export function GeocodeButton({ disabled }: GeocodeButtonProps) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
      className="px-dir-sm py-dir-xs text-sm rounded-dir-sm border border-dir-outline-variant text-dir-on-surface hover:bg-dir-surface-container disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {pending ? 'Geocodiere… (bis zu 5 min)' : 'Geocode next 80 (~5 min)'}
    </button>
  )
}
