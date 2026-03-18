'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { hasPermission } from '@/lib/permissions'
import { Role } from '@prisma/client'

interface NavItem {
  name: string
  href: string
  icon: string
  permission?: string
}

const adminNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/admin', icon: '📊' },
  { name: 'Bestellungen', href: '/admin/orders', icon: '📦' },
  { name: 'Kategorien', href: '/admin/categories', icon: '📁' },
  { name: 'Produkte', href: '/admin/products', icon: '🍕' },
  { name: 'Boxen / Bundles', href: '/admin/boxes', icon: '📦' },
  {
    name: 'Zahlungskonten',
    href: '/admin/payment-accounts',
    icon: '💳',
    permission: 'manage_payment_accounts',
  },
  {
    name: 'Benutzer',
    href: '/admin/users',
    icon: '👥',
    permission: 'manage_users',
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const userRole = session?.user?.role as Role | undefined

  const filteredNavigation = adminNavigation.filter((item) => {
    if (!item.permission) return true
    if (!userRole) return false
    return hasPermission(userRole, item.permission as any)
  })

  return (
    <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 min-h-[calc(100vh-4rem)]">
      <nav className="p-4 space-y-1">
        {filteredNavigation.map((item) => {
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900 text-primary-700 dark:text-primary-200'
                  : 'text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              )}
            >
              <span className="text-lg">{item.icon}</span>
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Back to Shop */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <Link
          href="/catalog"
          className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
        >
          <span className="text-lg">🛒</span>
          Zurück zum Shop
        </Link>
      </div>
    </aside>
  )
}
