import { cookies } from 'next/headers'
import { SESSION_COOKIE_NAME } from '@/lib/admin/auth-edge'
import { NextResponse } from 'next/server'

export async function GET() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
  return NextResponse.redirect(new URL('/admin/login', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'))
}
