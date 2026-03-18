import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { getOrderStats } from '@/actions/orders'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

export default async function AdminDashboardPage() {
  const statsResult = await getOrderStats()
  const stats = statsResult.data

  const cards = [
    {
      title: 'Bestellungen gesamt',
      value: stats?.totalOrders ?? 0,
      icon: '📦',
      href: '/admin/orders',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Ausstehende Bestellungen',
      value: stats?.pendingOrders ?? 0,
      icon: '⏳',
      href: '/admin/orders?status=PENDING',
      color: 'bg-yellow-50 text-yellow-600',
    },
    {
      title: 'Bestellungen heute',
      value: stats?.todayOrders ?? 0,
      icon: '📅',
      href: '/admin/orders',
      color: 'bg-green-50 text-green-600',
    },
    {
      title: 'Gesamtumsatz',
      value: formatCurrency(stats?.totalRevenue ?? 0),
      icon: '💰',
      href: '/admin/orders',
      color: 'bg-purple-50 text-purple-600',
    },
  ]

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${card.color}`}>
                    <span className="text-2xl">{card.icon}</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{card.title}</p>
                    <p className="text-2xl font-bold">{card.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/admin/orders">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📦 Bestellungen verwalten
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">
                Alle Bestellungen einsehen und Status aktualisieren
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/products">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🍕 Produkte verwalten
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">
                Produkte, Kategorien und Optionen bearbeiten
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/payment-accounts">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                💳 Zahlungskonten
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">
                Bankverbindungen und PayPal-Konten verwalten
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
