'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { updateUserNotificationSettings } from '@/actions/user'
import { updateUser } from '@/actions/users'
import { changePassword } from '@/actions/auth'

export default function SettingsPage() {
  const { data: session, status, update } = useSession()
  const { addToast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true)

  // Profile edit state
  const [profileName, setProfileName] = useState(session?.user?.name || '')
  const [profileEmail, setProfileEmail] = useState(session?.user?.email || '')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [emailError, setEmailError] = useState<string | undefined>()

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | undefined>()

  useEffect(() => {
    if (session?.user) {
      setEmailNotificationsEnabled((session.user as any).emailNotificationsEnabled ?? true)
      setProfileName(session.user.name || '')
      setProfileEmail(session.user.email || '')
    }
  }, [session])

  const handleSaveProfile = async () => {
    setEmailError(undefined)

    // Client-side validation
    if (!profileName.trim()) {
      addToast('Name ist erforderlich', 'error')
      return
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(profileEmail.trim())) {
      setEmailError('Ungültige E-Mail-Adresse')
      return
    }

    setIsSavingProfile(true)
    try {
      const result = await updateUser(session!.user!.id, {
        name: profileName.trim(),
        email: profileEmail.trim(),
      })

      if (result.success) {
        await update()
        addToast('Profil gespeichert', 'success')
      } else if (result.error?.includes('Email')) {
        setEmailError(result.error)
      } else {
        addToast(result.error || 'Fehler beim Speichern', 'error')
      }
    } catch (err) {
      addToast('Fehler beim Speichern', 'error')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    setPasswordError(undefined)

    // Client-side validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Alle Felder sind erforderlich')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwörter stimmen nicht überein')
      return
    }

    setIsSavingPassword(true)
    try {
      const result = await changePassword(currentPassword, newPassword)

      if (result.success) {
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        addToast('Passwort geändert', 'success')
      } else {
        setPasswordError(result.error)
      }
    } catch (err) {
      addToast('Fehler beim Speichern', 'error')
    } finally {
      setIsSavingPassword(false)
    }
  }

  const handleSaveSettings = async () => {
    setIsSaving(true)
    try {
      const result = await updateUserNotificationSettings({
        emailNotificationsEnabled,
      })
      if (result.success) {
        // Refresh the session to force a JWT callback that will fetch fresh data from DB
        await update()
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

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>Profil bearbeiten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Name"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            disabled={isSavingProfile}
          />
          <Input
            label="E-Mail"
            type="email"
            value={profileEmail}
            onChange={(e) => setProfileEmail(e.target.value)}
            error={emailError}
            disabled={isSavingProfile}
          />
          <div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Rolle</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {user.role === 'EMPLOYEE' ? 'Mitarbeiter' : user.role}
            </p>
          </div>
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={handleSaveProfile}
              isLoading={isSavingProfile}
              disabled={
                profileName === user.name && profileEmail === user.email
              }
            >
              Speichern
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setProfileName(user.name)
                setProfileEmail(user.email)
                setEmailError(undefined)
              }}
              disabled={isSavingProfile}
            >
              Zurücksetzen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Password Change Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Passwort ändern</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Aktuelles Passwort"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={isSavingPassword}
          />
          <Input
            label="Neues Passwort"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={isSavingPassword}
          />
          <Input
            label="Passwort bestätigen"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={passwordError}
            disabled={isSavingPassword}
          />
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={handleChangePassword}
              isLoading={isSavingPassword}
              disabled={!currentPassword || !newPassword || !confirmPassword}
            >
              Passwort ändern
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setCurrentPassword('')
                setNewPassword('')
                setConfirmPassword('')
                setPasswordError(undefined)
              }}
              disabled={isSavingPassword}
            >
              Zurücksetzen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Card */}
      <Card className="mt-6">
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
    </div>
  )
}
