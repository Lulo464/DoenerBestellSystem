'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { formatCurrency } from '@/lib/utils'
import { getCart } from '@/actions/cart'
import { createOrder } from '@/actions/orders'
import { CartItemWithProduct, SelectedOption } from '@/types'
import Link from 'next/link'

export default function CheckoutPage() {
  const router = useRouter()
  const { addToast } = useToast()

  const [items, setItems] = useState<CartItemWithProduct[]>([])
  const [total, setTotal] = useState(0)
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      addToast('Fehler beim Laden', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (items.length === 0) {
      addToast('Ihr Warenkorb ist leer', 'warning')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createOrder({
        notes: notes.trim() || undefined,
      })

      if (result.success && result.data) {
        addToast('Bestellung erfolgreich aufgegeben!', 'success')
        router.push(`/orders/${result.data.orderId}`)
      } else {
        addToast(result.error || 'Fehler bei der Bestellung', 'error')
      }
    } catch (err) {
      addToast('Ein Fehler ist aufgetreten', 'error')
    } finally {
      setIsSubmitting(false)
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
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <span className="text-6xl mb-4 block">🛒</span>
            <h2 className="text-xl font-semibold mb-2">Ihr Warenkorb ist leer</h2>
            <p className="text-gray-500 mb-6">
              Fügen Sie Produkte hinzu, bevor Sie bestellen.
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
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Bestellung abschicken</h1>

      <div className="space-y-6">
        {/* Bestellübersicht */}
        <Card>
          <CardHeader>
            <CardTitle>Bestellübersicht</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex-1">
                  <p className="font-medium">
                    {item.isCustomRequest
                      ? 'Sonderwunsch'
                      : (item as any).box?.name || item.product?.name || 'Unbekannt'}
                  </p>
                  {item.isCustomRequest && item.customRequestText && (
                    <p className="text-sm text-gray-500 line-clamp-1">{item.customRequestText}</p>
                  )}
                  {item.selectedOptions && (item.selectedOptions as SelectedOption[]).length > 0 && (
                    <p className="text-xs text-gray-400">
                      {(item.selectedOptions as SelectedOption[]).map((o) => o.optionName).join(', ')}
                    </p>
                  )}
                  <p className="text-sm text-gray-500">
                    {item.quantity} × {formatCurrency(item.unitPrice)}
                  </p>
                </div>
                <p className="font-medium">{formatCurrency(item.unitPrice * item.quantity)}</p>
              </div>
            ))}

            <div className="pt-3 border-t border-gray-200">
              <div className="flex justify-between text-lg font-bold">
                <span>Ungefähre Summe</span>
                <span className="text-primary-600">{formatCurrency(total)}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Der genaue Betrag wird vom Admin nach der Lieferung festgelegt.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Anmerkungen */}
        <Card>
          <CardContent className="pt-6">
            <Textarea
              label="Anmerkungen (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Besondere Hinweise zur Bestellung..."
              rows={3}
            />
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              className="w-full"
              size="lg"
              onClick={handleSubmit}
              isLoading={isSubmitting}
            >
              Bestellung abschicken
            </Button>
            <Link href="/cart" className="w-full">
              <Button variant="outline" className="w-full">
                Zurück zum Warenkorb
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
