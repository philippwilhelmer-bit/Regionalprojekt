'use server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { signSessionCookie, SESSION_COOKIE_NAME } from './auth-node'

export type LoginState = { error: string } | null

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const password = formData.get('password')?.toString() ?? ''
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) {
    console.error('[login-action] ADMIN_PASSWORD env var is not set — check server configuration')
    return { error: 'Login derzeit nicht möglich.' }
  }
  if (password !== adminPassword) {
    return { error: 'Falsches Passwort. Bitte erneut versuchen.' }
  }
  const cookieStore = await cookies()  // MUST await in Next.js 15
  cookieStore.set(SESSION_COOKIE_NAME, signSessionCookie(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,  // 7 days
  })
  redirect('/admin/articles')  // outside try/catch — throws NEXT_REDIRECT intentionally
}
