'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { generatePayPalLink } from '@/lib/paypal'

interface PayPalButtonProps {
  paypalMeLink: string
  amount: number | { toString(): string }
  orderNumber: string
}

export function PayPalButton({ paypalMeLink, amount, orderNumber }: PayPalButtonProps) {
  const paymentUrl = generatePayPalLink({
    paypalMeLink,
    amount,
    description: `Bestellung ${orderNumber}`,
  })

  const handleClick = () => {
    window.open(paymentUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          💳 PayPal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-blue-50 rounded-lg text-center">
          <p className="text-sm text-gray-600 mb-2">Betrag:</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(amount)}</p>
        </div>

        <Button
          onClick={handleClick}
          className="w-full bg-[#0070ba] hover:bg-[#005ea6]"
          size="lg"
        >
          <span className="mr-2">💳</span>
          Mit PayPal bezahlen
        </Button>

        <p className="text-xs text-gray-500 text-center">
          Sie werden zu PayPal weitergeleitet. Geben Sie im Verwendungszweck an:
          <br />
          <span className="font-mono font-medium">{orderNumber}</span>
        </p>

        {/* Manual Link */}
        <div className="border-t pt-4">
          <p className="text-xs text-gray-500 mb-2">Oder kopieren Sie den Link:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={paymentUrl}
              readOnly
              className="flex-1 text-xs p-2 bg-gray-50 border rounded font-mono truncate"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(paymentUrl)}
            >
              📋
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
