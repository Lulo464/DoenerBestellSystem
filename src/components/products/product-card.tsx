'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { ProductWithDetails } from '@/types'
import { ProductConfigurator } from './product-configurator'

interface ProductCardProps {
  product: ProductWithDetails
  onAddToCart: (product: ProductWithDetails, options?: any[], quantity?: number) => Promise<void>
}

// Hilfsfunktion für Produkt-Emoji
function getProductEmoji(categoryName?: string): string {
  if (!categoryName) return '🍽️'
  
  if (categoryName.includes('Döner')) return '🥙'
  if (categoryName.includes('Pizza')) return '🍕'
  if (categoryName.includes('Burger')) return '🍔'
  if (categoryName.includes('Getränke')) return '🥤'
  if (categoryName.includes('Sonstiges')) return '📝'
  
  return '🍽️'
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [showConfigurator, setShowConfigurator] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleQuickAdd = async () => {
    if (product.isConfigurable) {
      setShowConfigurator(true)
      return
    }

    setIsLoading(true)
    try {
      await onAddToCart(product)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfiguredAdd = async (options: any[], quantity: number) => {
    setIsLoading(true)
    try {
      await onAddToCart(product, options, quantity)
      setShowConfigurator(false)
    } finally {
      setIsLoading(false)
    }
  }

  // Sichere Kategorie-Abfrage
  const categoryName = product.category?.name || ''

  return (
    <>
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        {/* Image Placeholder */}
        <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
          <span className="text-5xl">
            {getProductEmoji(categoryName)}
          </span>
        </div>

        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{product.name}</h3>
            {product.isConfigurable && (
              <Badge variant="secondary" className="text-xs">
                Konfigurierbar
              </Badge>
            )}
          </div>

          {product.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
              {product.description}
            </p>
          )}

          <div className="flex justify-between items-center">
            <div>
              <span className="text-lg font-bold text-primary-600">
                {formatCurrency(product.basePrice)}
              </span>
              {product.isConfigurable && (
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">ab</span>
              )}
            </div>
            <Button
              size="sm"
              onClick={handleQuickAdd}
              isLoading={isLoading}
            >
              {product.isConfigurable ? 'Konfigurieren' : 'Hinzufügen'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configurator Modal */}
      {showConfigurator && (
        <ProductConfigurator
          product={product}
          onConfirm={handleConfiguredAdd}
          onClose={() => setShowConfigurator(false)}
          isLoading={isLoading}
        />
      )}
    </>
  )
}
