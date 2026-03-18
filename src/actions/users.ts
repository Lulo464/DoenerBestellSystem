'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { hasPermission, isSuperAdmin } from '@/lib/permissions'
import { Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

export async function getUsers() {
  const user = await getCurrentUser()
  
  if (!user) {
    return { success: false, error: 'Nicht authentifiziert', data: [] }
  }
  
  const canManage = hasPermission(user.role as Role, 'manage_users')
  
  if (!canManage) {
    return { success: false, error: 'Keine Berechtigung', data: [] }
  }
  
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      totpEnabled: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: { orders: true },
      },
    },
    orderBy: { name: 'asc' },
  })
  
  return { success: true, data: users }
}

export async function getUser(userId: string) {
  const user = await getCurrentUser()
  
  if (!user) {
    return { success: false, error: 'Nicht authentifiziert', data: null }
  }
  
  const canManage = hasPermission(user.role as Role, 'manage_users')
  const isSelf = user.id === userId
  
  if (!canManage && !isSelf) {
    return { success: false, error: 'Keine Berechtigung', data: null }
  }
  
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      totpEnabled: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  
  return { success: true, data: targetUser }
}

export async function createUser(data: {
  email: string
  name: string
  password: string
  role: Role
}) {
  const user = await getCurrentUser()
  
  if (!user) {
    return { success: false, error: 'Nicht authentifiziert' }
  }
  
  const canManage = hasPermission(user.role as Role, 'manage_users')
  
  if (!canManage) {
    return { success: false, error: 'Keine Berechtigung' }
  }
  // Nur Superadmin darf Superadmins erstellen
  if (data.role === Role.SUPER_ADMIN && !isSuperAdmin(user.role as Role)) {
    return { success: false, error: 'Nur Superadmins können Superadmins erstellen' }
  }
  
  // Prüfe ob Email bereits existiert
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  })
  
  if (existingUser) {
    return { success: false, error: 'Email bereits registriert' }
  }
  
  // Passwort validieren
  if (data.password.length < 8) {
    return { success: false, error: 'Passwort muss mindestens 8 Zeichen haben' }
  }
  
  const hashedPassword = await bcrypt.hash(data.password, 12)
  
  const newUser = await prisma.user.create({
    data: {
      email: data.email.toLowerCase().trim(),
      name: data.name.trim(),
      password: hashedPassword,
      role: data.role,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  })
  
  revalidatePath('/admin/users')
  
  return { success: true, data: newUser, message: 'Benutzer erstellt' }
}

export async function updateUser(userId: string, data: {
  name?: string
  email?: string
  role?: Role
}) {
  const user = await getCurrentUser()
  
  if (!user) {
    return { success: false, error: 'Nicht authentifiziert' }
  }
  
  const canManage = hasPermission(user.role as Role, 'manage_users')
  const isSelf = user.id === userId
  
  // Eigene Daten dürfen eingeschränkt bearbeitet werden
  if (!canManage && !isSelf) {
    return { success: false, error: 'Keine Berechtigung' }
  }
  
  // Nur Superadmin darf Rollen ändern
  if (data.role !== undefined) {
    if (!hasPermission(user.role as Role, 'manage_roles')) {
      return { success: false, error: 'Keine Berechtigung zur Rollenänderung' }
    }
    
    // Nur Superadmin darf Superadmin-Rolle vergeben
    if (data.role === Role.SUPER_ADMIN && !isSuperAdmin(user.role as Role)) {
      return { success: false, error: 'Nur Superadmins können diese Rolle vergeben' }
    }
    
    // Verhindere, dass man sich selbst herabstuft (als letzter Superadmin)
    if (isSelf && user.role === 'SUPER_ADMIN' && data.role !== Role.SUPER_ADMIN) {
      const superAdminCount = await prisma.user.count({
        where: { role: Role.SUPER_ADMIN },
      })
      
      if (superAdminCount <= 1) {
        return { success: false, error: 'Es muss mindestens ein Superadmin existieren' }
      }
    }
  }
  
  // Prüfe ob Email bereits von anderem Benutzer verwendet wird
  if (data.email) {
    const existingUser = await prisma.user.findFirst({
      where: {
        email: data.email.toLowerCase().trim(),
        id: { not: userId },
      },
    })
    
    if (existingUser) {
      return { success: false, error: 'Email bereits registriert' }
    }
  }
  
  const updateData: any = {}
  
  if (data.name) updateData.name = data.name.trim()
  if (data.email) updateData.email = data.email.toLowerCase().trim()
  if (data.role !== undefined) updateData.role = data.role
  
  await prisma.user.update({
    where: { id: userId },
    data: updateData,
  })
  
  revalidatePath('/admin/users')
  
  return { success: true, message: 'Benutzer aktualisiert' }
}

export async function resetUserPassword(userId: string, newPassword: string) {
  const user = await getCurrentUser()
  
  if (!user) {
    return { success: false, error: 'Nicht authentifiziert' }
  }
  
  const canManage = hasPermission(user.role as Role, 'manage_users')
  
  if (!canManage) {
    return { success: false, error: 'Keine Berechtigung' }
  }
  
  if (newPassword.length < 8) {
    return { success: false, error: 'Passwort muss mindestens 8 Zeichen haben' }
  }
  
  const hashedPassword = await bcrypt.hash(newPassword, 12)
  
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  })
  
  return { success: true, message: 'Passwort zurückgesetzt' }
}

export async function deleteUser(userId: string) {
  const user = await getCurrentUser()

  if (!user) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  const canManage = hasPermission(user.role as Role, 'manage_users')

  if (!canManage) {
    return { success: false, error: 'Keine Berechtigung' }
  }

  // Verhindere Selbstlöschung
  if (user.id === userId) {
    return { success: false, error: 'Sie können sich nicht selbst löschen' }
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!targetUser) {
    return { success: false, error: 'Benutzer nicht gefunden' }
  }

  // Nur Superadmin darf Superadmins löschen
  if (targetUser.role === Role.SUPER_ADMIN && !isSuperAdmin(user.role as Role)) {
    return { success: false, error: 'Keine Berechtigung' }
  }

  // Nutze Transaktion um sicherzustellen, dass alle Operationen zusammen erfolgreich sind
  await prisma.$transaction(async (tx) => {
    // Setze alle Orders des Users auf Status EXITED (statt sie zu löschen)
    await tx.order.updateMany({
      where: { userId },
      data: { status: 'EXITED' as any },
    })

    // Lösche Warenkorb
    await tx.cartItem.deleteMany({
      where: { userId },
    })

    // Lösche Benutzer
    await tx.user.delete({
      where: { id: userId },
    })
  })

  revalidatePath('/admin/users')
  revalidatePath('/admin/orders')

  return { success: true, message: 'Benutzer gelöscht - Bestellungen auf "Ausgetreten" gesetzt' }
}

export async function disableUserTOTP(userId: string) {
  const user = await getCurrentUser()
  
  if (!user) {
    return { success: false, error: 'Nicht authentifiziert' }
  }
  
  const canManage = hasPermission(user.role as Role, 'manage_users')
  
  if (!canManage) {
    return { success: false, error: 'Keine Berechtigung' }
  }
  
  await prisma.user.update({
    where: { id: userId },
    data: {
      totpEnabled: false,
      totpSecret: null,
    },
  })
  
  revalidatePath('/admin/users')
  
  return { success: true, message: 'TOTP deaktiviert' }
}
