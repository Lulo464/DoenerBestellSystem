'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CartItem } from '@/components/cart/cart-item'
import { CartSummary } from '@/components/cart/cart-summary'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { getCart, clearCart } from '@/actions/cart'
import { CartItemWithProduct } from '@/types'
import Link from 'next/link'

export default function CartPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [items, setItems] = useState<CartItemWithProduct[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isClearing, setIsClearing] = useState(false)

  useEffect(() => {
    loadCart()
  }, [])

  const loadCart = async () => {
    setIsLoading(true)
    try {
      const result = await getCart()
      if (result.success && result.data) {
        setItems(result.data.items)
        setTotal(result.data.total)
      }
    } catch (err) {
      addToast('Fehler beim Laden des Warenkorbs', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClear = async () => {
    setIsClearing(true)
    try {
      const result = await clearCart()
      if (result.success) {
        setItems([])
        setTotal(0)
        addToast('Warenkorb geleert', 'success')
        router.refresh()
      } else {
        addToast(result.error || 'Fehler', 'error')
      }
    } finally {
      setIsClearing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <span className="text-6xl mb-4 block">🛒</span>
            <h2 className="text-xl font-semibold mb-2">Ihr Warenkorb ist leer</h2>
            <p className="text-gray-500 mb-6">
              Fügen Sie Produkte aus dem Katalog hinzu, um zu bestellen.
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
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Warenkorb</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-4">
              {items.map((item) => (
                <CartItem
                  key={item.id}
                  item={item}
                  onUpdate={loadCart}
                />
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <div>
          <CartSummary
            total={total}
            itemCount={items.reduce((sum, item) => sum + item.quantity, 0)}
            onClear={handleClear}
            isLoading={isClearing}
          />
        </div>
      </div>
    </div>
  )
}

