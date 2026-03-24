import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requireAuth } from './auth-node'

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

describe('requireAuth()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to /admin/login when no session cookie is present', async () => {
    const { cookies } = await import('next/headers')
    const { redirect } = await import('next/navigation')

    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    } as any)

    await requireAuth()

    expect(redirect).toHaveBeenCalledWith('/admin/login')
    expect(redirect).toHaveBeenCalledTimes(1)
  })

  it('redirects to /admin/login when session cookie has invalid HMAC', async () => {
    const { cookies } = await import('next/headers')
    const { redirect } = await import('next/navigation')

    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'authenticated.invalidsignature' }),
    } as any)

    await requireAuth()

    expect(redirect).toHaveBeenCalledWith('/admin/login')
    expect(redirect).toHaveBeenCalledTimes(1)
  })

  it('does not redirect when session cookie is valid', async () => {
    const { cookies } = await import('next/headers')
    const { redirect } = await import('next/navigation')

    // Build a valid signed cookie using the real signSessionCookie()
    process.env.ADMIN_SESSION_SECRET = 'test-secret-for-unit-tests'
    const { signSessionCookie } = await import('./auth-node')
    const validCookie = signSessionCookie()

    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: validCookie }),
    } as any)

    await requireAuth()

    expect(redirect).not.toHaveBeenCalled()
  })
})
