'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { GiroCodeDisplay } from '@/components/payment/girocode-display'
import { PayPalButton } from '@/components/payment/paypal-button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getOrder, cancelOrder } from '@/actions/orders'
import { OrderWithDetails, orderStatusLabels, orderStatusColors, SelectedOption } from '@/types'

const STATUS_STEPS = [
  { status: 'PENDING', label: 'Aufgegeben' },
  { status: 'CONFIRMED', label: 'Bestätigt' },
  { status: 'ON_THE_WAY', label: 'Unterwegs' },
  { status: 'PAYMENT_PENDING', label: 'Zahlung ausstehend' },
  { status: 'COMPLETED', label: 'Abgeschlossen' },
]

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { addToast } = useToast()

  const [order, setOrder] = useState<OrderWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCancelling, setIsCancelling] = useState(false)

  useEffect(() => {
    loadOrder()
  }, [params.id])

  const loadOrder = async () => {
    setIsLoading(true)
    try {
      const result = await getOrder(params.id as string)
      if (result.success && result.data) {
        setOrder(result.data as OrderWithDetails)
      } else {
        addToast(result.error || 'Bestellung nicht gefunden', 'error')
        router.push('/orders')
      }
    } catch (err) {
      addToast('Ein Fehler ist aufgetreten', 'error')
      router.push('/orders')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!order) return
    if (!confirm('Möchten Sie diese Bestellung wirklich stornieren?')) return

    setIsCancelling(true)
    try {
      const result = await cancelOrder(order.id)
      if (result.success) {
        addToast('Bestellung storniert', 'success')
        loadOrder()
      } else {
        addToast(result.error || 'Fehler beim Stornieren', 'error')
      }
    } catch (err) {
      addToast('Ein Fehler ist aufgetreten', 'error')
    } finally {
      setIsCancelling(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (!order) return null

  const isCancelled = order.status === 'CANCELLED'
  const isPaymentPending = order.status === 'PAYMENT_PENDING'
  const isCompleted = order.status === 'COMPLETED'
  const canCancel = order.status === 'PENDING'

  // Fortschrittsanzeige: aktuellen Schritt bestimmen
  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.status === order.status)

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
            <Badge className={orderStatusColors[order.status]}>
              {orderStatusLabels[order.status]}
            </Badge>
          </div>
          <p className="text-gray-500">{formatDate(order.createdAt)}</p>
        </div>
        <div className="flex gap-2">
          {canCancel && (
            <Button variant="destructive" onClick={handleCancel} isLoading={isCancelling}>
              Stornieren
            </Button>
          )}
          <Link href="/orders">
            <Button variant="outline">Zurück</Button>
          </Link>
        </div>
      </div>

      {/* Fortschrittsleiste */}
      {!isCancelled && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              {STATUS_STEPS.map((step, i) => {
                const isDone = currentStepIndex > i
                const isCurrent = currentStepIndex === i
                return (
                  <div key={step.status} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                          isDone
                            ? 'bg-green-500 border-green-500 text-white'
                            : isCurrent
                            ? 'bg-primary-600 border-primary-600 text-white'
                            : 'bg-white border-gray-300 text-gray-400'
                        }`}
                      >
                        {isDone ? '✓' : i + 1}
                      </div>
                      <span
                        className={`text-xs mt-1 text-center hidden sm:block ${
                          isCurrent ? 'font-medium text-primary-600' : 'text-gray-400'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div
                        className={`h-0.5 flex-1 mx-1 ${
                          currentStepIndex > i ? 'bg-green-400' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bestellpositionen */}
        <Card>
          <CardHeader>
            <CardTitle>Bestellpositionen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between py-3 border-b border-gray-100 last:border-0"
              >
                <div className="flex-1">
                  <p className="font-medium">
                    {item.isCustomRequest
                      ? 'Sonderwunsch'
                      : (item as any).box?.name || item.product?.name || 'Unbekanntes Produkt'}
                  </p>
                  {item.isCustomRequest && item.customRequestText && (
                    <p className="text-sm text-gray-600 mt-1">{item.customRequestText}</p>
                  )}
                  {item.selectedOptions &&
                    (item.selectedOptions as SelectedOption[]).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(item.selectedOptions as SelectedOption[]).map((opt, i) => (
                          <span
                            key={i}
                            className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                          >
                            {opt.optionName}
                            {opt.priceModifier > 0 && ` (+${formatCurrency(opt.priceModifier)})`}
                          </span>
                        ))}
                      </div>
                    )}
                  <p className="text-sm text-gray-500 mt-1">
                    {item.quantity} × {formatCurrency(item.unitPrice)}
                  </p>
                </div>
                <p className="font-medium text-right">{formatCurrency(item.totalPrice)}</p>
              </div>
            ))}

            <div className="pt-4 border-t border-gray-200 space-y-2">
              <div className="flex justify-between text-gray-500">
                <span>Ungefähre Summe</span>
                <span>{formatCurrency(order.totalAmount)}</span>
              </div>
              {order.finalAmount !== null && (
                <div className="flex justify-between text-lg font-bold">
                  <span>Zu zahlen</span>
                  <span className="text-primary-600">{formatCurrency(order.finalAmount)}</span>
                </div>
              )}
            </div>

            {order.notes && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  <strong>Anmerkungen:</strong> {order.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Zahlungsinfo — nur bei PAYMENT_PENDING */}
        <div className="space-y-6">
          {isPaymentPending && order.paymentAccount && order.finalAmount !== null && (
            <>
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="font-semibold text-purple-800 mb-1">Zahlung ausstehend</p>
                <p className="text-sm text-purple-600">
                  Bitte überweise{' '}
                  <strong>{formatCurrency(order.finalAmount)}</strong> an:
                </p>
              </div>

              <GiroCodeDisplay
                iban={order.paymentAccount.iban}
                bic={order.paymentAccount.bic}
                accountHolder={order.paymentAccount.accountHolder}
                amount={order.finalAmount}
                reference={order.orderNumber}
                purpose={`Bestellung ${order.orderNumber}`}
              />

              {order.paymentAccount.paypalMeLink && (
                <PayPalButton
                  paypalMeLink={order.paymentAccount.paypalMeLink}
                  amount={order.finalAmount}
                  orderNumber={order.orderNumber}
                />
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Zahlungsinformationen</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Konto:</span>
                      <span className="font-medium">{order.paymentAccount.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Inhaber:</span>
                      <span>{order.paymentAccount.accountHolder}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">IBAN:</span>
                      <span className="font-mono text-xs">{order.paymentAccount.iban}</span>
                    </div>
                    {order.paymentAccount.bic && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">BIC:</span>
                        <span className="font-mono">{order.paymentAccount.bic}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {isCompleted && (
            <Card>
              <CardContent className="py-8 text-center">
                <span className="text-4xl mb-3 block">✅</span>
                <p className="font-semibold text-gray-800">Bestellung abgeschlossen</p>
                <p className="text-sm text-gray-500 mt-1">Vielen Dank!</p>
              </CardContent>
            </Card>
          )}

          {isCancelled && (
            <Card>
              <CardContent className="py-8 text-center">
                <span className="text-4xl mb-3 block">❌</span>
                <p className="font-semibold text-gray-800">Bestellung storniert</p>
              </CardContent>
            </Card>
          )}

          {!isPaymentPending && !isCompleted && !isCancelled && (
            <Card>
              <CardContent className="py-8 text-center">
                <span className="text-4xl mb-3 block">⏳</span>
                <p className="font-semibold text-gray-800">
                  {orderStatusLabels[order.status]}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Zahlungsdetails werden nach der Lieferung angezeigt.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
