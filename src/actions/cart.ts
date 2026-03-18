'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { SelectedOption } from '@/types'
import { Decimal } from '@prisma/client/runtime/library'

export async function getCart() {
  const user = await getCurrentUser()

  if (!user) {
    return { success: false, error: 'Nicht authentifiziert', data: null }
  }

  try {
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: user.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            basePrice: true,
            imageUrl: true,
            isActive: true,
          },
        },
        box: {
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
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    const items = cartItems.map((item) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      selectedOptions: item.selectedOptions as SelectedOption[] | null,
      boxItemConfigurations: item.boxItemConfigurations as any[] | null,
      product: item.product
        ? {
            ...item.product,
            basePrice: Number(item.product.basePrice),
          }
        : null,
      box: item.box
        ? {
            ...item.box,
            totalPrice: Number(item.box.totalPrice),
            items: item.box.items.map((boxItem) => ({
              ...boxItem,
              product: {
                ...boxItem.product,
                basePrice: Number(boxItem.product.basePrice),
              },
            })),
          }
        : null,
    }))

    const total = items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    )

    return {
      success: true,
      data: {
        items,
        total,
        itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      },
    }
  } catch (error) {
    console.error('getCart error:', error)
    return { success: false, error: 'Fehler beim Laden des Warenkorbs', data: null }
  }
}

export async function getCartItemCount() {
  const user = await getCurrentUser()

  if (!user) return 0

  try {
    const result = await prisma.cartItem.aggregate({
      where: { userId: user.id },
      _sum: { quantity: true },
    })
    return result._sum.quantity ?? 0
  } catch {
    return 0
  }
}

export async function addToCart(data: {
  productId: string
  quantity?: number
  selectedOptions?: SelectedOption[]
}) {
  const user = await getCurrentUser()

  if (!user) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
    })

    if (!product || !product.isActive) {
      return { success: false, error: 'Produkt nicht verfügbar' }
    }

    const quantity = data.quantity ?? 1

    // Aufpreis durch Optionen berechnen
    let extraPrice = 0
    if (data.selectedOptions) {
      data.selectedOptions.forEach((opt) => {
        extraPrice += opt.priceModifier
      })
    }

    const unitPrice = Number(product.basePrice) + extraPrice

    // Vorhandenes Item suchen (nur ohne Optionen zusammenfassen)
    if (!data.selectedOptions || data.selectedOptions.length === 0) {
      const existing = await prisma.cartItem.findFirst({
        where: {
          userId: user.id,
          productId: data.productId,
          isCustomRequest: false,
          selectedOptions: { equals: null },
        },
      })

      if (existing) {
        await prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + quantity },
        })
        revalidatePath('/cart')
        revalidatePath('/catalog')
        return { success: true, message: 'Warenkorb aktualisiert' }
      }
    }

    await prisma.cartItem.create({
      data: {
        userId: user.id,
        productId: data.productId,
        quantity,
        unitPrice: new Decimal(unitPrice),
        selectedOptions: data.selectedOptions && data.selectedOptions.length > 0
          ? data.selectedOptions
          : undefined,
      },
    })

    revalidatePath('/cart')
    revalidatePath('/catalog')

    return { success: true, message: 'Zum Warenkorb hinzugefügt' }
  } catch (error) {
    console.error('addToCart error:', error)
    return { success: false, error: 'Fehler beim Hinzufügen' }
  }
}

export async function addCustomRequestToCart(data: {
  description: string
  price?: number
}) {
  const user = await getCurrentUser()

  if (!user) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  try {
    if (!data.description.trim()) {
      return { success: false, error: 'Beschreibung ist erforderlich' }
    }

    await prisma.cartItem.create({
      data: {
        userId: user.id,
        quantity: 1,
        unitPrice: new Decimal(data.price ?? 0),
        isCustomRequest: true,
        customRequestText: data.description.trim(),
      },
    })

    revalidatePath('/cart')
    revalidatePath('/catalog')

    return { success: true, message: 'Sonderwunsch hinzugefügt' }
  } catch (error) {
    console.error('addCustomRequestToCart error:', error)
    return { success: false, error: 'Fehler beim Hinzufügen' }
  }
}

export async function updateCartItemQuantity(cartItemId: string, quantity: number) {
  const user = await getCurrentUser()

  if (!user) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  try {
    if (quantity <= 0) {
      return removeFromCart(cartItemId)
    }

    const item = await prisma.cartItem.findFirst({
      where: { id: cartItemId, userId: user.id },
    })

    if (!item) {
      return { success: false, error: 'Artikel nicht gefunden' }
    }

    await prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
    })

    revalidatePath('/cart')

    return { success: true }
  } catch (error) {
    console.error('updateCartItemQuantity error:', error)
    return { success: false, error: 'Fehler beim Aktualisieren' }
  }
}

export async function removeFromCart(cartItemId: string) {
  const user = await getCurrentUser()

  if (!user) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  try {
    const item = await prisma.cartItem.findFirst({
      where: { id: cartItemId, userId: user.id },
    })

    if (!item) {
      return { success: false, error: 'Artikel nicht gefunden' }
    }

    await prisma.cartItem.delete({
      where: { id: cartItemId },
    })

    revalidatePath('/cart')
    revalidatePath('/catalog')

    return { success: true }
  } catch (error) {
    console.error('removeFromCart error:', error)
    return { success: false, error: 'Fehler beim Entfernen' }
  }
}

export async function clearCart() {
  const user = await getCurrentUser()

  if (!user) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  try {
    await prisma.cartItem.deleteMany({
      where: { userId: user.id },
    })

    revalidatePath('/cart')

    return { success: true }
  } catch (error) {
    console.error('clearCart error:', error)
    return { success: false, error: 'Fehler beim Leeren des Warenkorbs' }
  }
}
