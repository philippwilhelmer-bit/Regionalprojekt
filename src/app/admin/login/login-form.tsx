'use client'
import { useActionState } from 'react'
import { loginAction } from '@/lib/admin/login-action'

export function LoginForm() {
  const [state, action, isPending] = useActionState(loginAction, null)

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-sm px-3 py-2">
          {state.error}
        </p>
      )}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-ink-muted mb-1">
          Passwort
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="w-full border border-parchment-dim rounded-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ink"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-gradient-to-br from-ink to-ink-soft text-parchment py-2 rounded-sm hover:opacity-90 font-medium disabled:opacity-50"
      >
        {isPending ? 'Anmelden…' : 'Anmelden'}
      </button>
    </form>
  )
}
