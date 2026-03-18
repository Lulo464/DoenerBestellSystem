'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'
import { BoxWithItems, ProductConfig } from '@/actions/boxes'
import { SelectedOption } from '@/types'
import { BoxConfigurator } from './box-configurator'

interface ProductDetails {
  id: string
  name: string
  isConfigurable: boolean
  optionGroups: {
    id: string
    name: string
    description: string | null
    isRequired: boolean
    isMultiple: boolean
    minSelections: number
    maxSelections: number | null
    options: {
      id: string
      name: string
      priceModifier: number
      isDefault: boolean
    }[]
  }[]
}

interface BoxCardProps {
  box: BoxWithItems
  productDetails?: Map<string, ProductDetails>
  onAddToCart: (box: BoxWithItems, configurations?: any[]) => Promise<void>
}

export function BoxCard({ box, productDetails, onAddToCart }: BoxCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showConfigurator, setShowConfigurator] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Berechne Einzelpreis-Summe
  const originalPrice = box.items.reduce(
    (sum, item) => sum + item.product.basePrice * item.quantity,
    0
  )

  const savings = originalPrice - box.totalPrice
  const savingsPercent = originalPrice > 0 
    ? Math.round((savings / originalPrice) * 100) 
    : 0

  // Prüfe ob konfigurierbare Produkte enthalten sind
  const hasConfigurableProducts = productDetails 
    ? box.items.some((item) => {
        const product = productDetails.get(item.product.id)
        return product?.isConfigurable
      })
    : false

  const handleClick = () => {
    // Boxen sind nicht konfigurierbar - immer direkt hinzufügen
    handleAddToCart([])
  }

  const handleAddToCart = async (configurations: any[]) => {
    setIsLoading(true)
    try {
      await onAddToCart(box, configurations)
      setShowConfigurator(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Card className="overflow-hidden hover:shadow-md transition-shadow border-2 border-primary-100">
        {/* Header mit Rabatt-Badge */}
        <div className="h-32 bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center relative">
          <span className="text-5xl">📦</span>
          {savings > 0 && (
            <Badge className="absolute top-2 right-2 bg-green-500 text-white">
              -{savingsPercent}% sparen
            </Badge>
          )}
          {hasConfigurableProducts && (
            <Badge className="absolute top-2 left-2 bg-blue-500 text-white">
              Konfigurierbar
            </Badge>
          )}
        </div>

        <CardContent className="p-4">
          <h3 className="font-semibold text-gray-900 text-lg mb-2">{box.name}</h3>

          {box.description && (
            <p className="text-sm text-gray-500 mb-3">{box.description}</p>
          )}

          {/* Enthaltene Produkte */}
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Inhalt:</p>
            <ul className="space-y-1">
              {box.items.map((item) => {
                const product = productDetails?.get(item.product.id)
                const isConfigurable = product?.isConfigurable

                return (
                  <li key={item.id} className="text-sm text-gray-700 dark:text-gray-300 flex justify-between items-center">
                    <span className="flex items-center gap-1">
                      {item.quantity}× {item.product.name}
                      {isConfigurable && (
                        <span className="text-xs text-blue-500">⚙️</span>
                      )}
                    </span>
                    <span className="text-gray-400 dark:text-gray-500">
                      {formatCurrency(item.product.basePrice * item.quantity)}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Preis */}
          <div className="flex items-center justify-between mb-4">
            <div>
              {savings > 0 && (
                <span className="text-sm text-gray-400 line-through mr-2">
                  {formatCurrency(originalPrice)}
                </span>
              )}
              <span className="text-xl font-bold text-primary-600">
                {formatCurrency(box.totalPrice)}
              </span>
            </div>
            {savings > 0 && (
              <Badge variant="success" className="text-xs">
                {formatCurrency(savings)} gespart
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            <Button
              className="w-full"
              onClick={handleClick}
              isLoading={isLoading}
            >
              In den Warenkorb
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowPreview(true)}
            >
              Konfiguration anzeigen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Modal - Zeige Vorkonfigurationen */}
      {showPreview && (
        <Dialog open onClose={() => setShowPreview(false)}>
          <DialogHeader>
            <DialogTitle>{box.name} - Vorkonfiguration</DialogTitle>
          </DialogHeader>
          <DialogContent className="max-h-[60vh] overflow-y-auto">
            <div className="space-y-4">
              {box.items.map((item) => {
                const selectedOptions = (item.selectedOptions as SelectedOption[] | null) || []
                return (
                  <div key={item.id} className="border rounded-lg p-3">
                    <p className="font-medium mb-2">{item.product.name}</p>
                    {selectedOptions.length > 0 ? (
                      <div className="space-y-1">
                        {selectedOptions.map((opt, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <span className="inline-block w-2 h-2 bg-primary-600 rounded-full" />
                            <span className="text-gray-700 dark:text-gray-300">{opt.groupName}:</span>
                            <span className="font-medium text-gray-900 dark:text-white">{opt.optionName}</span>
                            {opt.priceModifier > 0 && (
                              <span className="text-green-600 text-xs ml-auto">+{formatCurrency(opt.priceModifier)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">Keine Optionen konfiguriert</p>
                    )}
                  </div>
                )
              })}
            </div>
          </DialogContent>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Schließen
            </Button>
          </DialogFooter>
        </Dialog>
      )}

      {/* Box Configurator Modal */}
      {showConfigurator && productDetails && (
        <BoxConfigurator
          box={box}
          productDetails={productDetails}
          onConfirm={handleAddToCart}
          onClose={() => setShowConfigurator(false)}
          isLoading={isLoading}
        />
      )}
    </>
  )
}
