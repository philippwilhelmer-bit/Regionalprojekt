import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySessionCookie, SESSION_COOKIE_NAME } from '@/lib/admin/auth-node'
import Link from 'next/link'
import { LogoutButton } from '@/components/admin/LogoutButton'
import { TestSiteBanner } from '@/components/TestSiteBanner'

const navItems = [
  { href: '/admin/articles',   label: 'Artikel' },
  { href: '/admin/exceptions', label: 'Ausnahme-Queue' },
  { href: '/admin/sources',    label: 'Quellen' },
  { href: '/admin/ai-config',  label: 'KI-Konfiguration' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()  // MUST await in Next.js 15
  const session = cookieStore.get(SESSION_COOKIE_NAME)
  if (!session || !verifySessionCookie(session.value)) {
    redirect('/admin/login')
  }
  return (
    <>
      <TestSiteBanner />
      <div className="flex h-screen bg-background">
      <aside className="w-56 bg-surface-elevated flex flex-col py-6 px-4 shrink-0">
        <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-4">
          Wurzelwelt
        </p>
        <nav className="space-y-1 flex-1">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded-sm text-sm text-text/70 hover:bg-surface hover:text-text"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <LogoutButton />
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </>
  )
}
