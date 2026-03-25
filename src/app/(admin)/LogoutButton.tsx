'use client'

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch('/api/admin/logout', { method: 'POST' })
        window.location.href = '/admin/login'
      }}
      className="w-full px-3 py-2 rounded text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 text-left"
    >
      Abmelden
    </button>
  )
}
