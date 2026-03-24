// Node runtime version — uses node:crypto
// Only import this from Server Actions and Server Components (NOT middleware)

import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_COOKIE_NAME } from './auth-edge'

export { SESSION_COOKIE_NAME }

const SESSION_VALUE = 'authenticated'  // fixed value — only the HMAC matters

function getSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET
  if (!s) throw new Error('ADMIN_SESSION_SECRET env var is not set')
  return s
}

export function signSessionCookie(): string {
  const hmac = createHmac('sha256', getSecret()).update(SESSION_VALUE).digest('hex')
  return `${SESSION_VALUE}.${hmac}`
}

export function verifySessionCookie(cookie: string): boolean {
  const lastDot = cookie.lastIndexOf('.')
  if (lastDot === -1) return false
  const value = cookie.slice(0, lastDot)
  const sig   = cookie.slice(lastDot + 1)
  if (sig.length !== 64) return false  // SHA-256 hex = 64 chars
  try {
    const expected = createHmac('sha256', getSecret()).update(value).digest('hex')
    return timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    return false
  }
}

export async function requireAuth(): Promise<void> {
  const cookieStore = await cookies()
  const session = cookieStore.get(SESSION_COOKIE_NAME)
  if (!session || !verifySessionCookie(session.value)) {
    redirect('/admin/login')  // throws NEXT_REDIRECT internally — do NOT wrap in try/catch
  }
}
