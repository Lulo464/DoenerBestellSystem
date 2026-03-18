'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getOrders } from '@/actions/orders'
import { OrderWithDetails, orderStatusLabels, orderStatusColors } from '@/types'

export default function OrdersPage() {
  const { addToast } = useToast()
  const [orders, setOrders] = useState<OrderWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    setIsLoading(true)
    try {
      const result = await getOrders()
      if (result.success) {
        setOrders(result.data as OrderWithDetails[])
      } else {
        addToast(result.error || 'Fehler beim Laden', 'error')
      }
    } catch (err) {
      addToast('Ein Fehler ist aufgetreten', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <span className="text-6xl mb-4 block">📦</span>
            <h2 className="text-xl font-semibold mb-2">Keine Bestellungen</h2>
            <p className="text-gray-500 mb-6">
              Sie haben noch keine Bestellungen aufgegeben.
            </p>
            <Link href="/catalog">
              <Button>Zum Katalog</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Meine Bestellungen</h1>

      <div className="space-y-4">
        {orders.map((order) => (
          <Link key={order.id} href={`/orders/${order.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-medium">{order.orderNumber}</span>
                      <Badge className={orderStatusColors[order.status]}>
                        {orderStatusLabels[order.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">
                      {formatDate(order.createdAt)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {order.items.length} Artikel
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
                    <span className="text-xl font-bold text-primary-600">
                      {formatCurrency(order.totalAmount)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {order.paymentAccount?.name || 'Keine Zahlungsart'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
