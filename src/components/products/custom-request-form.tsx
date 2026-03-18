'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { addCustomRequestToCart } from '@/actions/cart'

interface CustomRequestFormProps {
  onSuccess?: () => void
}

export function CustomRequestForm({ onSuccess }: CustomRequestFormProps) {
  const { addToast } = useToast()
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!description.trim()) {
      addToast('Bitte geben Sie eine Beschreibung ein', 'warning')
      return
    }

    const priceValue = parseFloat(price) || 0

    if (priceValue < 0) {
      addToast('Der Preis darf nicht negativ sein', 'warning')
      return
    }

    setIsLoading(true)

    try {
      const result = await addCustomRequestToCart({
        description: description.trim(),
        price: priceValue,
      })

      if (result.success) {
        addToast('Sonderwunsch zum Warenkorb hinzugefügt', 'success')
        setDescription('')
        setPrice('')
        onSuccess?.()
      } else {
        addToast(result.error || 'Fehler beim Hinzufügen', 'error')
      }
    } catch (err) {
      addToast('Ein Fehler ist aufgetreten', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📝 Sonderwunsch / Freitext-Anfrage
        </CardTitle>
        <CardDescription>
          Für individuelle Bestellungen, die nicht im Katalog sind
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            label="Beschreibung"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Beschreiben Sie Ihren Wunsch..."
            rows={3}
            required
            disabled={isLoading}
          />

          <Input
            label="Preis (optional)"
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            helperText="Wenn bekannt, geben Sie den Preis an. Sonst 0 € eingeben."
            disabled={isLoading}
          />

          <Button type="submit" isLoading={isLoading} className="w-full">
            Zum Warenkorb hinzufügen
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
