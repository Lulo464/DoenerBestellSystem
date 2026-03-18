'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { Role } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { SelectedOption } from '@/types'

export interface BoxWithItems {
  id: string
  name: string
  description: string | null
  totalPrice: number
  isActive: boolean
  sortOrder: number
  items: {
    id: string
    quantity: number
    selectedOptions: SelectedOption[] | null
    product: {
      id: string
      name: string
      basePrice: number
    }
  }[]
}

export interface ProductConfig {
  productId: string
  productName: string
  selectedOptions: SelectedOption[]
}

export async function getBoxes(onlyActive: boolean = false) {
  try {
    const boxes = await prisma.box.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                basePrice: true,
              },
            },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })

    const result: BoxWithItems[] = boxes.map((box) => ({
      ...box,
      totalPrice: Number(box.totalPrice),
      items: box.items.map((item) => ({
        ...item,
        selectedOptions: (item.selectedOptions as SelectedOption[] | null) ?? null,
        product: {
          ...item.product,
          basePrice: Number(item.product.basePrice),
        },
      })),
    }))

    return { success: true, data: result }
  } catch (error) {
    console.error('getBoxes error:', error)
    return { success: false, error: 'Fehler beim Laden der Boxen', data: [] }
  }
}

export async function getBoxesWithProductDetails(onlyActive: boolean = true) {
  try {
    const boxes = await prisma.box.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      include: {
        items: {
          include: {
            product: {
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
            },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })

    // Erstelle Map mit Produktdetails
    const productDetailsMap = new Map<string, any>()

    boxes.forEach((box) => {
      box.items.forEach((item) => {
        if (!productDetailsMap.has(item.product.id)) {
          productDetailsMap.set(item.product.id, {
            id: item.product.id,
            name: item.product.name,
            isConfigurable: item.product.isConfigurable,
            optionGroups: item.product.optionGroups.map((group) => ({
              id: group.id,
              name: group.name,
              description: group.description,
              isRequired: group.isRequired,
              isMultiple: group.isMultiple,
              minSelections: group.minSelections,
              maxSelections: group.maxSelections,
              options: group.options.map((opt) => ({
                id: opt.id,
                name: opt.name,
                priceModifier: Number(opt.priceModifier),
                isDefault: opt.isDefault,
              })),
            })),
          })
        }
      })
    })

    const boxesResult: BoxWithItems[] = boxes.map((box) => ({
      id: box.id,
      name: box.name,
      description: box.description,
      totalPrice: Number(box.totalPrice),
      isActive: box.isActive,
      sortOrder: box.sortOrder,
      items: box.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        selectedOptions: (item.selectedOptions as SelectedOption[] | null) ?? null,
        product: {
          id: item.product.id,
          name: item.product.name,
          basePrice: Number(item.product.basePrice),
        },
      })),
    }))

    return {
      success: true,
      data: {
        boxes: boxesResult,
        productDetails: Object.fromEntries(productDetailsMap),
      },
    }
  } catch (error) {
    console.error('getBoxesWithProductDetails error:', error)
    return { success: false, error: 'Fehler beim Laden', data: null }
  }
}

export async function getBox(boxId: string) {
  try {
    const box = await prisma.box.findUnique({
      where: { id: boxId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                basePrice: true,
              },
            },
          },
        },
      },
    })

    if (!box) {
      return { success: false, error: 'Box nicht gefunden', data: null }
    }

    const result: BoxWithItems = {
      ...box,
      totalPrice: Number(box.totalPrice),
      items: box.items.map((item) => ({
        ...item,
        selectedOptions: (item.selectedOptions as SelectedOption[] | null) ?? null,
        product: {
          ...item.product,
          basePrice: Number(item.product.basePrice),
        },
      })),
    }

    return { success: true, data: result }
  } catch (error) {
    console.error('getBox error:', error)
    return { success: false, error: 'Fehler beim Laden der Box', data: null }
  }
}

export async function createBox(data: {
  name: string
  description?: string
  totalPrice: number
  items: { productId: string; quantity: number; selectedOptions?: SelectedOption[] }[]
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

    if (!data.name.trim()) {
      return { success: false, error: 'Name ist erforderlich' }
    }

    if (data.items.length === 0) {
      return { success: false, error: 'Mindestens ein Produkt erforderlich' }
    }

    const lastBox = await prisma.box.findFirst({
      orderBy: { sortOrder: 'desc' },
    })

    const box = await prisma.box.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        totalPrice: new Decimal(data.totalPrice),
        sortOrder: (lastBox?.sortOrder ?? 0) + 1,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            selectedOptions: item.selectedOptions && item.selectedOptions.length > 0
              ? item.selectedOptions
              : undefined,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    })

    revalidatePath('/catalog')
    revalidatePath('/admin/boxes')

    return { success: true, data: box }
  } catch (error) {
    console.error('createBox error:', error)
    return { success: false, error: 'Fehler beim Erstellen der Box' }
  }
}

export async function updateBox(boxId: string, data: {
  name?: string
  description?: string
  totalPrice?: number
  isActive?: boolean
  sortOrder?: number
  items?: { productId: string; quantity: number; selectedOptions?: SelectedOption[] }[]
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

    if (data.totalPrice !== undefined && !canChangePrice) {
      return { success: false, error: 'Keine Berechtigung zur Preisänderung' }
    }

    const updateData: any = {}

    if (data.name !== undefined) updateData.name = data.name.trim()
    if (data.description !== undefined) updateData.description = data.description.trim() || null
    if (data.totalPrice !== undefined) updateData.totalPrice = new Decimal(data.totalPrice)
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder

    await prisma.box.update({
      where: { id: boxId },
      data: updateData,
    })

    if (data.items !== undefined) {
      await prisma.boxItem.deleteMany({
        where: { boxId },
      })

      await prisma.boxItem.createMany({
        data: data.items.map((item) => ({
          boxId,
          productId: item.productId,
          quantity: item.quantity,
          selectedOptions: item.selectedOptions && item.selectedOptions.length > 0
            ? item.selectedOptions
            : undefined,
        })),
      })
    }

    revalidatePath('/catalog')
    revalidatePath('/admin/boxes')

    return { success: true, message: 'Box aktualisiert' }
  } catch (error) {
    console.error('updateBox error:', error)
    return { success: false, error: 'Fehler beim Aktualisieren' }
  }
}

export async function deleteBox(boxId: string) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    const canManage = hasPermission(user.role as Role, 'manage_products')

    if (!canManage) {
      return { success: false, error: 'Keine Berechtigung' }
    }

    // Prüfe ob Box in Bestellungen verwendet wird
    const ordersCount = await prisma.orderItem.count({
      where: { boxId },
    })

    if (ordersCount > 0) {
      // Soft delete
      await prisma.box.update({
        where: { id: boxId },
        data: { isActive: false },
      })
      return { success: true, message: 'Box deaktiviert (wird in Bestellungen verwendet)' }
    }

    // Hard delete
    await prisma.box.delete({
      where: { id: boxId },
    })

    revalidatePath('/catalog')
    revalidatePath('/admin/boxes')

    return { success: true, message: 'Box gelöscht' }
  } catch (error) {
    console.error('deleteBox error:', error)
    return { success: false, error: 'Fehler beim Löschen' }
  }
}

export async function addBoxToCart(
  boxId: string,
  quantity: number = 1,
  configurations?: ProductConfig[]
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    const box = await prisma.box.findUnique({
      where: { id: boxId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    if (!box || !box.isActive) {
      return { success: false, error: 'Box nicht verfügbar' }
    }

    // Berechne eventuelle Aufpreise durch Konfigurationen
    let totalExtraPrice = 0
    let finalConfigurations: ProductConfig[] = configurations || []

    // Wenn keine Konfigurationen vom Benutzer gegeben, nimm die Admin-Voreinstellungen
    if (!configurations || configurations.length === 0) {
      const adminConfigs: ProductConfig[] = []

      for (const boxItem of box.items) {
        const adminPresets = (boxItem.selectedOptions as SelectedOption[] | null) || []

        // Füge immer die Konfiguration hinzu, auch wenn leer (für komplette Vorkonfiguration)
        adminConfigs.push({
          productId: boxItem.productId,
          productName: (boxItem.product as any)?.name || 'Unbekanntes Produkt',
          selectedOptions: adminPresets,
        })

        // Berechne Aufpreis für Admin-Presets
        adminPresets.forEach((opt) => {
          totalExtraPrice += opt.priceModifier
        })
      }

      finalConfigurations = adminConfigs
    } else {
      // Benutzer-Konfigurationen: Berechne Aufpreise
      configurations.forEach((config) => {
        config.selectedOptions.forEach((opt) => {
          totalExtraPrice += opt.priceModifier
        })
      })
    }

    const finalPrice = Number(box.totalPrice) + totalExtraPrice

    // Erstelle neuen Warenkorb-Eintrag (Boxen werden nicht zusammengefasst wegen Konfiguration)
    await prisma.cartItem.create({
      data: {
        userId: user.id,
        boxId,
        quantity,
        unitPrice: new Decimal(finalPrice),
        // Speichere immer Konfigurationen, wenn sie vorhanden sind
        boxItemConfigurations: finalConfigurations && finalConfigurations.length > 0
          ? finalConfigurations
          : undefined,
      },
    })

    revalidatePath('/cart')
    revalidatePath('/catalog')

    return { success: true, message: 'Box zum Warenkorb hinzugefügt' }
  } catch (error) {
    console.error('addBoxToCart error:', error)
    return { success: false, error: 'Fehler beim Hinzufügen' }
  }
}
