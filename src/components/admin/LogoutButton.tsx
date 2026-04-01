'use client'
import { logoutAction } from '@/lib/admin/logout-action'

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="mt-auto block w-full text-left px-3 py-2 rounded-sm text-sm text-ink-dim hover:bg-surface hover:text-ink"
      >
        Abmelden
      </button>
    </form>
  )
}
