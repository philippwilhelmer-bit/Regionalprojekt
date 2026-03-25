/**
 * Tests for loginAction server action.
 *
 * Covers:
 *   - Missing ADMIN_PASSWORD env var returns config error
 *   - Wrong password returns wrong-password error
 *   - Correct password triggers redirect (NEXT_REDIRECT)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock next/headers cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  }),
}))

// Mock next/navigation redirect — throws recognizable error per Next.js NEXT_REDIRECT pattern
vi.mock('next/navigation', () => ({
  redirect: vi.fn().mockImplementation((url: string) => {
    const error = new Error(`NEXT_REDIRECT:${url}`)
    ;(error as Error & { digest?: string }).digest = `NEXT_REDIRECT;replace;${url};307;`
    throw error
  }),
}))

// Mock signSessionCookie from auth-node
vi.mock('./auth-node', () => ({
  signSessionCookie: vi.fn().mockReturnValue('mocked-session-token'),
  SESSION_COOKIE_NAME: 'admin_session',
}))

import { loginAction } from './login-action'

function makeFormData(password: string): FormData {
  const fd = new FormData()
  fd.append('password', password)
  return fd
}

describe('loginAction', () => {
  const originalEnv = process.env.ADMIN_PASSWORD

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.ADMIN_PASSWORD
    } else {
      process.env.ADMIN_PASSWORD = originalEnv
    }
    vi.clearAllMocks()
  })

  it('returns config error when ADMIN_PASSWORD env var is not set', async () => {
    delete process.env.ADMIN_PASSWORD

    const result = await loginAction(null, makeFormData('anything'))

    expect(result).toEqual({ error: 'Login derzeit nicht möglich.' })
  })

  it('returns wrong-password error when password does not match', async () => {
    process.env.ADMIN_PASSWORD = 'secret'

    const result = await loginAction(null, makeFormData('wrong'))

    expect(result).toEqual({ error: 'Falsches Passwort. Bitte erneut versuchen.' })
  })

  it('calls redirect when correct password provided — throws NEXT_REDIRECT', async () => {
    process.env.ADMIN_PASSWORD = 'secret'

    await expect(loginAction(null, makeFormData('secret'))).rejects.toThrow('NEXT_REDIRECT')
  })
})
