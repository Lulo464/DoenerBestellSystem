'use client'

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

interface CartSummaryProps {
  total: number
  itemCount: number
  onClear?: () => void
  isLoading?: boolean
  showCheckout?: boolean
}

export function CartSummary({
  total,
  itemCount,
  onClear,
  isLoading,
  showCheckout = true,
}: CartSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Zusammenfassung</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Artikel</span>
          <span>{itemCount}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Zwischensumme</span>
          <span>{formatCurrency(total)}</span>
        </div>
        <div className="border-t pt-3">
          <div className="flex justify-between font-semibold text-lg">
            <span>Gesamt</span>
            <span className="text-primary-600">{formatCurrency(total)}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        {showCheckout && (
          <Link href="/checkout" className="w-full">
            <Button className="w-full" size="lg" disabled={itemCount === 0}>
              Zur Kasse
            </Button>
          </Link>
        )}
        {onClear && (
          <Button
            variant="outline"
            className="w-full"
            onClick={onClear}
            disabled={isLoading || itemCount === 0}
          >
            Warenkorb leeren
          </Button>
        )}
        <Link href="/catalog" className="w-full">
          <Button variant="ghost" className="w-full">
            Weiter einkaufen
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
