'use client'

import { useState, useMemo } from 'react'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, cn } from '@/lib/utils'
import { ProductWithDetails, SelectedOption } from '@/types'

interface ProductConfiguratorProps {
  product: ProductWithDetails
  onConfirm: (options: SelectedOption[], quantity: number) => Promise<void>
  onClose: () => void
  isLoading: boolean
}

export function ProductConfigurator({
  product,
  onConfirm,
  onClose,
  isLoading,
}: ProductConfiguratorProps) {
  const [quantity, setQuantity] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState<Map<string, Set<string>>>(() => {
    // Initialize with default options
    const defaults = new Map<string, Set<string>>()
    
    product.optionGroups.forEach((group) => {
      const defaultOpts = group.options
        .filter((opt) => opt.isDefault)
        .map((opt) => opt.id)
      
      if (defaultOpts.length > 0) {
        defaults.set(group.id, new Set(defaultOpts))
      } else {
        defaults.set(group.id, new Set())
      }
    })
    
    return defaults
  })

  const toggleOption = (groupId: string, optionId: string, isMultiple: boolean) => {
    setSelectedOptions((prev) => {
      const newMap = new Map(prev)
      const groupSelections = new Set(prev.get(groupId) || [])

      if (isMultiple) {
        // Toggle for multiple selection
        if (groupSelections.has(optionId)) {
          groupSelections.delete(optionId)
        } else {
          groupSelections.add(optionId)
        }
      } else {
        // Single selection - replace
        groupSelections.clear()
        groupSelections.add(optionId)
      }

      newMap.set(groupId, groupSelections)
      return newMap
    })
  }

  const { totalPrice, selectedOptionsArray, validationErrors } = useMemo(() => {
    let total = product.basePrice
    const options: SelectedOption[] = []
    const errors: string[] = []

    product.optionGroups.forEach((group) => {
      const selections = selectedOptions.get(group.id) || new Set()
      const selectionCount = selections.size

      // Validation
      if (group.isRequired && selectionCount < group.minSelections) {
        errors.push(`${group.name}: Mindestens ${group.minSelections} Auswahl erforderlich`)
      }
      if (group.maxSelections && selectionCount > group.maxSelections) {
        errors.push(`${group.name}: Maximal ${group.maxSelections} Auswahlen erlaubt`)
      }

      // Calculate price and collect options
      group.options.forEach((opt) => {
        if (selections.has(opt.id)) {
          total += opt.priceModifier
          options.push({
            optionId: opt.id,
            optionName: opt.name,
            groupName: group.name,
            priceModifier: opt.priceModifier,
          })
        }
      })
    })

    return {
      totalPrice: total * quantity,
      selectedOptionsArray: options,
      validationErrors: errors,
    }
  }, [product, selectedOptions, quantity])

  const handleConfirm = () => {
    if (validationErrors.length === 0) {
      onConfirm(selectedOptionsArray, quantity)
    }
  }

  return (
    <Dialog open onClose={onClose}>
      <DialogHeader>
        <DialogTitle>{product.name} konfigurieren</DialogTitle>
      </DialogHeader>

      <DialogContent className="max-h-[60vh] overflow-y-auto">
        {/* Option Groups */}
        {product.optionGroups.map((group) => {
          const selections = selectedOptions.get(group.id) || new Set()

          return (
            <div key={group.id} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <h4 className="font-medium text-gray-900">{group.name}</h4>
                {group.isRequired && (
                  <Badge variant="destructive" className="text-xs">
                    Pflicht
                  </Badge>
                )}
                {group.isMultiple && (
                  <span className="text-xs text-gray-500">
                    (Mehrfachauswahl
                    {group.maxSelections ? `, max. ${group.maxSelections}` : ''})
                  </span>
                )}
              </div>

              {group.description && (
                <p className="text-sm text-gray-500 mb-2">{group.description}</p>
              )}

              <div className="grid grid-cols-2 gap-2">
                {group.options.map((option) => {
                  const isSelected = selections.has(option.id)

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleOption(group.id, option.id, group.isMultiple)}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg border text-left transition-colors',
                        isSelected
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <span className="font-medium">{option.name}</span>
                      {option.priceModifier > 0 && (
                        <span className="text-sm text-gray-500">
                          +{formatCurrency(option.priceModifier)}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Quantity */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Anzahl</span>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                -
              </Button>
              <span className="w-8 text-center font-medium">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity((q) => q + 1)}
              >
                +
              </Button>
            </div>
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <ul className="text-sm text-red-700 space-y-1">
              {validationErrors.map((error, i) => (
                <li key={i}>• {error}</li>
              ))}
            </ul>
          </div>
        )}
      </DialogContent>

      <DialogFooter>
        <div className="flex items-center justify-between w-full">
          <div>
            <span className="text-sm text-gray-500">Gesamtpreis:</span>
            <span className="ml-2 text-xl font-bold text-primary-600">
              {formatCurrency(totalPrice)}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Abbrechen
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={validationErrors.length > 0 || isLoading}
              isLoading={isLoading}
            >
              In den Warenkorb
            </Button>
          </div>
        </div>
      </DialogFooter>
    </Dialog>
  )
}

