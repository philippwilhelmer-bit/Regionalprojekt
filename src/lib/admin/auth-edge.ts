// Edge runtime version — uses Web Crypto API (crypto.subtle) only
// NO node:crypto imports — safe to use in Next.js middleware (Edge runtime)

export const SESSION_COOKIE_NAME = 'admin_session'

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
