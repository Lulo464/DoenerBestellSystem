'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { Role } from '@prisma/client'
import { ProductFormData, OptionGroupFormData, ProductFilters } from '@/types'
import { Decimal } from '@prisma/client/runtime/library'

export async function getProducts(filters?: ProductFilters) {
  try {
    const where: any = {}
    
    if (filters?.categoryId) {
      where.categoryId = filters.categoryId
    }
    
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive
    }
    
    if (filters?.isConfigurable !== undefined) {
      where.isConfigurable = filters.isConfigurable
    }
    
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ]
    }
    
    const products = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true },
        },
        optionGroups: {
          include: {
            options: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    })
    
    return products.map((product) => ({
      ...product,
      basePrice: Number(product.basePrice),
      optionGroups: product.optionGroups.map((group) => ({
        ...group,
        options: group.options.map((opt) => ({
          ...opt,
          priceModifier: Number(opt.priceModifier),
        })),
      })),
    }))
  } catch (error) {
    console.error('getProducts error:', error)
    throw error
  }
}

export async function getProduct(productId: string) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        optionGroups: {
          include: {
            options: {
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })
    
    if (!product) {
      return null
    }
    
    return {
      ...product,
      basePrice: Number(product.basePrice),
      optionGroups: product.optionGroups.map((group) => ({
        ...group,
        options: group.options.map((opt) => ({
          ...opt,
          priceModifier: Number(opt.priceModifier),
        })),
      })),
    }
  } catch (error) {
    console.error('getProduct error:', error)
    throw error
  }
}

export async function getCategories() {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })
    
    return categories
  } catch (error) {
    console.error('getCategories error:', error)
    throw error
  }
}

export async function getCategoriesWithProducts() {
  try {
    console.log('getCategoriesWithProducts: Starting query...')
    
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: {
        products: {
          where: { isActive: true },
          include: {
            optionGroups: {
              include: {
                options: {
                  where: { isActive: true },
                  orderBy: { sortOrder: 'asc' },
                },
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })

    console.log('getCategoriesWithProducts: Found categories:', categories.length)

    const result = categories.map((category) => ({
      ...category,
      products: category.products.map((product) => ({
        ...product,
        basePrice: Number(product.basePrice),
        // Füge Kategorie-Info zum Produkt hinzu
        category: {
          id: category.id,
          name: category.name,
        },
        optionGroups: product.optionGroups.map((group) => ({
          ...group,
          options: group.options.map((opt) => ({
            ...opt,
            priceModifier: Number(opt.priceModifier),
          })),
        })),
      })),
    }))

    console.log('getCategoriesWithProducts: Returning result')
    return result
  } catch (error) {
    console.error('getCategoriesWithProducts error:', error)
    throw error
  }
}

export async function createProduct(data: ProductFormData) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }
    
    const canManage = hasPermission(user.role as Role, 'manage_products')
    
    if (!canManage) {
      return { success: false, error: 'Keine Berechtigung' }
    }
    
    const product = await prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        basePrice: new Decimal(data.basePrice),
        categoryId: data.categoryId,
        isActive: data.isActive,
        isConfigurable: data.isConfigurable,
        imageUrl: data.imageUrl,
      },
    })
    
    revalidatePath('/catalog')
    revalidatePath('/admin/products')
    
    return { success: true, data: product }
  } catch (error) {
    console.error('createProduct error:', error)
    return { success: false, error: 'Fehler beim Erstellen des Produkts' }
  }
}

export async function updateProduct(productId: string, data: Partial<ProductFormData> & { sortOrder?: number }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    const canManage = hasPermission(user.role as Role, 'manage_products')
    const canChangePrice = hasPermission(user.role as Role, 'change_prices')

    if (!canManage) {
      return { success: false, error: 'Keine Berechtigung' }
    }

    if (data.basePrice !== undefined && !canChangePrice) {
      return { success: false, error: 'Keine Berechtigung zur Preisänderung' }
    }

    const updateData: any = { ...data }

    if (data.basePrice !== undefined) {
      updateData.basePrice = new Decimal(data.basePrice)
    }

    // Explicitly set imageUrl to null if undefined (to clear it in DB)
    if ('imageUrl' in data && data.imageUrl === undefined) {
      updateData.imageUrl = null
    }

    await prisma.product.update({
      where: { id: productId },
      data: updateData,
    })

    revalidatePath('/catalog')
    revalidatePath('/admin/products')
    revalidatePath(`/admin/products/${productId}`)

    return { success: true, message: 'Produkt aktualisiert' }
  } catch (error) {
    console.error('updateProduct error:', error)
    return { success: false, error: 'Fehler beim Aktualisieren' }
  }
}

export async function deleteProduct(productId: string) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    const canManage = hasPermission(user.role as Role, 'manage_products')

    if (!canManage) {
      return { success: false, error: 'Keine Berechtigung' }
    }

    await prisma.product.update({
      where: { id: productId },
      data: { isActive: false },
    })

    revalidatePath('/catalog')
    revalidatePath('/admin/products')

    return { success: true, message: 'Produkt deaktiviert' }
  } catch (error) {
    console.error('deleteProduct error:', error)
    return { success: false, error: 'Fehler beim Deaktivieren' }
  }
}

export async function permanentlyDeleteProduct(productId: string) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    const canManage = hasPermission(user.role as Role, 'manage_products')

    if (!canManage) {
      return { success: false, error: 'Keine Berechtigung' }
    }

    // Hole das Produkt
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        orderItems: { select: { id: true } },
        cartItems: { select: { id: true } },
      },
    })

    if (!product) {
      return { success: false, error: 'Produkt nicht gefunden' }
    }

    // Prüfe, ob Produkt inaktiv ist
    if (product.isActive) {
      return { success: false, error: 'Nur inaktive Produkte können gelöscht werden. Deaktiviere das Produkt zuerst.' }
    }

    // Prüfe, ob Bestellungen existieren
    if (product.orderItems.length > 0) {
      return { success: false, error: 'Produkt kann nicht gelöscht werden, da es in Bestellungen verwendet wird.' }
    }

    // Lösche das Produkt (Cascade kümmert sich um OptionGroups und Options)
    await prisma.product.delete({
      where: { id: productId },
    })

    revalidatePath('/catalog')
    revalidatePath('/admin/products')

    return { success: true, message: 'Produkt dauerhaft gelöscht' }
  } catch (error) {
    console.error('permanentlyDeleteProduct error:', error)
    return { success: false, error: 'Fehler beim Löschen des Produkts' }
  }
}

export async function addOptionGroup(productId: string, data: OptionGroupFormData) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }
    
    const canManage = hasPermission(user.role as Role, 'manage_products')
    const canChangePrice = hasPermission(user.role as Role, 'change_prices')
    
    if (!canManage) {
      return { success: false, error: 'Keine Berechtigung' }
    }
    
    const hasPrice = data.options.some((opt) => opt.priceModifier > 0)
    if (hasPrice && !canChangePrice) {
      return { success: false, error: 'Keine Berechtigung zur Preisänderung' }
    }
    
    const lastGroup = await prisma.optionGroup.findFirst({
      where: { productId },
      orderBy: { sortOrder: 'desc' },
    })
    
    const optionGroup = await prisma.optionGroup.create({
      data: {
        productId,
        name: data.name,
        description: data.description,
        isRequired: data.isRequired,
        isMultiple: data.isMultiple,
        minSelections: data.minSelections,
        maxSelections: data.maxSelections,
        sortOrder: (lastGroup?.sortOrder ?? 0) + 1,
        options: {
          create: data.options.map((opt, index) => ({
            name: opt.name,
            priceModifier: new Decimal(opt.priceModifier),
            isDefault: opt.isDefault,
            sortOrder: index,
          })),
        },
      },
      include: { options: true },
    })
    
    revalidatePath('/catalog')
    revalidatePath(`/admin/products/${productId}`)
    
    return { success: true, data: optionGroup }
  } catch (error) {
    console.error('addOptionGroup error:', error)
    return { success: false, error: 'Fehler beim Erstellen der Optionsgruppe' }
  }
}

export async function updateOptionGroup(groupId: string, data: Partial<OptionGroupFormData>) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }
    
    const canManage = hasPermission(user.role as Role, 'manage_products')
    
    if (!canManage) {
      return { success: false, error: 'Keine Berechtigung' }
    }
    
    const group = await prisma.optionGroup.findUnique({
      where: { id: groupId },
    })
    
    if (!group) {
      return { success: false, error: 'Optionsgruppe nicht gefunden' }
    }
    
    await prisma.optionGroup.update({
      where: { id: groupId },
      data: {
        name: data.name,
        description: data.description,
        isRequired: data.isRequired,
        isMultiple: data.isMultiple,
        minSelections: data.minSelections,
        maxSelections: data.maxSelections,
      },
    })
    
    revalidatePath('/catalog')
    revalidatePath(`/admin/products/${group.productId}`)
    
    return { success: true, message: 'Optionsgruppe aktualisiert' }
  } catch (error) {
    console.error('updateOptionGroup error:', error)
    return { success: false, error: 'Fehler beim Aktualisieren' }
  }
}

export async function deleteOptionGroup(groupId: string) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }
    
    const canManage = hasPermission(user.role as Role, 'manage_products')
    
    if (!canManage) {
      return { success: false, error: 'Keine Berechtigung' }
    }
    
    const group = await prisma.optionGroup.findUnique({
      where: { id: groupId },
    })
    
    if (!group) {
      return { success: false, error: 'Optionsgruppe nicht gefunden' }
    }
    
    await prisma.optionGroup.delete({
      where: { id: groupId },
    })
    
    revalidatePath('/catalog')
    revalidatePath(`/admin/products/${group.productId}`)
    
    return { success: true, message: 'Optionsgruppe gelöscht' }
  } catch (error) {
    console.error('deleteOptionGroup error:', error)
    return { success: false, error: 'Fehler beim Löschen' }
  }
}

export async function addOption(groupId: string, data: {
  name: string
  priceModifier: number
  isDefault?: boolean
}) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }
    
    const canManage = hasPermission(user.role as Role, 'manage_products')
    const canChangePrice = hasPermission(user.role as Role, 'change_prices')
    
    if (!canManage) {
      return { success: false, error: 'Keine Berechtigung' }
    }
    
    if (data.priceModifier > 0 && !canChangePrice) {
      return { success: false, error: 'Keine Berechtigung zur Preisänderung' }
    }
    
    const group = await prisma.optionGroup.findUnique({
      where: { id: groupId },
    })
    
    if (!group) {
      return { success: false, error: 'Optionsgruppe nicht gefunden' }
    }
    
    const lastOption = await prisma.option.findFirst({
      where: { optionGroupId: groupId },
      orderBy: { sortOrder: 'desc' },
    })
    
    const option = await prisma.option.create({
      data: {
        optionGroupId: groupId,
        name: data.name,
        priceModifier: new Decimal(data.priceModifier),
        isDefault: data.isDefault ?? false,
        sortOrder: (lastOption?.sortOrder ?? 0) + 1,
      },
    })
    
    revalidatePath('/catalog')
    revalidatePath(`/admin/products/${group.productId}`)
    
    return { success: true, data: option }
  } catch (error) {
    console.error('addOption error:', error)
    return { success: false, error: 'Fehler beim Erstellen der Option' }
  }
}

export async function updateOption(optionId: string, data: {
  name?: string
  priceModifier?: number
  isDefault?: boolean
  isActive?: boolean
}) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }
    
    const canManage = hasPermission(user.role as Role, 'manage_products')
    const canChangePrice = hasPermission(user.role as Role, 'change_prices')
    
    if (!canManage) {
      return { success: false, error: 'Keine Berechtigung' }
    }
    
    if (data.priceModifier !== undefined && !canChangePrice) {
      return { success: false, error: 'Keine Berechtigung zur Preisänderung' }
    }
    
    const option = await prisma.option.findUnique({
      where: { id: optionId },
      include: { optionGroup: true },
    })
    
    if (!option) {
      return { success: false, error: 'Option nicht gefunden' }
    }
    
    const updateData: any = { ...data }
    
    if (data.priceModifier !== undefined) {
      updateData.priceModifier = new Decimal(data.priceModifier)
    }
    
    await prisma.option.update({
      where: { id: optionId },
      data: updateData,
    })
    
    revalidatePath('/catalog')
    revalidatePath(`/admin/products/${option.optionGroup.productId}`)
    
    return { success: true, message: 'Option aktualisiert' }
  } catch (error) {
    console.error('updateOption error:', error)
    return { success: false, error: 'Fehler beim Aktualisieren' }
  }
}

export async function deleteOption(optionId: string) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }
    
    const canManage = hasPermission(user.role as Role, 'manage_products')
    
    if (!canManage) {
      return { success: false, error: 'Keine Berechtigung' }
    }
    
    const option = await prisma.option.findUnique({
      where: { id: optionId },
      include: { optionGroup: true },
    })
    
    if (!option) {
      return { success: false, error: 'Option nicht gefunden' }
    }
    
    await prisma.option.delete({
      where: { id: optionId },
    })
    
    revalidatePath('/catalog')
    revalidatePath(`/admin/products/${option.optionGroup.productId}`)
    
    return { success: true, message: 'Option gelöscht' }
  } catch (error) {
    console.error('deleteOption error:', error)
    return { success: false, error: 'Fehler beim Löschen' }
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
        description: data.description,
        sortOrder: (lastCategory?.sortOrder ?? 0) + 1,
      },
    })
    
    revalidatePath('/catalog')
    revalidatePath('/admin/products')
    
    return { success: true, data: category }
  } catch (error) {
    console.error('createCategory error:', error)
    return { success: false, error: 'Fehler beim Erstellen der Kategorie' }
  }
}

