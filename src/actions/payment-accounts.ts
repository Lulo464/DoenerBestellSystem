'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { Role } from '@prisma/client'
import { PaymentAccountFormData } from '@/types'
import { validateIBAN, validatePayPalMeLink, normalizePayPalMeLink } from '@/lib/girocode'

export async function getPaymentAccounts(onlyActive: boolean = true) {
  const accounts = await prisma.paymentAccount.findMany({
    where: onlyActive ? { isActive: true } : undefined,
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  })
  
  return accounts
}

export async function getPaymentAccount(accountId: string) {
  const account = await prisma.paymentAccount.findUnique({
    where: { id: accountId },
  })
  
  return account
}

export async function createPaymentAccount(data: PaymentAccountFormData) {
  const user = await getCurrentUser()
  
  if (!user) {
    return { success: false, error: 'Nicht authentifiziert' }
  }
  
  const canManage = hasPermission(user.role as Role, 'manage_payment_accounts')
  
  if (!canManage) {
    return { success: false, error: 'Keine Berechtigung' }
  }
  
  // Validierung
  if (!validateIBAN(data.iban)) {
    return { success: false, error: 'Ungültige IBAN' }
  }
  
  if (data.paypalMeLink && !validatePayPalMeLink(data.paypalMeLink)) {
    return { success: false, error: 'Ungültiger PayPal.me Link' }
  }
  
  // Wenn neues Konto default sein soll, andere deaktivieren
  if (data.isDefault) {
    await prisma.paymentAccount.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    })
  }
  
  const account = await prisma.paymentAccount.create({
    data: {
      name: data.name,
      iban: data.iban.replace(/\s/g, '').toUpperCase(),
      accountHolder: data.accountHolder,
      bic: data.bic || null,
      paypalEmail: data.paypalEmail || null,
      paypalMeLink: data.paypalMeLink ? normalizePayPalMeLink(data.paypalMeLink) : null,
      isDefault: data.isDefault,
      isActive: data.isActive,
    },
  })
  
  revalidatePath('/admin/payment-accounts')
  revalidatePath('/checkout')
  
  return { success: true, data: account }
}

export async function updatePaymentAccount(accountId: string, data: Partial<PaymentAccountFormData>) {
  const user = await getCurrentUser()
  
  if (!user) {
    return { success: false, error: 'Nicht authentifiziert' }
  }
  
  const canManage = hasPermission(user.role as Role, 'manage_payment_accounts')
  
  if (!canManage) {
    return { success: false, error: 'Keine Berechtigung' }
  }
  
  // Validierung
  if (data.iban && !validateIBAN(data.iban)) {
    return { success: false, error: 'Ungültige IBAN' }
  }
  
  if (data.paypalMeLink && !validatePayPalMeLink(data.paypalMeLink)) {
    return { success: false, error: 'Ungültiger PayPal.me Link' }
  }
  
  // Wenn Konto default werden soll, andere deaktivieren
  if (data.isDefault) {
    await prisma.paymentAccount.updateMany({
      where: { isDefault: true, id: { not: accountId } },
      data: { isDefault: false },
    })
  }
  
  const updateData: any = { ...data }
  
  if (data.iban) {
    updateData.iban = data.iban.replace(/\s/g, '').toUpperCase()
  }
  
  if (data.paypalMeLink) {
    updateData.paypalMeLink = normalizePayPalMeLink(data.paypalMeLink)
  }
  
  await prisma.paymentAccount.update({
    where: { id: accountId },
    data: updateData,
  })
  
  revalidatePath('/admin/payment-accounts')
  revalidatePath('/checkout')
  
  return { success: true, message: 'Zahlungskonto aktualisiert' }
}

export async function deletePaymentAccount(accountId: string) {
  const user = await getCurrentUser()
  
  if (!user) {
    return { success: false, error: 'Nicht authentifiziert' }
  }
  
  const canManage = hasPermission(user.role as Role, 'manage_payment_accounts')
  
  if (!canManage) {
    return { success: false, error: 'Keine Berechtigung' }
  }
  
  // Prüfe ob Bestellungen mit diesem Konto existieren
  const ordersCount = await prisma.order.count({
    where: { paymentAccountId: accountId },
  })
  
  if (ordersCount > 0) {
    // Soft delete
    await prisma.paymentAccount.update({
      where: { id: accountId },
      data: { isActive: false, isDefault: false },
    })
    
    return { success: true, message: 'Zahlungskonto deaktiviert (hat verknüpfte Bestellungen)' }
  }
  
  await prisma.paymentAccount.delete({
    where: { id: accountId },
  })
  
  revalidatePath('/admin/payment-accounts')
  revalidatePath('/checkout')
  
  return { success: true, message: 'Zahlungskonto gelöscht' }
}

export async function setDefaultPaymentAccount(accountId: string) {
  const user = await getCurrentUser()
  
  if (!user) {
    return { success: false, error: 'Nicht authentifiziert' }
  }
  
  const canManage = hasPermission(user.role as Role, 'manage_payment_accounts')
  
  if (!canManage) {
    return { success: false, error: 'Keine Berechtigung' }
  }
  
  // Deaktiviere alle anderen defaults
  await prisma.paymentAccount.updateMany({
    where: { isDefault: true },
    data: { isDefault: false },
  })
  
  // Setze neuen default
  await prisma.paymentAccount.update({
    where: { id: accountId },
    data: { isDefault: true },
  })
  
  revalidatePath('/admin/payment-accounts')
  revalidatePath('/checkout')
  
  return { success: true, message: 'Standard-Zahlungskonto gesetzt' }
}
