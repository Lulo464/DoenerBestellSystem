'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { CartItemWithProduct, SelectedOption } from '@/types'
import { updateCartItemQuantity, removeFromCart } from '@/actions/cart'
import { useToast } from '@/components/ui/toast'

interface ProductConfig {
  productId: string
  productName: string
  selectedOptions: SelectedOption[]
}

interface CartItemProps {
  item: CartItemWithProduct & {
    boxItemConfigurations?: ProductConfig[] | null
  }
  onUpdate: () => void
}

export function CartItem({ item, onUpdate }: CartItemProps) {
  const { addToast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const handleQuantityChange = async (newQuantity: number) => {
    setIsLoading(true)
    try {
      const result = await updateCartItemQuantity(item.id, newQuantity)
      if (result.success) {
        onUpdate()
      } else {
        addToast(result.error || 'Fehler', 'error')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemove = async () => {
    setIsLoading(true)
    try {
      const result = await removeFromCart(item.id)
      if (result.success) {
        addToast('Artikel entfernt', 'success')
        onUpdate()
      } else {
        addToast(result.error || 'Fehler', 'error')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const selectedOptions = item.selectedOptions as SelectedOption[] | null
  const boxConfigurations = item.boxItemConfigurations as ProductConfig[] | null

  // Bestimme ob es eine Box, ein Produkt oder ein Sonderwunsch ist
  const isBox = !!(item as any).box
  const isCustomRequest = item.isCustomRequest
  const displayName = isBox 
    ? (item as any).box?.name 
    : isCustomRequest 
      ? 'Sonderwunsch' 
      : item.product?.name || 'Unbekanntes Produkt'

  return (
    <div className="flex gap-4 py-4 border-b border-gray-100">
      {/* Product Icon */}
      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-2xl shrink-0">
        {isBox ? '📦' : isCustomRequest ? '📝' : '🍽️'}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-gray-900">{displayName}</h4>
          {isBox && (
            <Badge variant="secondary" className="text-xs">Box</Badge>
          )}
        </div>

        {/* Custom Request Text */}
        {isCustomRequest && item.customRequestText && (
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {item.customRequestText}
          </p>
        )}
        {/* Selected Options für normale Produkte */}
        {selectedOptions && selectedOptions.length > 0 && !isBox && (
          <div className="mt-1 flex flex-wrap gap-1">
            {selectedOptions.map((opt, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
              >
                {opt.optionName}
                {opt.priceModifier > 0 && (
                  <span className="ml-1 text-gray-400">
                    +{formatCurrency(opt.priceModifier)}
                  </span>
                )}
              </span>
            ))}
          </div>
        )}

        {/* Box Inhalt und Konfigurationen */}
        {isBox && (item as any).box && (
          <div className="mt-2 space-y-2">
            {/* Box Items */}
            <div className="text-xs text-gray-500">
              <span className="font-medium">Inhalt: </span>
              {(item as any).box.items.map((boxItem: any, i: number) => (
                <span key={i}>
                  {i > 0 && ', '}
                  {boxItem.quantity}× {boxItem.product?.name}
                </span>
              ))}
            </div>

            {/* Box Konfigurationen anzeigen */}
            {boxConfigurations && boxConfigurations.length > 0 && (
              <div className="space-y-1">
                {boxConfigurations.map((config, i) => (
                  <div key={i} className="text-xs">
                    <span className="font-medium text-gray-600">{config.productName}:</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {config.selectedOptions.map((opt, j) => (
                        <span
                          key={j}
                          className="inline-flex items-center px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs"
                        >
                          {opt.optionName}
                          {opt.priceModifier > 0 && (
                            <span className="ml-1 text-blue-400">
                              +{formatCurrency(opt.priceModifier)}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Price */}
        <div className="mt-2 text-sm text-gray-500">
          {formatCurrency(item.unitPrice)} × {item.quantity} ={' '}
          <span className="font-medium text-gray-900">
            {formatCurrency(item.unitPrice * item.quantity)}
          </span>
        </div>
      </div>

      {/* Quantity Controls */}
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuantityChange(item.quantity - 1)}
            disabled={isLoading}
            className="h-8 w-8 p-0"
          >
            -
          </Button>
          <span className="w-8 text-center font-medium">{item.quantity}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuantityChange(item.quantity + 1)}
            disabled={isLoading}
            className="h-8 w-8 p-0"
          >
            +
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRemove}
          disabled={isLoading}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          Entfernen
        </Button>
      </div>
    </div>
  )
}

