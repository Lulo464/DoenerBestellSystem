'use client'

import { useState, useMemo } from 'react'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatCurrency, cn } from '@/lib/utils'
import { BoxWithItems } from '@/actions/boxes'
import { SelectedOption } from '@/types'

interface ProductConfig {
  productId: string
  productName: string
  selectedOptions: SelectedOption[]
}

interface BoxConfiguratorProps {
  box: BoxWithItems
  productDetails: Map<string, {
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
  }>
  onConfirm: (configurations: ProductConfig[]) => Promise<void>
  onClose: () => void
  isLoading: boolean
}

export function BoxConfigurator({
  box,
  productDetails,
  onConfirm,
  onClose,
  isLoading,
}: BoxConfiguratorProps) {
  // State für jedes konfigurierbare Produkt in der Box
  const [configurations, setConfigurations] = useState<Map<string, Map<string, Set<string>>>>(() => {
    const configs = new Map<string, Map<string, Set<string>>>()
    
    box.items.forEach((item) => {
      const product = productDetails.get(item.product.id)
      if (product?.isConfigurable) {
        const productConfig = new Map<string, Set<string>>()
        
        product.optionGroups.forEach((group) => {
          const defaultOpts = group.options
            .filter((opt) => opt.isDefault)
            .map((opt) => opt.id)
          productConfig.set(group.id, new Set(defaultOpts))
        })
        
        configs.set(item.product.id, productConfig)
      }
    })
    
    return configs
  })

  const [currentProductIndex, setCurrentProductIndex] = useState(0)

  // Finde alle konfigurierbaren Produkte in der Box
  const configurableItems = useMemo(() => {
    return box.items.filter((item) => {
      const product = productDetails.get(item.product.id)
      return product?.isConfigurable
    })
  }, [box.items, productDetails])

  const currentItem = configurableItems[currentProductIndex]
  const currentProduct = currentItem ? productDetails.get(currentItem.product.id) : null

  const toggleOption = (productId: string, groupId: string, optionId: string, isMultiple: boolean) => {
    setConfigurations((prev) => {
      const newConfigs = new Map(prev)
      const productConfig = new Map(newConfigs.get(productId) || new Map())
      const groupSelections = new Set(productConfig.get(groupId) || new Set())

      if (isMultiple) {
        if (groupSelections.has(optionId)) {
          groupSelections.delete(optionId)
        } else {
          groupSelections.add(optionId)
        }
      } else {
        groupSelections.clear()
        groupSelections.add(optionId)
      }

      productConfig.set(groupId, groupSelections)
      newConfigs.set(productId, productConfig)
      return newConfigs
    })
  }

  // Validierung für aktuelles Produkt
  const currentValidationErrors = useMemo(() => {
    if (!currentProduct) return []
    
    const errors: string[] = []
    const productConfig = configurations.get(currentItem.product.id)

    currentProduct.optionGroups.forEach((group) => {
      const selections = productConfig?.get(group.id) || new Set()
      const selectionCount = selections.size

      if (group.isRequired && selectionCount < group.minSelections) {
        errors.push(`${group.name}: Mindestens ${group.minSelections} Auswahl erforderlich`)
      }
      if (group.maxSelections && selectionCount > group.maxSelections) {
        errors.push(`${group.name}: Maximal ${group.maxSelections} Auswahlen erlaubt`)
      }
    })

    return errors
  }, [currentProduct, currentItem, configurations])

  // Gesamtvalidierung
  const allValid = useMemo(() => {
    for (const item of configurableItems) {
      const product = productDetails.get(item.product.id)
      if (!product) continue

      const productConfig = configurations.get(item.product.id)

      for (const group of product.optionGroups) {
        const selections = productConfig?.get(group.id) || new Set()
        const selectionCount = selections.size

        if (group.isRequired && selectionCount < group.minSelections) {
          return false
        }
        if (group.maxSelections && selectionCount > group.maxSelections) {
          return false
        }
      }
    }
    return true
  }, [configurableItems, productDetails, configurations])

  const handleConfirm = () => {
    const productConfigs: ProductConfig[] = []

    configurableItems.forEach((item) => {
      const product = productDetails.get(item.product.id)
      if (!product) return

      const productConfig = configurations.get(item.product.id)
      const selectedOptions: SelectedOption[] = []

      product.optionGroups.forEach((group) => {
        const selections = productConfig?.get(group.id) || new Set()

        group.options.forEach((opt) => {
          if (selections.has(opt.id)) {
            selectedOptions.push({
              optionId: opt.id,
              optionName: opt.name,
              groupName: group.name,
              priceModifier: opt.priceModifier,
            })
          }
        })
      })

      productConfigs.push({
        productId: item.product.id,
        productName: item.product.name,
        selectedOptions,
      })
    })

    onConfirm(productConfigs)
  }

  // Wenn keine konfigurierbaren Produkte, direkt bestätigen
  if (configurableItems.length === 0) {
    return (
      <Dialog open onClose={onClose}>
        <DialogHeader>
          <DialogTitle>{box.name} zum Warenkorb hinzufügen</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <p className="text-gray-600">
            Diese Box enthält keine konfigurierbaren Produkte.
          </p>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="font-medium mb-2">Inhalt:</p>
            <ul className="space-y-1 text-sm">
              {box.items.map((item) => (
                <li key={item.id}>
                  {item.quantity}× {item.product.name}
                </li>
              ))}
            </ul>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button onClick={() => onConfirm([])} isLoading={isLoading}>
            In den Warenkorb ({formatCurrency(box.totalPrice)})
          </Button>
        </DialogFooter>
      </Dialog>
    )
  }

  return (
    <Dialog open onClose={onClose}>
      <DialogHeader>
        <DialogTitle>
          {box.name} konfigurieren
        </DialogTitle>
      </DialogHeader>

      <DialogContent className="max-h-[60vh] overflow-y-auto">
        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>
              Produkt {currentProductIndex + 1} von {configurableItems.length}
            </span>
            <span>{currentItem?.product.name}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all"
              style={{
                width: `${((currentProductIndex + 1) / configurableItems.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Aktuelles Produkt konfigurieren */}
        {currentProduct && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                {currentItem.quantity > 1 && (
                  <Badge variant="secondary">{currentItem.quantity}×</Badge>
                )}
                {currentProduct.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentProduct.optionGroups.map((group) => {
                const productConfig = configurations.get(currentItem.product.id)
                const selections = productConfig?.get(group.id) || new Set()

                return (
                  <div key={group.id} className="mb-6 last:mb-0">
                    <div className="flex items-center gap-2 mb-3">
                      <h4 className="font-medium text-gray-900">{group.name}</h4>
                      {group.isRequired && (
                        <Badge variant="destructive" className="text-xs">
                          Pflicht
                        </Badge>
                      )}
                      {group.isMultiple && (
                        <span className="text-xs text-gray-500">
                          (Mehrfachauswahl{group.maxSelections ? `, max. ${group.maxSelections}` : ''})
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
                            onClick={() =>
                              toggleOption(
                                currentItem.product.id,
                                group.id,
                                option.id,
                                group.isMultiple
                              )
                            }
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

              {/* Validation Errors */}
              {currentValidationErrors.length > 0 && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <ul className="text-sm text-red-700 space-y-1">
                    {currentValidationErrors.map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </DialogContent>

      <DialogFooter>
        <div className="flex items-center justify-between w-full">
          <div className="flex gap-2">
            {currentProductIndex > 0 && (
              <Button
                variant="outline"
                onClick={() => setCurrentProductIndex((i) => i - 1)}
                disabled={isLoading}
              >
                ← Zurück
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Abbrechen
            </Button>

            {currentProductIndex < configurableItems.length - 1 ? (
              <Button
                onClick={() => setCurrentProductIndex((i) => i + 1)}
                disabled={currentValidationErrors.length > 0}
              >
                Weiter →
              </Button>
            ) : (
              <Button
                onClick={handleConfirm}
                disabled={!allValid || isLoading}
                isLoading={isLoading}
              >
                In den Warenkorb ({formatCurrency(box.totalPrice)})
              </Button>
            )}
          </div>
        </div>
      </DialogFooter>
    </Dialog>
  )
}
