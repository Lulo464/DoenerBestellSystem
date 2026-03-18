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
    </div>
  )
}
