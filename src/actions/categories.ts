'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { Role } from '@prisma/client'

export async function getCategories() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    })

    return { success: true, data: categories }
  } catch (error) {
    console.error('getCategories error:', error)
    return { success: false, error: 'Fehler beim Laden der Kategorien' }
  }
}

export async function createCategory(data: {
  name: string
  description?: string
}) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    const canManage = hasPermission(user.role as Role, 'manage_products')

    if (!canManage) {
      return { success: false, error: 'Keine Berechtigung' }
    }

    const lastCategory = await prisma.category.findFirst({
      orderBy: { sortOrder: 'desc' },
    })

    const category = await prisma.category.create({
      data: {
        name: data.name,
        description: data.description || null,
        sortOrder: (lastCategory?.sortOrder ?? 0) + 1,
        isActive: true,
      },
    })

    revalidatePath('/catalog')
    revalidatePath('/admin/categories')
    revalidatePath('/admin/products')

    return { success: true, data: category }
  } catch (error) {
    console.error('createCategory error:', error)
    return { success: false, error: 'Fehler beim Erstellen' }
  }
}

export async function updateCategory(categoryId: string, data: {
  name?: string
  description?: string
  isActive?: boolean
  sortOrder?: number
}) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    const canManage = hasPermission(user.role as Role, 'manage_products')

    if (!canManage) {
      return { success: false, error: 'Keine Berechtigung' }
    }

    await prisma.category.update({
      where: { id: categoryId },
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      },
    })

    revalidatePath('/catalog')
    revalidatePath('/admin/categories')
    revalidatePath('/admin/products')

    return { success: true, message: 'Kategorie aktualisiert' }
  } catch (error) {
    console.error('updateCategory error:', error)
    return { success: false, error: 'Fehler beim Aktualisieren' }
  }
}

export async function deleteCategory(categoryId: string) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    const canManage = hasPermission(user.role as Role, 'manage_products')

    if (!canManage) {
      return { success: false, error: 'Keine Berechtigung' }
    }

    // Prüfe ob Produkte in der Kategorie sind
    const productsCount = await prisma.product.count({
      where: { categoryId },
    })

    if (productsCount > 0) {
      return { 
        success: false, 
        error: `Kategorie enthält ${productsCount} Produkt(e). Bitte erst alle Produkte löschen oder verschieben.` 
      }
    }

    await prisma.category.delete({
      where: { id: categoryId },
    })

    revalidatePath('/catalog')
    revalidatePath('/admin/categories')
    revalidatePath('/admin/products')

    return { success: true, message: 'Kategorie gelöscht' }
  } catch (error) {
    console.error('deleteCategory error:', error)
    return { success: false, error: 'Fehler beim Löschen' }
  }
}
