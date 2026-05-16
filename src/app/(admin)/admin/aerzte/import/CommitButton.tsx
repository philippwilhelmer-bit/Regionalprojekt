'use client'

import { useFormStatus } from 'react-dom'

interface CommitButtonProps {
  label: string
}

export function CommitButton({ label }: CommitButtonProps) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="px-dir-md py-dir-sm bg-dir-error text-dir-on-error text-sm font-medium rounded-dir-sm hover:opacity-90 disabled:opacity-60 disabled:cursor-progress"
    >
      {pending ? 'Importiere…' : label}
    </button>
  )
}
