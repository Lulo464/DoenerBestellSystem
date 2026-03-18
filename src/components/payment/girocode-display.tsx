'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatIBAN } from '@/lib/utils'
import { generateGiroCodeQR } from '@/lib/girocode'

interface GiroCodeDisplayProps {
  iban: string
  bic?: string | null
  accountHolder: string
  amount: number | { toString(): string }
  reference: string
  purpose?: string
}

export function GiroCodeDisplay({
  iban,
  bic,
  accountHolder,
  amount,
  reference,
  purpose,
}: GiroCodeDisplayProps) {
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const generateQR = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const qr = await generateGiroCodeQR({
          iban,
          bic: bic || undefined,
          recipientName: accountHolder,
          amount,
          reference,
          purpose: purpose || `Bestellung ${reference}`,
        })
        setQrCode(qr)
      } catch (err) {
        setError('QR-Code konnte nicht generiert werden')
      } finally {
        setIsLoading(false)
      }
    }

    generateQR()
  }, [iban, bic, accountHolder, amount, reference, purpose])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🏦 Banküberweisung (GiroCode)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* QR Code */}
        <div className="flex justify-center">
          <div className="p-4 bg-white border rounded-lg">
            {isLoading ? (
              <div className="w-48 h-48 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
              </div>
            ) : error ? (
              <div className="w-48 h-48 flex items-center justify-center text-red-500 text-sm text-center">
                {error}
              </div>
            ) : qrCode ? (
              <img src={qrCode} alt="GiroCode QR" className="w-48 h-48" />
            ) : null}
          </div>
        </div>

        <p className="text-sm text-gray-500 text-center">
          Scannen Sie diesen QR-Code mit Ihrer Banking-App
        </p>

        {/* Bank Details */}
        <div className="space-y-2 p-4 bg-gray-50 rounded-lg text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Empfänger:</span>
            <span className="font-medium">{accountHolder}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">IBAN:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs">{formatIBAN(iban)}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(iban)}
                className="h-6 px-2"
              >
                📋
              </Button>
            </div>
          </div>
          {bic && (
            <div className="flex justify-between">
              <span className="text-gray-600">BIC:</span>
              <span className="font-mono">{bic}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Betrag:</span>
            <span className="font-bold text-primary-600">{formatCurrency(amount)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Verwendungszweck:</span>
            <div className="flex items-center gap-2">
              <span className="font-medium">{reference}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(reference)}
                className="h-6 px-2"
              >
                📋
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
