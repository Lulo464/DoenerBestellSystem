'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { generateOrderNumber } from '@/lib/utils'
import { hasPermission } from '@/lib/permissions'
import { Role, OrderStatus } from '@prisma/client'
import { SelectedOption, OrderFilters } from '@/types'
import { Decimal } from '@prisma/client/runtime/library'
import {
  sendOrderConfirmation,
  sendStatusUpdate,
  sendPaymentDue,
  sendOrderCompleted,
} from '@/lib/mailer'

export async function createOrder(params: {
  notes?: string
}) {
  const user = await getCurrentUser()

  if (!user) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  const { notes } = params

  // Hole Warenkorb
  const cartItems = await prisma.cartItem.findMany({
    where: { userId: user.id },
    include: {
      product: true,
      box: true,
    },
  })

  if (cartItems.length === 0) {
    return { success: false, error: 'Warenkorb ist leer' }
  }

  // Berechne ungefähre Gesamtsumme
  const totalAmount = cartItems.reduce(
    (sum, item) => sum + Number(item.unitPrice) * item.quantity,
    0
  )

  // Erstelle Bestellung ohne Zahlungskonto
  const order = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      userId: user.id,
      totalAmount: new Decimal(totalAmount),
      notes,
      status: OrderStatus.PENDING,
      items: {
        create: cartItems.map((item) => ({
          productId: item.productId,
          boxId: item.boxId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: new Decimal(Number(item.unitPrice) * item.quantity),
          selectedOptions: item.selectedOptions ?? undefined,
          boxItemConfigurations: item.boxItemConfigurations ?? undefined,
          isCustomRequest: item.isCustomRequest,
          customRequestText: item.customRequestText,
        })),
      },
    },
  })

  // Leere Warenkorb
  await prisma.cartItem.deleteMany({
    where: { userId: user.id },
  })

  revalidatePath('/cart')
  revalidatePath('/orders')
  revalidatePath('/admin/orders')

  // Bestätigungsmail
  sendOrderConfirmation({
    to: user.email,
    customerName: user.name,
    orderNumber: order.orderNumber,
    items: cartItems.map((i) => ({
      name: i.isCustomRequest ? 'Sonderwunsch' : ((i.box?.name || i.product?.name) ?? 'Artikel'),
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
    })),
    totalAmount,
    notes: notes ?? null,
  }).catch((err) => console.error('Mail-Fehler (orderConfirmation):', err))

  return {
    success: true,
    data: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalAmount,
    },
    message: 'Bestellung erfolgreich aufgegeben',
  }
}

export async function getOrders(filters?: OrderFilters) {
  const user = await getCurrentUser()

  if (!user) {
    return { success: false, error: 'Nicht authentifiziert', data: [] }
  }

  const canViewAll = hasPermission(user.role as Role, 'view_all_orders')

  const where: any = {}

  // Immer nur eigene Bestellungen anzeigen, es sei denn, es gibt explizite Filter
  // (z.B. beim Admin-Panel mit userId-Filter)
  if (!canViewAll || !filters) {
    where.userId = user.id
  } else if (filters?.userId) {
    where.userId = filters.userId
  }
  
  if (filters?.status) {
    where.status = filters.status
  }
  
  if (filters?.paymentAccountId) {
    where.paymentAccountId = filters.paymentAccountId
  }
  
  if (filters?.dateFrom || filters?.dateTo) {
    where.createdAt = {}
    if (filters.dateFrom) {
      where.createdAt.gte = filters.dateFrom
    }
    if (filters.dateTo) {
      where.createdAt.lte = filters.dateTo
    }
  }
  
  if (filters?.search) {
    where.OR = [
      { orderNumber: { contains: filters.search, mode: 'insensitive' } },
      { user: { name: { contains: filters.search, mode: 'insensitive' } } },
      { user: { email: { contains: filters.search, mode: 'insensitive' } } },
    ]
  }
  
  const orders = await prisma.order.findMany({
    where,
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      paymentAccount: {
        select: {
          id: true,
          name: true,
          iban: true,
          accountHolder: true,
          bic: true,
          paypalMeLink: true,
        },
      },
      items: {
        include: {
          product: {
            select: { id: true, name: true },
          },
          box: {
            select: { id: true, name: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
  
  const formattedOrders = orders.map((order) => ({
    ...order,
    totalAmount: Number(order.totalAmount),
    finalAmount: order.finalAmount !== null ? Number(order.finalAmount) : null,
    items: order.items.map((item) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
      selectedOptions: item.selectedOptions as SelectedOption[] | null,
    })),
  }))
  
  return { success: true, data: formattedOrders }
}

export async function getOrder(orderId: string) {
  const user = await getCurrentUser()
  
  if (!user) {
    return { success: false, error: 'Nicht authentifiziert', data: null }
  }
  
  const canViewAll = hasPermission(user.role as Role, 'view_all_orders')
  
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      paymentAccount: true,
      items: {
        include: {
          product: {
            select: { id: true, name: true, imageUrl: true },
          },
          box: {
            include: {
              items: {
                include: {
                  product: {
                    select: { id: true, name: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  
  if (!order) {
    return { success: false, error: 'Bestellung nicht gefunden', data: null }
  }
  
  // Prüfe Berechtigung
  if (!canViewAll && order.userId !== user.id) {
    return { success: false, error: 'Keine Berechtigung', data: null }
  }
  
  return {
    success: true,
    data: {
      ...order,
      totalAmount: Number(order.totalAmount),
      items: order.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        selectedOptions: item.selectedOptions as SelectedOption[] | null,
      })),
    },
  }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const user = await getCurrentUser()

  if (!user) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  const canManage = hasPermission(user.role as Role, 'view_all_orders')

  if (!canManage) {
    return { success: false, error: 'Keine Berechtigung' }
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { email: true, name: true } },
      items: {
        include: {
          product: { select: { name: true } },
          box: { select: { name: true } },
        },
      },
    },
  })

  if (!order) {
    return { success: false, error: 'Bestellung nicht gefunden' }
  }

  const updateData: any = { status }

  if (status === OrderStatus.COMPLETED) {
    updateData.completedAt = new Date()
  }

  await prisma.order.update({
    where: { id: orderId },
    data: updateData,
  })

  revalidatePath('/orders')
  revalidatePath('/admin/orders')
  revalidatePath(`/orders/${orderId}`)

  // Statusmail an Kunde (nur wenn User noch existiert)
  if (order.user) {
    const mailData = {
      to: order.user.email,
      customerName: order.user.name,
      orderNumber: order.orderNumber,
      totalAmount: Number(order.totalAmount),
      finalAmount: order.finalAmount !== null ? Number(order.finalAmount) : null,
      items: order.items.map((i) => ({
        name: i.isCustomRequest ? 'Sonderwunsch' : ((i.box?.name || i.product?.name) ?? 'Artikel'),
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
      })),
    }

    if (status === OrderStatus.COMPLETED) {
      sendOrderCompleted(mailData).catch((err) =>
        console.error('Mail-Fehler (completed):', err)
      )
    } else {
      sendStatusUpdate(mailData, status).catch((err) =>
        console.error('Mail-Fehler (statusUpdate):', err)
      )
    }
  }

  return { success: true, message: 'Status aktualisiert' }
}

export async function setPaymentDue(orderId: string, params: {
  finalAmount: number
  paymentAccountId: string
}) {
  const user = await getCurrentUser()

  if (!user) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  const canManage = hasPermission(user.role as Role, 'view_all_orders')

  if (!canManage) {
    return { success: false, error: 'Keine Berechtigung' }
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { email: true, name: true } },
      items: {
        include: {
          product: { select: { name: true } },
          box: { select: { name: true } },
        },
      },
    },
  })

  if (!order) {
    return { success: false, error: 'Bestellung nicht gefunden' }
  }

  const paymentAccount = await prisma.paymentAccount.findUnique({
    where: { id: params.paymentAccountId },
  })

  if (!paymentAccount || !paymentAccount.isActive) {
    return { success: false, error: 'Ungültiges Zahlungskonto' }
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatus.PAYMENT_PENDING,
      finalAmount: new Decimal(params.finalAmount),
      paymentAccountId: params.paymentAccountId,
    },
  })

  revalidatePath('/orders')
  revalidatePath('/admin/orders')
  revalidatePath(`/orders/${orderId}`)

  // Zahlungsaufforderungsmail (nur wenn User noch existiert)
  if (order.user) {
    sendPaymentDue({
      to: order.user.email,
      customerName: order.user.name,
      orderNumber: order.orderNumber,
      totalAmount: Number(order.totalAmount),
      finalAmount: params.finalAmount,
      items: order.items.map((i) => ({
        name: i.isCustomRequest ? 'Sonderwunsch' : ((i.box?.name || i.product?.name) ?? 'Artikel'),
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
      })),
      paymentAccount: {
        name: paymentAccount.name,
        accountHolder: paymentAccount.accountHolder,
        iban: paymentAccount.iban,
        bic: paymentAccount.bic,
        paypalMeLink: paymentAccount.paypalMeLink,
      },
    }).catch((err) => console.error('Mail-Fehler (paymentDue):', err))
  }

  return { success: true, message: 'Zahlung ausstehend gesetzt' }
}

export async function cancelOrder(orderId: string) {
  const user = await getCurrentUser()
  
  if (!user) {
    return { success: false, error: 'Nicht authentifiziert' }
  }
  
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  })
  
  if (!order) {
    return { success: false, error: 'Bestellung nicht gefunden' }
  }
  
  const canManage = hasPermission(user.role as Role, 'view_all_orders')
  const isOwner = order.userId === user.id
  
  // Nur eigene Bestellungen können storniert werden (wenn PENDING)
  // Admins können alle Bestellungen stornieren
  if (!canManage && !isOwner) {
    return { success: false, error: 'Keine Berechtigung' }
  }
  
  if (!canManage && order.status !== OrderStatus.PENDING) {
    return { success: false, error: 'Bestellung kann nicht mehr storniert werden' }
  }
  
  await prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.CANCELLED },
  })
  
  revalidatePath('/orders')
  revalidatePath('/admin/orders')
  
  return { success: true, message: 'Bestellung storniert' }
}

export async function deleteOrder(orderId: string) {
  const user = await getCurrentUser()

  if (!user) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  const canManage = hasPermission(user.role as Role, 'view_all_orders')

  if (!canManage) {
    return { success: false, error: 'Keine Berechtigung' }
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  })

  if (!order) {
    return { success: false, error: 'Bestellung nicht gefunden' }
  }

  // Lösche Bestellungsartikel zuerst (wegen Foreign Key)
  await prisma.orderItem.deleteMany({
    where: { orderId },
  })

  // Dann lösche die Bestellung
  await prisma.order.delete({
    where: { id: orderId },
  })

  revalidatePath('/orders')
  revalidatePath('/admin/orders')
  revalidatePath(`/orders/${orderId}`)

  return { success: true, message: 'Bestellung gelöscht' }
}

export async function getOrderStats() {
  const user = await getCurrentUser()

  if (!user) {
    return { success: false, error: 'Nicht authentifiziert', data: null }
  }

  const canViewAll = hasPermission(user.role as Role, 'view_all_orders')

  if (!canViewAll) {
    return { success: false, error: 'Keine Berechtigung', data: null }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [totalOrders, pendingOrders, todayOrders, totalRevenue] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: OrderStatus.PENDING } }),
    prisma.order.count({ where: { createdAt: { gte: today } } }),
    prisma.order.aggregate({
      where: { status: { not: OrderStatus.CANCELLED } },
      _sum: { totalAmount: true },
    }),
  ])

  return {
    success: true,
    data: {
      totalOrders,
      pendingOrders,
      todayOrders,
      totalRevenue: Number(totalRevenue._sum.totalAmount ?? 0),
    },
  }
}
