'use client'
import { logoutAction } from '@/lib/admin/logout-action'

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="mt-auto block w-full text-left px-3 py-2 rounded text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      >
        Abmelden
      </button>
    </form>
  )
}
