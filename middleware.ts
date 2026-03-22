import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySessionCookieEdge, SESSION_COOKIE_NAME } from '@/lib/admin/auth-edge'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname === '/admin/login') return NextResponse.next()

  const secret = process.env.ADMIN_SESSION_SECRET ?? ''
  const session = request.cookies.get(SESSION_COOKIE_NAME)
  if (!session || !(await verifySessionCookieEdge(session.value, secret))) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
