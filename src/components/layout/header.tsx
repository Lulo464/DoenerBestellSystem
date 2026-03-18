'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { isAdmin, roleLabels, roleColors } from '@/lib/permissions'
import { Role } from '@prisma/client'
import { useEffect, useState, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { getCartItemCount } from '@/actions/cart'

export function Header() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [cartCount, setCartCount] = useState(0)

  const loadCartCount = useCallback(async () => {
    if (session?.user) {
      try {
        const count = await getCartItemCount()
        setCartCount(count)
      } catch (error) {
        console.error('Error loading cart count:', error)
        setCartCount(0)
      }
    }
  }, [session])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    loadCartCount()
  }, [loadCartCount, pathname])

  const navigation = [
    { name: 'Katalog', href: '/catalog' },
    { name: 'Warenkorb', href: '/cart', badge: cartCount },
    { name: 'Meine Bestellungen', href: '/orders' },
  ]

  const userRole = session?.user?.role as Role | undefined

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo & Navigation */}
          <div className="flex">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold text-primary-600">
                🍔 {process.env.NEXT_PUBLIC_APP_NAME || 'Bestellsystem'}
              </span>
            </Link>

            {session && (
              <nav className="hidden md:ml-8 md:flex md:space-x-4">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'inline-flex items-center px-3 py-2 text-sm font-medium rounded-md',
                      pathname === item.href
                        ? 'bg-primary-50 dark:bg-primary-900 text-primary-700 dark:text-primary-200'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                    )}
                  >
                    {item.name}
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-2 bg-primary-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                ))}

                {/* Admin Link */}
                {userRole && isAdmin(userRole) && (
                  <Link
                    href="/admin"
                    className={cn(
                      'inline-flex items-center px-3 py-2 text-sm font-medium rounded-md',
                      pathname.startsWith('/admin')
                        ? 'bg-primary-50 dark:bg-primary-900 text-primary-700 dark:text-primary-200'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                    )}
                  >
                    Admin
                  </Link>
                )}
              </nav>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {session ? (
              <>
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-sm text-gray-700 dark:text-gray-200">{session.user.name}</span>
                  {userRole && (
                    <Badge className={roleColors[userRole]}>
                      {roleLabels[userRole]}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Link href="/setup-totp">
                    <Button variant="ghost" size="sm">
                      🔐
                    </Button>
                  </Link>
                  <Link href="/settings">
                    <Button variant="outline" size="sm" title="Einstellungen">
                      ⚙️ Einstellungen
                    </Button>
                  </Link>
                  {mounted && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                      title={theme === 'dark' ? 'Hellen Modus aktivieren' : 'Dunklen Modus aktivieren'}
                    >
                      {theme === 'dark' ? '☀️' : '🌙'}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => signOut({ callbackUrl: '/login' })}
                  >
                    Abmelden
                  </Button>
                </div>
              </>
            ) : (
              <Link href="/login">
                <Button>Anmelden</Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {session && (
        <nav className="md:hidden border-t border-gray-200 dark:border-gray-700 px-4 py-2">
          <div className="flex flex-wrap gap-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md',
                  pathname === item.href
                    ? 'bg-primary-50 dark:bg-primary-900 text-primary-700 dark:text-primary-200'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                )}
              >
                {item.name}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-1 bg-primary-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
            {userRole && isAdmin(userRole) && (
              <Link
                href="/admin"
                className={cn(
                  'inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md',
                  pathname.startsWith('/admin')
                    ? 'bg-primary-50 dark:bg-primary-900 text-primary-700 dark:text-primary-200'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                )}
              >
                Admin
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  )
}
