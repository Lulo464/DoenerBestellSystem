'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { formatCurrency } from '@/lib/utils'
import { getBoxes, createBox, updateBox, deleteBox, BoxWithItems } from '@/actions/boxes'
import { getProducts } from '@/actions/products'
import { useSession } from 'next-auth/react'
import { hasPermission } from '@/lib/permissions'
import { Role } from '@prisma/client'
import { SelectedOption, OptionGroupWithOptions } from '@/types'

interface ProductOption {
  id: string
  name: string
  basePrice: number
  isConfigurable: boolean
  category: { name: string }
  optionGroups: OptionGroupWithOptions[]
}

interface BoxItemInput {
  productId: string
  productName: string
  quantity: number
  price: number
  selectedOptions: SelectedOption[]
}

export default function AdminBoxesPage() {
  const { data: session } = useSession()
  const { addToast } = useToast()

  const [boxes, setBoxes] = useState<BoxWithItems[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Dialog State
  const [showDialog, setShowDialog] = useState(false)
  const [editingBox, setEditingBox] = useState<BoxWithItems | null>(null)

  // Form State
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [totalPrice, setTotalPrice] = useState('')
  const [useCustomPrice, setUseCustomPrice] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [sortOrder, setSortOrder] = useState('')
  const [boxItems, setBoxItems] = useState<BoxItemInput[]>([])

  // Product Selection
  const [showProductSelector, setShowProductSelector] = useState(false)
  const [productSearch, setProductSearch] = useState('')

  // Option Configurator
  const [configuringItemId, setConfiguringItemId] = useState<string | null>(null)
  const [tempSelectedOptions, setTempSelectedOptions] = useState<SelectedOption[]>([])

  const userRole = session?.user?.role as Role | undefined
  const canChangePrice = userRole ? hasPermission(userRole, 'change_prices') : false

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [boxesResult, productsData] = await Promise.all([
        getBoxes(),
        getProducts({ isActive: true }),
      ])

      if (boxesResult.success) {
        setBoxes(boxesResult.data || [])
      }

      setProducts(productsData as ProductOption[])
    } catch (err) {
      addToast('Fehler beim Laden', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // Berechne Gesamtpreis aus Items
  const calculatedPrice = boxItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )

  const openDialog = (box?: BoxWithItems) => {
    if (box) {
      setEditingBox(box)
      setName(box.name)
      setDescription(box.description || '')
      setTotalPrice(box.totalPrice.toString())
      setUseCustomPrice(true)
      setIsActive(box.isActive)
      setSortOrder(box.sortOrder?.toString() || '')
      setBoxItems(
        box.items.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.product.basePrice,
          selectedOptions: item.selectedOptions || [],
        }))
      )
    } else {
      setEditingBox(null)
      setName('')
      setDescription('')
      setTotalPrice('')
      setUseCustomPrice(false)
      setIsActive(true)
      setSortOrder('')
      setBoxItems([])
    }
    setShowDialog(true)
  }

  const addProduct = (product: ProductOption) => {
    const existing = boxItems.find((item) => item.productId === product.id)

    if (existing) {
      setBoxItems(
        boxItems.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      )
    } else {
      // Standardoptionen vorbelegen falls konfigurierbar
      const defaultOptions: SelectedOption[] = []
      if (product.isConfigurable) {
        product.optionGroups.forEach((group) => {
          group.options
            .filter((opt) => opt.isDefault)
            .forEach((opt) => {
              defaultOptions.push({
                optionId: opt.id,
                optionName: opt.name,
                groupName: group.name,
                priceModifier: opt.priceModifier,
              })
            })
        })
      }

      setBoxItems([
        ...boxItems,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          price: product.basePrice,
          selectedOptions: defaultOptions,
        },
      ])
    }

    setShowProductSelector(false)
    setProductSearch('')
  }

  const updateItemQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setBoxItems(boxItems.filter((item) => item.productId !== productId))
    } else {
      setBoxItems(
        boxItems.map((item) =>
          item.productId === productId ? { ...item, quantity } : item
        )
      )
    }
  }

  const removeItem = (productId: string) => {
    setBoxItems(boxItems.filter((item) => item.productId !== productId))
  }

  // Option Configurator
  const openConfigurator = (productId: string) => {
    const item = boxItems.find((i) => i.productId === productId)
    if (!item) return
    setTempSelectedOptions(item.selectedOptions || [])
    setConfiguringItemId(productId)
  }

  const saveConfigurator = () => {
    if (!configuringItemId) return
    setBoxItems(
      boxItems.map((item) =>
        item.productId === configuringItemId
          ? { ...item, selectedOptions: tempSelectedOptions }
          : item
      )
    )
    setConfiguringItemId(null)
  }

  const toggleOption = (
    group: OptionGroupWithOptions,
    optId: string,
    optName: string,
    priceModifier: number
  ) => {
    const alreadySelected = tempSelectedOptions.some((o) => o.optionId === optId)

    if (alreadySelected) {
      setTempSelectedOptions(tempSelectedOptions.filter((o) => o.optionId !== optId))
    } else {
      if (!group.isMultiple) {
        // Einzelauswahl: andere Optionen dieser Gruppe entfernen
        const withoutGroup = tempSelectedOptions.filter((o) => o.groupName !== group.name)
        setTempSelectedOptions([
          ...withoutGroup,
          { optionId: optId, optionName: optName, groupName: group.name, priceModifier },
        ])
      } else {
        setTempSelectedOptions([
          ...tempSelectedOptions,
          { optionId: optId, optionName: optName, groupName: group.name, priceModifier },
        ])
      }
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      addToast('Name ist erforderlich', 'warning')
      return
    }

    if (boxItems.length === 0) {
      addToast('Mindestens ein Produkt erforderlich', 'warning')
      return
    }

    const finalPrice = useCustomPrice ? parseFloat(totalPrice) || 0 : calculatedPrice

    if (finalPrice < 0) {
      addToast('Preis darf nicht negativ sein', 'warning')
      return
    }

    setIsSaving(true)
    try {
      if (editingBox) {
        const result = await updateBox(editingBox.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          totalPrice: canChangePrice ? finalPrice : undefined,
          isActive,
          sortOrder: sortOrder ? parseInt(sortOrder) : undefined,
          items: boxItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            selectedOptions: item.selectedOptions.length > 0 ? item.selectedOptions : undefined,
          })),
        })

        if (result.success) {
          addToast('Box aktualisiert', 'success')
        } else {
          addToast(result.error || 'Fehler', 'error')
          return
        }
      } else {
        const result = await createBox({
          name: name.trim(),
          description: description.trim() || undefined,
          totalPrice: finalPrice,
          items: boxItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            selectedOptions: item.selectedOptions.length > 0 ? item.selectedOptions : undefined,
          })),
        })

        if (result.success) {
          addToast('Box erstellt', 'success')
        } else {
          addToast(result.error || 'Fehler', 'error')
          return
        }
      }

      setShowDialog(false)
      loadData()
    } catch (err) {
      addToast('Ein Fehler ist aufgetreten', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (box: BoxWithItems) => {
    if (!confirm(`Möchten Sie die Box "${box.name}" wirklich löschen?`)) {
      return
    }

    try {
      const result = await deleteBox(box.id)

      if (result.success) {
        addToast(result.message || 'Box gelöscht', 'success')
        loadData()
      } else {
        addToast(result.error || 'Fehler', 'error')
      }
    } catch (err) {
      addToast('Ein Fehler ist aufgetreten', 'error')
    }
  }

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.category.name.toLowerCase().includes(productSearch.toLowerCase())
  )

  const configuringProduct = configuringItemId
    ? products.find((p) => p.id === configuringItemId)
    : null

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
        <div>
          <h1 className="text-2xl font-bold">Boxen / Bundles</h1>
          <p className="text-gray-500 text-sm mt-1">
            Erstelle Produkt-Kombinationen zu einem Festpreis
          </p>
        </div>
        <Button onClick={() => openDialog()}>+ Neue Box</Button>
      </div>

      {boxes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <span className="text-4xl mb-4 block">📦</span>
            <p className="text-gray-500 mb-4">Keine Boxen vorhanden</p>
            <Button onClick={() => openDialog()}>Erste Box erstellen</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boxes.map((box) => (
            <Card key={box.id} className={!box.isActive ? 'opacity-50' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{box.name}</CardTitle>
                  <div className="flex gap-1">
                    {!box.isActive && (
                      <Badge variant="destructive" className="text-xs">
                        Inaktiv
                      </Badge>
                    )}
                  </div>
                </div>
                {box.description && (
                  <p className="text-sm text-gray-500">{box.description}</p>
                )}
              </CardHeader>
              <CardContent>
                {/* Enthaltene Produkte */}
                <div className="space-y-1 mb-4">
                  {box.items.map((item) => (
                    <div key={item.id} className="text-sm">
                      <div className="flex justify-between">
                        <span>
                          {item.quantity}× {item.product.name}
                        </span>
                        <span className="text-gray-400">
                          {formatCurrency(item.product.basePrice * item.quantity)}
                        </span>
                      </div>
                      {item.selectedOptions && item.selectedOptions.length > 0 && (
                        <div className="text-xs text-gray-400 ml-3 mt-0.5">
                          {item.selectedOptions.map((o) => o.optionName).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Preis */}
                <div className="border-t pt-3 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Einzelpreis:</span>
                    <span className="text-gray-400 line-through text-sm">
                      {formatCurrency(
                        box.items.reduce(
                          (sum, item) => sum + item.product.basePrice * item.quantity,
                          0
                        )
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Box-Preis:</span>
                    <span className="text-xl font-bold text-primary-600">
                      {formatCurrency(box.totalPrice)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDialog(box)}
                    className="flex-1"
                  >
                    Bearbeiten
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(box)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    🗑️
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Box Dialog */}
      <Dialog open={showDialog} onClose={() => setShowDialog(false)}>
        <DialogHeader>
          <DialogTitle>
            {editingBox ? 'Box bearbeiten' : 'Neue Box erstellen'}
          </DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-4 max-h-[70vh] overflow-y-auto">
          <Input
            label="Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Familien-Box, Mittags-Menü"
            disabled={isSaving}
          />

          <Textarea
            label="Beschreibung (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Kurze Beschreibung der Box..."
            rows={2}
            disabled={isSaving}
          />

          <Input
            label="Sortierreihenfolge"
            type="number"
            min="0"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            disabled={isSaving}
            helperText="Niedrigere Nummern werden zuerst angezeigt"
          />

          {/* Produkte in der Box */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Enthaltene Produkte *
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowProductSelector(true)}
                disabled={isSaving}
              >
                + Produkt hinzufügen
              </Button>
            </div>

            {boxItems.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                <span className="text-gray-400">
                  Noch keine Produkte hinzugefügt
                </span>
              </div>
            ) : (
              <div className="border rounded-lg divide-y">
                {boxItems.map((item) => {
                  const productDef = products.find((p) => p.id === item.productId)
                  return (
                    <div key={item.productId} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <span className="font-medium">{item.productName}</span>
                          <span className="text-gray-400 text-sm ml-2">
                            ({formatCurrency(item.price)} pro Stück)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {productDef?.isConfigurable && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openConfigurator(item.productId)}
                              disabled={isSaving}
                              className="h-8 px-2 text-xs"
                            >
                              Konfigurieren
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => updateItemQuantity(item.productId, item.quantity - 1)}
                            disabled={isSaving}
                            className="h-8 w-8 p-0"
                          >
                            -
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => updateItemQuantity(item.productId, item.quantity + 1)}
                            disabled={isSaving}
                            className="h-8 w-8 p-0"
                          >
                            +
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.productId)}
                            disabled={isSaving}
                            className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                          >
                            ✕
                          </Button>
                        </div>
                      </div>
                      {/* Vorgemerkte Optionen anzeigen */}
                      {item.selectedOptions.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.selectedOptions.map((opt) => (
                            <span
                              key={opt.optionId}
                              className="text-xs bg-primary-50 text-primary-700 border border-primary-200 rounded px-1.5 py-0.5"
                            >
                              {opt.optionName}
                              {opt.priceModifier > 0 && ` (+${formatCurrency(opt.priceModifier)})`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Berechneter Preis */}
            {boxItems.length > 0 && (
              <div className="mt-2 text-right text-sm text-gray-500">
                Summe Einzelpreise: {formatCurrency(calculatedPrice)}
              </div>
            )}
          </div>

          {/* Preis */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                id="useCustomPrice"
                checked={useCustomPrice}
                onChange={(e) => setUseCustomPrice(e.target.checked)}
                disabled={isSaving || !canChangePrice}
                className="h-4 w-4 text-primary-600 rounded border-gray-300"
              />
              <label htmlFor="useCustomPrice" className="text-sm">
                Eigenen Box-Preis festlegen (Rabatt)
              </label>
            </div>

            {useCustomPrice ? (
              <Input
                label="Box-Preis (€)"
                type="number"
                step="0.01"
                min="0"
                value={totalPrice}
                onChange={(e) => setTotalPrice(e.target.value)}
                disabled={isSaving || !canChangePrice}
                helperText={
                  !canChangePrice
                    ? 'Nur Hauptadministratoren können Preise ändern'
                    : `Ersparnis: ${formatCurrency(calculatedPrice - (parseFloat(totalPrice) || 0))}`
                }
              />
            ) : (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-gray-600">Box-Preis (automatisch):</span>
                  <span className="font-bold">{formatCurrency(calculatedPrice)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Aktiv-Status bei Bearbeitung */}
          {editingBox && (
            <div className="flex items-center gap-3 border-t pt-4">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={isSaving}
                className="h-4 w-4 text-primary-600 rounded border-gray-300"
              />
              <label htmlFor="isActive" className="text-sm">
                Box aktiv (im Katalog sichtbar)
              </label>
            </div>
          )}
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
            {editingBox ? 'Speichern' : 'Box erstellen'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Product Selector Dialog */}
      <Dialog open={showProductSelector} onClose={() => setShowProductSelector(false)}>
        <DialogHeader>
          <DialogTitle>Produkt hinzufügen</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <Input
            placeholder="Produkt suchen..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="mb-4"
          />

          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {filteredProducts.length === 0 ? (
              <p className="text-center text-gray-500 py-4">
                Keine Produkte gefunden
              </p>
            ) : (
              filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => addProduct(product)}
                  className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <span className="font-medium">{product.name}</span>
                    <span className="text-xs text-gray-400 ml-2">
                      {product.category.name}
                    </span>
                    {product.isConfigurable && (
                      <span className="text-xs text-primary-600 ml-2">konfigurierbar</span>
                    )}
                  </div>
                  <span className="text-primary-600 font-medium">
                    {formatCurrency(product.basePrice)}
                  </span>
                </div>
              ))
            )}
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowProductSelector(false)}>
            Schließen
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Option Configurator Dialog */}
      {configuringProduct && (
        <Dialog open={!!configuringItemId} onClose={() => setConfiguringItemId(null)}>
          <DialogHeader>
            <DialogTitle>Optionen für: {configuringProduct.name}</DialogTitle>
          </DialogHeader>
          <DialogContent className="space-y-4 max-h-[60vh] overflow-y-auto">
            {configuringProduct.optionGroups.map((group) => (
              <div key={group.id}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-sm">{group.name}</span>
                  {group.isRequired && (
                    <span className="text-xs text-red-500">Pflichtfeld</span>
                  )}
                  {group.isMultiple && (
                    <span className="text-xs text-gray-400">Mehrfachauswahl</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.options.map((opt) => {
                    const isSelected = tempSelectedOptions.some((o) => o.optionId === opt.id)
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          toggleOption(group, opt.id, opt.name, opt.priceModifier)
                        }
                        className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                          isSelected
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'
                        }`}
                      >
                        {opt.name}
                        {opt.priceModifier > 0 && (
                          <span className="ml-1 opacity-75">
                            +{formatCurrency(opt.priceModifier)}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            {tempSelectedOptions.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-2">
                Keine Optionen ausgewählt — Kunde wählt selbst beim Bestellen
              </p>
            )}
          </DialogContent>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfiguringItemId(null)}>
              Abbrechen
            </Button>
            <Button onClick={saveConfigurator}>Übernehmen</Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  )
}
