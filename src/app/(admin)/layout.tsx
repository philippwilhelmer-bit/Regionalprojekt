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
      <div className="flex h-screen bg-parchment">
      <aside className="w-56 bg-surface-elevated flex flex-col py-6 px-4 shrink-0">
        <Link
          href="/"
          className="group flex items-center gap-2 mb-6 transition-colors"
          aria-label="Zur Startseite"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/wurzelmann.png"
            alt=""
            className="w-10 h-10 rounded-full object-contain shrink-0 bg-parchment"
          />
          <span className="font-headline italic text-lg text-primary group-hover:text-accent transition-colors">
            Loden &amp; Leute
          </span>
        </Link>
        <nav className="space-y-1 flex-1">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded-sm text-sm text-ink-muted hover:bg-surface hover:text-ink"
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
