'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { updateUserNotificationSettings } from '@/actions/user'

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const { addToast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true)

  useEffect(() => {
    if (session?.user) {
      setEmailNotificationsEnabled((session.user as any).emailNotificationsEnabled ?? true)
    }
  }, [session])

  const handleSaveSettings = async () => {
    setIsSaving(true)
    try {
      const result = await updateUserNotificationSettings({
        emailNotificationsEnabled,
      })
      if (result.success) {
        addToast('Einstellungen gespeichert', 'success')
      } else {
        addToast(result.error || 'Fehler beim Speichern', 'error')
      }
    } catch (err) {
      addToast('Fehler beim Speichern', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">Nicht authentifiziert</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const user = session.user as any

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Einstellungen</h1>

      <Card>
        <CardHeader>
          <CardTitle>Benachrichtigungen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <p className="font-medium text-gray-900 dark:text-white">
                  📧 E-Mail Benachrichtigungen
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Erhalte Benachrichtigungen über Bestellstatus und Zahlungsaufforderungen
                </p>
              </div>
              <button
                onClick={() => setEmailNotificationsEnabled(!emailNotificationsEnabled)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  emailNotificationsEnabled
                    ? 'bg-primary-600'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    emailNotificationsEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {emailNotificationsEnabled && (
              <div className="text-sm text-green-600 dark:text-green-400 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                ✓ E-Mail Benachrichtigungen sind aktiviert
              </div>
            )}

            {!emailNotificationsEnabled && (
              <div className="text-sm text-gray-600 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                E-Mail Benachrichtigungen sind deaktiviert
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={handleSaveSettings}
              isLoading={isSaving}
              disabled={
                emailNotificationsEnabled === (user.emailNotificationsEnabled ?? true)
              }
            >
              Speichern
            </Button>
            <Button
              variant="outline"
              onClick={() => setEmailNotificationsEnabled(user.emailNotificationsEnabled ?? true)}
              disabled={isSaving}
            >
              Zurücksetzen
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Profilinformationen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="text-gray-600 dark:text-gray-400">E-Mail</p>
            <p className="font-medium text-gray-900 dark:text-white">{user.email}</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Name</p>
            <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Rolle</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {user.role === 'EMPLOYEE' ? 'Mitarbeiter' : user.role}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
