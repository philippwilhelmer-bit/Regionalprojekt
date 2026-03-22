// Node runtime version (Server Actions) — uses node:crypto
import { createHmac, timingSafeEqual } from 'node:crypto'

export const SESSION_COOKIE_NAME = 'admin_session'
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

// Edge runtime version (middleware) — uses Web Crypto API (crypto.subtle)
export async function verifySessionCookieEdge(
  cookie: string,
  secret: string
): Promise<boolean> {
  const lastDot = cookie.lastIndexOf('.')
  if (lastDot === -1) return false
  const value = cookie.slice(0, lastDot)
  const sig   = cookie.slice(lastDot + 1)
  if (sig.length !== 64) return false
  try {
    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw', enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false, ['verify']
    )
    const sigBytes = new Uint8Array(
      sig.match(/.{2}/g)!.map(b => parseInt(b, 16))
    )
    return crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(value))
  } catch {
    return false
  }
}
