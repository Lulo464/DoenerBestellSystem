'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { formatCurrency } from '@/lib/utils'
import {
  getProduct,
  getCategories,
  updateProduct,
  addOptionGroup,
  updateOptionGroup,
  deleteOptionGroup,
  addOption,
  updateOption,
  deleteOption,
} from '@/actions/products'
import { ProductWithDetails, OptionGroupWithOptions } from '@/types'
import { useSession } from 'next-auth/react'
import { hasPermission } from '@/lib/permissions'
import { Role } from '@prisma/client'
import Link from 'next/link'

export default function EditProductPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const { addToast } = useToast()

  const [product, setProduct] = useState<ProductWithDetails | null>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [basePrice, setBasePrice] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [isConfigurable, setIsConfigurable] = useState(false)
  const [sortOrder, setSortOrder] = useState('')

  // Option Group Dialog
  const [showOptionGroupDialog, setShowOptionGroupDialog] = useState(false)
  const [editingOptionGroup, setEditingOptionGroup] = useState<OptionGroupWithOptions | null>(null)
  const [optionGroupName, setOptionGroupName] = useState('')
  const [optionGroupDescription, setOptionGroupDescription] = useState('')
  const [optionGroupRequired, setOptionGroupRequired] = useState(false)
  const [optionGroupMultiple, setOptionGroupMultiple] = useState(false)
  const [optionGroupMinSelections, setOptionGroupMinSelections] = useState('0')
  const [optionGroupMaxSelections, setOptionGroupMaxSelections] = useState('')

  // Option Dialog
  const [showOptionDialog, setShowOptionDialog] = useState(false)
  const [editingOption, setEditingOption] = useState<any>(null)
  const [optionGroupIdForNewOption, setOptionGroupIdForNewOption] = useState('')
  const [optionName, setOptionName] = useState('')
  const [optionPrice, setOptionPrice] = useState('0')
  const [optionIsDefault, setOptionIsDefault] = useState(false)

  const userRole = session?.user?.role as Role | undefined
  const canChangePrice = userRole ? hasPermission(userRole, 'change_prices') : false

  useEffect(() => {
    loadData()
  }, [params.id])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [productData, categoriesData] = await Promise.all([
        getProduct(params.id as string),
        getCategories(),
      ])

      if (!productData) {
        addToast('Produkt nicht gefunden', 'error')
        router.push('/admin/products')
        return
      }

      setProduct(productData)
      setCategories(categoriesData)

      // Set form values
      setName(productData.name)
      setDescription(productData.description || '')
      setBasePrice(productData.basePrice.toString())
      setCategoryId(productData.categoryId)
      setIsActive(productData.isActive)
      setIsConfigurable(productData.isConfigurable)
      setSortOrder(productData.sortOrder?.toString() || '')
    } catch (err) {
      addToast('Fehler beim Laden', 'error')
      router.push('/admin/products')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveProduct = async () => {
    if (!name.trim()) {
      addToast('Name ist erforderlich', 'warning')
      return
    }

    const price = parseFloat(basePrice) || 0
    const priceChanged = product && price !== product.basePrice

    if (priceChanged && !canChangePrice) {
      addToast('Keine Berechtigung zur Preisänderung', 'error')
      return
    }

    setIsSaving(true)
    try {
      const result = await updateProduct(params.id as string, {
        name: name.trim(),
        description: description.trim(),
        basePrice: canChangePrice ? price : undefined,
        categoryId,
        isActive,
        isConfigurable,
        sortOrder: sortOrder ? parseInt(sortOrder) : undefined,
      })

      if (result.success) {
        addToast('Produkt gespeichert', 'success')
        loadData()
      } else {
        addToast(result.error || 'Fehler beim Speichern', 'error')
      }
    } catch (err) {
      addToast('Ein Fehler ist aufgetreten', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  // Option Group Handlers
  const openOptionGroupDialog = (group?: OptionGroupWithOptions) => {
    if (group) {
      setEditingOptionGroup(group)
      setOptionGroupName(group.name)
      setOptionGroupDescription(group.description || '')
      setOptionGroupRequired(group.isRequired)
      setOptionGroupMultiple(group.isMultiple)
      setOptionGroupMinSelections(group.minSelections.toString())
      setOptionGroupMaxSelections(group.maxSelections?.toString() || '')
    } else {
      setEditingOptionGroup(null)
      setOptionGroupName('')
      setOptionGroupDescription('')
      setOptionGroupRequired(false)
      setOptionGroupMultiple(false)
      setOptionGroupMinSelections('0')
      setOptionGroupMaxSelections('')
    }
    setShowOptionGroupDialog(true)
  }

  const handleSaveOptionGroup = async () => {
    if (!optionGroupName.trim()) {
      addToast('Name ist erforderlich', 'warning')
      return
    }

    setIsSaving(true)
    try {
      if (editingOptionGroup) {
        const result = await updateOptionGroup(editingOptionGroup.id, {
          name: optionGroupName.trim(),
          description: optionGroupDescription.trim() || undefined,
          isRequired: optionGroupRequired,
          isMultiple: optionGroupMultiple,
          minSelections: parseInt(optionGroupMinSelections) || 0,
          maxSelections: optionGroupMaxSelections ? parseInt(optionGroupMaxSelections) : undefined,
        })

        if (result.success) {
          addToast('Optionsgruppe aktualisiert', 'success')
        } else {
          addToast(result.error || 'Fehler', 'error')
        }
      } else {
        const result = await addOptionGroup(params.id as string, {
          name: optionGroupName.trim(),
          description: optionGroupDescription.trim() || undefined,
          isRequired: optionGroupRequired,
          isMultiple: optionGroupMultiple,
          minSelections: parseInt(optionGroupMinSelections) || 0,
          maxSelections: optionGroupMaxSelections ? parseInt(optionGroupMaxSelections) : undefined,
          options: [],
        })

        if (result.success) {
          addToast('Optionsgruppe erstellt', 'success')
        } else {
          addToast(result.error || 'Fehler', 'error')
        }
      }

      setShowOptionGroupDialog(false)
      loadData()
    } catch (err) {
      addToast('Ein Fehler ist aufgetreten', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteOptionGroup = async (groupId: string) => {
    if (!confirm('Optionsgruppe wirklich löschen?')) return

    try {
      const result = await deleteOptionGroup(groupId)
      if (result.success) {
        addToast('Optionsgruppe gelöscht', 'success')
        loadData()
      } else {
        addToast(result.error || 'Fehler', 'error')
      }
    } catch (err) {
      addToast('Ein Fehler ist aufgetreten', 'error')
    }
  }

  // Option Handlers
  const openOptionDialog = (groupId: string, option?: any) => {
    setOptionGroupIdForNewOption(groupId)
    if (option) {
      setEditingOption(option)
      setOptionName(option.name)
      setOptionPrice(option.priceModifier.toString())
      setOptionIsDefault(option.isDefault)
    } else {
      setEditingOption(null)
      setOptionName('')
      setOptionPrice('0')
      setOptionIsDefault(false)
    }
    setShowOptionDialog(true)
  }

  const handleSaveOption = async () => {
    if (!optionName.trim()) {
      addToast('Name ist erforderlich', 'warning')
      return
    }

    const price = parseFloat(optionPrice) || 0

    if (price > 0 && !canChangePrice) {
      addToast('Keine Berechtigung zur Preisänderung', 'error')
      return
    }

    setIsSaving(true)
    try {
      if (editingOption) {
        const result = await updateOption(editingOption.id, {
          name: optionName.trim(),
          priceModifier: canChangePrice ? price : undefined,
          isDefault: optionIsDefault,
        })

        if (result.success) {
          addToast('Option aktualisiert', 'success')
        } else {
          addToast(result.error || 'Fehler', 'error')
        }
      } else {
        const result = await addOption(optionGroupIdForNewOption, {
          name: optionName.trim(),
          priceModifier: price,
          isDefault: optionIsDefault,
        })

        if (result.success) {
          addToast('Option erstellt', 'success')
        } else {
          addToast(result.error || 'Fehler', 'error')
        }
      }

      setShowOptionDialog(false)
      loadData()
    } catch (err) {
      addToast('Ein Fehler ist aufgetreten', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteOption = async (optionId: string) => {
    if (!confirm('Option wirklich löschen?')) return

    try {
      const result = await deleteOption(optionId)
      if (result.success) {
        addToast('Option gelöscht', 'success')
        loadData()
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

  if (!product) {
    return null
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/products">
          <Button variant="ghost" size="sm">
            ← Zurück
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Produkt bearbeiten</h1>
        {!product.isActive && (
          <Badge variant="destructive">Inaktiv</Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Produktdetails</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving}
            />

            <Textarea
              label="Beschreibung"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={isSaving}
            />

            <Select
              label="Kategorie *"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              disabled={isSaving}
            />

            <Input
              label="Basispreis (€) *"
              type="number"
              step="0.01"
              min="0"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              disabled={isSaving || !canChangePrice}
              helperText={
                !canChangePrice
                  ? 'Nur Hauptadministratoren können Preise ändern'
                  : undefined
              }
            />

            <div className="space-y-3">
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
                  Produkt aktiv (im Katalog sichtbar)
                </label>
              </div>

              <Input
                label="Sortierreihenfolge"
                type="number"
                min="0"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                disabled={isSaving}
                helperText="Niedrigere Nummern werden zuerst angezeigt"
              />

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isConfigurable"
                  checked={isConfigurable}
                  onChange={(e) => setIsConfigurable(e.target.checked)}
                  disabled={isSaving}
                  className="h-4 w-4 text-primary-600 rounded border-gray-300"
                />
                <label htmlFor="isConfigurable" className="text-sm">
                  Konfigurierbares Produkt
                </label>
              </div>
            </div>

            <div className="pt-4">
              <Button onClick={handleSaveProduct} isLoading={isSaving}>
                Änderungen speichern
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Option Groups */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Optionsgruppen</h2>
            <Button
              size="sm"
              onClick={() => openOptionGroupDialog()}
              disabled={!isConfigurable}
            >
              + Neue Gruppe
            </Button>
          </div>

          {!isConfigurable && (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                <p>Aktivieren Sie "Konfigurierbares Produkt" um Optionen hinzuzufügen</p>
              </CardContent>
            </Card>
          )}

          {isConfigurable && product.optionGroups.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                <p>Keine Optionsgruppen vorhanden</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => openOptionGroupDialog()}
                >
                  Erste Optionsgruppe erstellen
                </Button>
              </CardContent>
            </Card>
          )}

          {isConfigurable &&
            product.optionGroups.map((group) => (
              <Card key={group.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{group.name}</CardTitle>
                      {group.isRequired && (
                        <Badge variant="destructive" className="text-xs">
                          Pflicht
                        </Badge>
                      )}
                      {group.isMultiple && (
                        <Badge variant="secondary" className="text-xs">
                          Mehrfach
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openOptionGroupDialog(group)}
                      >
                        ✏️
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteOptionGroup(group.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        🗑️
                      </Button>
                    </div>
                  </div>
                  {group.description && (
                    <p className="text-sm text-gray-500">{group.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {group.options.map((option) => (
                      <div
                        key={option.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded"
                      >
                        <div className="flex items-center gap-2">
                          <span>{option.name}</span>
                          {option.isDefault && (
                            <Badge variant="outline" className="text-xs">
                              Standard
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {option.priceModifier > 0 && (
                            <span className="text-sm text-gray-500">
                              +{formatCurrency(option.priceModifier)}
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openOptionDialog(group.id, option)}
                          >
                            ✏️
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteOption(option.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            🗑️
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => openOptionDialog(group.id)}
                  >
                    + Option hinzufügen
                  </Button>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>

      {/* Option Group Dialog */}
      <Dialog open={showOptionGroupDialog} onClose={() => setShowOptionGroupDialog(false)}>
        <DialogHeader>
          <DialogTitle>
            {editingOptionGroup ? 'Optionsgruppe bearbeiten' : 'Neue Optionsgruppe'}
          </DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-4">
          <Input
            label="Name *"
            value={optionGroupName}
            onChange={(e) => setOptionGroupName(e.target.value)}
            placeholder="z.B. Fleischauswahl"
          />

          <Textarea
            label="Beschreibung"
            value={optionGroupDescription}
            onChange={(e) => setOptionGroupDescription(e.target.value)}
            placeholder="Optionale Beschreibung..."
            rows={2}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="optionGroupRequired"
                checked={optionGroupRequired}
                onChange={(e) => setOptionGroupRequired(e.target.checked)}
                className="h-4 w-4 text-primary-600 rounded border-gray-300"
              />
              <label htmlFor="optionGroupRequired" className="text-sm">
                Pflichtauswahl
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="optionGroupMultiple"
                checked={optionGroupMultiple}
                onChange={(e) => setOptionGroupMultiple(e.target.checked)}
                className="h-4 w-4 text-primary-600 rounded border-gray-300"
              />
              <label htmlFor="optionGroupMultiple" className="text-sm">
                Mehrfachauswahl
              </label>
            </div>
          </div>

          {optionGroupMultiple && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Min. Auswahl"
                type="number"
                min="0"
                value={optionGroupMinSelections}
                onChange={(e) => setOptionGroupMinSelections(e.target.value)}
              />
              <Input
                label="Max. Auswahl (leer = unbegrenzt)"
                type="number"
                min="1"
                value={optionGroupMaxSelections}
                onChange={(e) => setOptionGroupMaxSelections(e.target.value)}
              />
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowOptionGroupDialog(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSaveOptionGroup} isLoading={isSaving}>
            Speichern
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Option Dialog */}
      <Dialog open={showOptionDialog} onClose={() => setShowOptionDialog(false)}>
        <DialogHeader>
          <DialogTitle>
            {editingOption ? 'Option bearbeiten' : 'Neue Option'}
          </DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-4">
          <Input
            label="Name *"
            value={optionName}
            onChange={(e) => setOptionName(e.target.value)}
            placeholder="z.B. Hähnchen"
          />

          <Input
            label="Aufpreis (€)"
            type="number"
            step="0.01"
            min="0"
            value={optionPrice}
            onChange={(e) => setOptionPrice(e.target.value)}
            disabled={!canChangePrice}
            helperText={
              !canChangePrice
                ? 'Nur Hauptadministratoren können Preise setzen'
                : undefined
            }
          />

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="optionIsDefault"
              checked={optionIsDefault}
              onChange={(e) => setOptionIsDefault(e.target.checked)}
              className="h-4 w-4 text-primary-600 rounded border-gray-300"
            />
            <label htmlFor="optionIsDefault" className="text-sm">
              Standardmäßig ausgewählt
            </label>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowOptionDialog(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSaveOption} isLoading={isSaving}>
            Speichern
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}

