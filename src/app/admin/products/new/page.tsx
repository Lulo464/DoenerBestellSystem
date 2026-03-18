'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { getCategories, createProduct } from '@/actions/products'
import { useSession } from 'next-auth/react'
import { hasPermission } from '@/lib/permissions'
import { Role } from '@prisma/client'
import Link from 'next/link'

export default function NewProductPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { addToast } = useToast()

  const [categories, setCategories] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [basePrice, setBasePrice] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [isConfigurable, setIsConfigurable] = useState(false)

  const userRole = session?.user?.role as Role | undefined
  const canChangePrice = userRole ? hasPermission(userRole, 'change_prices') : false

  useEffect(() => {
    getCategories().then(setCategories)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      addToast('Name ist erforderlich', 'warning')
      return
    }

    if (!categoryId) {
      addToast('Kategorie ist erforderlich', 'warning')
      return
    }

    const price = parseFloat(basePrice) || 0
    if (price < 0) {
      addToast('Preis darf nicht negativ sein', 'warning')
      return
    }

    if (!canChangePrice && price > 0) {
      addToast('Sie haben keine Berechtigung, Preise zu setzen', 'error')
      return
    }

    setIsLoading(true)

    try {
      const result = await createProduct({
        name: name.trim(),
        description: description.trim(),
        basePrice: price,
        categoryId,
        isActive: true,
        isConfigurable,
      })

      if (result.success && result.data) {
        addToast('Produkt erstellt', 'success')
        router.push(`/admin/products/${result.data.id}`)
      } else {
        addToast(result.error || 'Fehler beim Erstellen', 'error')
      }
    } catch (err) {
      addToast('Ein Fehler ist aufgetreten', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/products">
          <Button variant="ghost" size="sm">
            ← Zurück
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Neues Produkt</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Produktdetails</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Döner Kebab"
              required
              disabled={isLoading}
            />

            <Textarea
              label="Beschreibung"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beschreibung des Produkts..."
              rows={3}
              disabled={isLoading}
            />

            <Select
              label="Kategorie *"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Kategorie auswählen..."
              disabled={isLoading}
            />

            <Input
              label="Basispreis (€) *"
              type="number"
              step="0.01"
              min="0"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              placeholder="0.00"
              disabled={isLoading || !canChangePrice}
              helperText={
                !canChangePrice
                  ? 'Nur Hauptadministratoren können Preise setzen'
                  : undefined
              }
            />

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isConfigurable"
                checked={isConfigurable}
                onChange={(e) => setIsConfigurable(e.target.checked)}
                disabled={isLoading}
                className="h-4 w-4 text-primary-600 rounded border-gray-300"
              />
              <label htmlFor="isConfigurable" className="text-sm">
                Konfigurierbares Produkt (mit Optionen wie Fleisch, Soße, etc.)
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" isLoading={isLoading}>
                Produkt erstellen
              </Button>
              <Link href="/admin/products">
                <Button variant="outline" disabled={isLoading}>
                  Abbrechen
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

