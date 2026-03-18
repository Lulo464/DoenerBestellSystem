'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/actions/categories'

interface CategoryData {
  id: string
  name: string
  description: string | null
  sortOrder: number
  isActive: boolean
  _count?: { products: number }
}

export default function AdminCategoriesPage() {
  const { addToast } = useToast()
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Dialog State
  const [showDialog, setShowDialog] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryData | null>(null)

  // Form State
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [sortOrder, setSortOrder] = useState('')

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    setIsLoading(true)
    try {
      const result = await getCategories()
      if (result.success) {
        setCategories(result.data || [])
      } else {
        addToast(result.error || 'Fehler beim Laden', 'error')
      }
    } catch (err) {
      addToast('Ein Fehler ist aufgetreten', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const openDialog = (category?: CategoryData) => {
    if (category) {
      setEditingCategory(category)
      setName(category.name)
      setDescription(category.description || '')
      setIsActive(category.isActive)
      setSortOrder(category.sortOrder?.toString() || '')
    } else {
      setEditingCategory(null)
      setName('')
      setDescription('')
      setIsActive(true)
      setSortOrder('')
    }
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!name.trim()) {
      addToast('Name ist erforderlich', 'warning')
      return
    }

    setIsSaving(true)
    try {
      if (editingCategory) {
        const result = await updateCategory(editingCategory.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          isActive,
          sortOrder: sortOrder ? parseInt(sortOrder) : undefined,
        })

        if (result.success) {
          addToast('Kategorie aktualisiert', 'success')
        } else {
          addToast(result.error || 'Fehler', 'error')
          return
        }
      } else {
        const result = await createCategory({
          name: name.trim(),
          description: description.trim() || undefined,
        })

        if (result.success) {
          addToast('Kategorie erstellt', 'success')
        } else {
          addToast(result.error || 'Fehler', 'error')
          return
        }
      }

      setShowDialog(false)
      loadCategories()
    } catch (err) {
      addToast('Ein Fehler ist aufgetreten', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (category: CategoryData) => {
    if (category._count && category._count.products > 0) {
      addToast(
        `Kategorie "${category.name}" enthält ${category._count.products} Produkt(e). Bitte erst Produkte löschen oder verschieben.`,
        'warning'
      )
      return
    }

    if (!confirm(`Möchten Sie die Kategorie "${category.name}" wirklich löschen?`)) {
      return
    }

    try {
      const result = await deleteCategory(category.id)

      if (result.success) {
        addToast('Kategorie gelöscht', 'success')
        loadCategories()
      } else {
        addToast(result.error || 'Fehler beim Löschen', 'error')
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
        <h1 className="text-2xl font-bold">Kategorien</h1>
        <Button onClick={() => openDialog()}>+ Neue Kategorie</Button>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <span className="text-4xl mb-4 block">📁</span>
            <p className="text-gray-500 mb-4">Keine Kategorien vorhanden</p>
            <Button onClick={() => openDialog()}>Erste Kategorie erstellen</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {categories.map((category) => (
            <Card
              key={category.id}
              className={!category.isActive ? 'opacity-50' : ''}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-2xl">
                      📁
                    </div>

                    {/* Info */}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{category.name}</h3>
                        {!category.isActive && (
                          <Badge variant="destructive" className="text-xs">
                            Inaktiv
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {category._count?.products || 0} Produkte
                        </Badge>
                      </div>
                      {category.description && (
                        <p className="text-sm text-gray-500">{category.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDialog(category)}
                    >
                      Bearbeiten
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(category)}
                      disabled={category._count && category._count.products > 0}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title={
                        category._count && category._count.products > 0
                          ? 'Kategorie enthält Produkte'
                          : 'Löschen'
                      }
                    >
                      🗑️
                    </Button>
                  </div>
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
            {editingCategory ? 'Kategorie bearbeiten' : 'Neue Kategorie'}
          </DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-4">
          <Input
            label="Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Döner & Türkische Spezialitäten"
            disabled={isSaving}
          />

          <Textarea
            label="Beschreibung (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Kurze Beschreibung der Kategorie..."
            rows={3}
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

          {editingCategory && (
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
                Kategorie aktiv (im Katalog sichtbar)
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
            {editingCategory ? 'Speichern' : 'Erstellen'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}

