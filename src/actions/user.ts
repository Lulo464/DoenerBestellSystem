'use server'

import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-options'

export async function updateUserNotificationSettings(params: {
  emailNotificationsEnabled: boolean
}) {
  const user = await getCurrentUser()

  if (!user) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailNotificationsEnabled: params.emailNotificationsEnabled,
      },
    })

    revalidatePath('/settings')
    revalidatePath('/')

    return {
      success: true,
      message: 'Einstellungen gespeichert',
    }
  } catch (err) {
    console.error('Fehler beim Aktualisieren der Einstellungen:', err)
    return { success: false, error: 'Fehler beim Speichern der Einstellungen' }
  }
}
