'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getOrders, updateOrderStatus, setPaymentDue, deleteOrder } from '@/actions/orders'
import { getPaymentAccounts } from '@/actions/payment-accounts'
import { OrderWithDetails, orderStatusLabels, orderStatusColors, PaymentAccountData } from '@/types'
import { OrderStatus } from '@prisma/client'

export default function AdminOrdersPage() {
  const { addToast } = useToast()
  const [orders, setOrders] = useState<OrderWithDetails[]>([])
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccountData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  // Payment-Due Dialog
  const [paymentDueOrder, setPaymentDueOrder] = useState<OrderWithDetails | null>(null)
  const [finalAmount, setFinalAmount] = useState('')
  const [selectedPaymentAccountId, setSelectedPaymentAccountId] = useState('')
  const [isSavingPayment, setIsSavingPayment] = useState(false)

  // Delivery List Modal
  const [deliveryOrder, setDeliveryOrder] = useState<OrderWithDetails | null>(null)
  const [showMasterDeliveryList, setShowMasterDeliveryList] = useState(false)

  useEffect(() => {
    loadData()
  }, [statusFilter])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [ordersResult, accounts] = await Promise.all([
        getOrders({
          status: statusFilter as OrderStatus | undefined,
          search: searchQuery || undefined,
        }),
        getPaymentAccounts(),
      ])
      if (ordersResult.success) {
        setOrders(ordersResult.data as OrderWithDetails[])
      }
      setPaymentAccounts(accounts)
      // Default-Konto vorwählen
      const def = accounts.find((a) => a.isDefault)
      if (def) setSelectedPaymentAccountId(def.id)
      else if (accounts.length > 0) setSelectedPaymentAccountId(accounts[0].id)
    } catch (err) {
      addToast('Fehler beim Laden', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const result = await updateOrderStatus(orderId, newStatus)
      if (result.success) {
        addToast('Status aktualisiert', 'success')
        loadData()
      } else {
        addToast(result.error || 'Fehler', 'error')
      }
    } catch (err) {
      addToast('Ein Fehler ist aufgetreten', 'error')
    }
  }

  const openPaymentDueDialog = (order: OrderWithDetails) => {
    setPaymentDueOrder(order)
    setFinalAmount(order.totalAmount.toFixed(2))
  }

  const handleSetPaymentDue = async () => {
    if (!paymentDueOrder) return

    const amount = parseFloat(finalAmount)
    if (isNaN(amount) || amount <= 0) {
      addToast('Bitte einen gültigen Betrag eingeben', 'warning')
      return
    }
    if (!selectedPaymentAccountId) {
      addToast('Bitte ein Zahlungskonto auswählen', 'warning')
      return
    }

    setIsSavingPayment(true)
    try {
      const result = await setPaymentDue(paymentDueOrder.id, {
        finalAmount: amount,
        paymentAccountId: selectedPaymentAccountId,
      })
      if (result.success) {
        addToast('Zahlung ausstehend gesetzt', 'success')
        setPaymentDueOrder(null)
        loadData()
      } else {
        addToast(result.error || 'Fehler', 'error')
      }
    } catch (err) {
      addToast('Ein Fehler ist aufgetreten', 'error')
    } finally {
      setIsSavingPayment(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadData()
  }

  const handleDeleteOrder = async (order: OrderWithDetails) => {
    if (!confirm(`Möchten Sie Bestellung ${order.orderNumber} wirklich löschen?`)) {
      return
    }

    try {
      const result = await deleteOrder(order.id)
      if (result.success) {
        addToast('Bestellung gelöscht', 'success')
        loadData()
      } else {
        addToast(result.error || 'Fehler', 'error')
      }
    } catch (err) {
      addToast('Ein Fehler ist aufgetreten', 'error')
    }
  }

  // Nächste mögliche Status je aktuellem Status
  const nextStatusOptions: Partial<Record<OrderStatus, { status: OrderStatus; label: string }[]>> = {
    PENDING: [
      { status: 'CONFIRMED', label: 'Bestätigen' },
      { status: 'CANCELLED', label: 'Stornieren' },
    ],
    CONFIRMED: [
      { status: 'ON_THE_WAY', label: 'Unterwegs setzen' },
      { status: 'CANCELLED', label: 'Stornieren' },
    ],
    ON_THE_WAY: [
      { status: 'DELIVERED', label: 'Abgeliefert' },
      // PAYMENT_PENDING wird separat behandelt
    ],
    DELIVERED: [
      // PAYMENT_PENDING wird separat behandelt
    ],
  }

  const statusOptions = [
    { value: '', label: 'Alle Status' },
    { value: 'PENDING', label: 'Ausstehend' },
    { value: 'CONFIRMED', label: 'Bestätigt' },
    { value: 'ON_THE_WAY', label: 'Unterwegs' },
    { value: 'DELIVERED', label: 'Abgeliefert' },
    { value: 'PAYMENT_PENDING', label: 'Zahlung ausstehend' },
    { value: 'COMPLETED', label: 'Abgeschlossen' },
    { value: 'CANCELLED', label: 'Storniert' },
    { value: 'EXITED', label: 'Ausgetreten' },
  ]

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Bestellungen</h1>
        <Button
          onClick={() => setShowMasterDeliveryList(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          📋 Gesamtliste
        </Button>
      </div>

      {/* Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <Input
            type="text"
            placeholder="Suche nach Bestellnummer, Name, Email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button type="submit">Suchen</Button>
        </form>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={statusOptions}
          className="w-56"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <span className="text-4xl mb-4 block">📦</span>
            <p className="text-gray-500">Keine Bestellungen gefunden</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const options = nextStatusOptions[order.status] || []
            const canSetPaymentDue = ['ON_THE_WAY', 'DELIVERED'].includes(order.status)
            const canComplete = order.status === 'PAYMENT_PENDING'

            return (
              <Card key={order.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    {/* Info */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Link
                          href={`/orders/${order.id}`}
                          className="font-mono font-medium hover:text-primary-600"
                        >
                          {order.orderNumber}
                        </Link>
                        <Badge className={orderStatusColors[order.status]}>
                          {orderStatusLabels[order.status]}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500 space-y-1">
                        <p>
                          <strong>Kunde:</strong> {order.user ? `${order.user.name} (${order.user.email})` : '(Benutzer gelöscht)'}
                        </p>
                        <p>
                          <strong>Datum:</strong> {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {order.items.slice(0, 3).map((item, i) => (
                          <span
                            key={i}
                            className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                          >
                            {item.quantity}× {item.isCustomRequest ? 'Sonderwunsch' : (item as any).box?.name || item.product?.name}
                          </span>
                        ))}
                        {order.items.length > 3 && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            +{order.items.length - 3} weitere
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Preis */}
                    <div className="text-right shrink-0">
                      <p className="text-sm text-gray-400">Ungefähr</p>
                      <p className="text-lg font-bold text-gray-700">
                        {formatCurrency(order.totalAmount)}
                      </p>
                      {order.finalAmount !== null && (
                        <>
                          <p className="text-sm text-gray-400 mt-1">Genau</p>
                          <p className="text-xl font-bold text-primary-600">
                            {formatCurrency(order.finalAmount)}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Aktionen */}
                    <div className="flex flex-col gap-2 min-w-[180px]">
                      {/* Reguläre Status-Buttons */}
                      {options.map((opt) => (
                        <Button
                          key={opt.status}
                          size="sm"
                          variant={opt.status === 'CANCELLED' ? 'ghost' : 'outline'}
                          className={opt.status === 'CANCELLED' ? 'text-red-600 hover:bg-red-50' : ''}
                          onClick={() => handleStatusChange(order.id, opt.status)}
                        >
                          {opt.label}
                        </Button>
                      ))}

                      {/* Zahlung ausstehend setzen */}
                      {canSetPaymentDue && (
                        <Button
                          size="sm"
                          onClick={() => openPaymentDueDialog(order)}
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          Zahlung fällig setzen
                        </Button>
                      )}

                      {/* Abschließen */}
                      {canComplete && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange(order.id, 'COMPLETED')}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Abschließen
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeliveryOrder(order)}
                        className="w-full"
                      >
                        Lieferliste
                      </Button>

                      <Link href={`/orders/${order.id}`}>
                        <Button variant="outline" size="sm" className="w-full">
                          Details
                        </Button>
                      </Link>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteOrder(order)}
                        className="text-red-600 hover:text-red-700 w-full"
                      >
                        🗑️ Löschen
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Payment-Due Dialog */}
      <Dialog open={!!paymentDueOrder} onClose={() => setPaymentDueOrder(null)}>
        <DialogHeader>
          <DialogTitle>Zahlung ausstehend — {paymentDueOrder?.orderNumber}</DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Ungefährer Betrag:{' '}
            <strong>{paymentDueOrder ? formatCurrency(paymentDueOrder.totalAmount) : ''}</strong>
            <br />
            Gib den genauen Betrag ein, der vom Kunden zu zahlen ist.
          </p>

          <Input
            label="Genauer Betrag (€) *"
            type="number"
            step="0.01"
            min="0"
            value={finalAmount}
            onChange={(e) => setFinalAmount(e.target.value)}
            disabled={isSavingPayment}
          />

          <Select
            label="Zahlungskonto *"
            value={selectedPaymentAccountId}
            onChange={(e) => setSelectedPaymentAccountId(e.target.value)}
            options={paymentAccounts.map((a) => ({
              value: a.id,
              label: `${a.name}${a.isDefault ? ' (Standard)' : ''}`,
            }))}
            disabled={isSavingPayment}
          />
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setPaymentDueOrder(null)} disabled={isSavingPayment}>
            Abbrechen
          </Button>
          <Button onClick={handleSetPaymentDue} isLoading={isSavingPayment}>
            Zahlung fällig setzen
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Master Delivery List Modal - alle Bestellungen sortiert nach Kategorien */}
      {showMasterDeliveryList && (
        <Dialog open onClose={() => setShowMasterDeliveryList(false)}>
          <DialogHeader>
            <DialogTitle>📋 Gesamtlieferliste - Alle Bestellungen</DialogTitle>
          </DialogHeader>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            {orders
              .filter((o) => ['PENDING', 'CONFIRMED', 'ON_THE_WAY'].includes(o.status))
              .length === 0 ? (
              <p className="text-gray-500">Keine ausstehenden Bestellungen</p>
            ) : (
              <div className="space-y-4">
                {/* Group by Produkt-Name */}
                {Array.from(
                  orders
                    .filter((o) => ['PENDING', 'CONFIRMED', 'ON_THE_WAY'].includes(o.status))
                    .reduce((acc, order) => {
                      order.items.forEach((item) => {
                        const key = item.isCustomRequest
                          ? 'Sonderwünsche'
                          : (item as any).box?.name || item.product?.name || 'Sonstiges'
                        if (!acc.has(key)) acc.set(key, [])
                        acc.get(key)!.push({ order, item })
                      })
                      return acc
                    }, new Map<string, Array<{ order: OrderWithDetails; item: any }>>())
                ).map(([productName, items]) => (
                  <div key={productName} className="border rounded-lg p-4">
                    <h3 className="font-bold text-lg mb-3 text-primary-600">
                      {productName} ({items.length}×)
                    </h3>
                    <div className="space-y-2">
                      {items.map(({ order, item }, idx) => (
                        <div key={`${order.id}-${idx}`} className="text-sm bg-gray-50 dark:bg-gray-700 p-2 rounded">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium text-gray-800 dark:text-gray-200">
                                {order.user?.name} ({order.orderNumber})
                              </p>

                              {/* Box Details */}
                              {(item as any).box?.items && (
                                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 ml-2">
                                  {(item as any).box.items.map((boxItem: any, j: number) => {
                                    const config = item.boxItemConfigurations?.find(
                                      (c: any) => c.productId === boxItem.product?.id
                                    )
                                    return (
                                      <div key={j}>
                                        • {boxItem.quantity}× {boxItem.product?.name}
                                        {config?.selectedOptions && config.selectedOptions.length > 0 && (
                                          <div className="text-xs text-gray-500 dark:text-gray-500 ml-3">
                                            {config.selectedOptions
                                              .map((opt: any) => opt.optionName)
                                              .join(', ')}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}

                              {/* Regular product options */}
                              {item.selectedOptions && (item.selectedOptions as any).length > 0 && !item.isCustomRequest && (
                                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 ml-2">
                                  {(item.selectedOptions as any).map((opt: any) => opt.optionName).join(', ')}
                                </div>
                              )}

                              {/* Custom request */}
                              {item.isCustomRequest && item.customRequestText && (
                                <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1 ml-2">
                                  📝 {item.customRequestText}
                                </p>
                              )}
                            </div>
                            <span className="text-right whitespace-nowrap ml-2">
                              <span className="inline-block bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded text-xs font-medium">
                                {item.quantity}×
                              </span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMasterDeliveryList(false)}>
              Schließen
            </Button>
            <Button onClick={() => window.print()}>
              🖨️ Drucken
            </Button>
          </DialogFooter>
        </Dialog>
      )}

      {/* Delivery List Modal */}
      {deliveryOrder && (
        <Dialog open onClose={() => setDeliveryOrder(null)}>
          <DialogHeader>
            <DialogTitle>Lieferliste — {deliveryOrder.orderNumber}</DialogTitle>
          </DialogHeader>
          <DialogContent className="max-h-[70vh] overflow-y-auto">
            <div className="space-y-4">
              <div className="border-b pb-3">
                <p className="text-sm">
                  <strong>Kunde:</strong> {deliveryOrder.user?.name || '(Benutzer gelöscht)'}
                </p>
                <p className="text-sm text-gray-600">
                  {deliveryOrder.user?.email}
                </p>
              </div>

              {deliveryOrder.items.map((item, i) => (
                <div key={item.id} className="border rounded-lg p-3 space-y-2">
                  <div className="font-medium text-lg">
                    {item.quantity}× {item.isCustomRequest ? 'Sonderwunsch' : (item as any).box?.name || item.product?.name}
                  </div>

                  {item.isCustomRequest && item.customRequestText && (
                    <p className="text-sm text-gray-700 bg-yellow-50 p-2 rounded">
                      📝 {item.customRequestText}
                    </p>
                  )}

                  {/* Box Items mit Konfigurationen anzeigen */}
                  {(item as any).box?.items && (
                    <div className="text-sm space-y-2 ml-2 border-l-2 border-gray-300 pl-2">
                      <p className="font-medium text-gray-600">📦 Box Inhalt:</p>
                      {(item as any).box.items.map((boxItem: any, j: number) => {
                        // Finde die Konfiguration für dieses BoxItem
                        const config = item.boxItemConfigurations?.find((c: any) => c.productId === boxItem.product?.id)
                        return (
                          <div key={j} className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                            <div className="font-medium text-gray-800 dark:text-gray-200">
                              • {boxItem.quantity}× {boxItem.product?.name}
                            </div>
                            {config?.selectedOptions && config.selectedOptions.length > 0 && (
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 ml-3 space-y-0.5">
                                {config.selectedOptions.map((opt: any, k: number) => (
                                  <div key={k}>
                                    → {opt.groupName}: <span className="font-medium">{opt.optionName}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Selected Options anzeigen */}
                  {item.selectedOptions && (item.selectedOptions as any).length > 0 && (
                    <div className="text-sm space-y-1 ml-2">
                      <p className="font-medium text-gray-600">Optionen:</p>
                      {(item.selectedOptions as any).map((opt: any, j: number) => (
                        <div key={j} className="text-gray-700">
                          • {opt.groupName}: <strong>{opt.optionName}</strong>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-right text-sm font-medium pt-2">
                    {formatCurrency(item.totalPrice)}
                  </div>
                </div>
              ))}

              <div className="border-t pt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Summe:</span>
                  <strong>{formatCurrency(deliveryOrder.totalAmount)}</strong>
                </div>
                {deliveryOrder.finalAmount !== null && (
                  <div className="flex justify-between text-sm text-primary-600">
                    <span>Genau zu zahlen:</span>
                    <strong>{formatCurrency(deliveryOrder.finalAmount)}</strong>
                  </div>
                )}
              </div>

              {deliveryOrder.notes && (
                <div className="bg-blue-50 p-3 rounded text-sm">
                  <strong>Notizen:</strong> {deliveryOrder.notes}
                </div>
              )}
            </div>
          </DialogContent>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeliveryOrder(null)}>
              Schließen
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  )
}
