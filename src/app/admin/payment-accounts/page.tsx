'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { formatIBAN } from '@/lib/utils'
import {
  getPaymentAccounts,
  createPaymentAccount,
  updatePaymentAccount,
  deletePaymentAccount,
  setDefaultPaymentAccount,
} from '@/actions/payment-accounts'
import { PaymentAccountData } from '@/types'

export default function AdminPaymentAccountsPage() {
  const { addToast } = useToast()
  const [accounts, setAccounts] = useState<PaymentAccountData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Dialog State
  const [showDialog, setShowDialog] = useState(false)
  const [editingAccount, setEditingAccount] = useState<PaymentAccountData | null>(null)

  // Form State
  const [name, setName] = useState('')
  const [iban, setIban] = useState('')
  const [accountHolder, setAccountHolder] = useState('')
  const [bic, setBic] = useState('')
  const [paypalEmail, setPaypalEmail] = useState('')
  const [paypalMeLink, setPaypalMeLink] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    setIsLoading(true)
    try {
      const data = await getPaymentAccounts(false)
      setAccounts(data)
    } catch (err) {
      addToast('Fehler beim Laden', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const openDialog = (account?: PaymentAccountData) => {
    if (account) {
      setEditingAccount(account)
      setName(account.name)
      setIban(account.iban)
      setAccountHolder(account.accountHolder)
      setBic(account.bic || '')
      setPaypalEmail(account.paypalEmail || '')
      setPaypalMeLink(account.paypalMeLink || '')
      setIsDefault(account.isDefault)
      setIsActive(account.isActive)
    } else {
      setEditingAccount(null)
      setName('')
      setIban('')
      setAccountHolder('')
      setBic('')
      setPaypalEmail('')
      setPaypalMeLink('')
      setIsDefault(false)
      setIsActive(true)
    }
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!name.trim()) {
      addToast('Name ist erforderlich', 'warning')
      return
    }

    if (!iban.trim()) {
      addToast('IBAN ist erforderlich', 'warning')
      return
    }

    if (!accountHolder.trim()) {
      addToast('Kontoinhaber ist erforderlich', 'warning')
      return
    }

    setIsSaving(true)
    try {
      const accountData = {
        name: name.trim(),
        iban: iban.trim(),
        accountHolder: accountHolder.trim(),
        bic: bic.trim() || undefined,
        paypalEmail: paypalEmail.trim() || undefined,
        paypalMeLink: paypalMeLink.trim() || undefined,
        isDefault,
        isActive,
      }

      if (editingAccount) {
        const result = await updatePaymentAccount(editingAccount.id, accountData)
        if (result.success) {
          addToast('Zahlungskonto aktualisiert', 'success')
        } else {
          addToast(result.error || 'Fehler', 'error')
          return
        }
      } else {
        const result = await createPaymentAccount(accountData)
        if (result.success) {
          addToast('Zahlungskonto erstellt', 'success')
        } else {
          addToast(result.error || 'Fehler', 'error')
          return
        }
      }

      setShowDialog(false)
      loadAccounts()
    } catch (err) {
      addToast('Ein Fehler ist aufgetreten', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (account: PaymentAccountData) => {
    if (!confirm(`Möchten Sie "${account.name}" wirklich löschen/deaktivieren?`)) {
      return
    }

    try {
      const result = await deletePaymentAccount(account.id)
      if (result.success) {
        addToast(result.message || 'Erfolgreich', 'success')
        loadAccounts()
      } else {
        addToast(result.error || 'Fehler', 'error')
      }
    } catch (err) {
      addToast('Ein Fehler ist aufgetreten', 'error')
    }
  }

  const handleSetDefault = async (accountId: string) => {
    try {
      const result = await setDefaultPaymentAccount(accountId)
      if (result.success) {
        addToast('Standard-Zahlungskonto geändert', 'success')
        loadAccounts()
      } else {
        addToast(result.error || 'Fehler', 'error')
      }
    } catch (err) {
      addToast('Ein Fehler ist aufgetreten', 'error')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Zahlungskonten</h1>
        <Button onClick={() => openDialog()}>+ Neues Konto</Button>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <span className="text-4xl mb-4 block">💳</span>
            <p className="text-gray-500 mb-4">Keine Zahlungskonten vorhanden</p>
            <Button onClick={() => openDialog()}>Erstes Konto erstellen</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <Card
              key={account.id}
              className={!account.isActive ? 'opacity-50' : ''}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{account.name}</CardTitle>
                  <div className="flex gap-1">
                    {account.isDefault && (
                      <Badge variant="success" className="text-xs">
                        Standard
                      </Badge>
                    )}
                    {!account.isActive && (
                      <Badge variant="destructive" className="text-xs">
                        Inaktiv
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-1">
                  <p className="text-gray-600">
                    <strong>Inhaber:</strong> {account.accountHolder}
                  </p>
                  <p className="font-mono text-xs">
                    <strong>IBAN:</strong> {formatIBAN(account.iban)}
                  </p>
                  {account.bic && (
                    <p className="text-gray-600">
                      <strong>BIC:</strong> {account.bic}
                    </p>
                  )}
                  {account.paypalMeLink && (
                    <p className="text-gray-600 flex items-center gap-1">
                      <strong>PayPal:</strong>
                      <span className="text-blue-600">✓</span>
                    </p>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDialog(account)}
                    className="flex-1"
                  >
                    Bearbeiten
                  </Button>
                  {!account.isDefault && account.isActive && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetDefault(account.id)}
                      title="Als Standard setzen"
                    >
                      ⭐
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(account)}
                    className="text-red-600 hover:text-red-700"
                  >
                    🗑️
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={showDialog} onClose={() => setShowDialog(false)}>
        <DialogHeader>
          <DialogTitle>
            {editingAccount ? 'Zahlungskonto bearbeiten' : 'Neues Zahlungskonto'}
          </DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-4">
          <Input
            label="Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Döner-Kasse"
            disabled={isSaving}
          />

          <Input
            label="IBAN *"
            value={iban}
            onChange={(e) => setIban(e.target.value)}
            placeholder="DE89 3704 0044 0532 0130 00"
            disabled={isSaving}
          />

          <Input
            label="Kontoinhaber *"
            value={accountHolder}
            onChange={(e) => setAccountHolder(e.target.value)}
            placeholder="Max Mustermann"
            disabled={isSaving}
          />

          <Input
            label="BIC (optional)"
            value={bic}
            onChange={(e) => setBic(e.target.value)}
            placeholder="COBADEFFXXX"
            disabled={isSaving}
          />

          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">PayPal (optional)</p>

            <div className="space-y-4">
              <Input
                label="PayPal E-Mail"
                type="email"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                placeholder="paypal@firma.de"
                disabled={isSaving}
              />

              <Input
                label="PayPal.me Link"
                value={paypalMeLink}
                onChange={(e) => setPaypalMeLink(e.target.value)}
                placeholder="https://paypal.me/username"
                disabled={isSaving}
                helperText="Oder nur den Benutzernamen eingeben"
              />
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isDefault"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                disabled={isSaving}
                className="h-4 w-4 text-primary-600 rounded border-gray-300"
              />
              <label htmlFor="isDefault" className="text-sm">
                Als Standard-Zahlungskonto setzen
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={isSaving}
                className="h-4 w-4 text-primary-600 rounded border-gray-300"
              />
              <label htmlFor="isActive" className="text-sm">
                Konto aktiv (kann für Bestellungen verwendet werden)
              </label>
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowDialog(false)}
            disabled={isSaving}
          >
            Abbrechen
          </Button>
          <Button onClick={handleSave} isLoading={isSaving}>
            Speichern
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
