'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { formatCurrency } from '@/lib/utils'
import { getProducts, getCategories, deleteProduct, permanentlyDeleteProduct } from '@/actions/products'
import { ProductWithDetails } from '@/types'
import { useSession } from 'next-auth/react'
import { hasPermission } from '@/lib/permissions'
import { Role } from '@prisma/client'

export default function AdminProductsPage() {
  const { data: session } = useSession()
  const { addToast } = useToast()
  const [products, setProducts] = useState<ProductWithDetails[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const userRole = session?.user?.role as Role | undefined
  const canChangePrice = userRole ? hasPermission(userRole, 'change_prices') : false

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [productsData, categoriesData] = await Promise.all([
        getProducts(),
        getCategories(),
      ])
      setProducts(productsData)
      setCategories(categoriesData)
    } catch (err) {
      addToast('Fehler beim Laden', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeactivate = async (productId: string, productName: string) => {
    if (!confirm(`Möchten Sie "${productName}" wirklich deaktivieren?`)) {
      return
    }

    try {
      const result = await deleteProduct(productId)
      if (result.success) {
        addToast('Produkt deaktiviert', 'success')
        loadData()
      } else {
        addToast(result.error || 'Fehler', 'error')
      }
    } catch (err) {
      addToast('Ein Fehler ist aufgetreten', 'error')
    }
  }

  const handlePermanentlyDelete = async (productId: string, productName: string) => {
    if (!confirm(`Möchten Sie "${productName}" wirklich DAUERHAFT löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
      return
    }

    try {
      const result = await permanentlyDeleteProduct(productId)
      if (result.success) {
        addToast('Produkt dauerhaft gelöscht', 'success')
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
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group by category
  const productsByCategory = categories.map((category) => ({
    category,
    products: filteredProducts.filter((p) => p.categoryId === category.id),
  }))

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Produkte</h1>
        <Link href="/admin/products/new">
          <Button>+ Neues Produkt</Button>
        </Link>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          type="text"
          placeholder="Produkte suchen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      {!canChangePrice && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm">
            ⚠️ Sie haben keine Berechtigung, Preise zu ändern. Preisänderungen können nur von Hauptadministratoren vorgenommen werden.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      ) : (
        <div className="space-y-8">
          {productsByCategory.map(({ category, products: categoryProducts }) => (
            <div key={category.id}>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                {category.name}
                <Badge variant="secondary">{categoryProducts.length}</Badge>
              </h2>

              {categoryProducts.length === 0 ? (
                <p className="text-gray-500 text-sm">Keine Produkte in dieser Kategorie</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryProducts.map((product) => (
                    <Card key={product.id} className={!product.isActive ? 'opacity-50' : ''}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium">{product.name}</h3>
                          <div className="flex gap-1">
                            {product.isConfigurable && (
                              <Badge variant="secondary" className="text-xs">
                                Konfigurierbar
                              </Badge>
                            )}
                            {!product.isActive && (
                              <Badge variant="destructive" className="text-xs">
                                Inaktiv
                              </Badge>
                            )}
                          </div>
                        </div>

                        {product.description && (
                          <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                            {product.description}
                          </p>
                        )}

                        <p className="text-lg font-bold text-primary-600 mb-3">
                          {formatCurrency(product.basePrice)}
                          {product.isConfigurable && (
                            <span className="text-xs text-gray-500 font-normal ml-1">ab</span>
                          )}
                        </p>

                        {product.optionGroups.length > 0 && (
                          <p className="text-xs text-gray-400 mb-3">
                            {product.optionGroups.length} Optionsgruppe(n)
                          </p>
                        )}

                        <div className="flex gap-2">
                          <Link href={`/admin/products/${product.id}`} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full">
                              Bearbeiten
                            </Button>
                          </Link>
                          {product.isActive ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeactivate(product.id, product.name)}
                              className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/30"
                              title="Produkt deaktivieren"
                            >
                              👻
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePermanentlyDelete(product.id, product.name)}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
                              title="Produkt dauerhaft löschen (kann nicht rückgängig gemacht werden)"
                            >
                              🗑️
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
