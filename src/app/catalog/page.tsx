'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProductCard } from '@/components/products/product-card'
import { BoxCard } from '@/components/products/box-card'
import { CustomRequestForm } from '@/components/products/custom-request-form'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { getCategoriesWithProducts } from '@/actions/products'
import { getBoxesWithProductDetails, addBoxToCart, BoxWithItems, ProductConfig } from '@/actions/boxes'
import { addToCart } from '@/actions/cart'
import { ProductWithDetails, SelectedOption } from '@/types'

export default function CatalogPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [categories, setCategories] = useState<any[]>([])
  const [boxes, setBoxes] = useState<BoxWithItems[]>([])
  const [productDetails, setProductDetails] = useState<Map<string, any>>(new Map())
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showBoxes, setShowBoxes] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCustomRequest, setShowCustomRequest] = useState(false)

  useEffect(() => {
    loadCatalog()
  }, [])

  const loadCatalog = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [categoriesData, boxesResult] = await Promise.all([
        getCategoriesWithProducts(),
        getBoxesWithProductDetails(true),
      ])
      
      setCategories(categoriesData || [])
      
      if (boxesResult.success && boxesResult.data) {
        setBoxes(boxesResult.data.boxes || [])
        setProductDetails(new Map(Object.entries(boxesResult.data.productDetails || {})))
      }
      
      if (categoriesData && categoriesData.length > 0 && !selectedCategory) {
        setSelectedCategory(categoriesData[0].id)
      }
    } catch (err) {
      console.error('Catalog load error:', err)
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
      addToast('Fehler beim Laden des Katalogs', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddToCart = async (
    product: ProductWithDetails,
    options?: SelectedOption[],
    quantity: number = 1
  ) => {
    try {
      const result = await addToCart({
        productId: product.id,
        quantity,
        selectedOptions: options,
      })

      if (result.success) {
        addToast(`${product.name} zum Warenkorb hinzugefügt`, 'success')
        router.refresh()
      } else {
        addToast(result.error || 'Fehler beim Hinzufügen', 'error')
      }
    } catch (err) {
      addToast('Ein Fehler ist aufgetreten', 'error')
    }
  }

  const handleAddBoxToCart = async (box: BoxWithItems, configurations?: ProductConfig[]) => {
    try {
      const result = await addBoxToCart(box.id, 1, configurations)

      if (result.success) {
        addToast(`${box.name} zum Warenkorb hinzugefügt`, 'success')
        router.refresh()
      } else {
        addToast(result.error || 'Fehler beim Hinzufügen', 'error')
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

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-red-700 mb-2">
            Fehler beim Laden des Katalogs
          </h2>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadCatalog}>Erneut versuchen</Button>
        </div>
      </div>
    )
  }

  const currentCategory = categories.find((c) => c.id === selectedCategory)

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Speisekarte</h1>
        <Button
          variant={showCustomRequest ? 'default' : 'outline'}
          onClick={() => setShowCustomRequest(!showCustomRequest)}
        >
          📝 Sonderwunsch
        </Button>
      </div>

      {/* Custom Request Form */}
      {showCustomRequest && (
        <div className="mb-6">
          <CustomRequestForm
            onSuccess={() => {
              setShowCustomRequest(false)
              router.refresh()
            }}
          />
        </div>
      )}

      {/* Category Tabs + Boxen Tab */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
        {/* Boxen Tab (wenn Boxen vorhanden) */}
        {boxes.length > 0 && (
          <Button
            variant={showBoxes ? 'default' : 'outline'}
            onClick={() => {
              setShowBoxes(true)
              setSelectedCategory(null)
            }}
            className="whitespace-nowrap"
          >
            📦 Boxen & Angebote
          </Button>
        )}

        {/* Kategorie Tabs */}
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={!showBoxes && selectedCategory === category.id ? 'default' : 'outline'}
            onClick={() => {
              setSelectedCategory(category.id)
              setShowBoxes(false)
            }}
            className="whitespace-nowrap"
          >
            {category.name}
          </Button>
        ))}
      </div>

      {/* Boxen anzeigen */}
      {showBoxes && (
        <>
          <h2 className="text-lg font-semibold mb-4">Boxen & Angebote</h2>
          <p className="text-gray-600 mb-4">
            Spare mit unseren Produkt-Kombinationen! Konfigurierbare Produkte können individuell angepasst werden.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boxes.map((box) => (
              <BoxCard
                key={box.id}
                box={box}
                productDetails={productDetails}
                onAddToCart={handleAddBoxToCart}
              />
            ))}
          </div>

          {boxes.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              Keine Boxen verfügbar
            </div>
          )}
        </>
      )}

      {/* Products Grid */}
      {!showBoxes && currentCategory && (
        <>
          {currentCategory.description && (
            <p className="text-gray-600 mb-4">{currentCategory.description}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {currentCategory.products?.map((product: ProductWithDetails) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>

          {(!currentCategory.products || currentCategory.products.length === 0) && (
            <div className="text-center py-12 text-gray-500">
              Keine Produkte in dieser Kategorie
            </div>
          )}
        </>
      )}
    </div>
  )
}
