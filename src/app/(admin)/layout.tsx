import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySessionCookie, SESSION_COOKIE_NAME } from '@/lib/admin/auth-node'
import Link from 'next/link'
import { logoutAction } from '@/lib/admin/logout-action'

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
    <div className="flex h-screen bg-gray-100">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col py-6 px-4 shrink-0">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-4">
          Regionencompass
        </p>
        <nav className="space-y-1 flex-1">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={logoutAction} className="mt-auto">
          <button
            type="submit"
            className="w-full px-3 py-2 rounded text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 text-left"
          >
            Abmelden
          </button>
        </form>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  )
}
