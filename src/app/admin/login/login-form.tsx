'use client'
import { useActionState } from 'react'
import { loginAction } from '@/lib/admin/login-action'

export function LoginForm() {
  const [state, action, isPending] = useActionState(loginAction, null)

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p className="text-sm text-accent bg-accent/10 rounded-sm px-3 py-2">
          {state.error}
        </p>
      )}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-text/70 mb-1">
          Passwort
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="w-full border border-surface rounded-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-gradient-to-br from-primary to-primary-container text-white py-2 rounded-full hover:opacity-90 font-medium disabled:opacity-50"
      >
        {isPending ? 'Anmelden…' : 'Anmelden'}
      </button>
    </form>
  )
}
