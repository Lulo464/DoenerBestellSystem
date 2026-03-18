'use server'

import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { authenticator } from 'otplib'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import QRCode from 'qrcode'

export async function setupTOTP() {
  const user = await getCurrentUser()
  
  if (!user) {
    return { success: false, error: 'Nicht authentifiziert' }
  }
  
  // Generiere TOTP Secret
  const secret = authenticator.generateSecret()
  
  // Speichere Secret temporär (noch nicht aktiviert)
  await prisma.user.update({
    where: { id: user.id },
    data: { totpSecret: secret },
  })
  
  // Generiere OTPAuth URL für QR Code
  const otpauth = authenticator.keyuri(
    user.email,
    'Internes Bestellsystem',
    secret
  )
  
  // Generiere QR Code
  const qrCode = await QRCode.toDataURL(otpauth)
  
  return {
    success: true,
    data: {
      secret,
      qrCode,
      otpauth,
    },
  }
}

export async function verifyAndEnableTOTP(code: string) {
  const user = await getCurrentUser()
  
  if (!user) {
    return { success: false, error: 'Nicht authentifiziert' }
  }
  
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  })
  
  if (!dbUser?.totpSecret) {
    return { success: false, error: 'Kein TOTP Secret gefunden' }
  }
  
  const isValid = authenticator.verify({
    token: code,
    secret: dbUser.totpSecret,
  })
  
  if (!isValid) {
    return { success: false, error: 'Ungültiger Code' }
  }
  
  // Aktiviere TOTP
  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: true },
  })
  
  revalidatePath('/setup-totp')
  
  return { success: true, message: 'TOTP erfolgreich aktiviert' }
}

export async function disableTOTP(password: string) {
  const user = await getCurrentUser()

  if (!user) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  })

  if (!dbUser) {
    return { success: false, error: 'Benutzer nicht gefunden' }
  }

  if (!dbUser.password) {
    return { success: false, error: 'SSO-Benutzer können TOTP nicht deaktivieren' }
  }

  const isPasswordValid = await bcrypt.compare(password, dbUser.password)

  if (!isPasswordValid) {
    return { success: false, error: 'Ungültiges Passwort' }
  }
  
  await prisma.user.update({
    where: { id: user.id },
    data: {
      totpEnabled: false,
      totpSecret: null,
    },
  })
  
  revalidatePath('/setup-totp')
  
  return { success: true, message: 'TOTP deaktiviert' }
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const user = await getCurrentUser()

  if (!user) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  })

  if (!dbUser) {
    return { success: false, error: 'Benutzer nicht gefunden' }
  }

  if (!dbUser.password) {
    return { success: false, error: 'SSO-Benutzer können ihr Passwort nicht ändern' }
  }

  const isPasswordValid = await bcrypt.compare(currentPassword, dbUser.password)

  if (!isPasswordValid) {
    return { success: false, error: 'Aktuelles Passwort ist falsch' }
  }
  
  if (newPassword.length < 8) {
    return { success: false, error: 'Neues Passwort muss mindestens 8 Zeichen haben' }
  }
  
  const hashedPassword = await bcrypt.hash(newPassword, 12)
  
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  })
  
  return { success: true, message: 'Passwort erfolgreich geändert' }
}
