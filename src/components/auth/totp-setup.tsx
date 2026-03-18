'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { setupTOTP, verifyAndEnableTOTP, disableTOTP } from '@/actions/auth'

export function TOTPSetup() {
  const { data: session, update } = useSession()
  const { addToast } = useToast()

  const [step, setStep] = useState<'initial' | 'setup' | 'verify'>('initial')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [disablePassword, setDisablePassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const totpEnabled = session?.user?.totpEnabled

  const handleSetup = async () => {
    setIsLoading(true)
    try {
      const result = await setupTOTP()
      if (result.success && result.data) {
        setQrCode(result.data.qrCode)
        setSecret(result.data.secret)
        setStep('setup')
      } else {
        addToast(result.error || 'Fehler beim Setup', 'error')
      }
    } catch (err) {
      addToast('Ein Fehler ist aufgetreten', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify = async () => {
    if (verifyCode.length !== 6) {
      addToast('Bitte geben Sie einen 6-stelligen Code ein', 'warning')
      return
    }

    setIsLoading(true)
    try {
      const result = await verifyAndEnableTOTP(verifyCode)
      if (result.success) {
        addToast('2FA erfolgreich aktiviert!', 'success')
        setStep('initial')
        setQrCode('')
        setSecret('')
        setVerifyCode('')
        await update()
      } else {
        addToast(result.error || 'Ungültiger Code', 'error')
      }
    } catch (err) {
      addToast('Ein Fehler ist aufgetreten', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisable = async () => {
    if (!disablePassword) {
      addToast('Bitte geben Sie Ihr Passwort ein', 'warning')
      return
    }

    setIsLoading(true)
    try {
      const result = await disableTOTP(disablePassword)
      if (result.success) {
        addToast('2FA deaktiviert', 'success')
        setDisablePassword('')
        await update()
      } else {
        addToast(result.error || 'Fehler beim Deaktivieren', 'error')
      }
    } catch (err) {
      addToast('Ein Fehler ist aufgetreten', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  if (totpEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔐 Zwei-Faktor-Authentifizierung
          </CardTitle>
          <CardDescription>
            2FA ist derzeit aktiviert für Ihren Account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg">
            <span className="text-xl">✓</span>
            <span className="font-medium">2FA ist aktiv</span>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-gray-600 mb-3">
              Um 2FA zu deaktivieren, geben Sie Ihr Passwort ein:
            </p>
            <div className="flex gap-2">
              <Input
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Ihr Passwort"
                disabled={isLoading}
              />
              <Button
                variant="destructive"
                onClick={handleDisable}
                isLoading={isLoading}
              >
                Deaktivieren
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (step === 'setup') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>🔐 2FA einrichten</CardTitle>
          <CardDescription>
            Scannen Sie den QR-Code mit Ihrer Authenticator-App
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* QR Code */}
          <div className="flex justify-center">
            <div className="p-4 bg-white border rounded-lg">
              {qrCode && (
                <img src={qrCode} alt="TOTP QR Code" className="w-48 h-48" />
              )}
            </div>
          </div>

          {/* Manual Secret */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">
              Oder geben Sie diesen Code manuell ein:
            </p>
            <code className="block p-2 bg-white border rounded text-sm font-mono break-all">
              {secret}
            </code>
          </div>

          {/* Verification */}
          <div className="space-y-3">
            <p className="text-sm font-medium">
              Geben Sie den 6-stelligen Code aus Ihrer App ein:
            </p>
            <div className="flex gap-2">
              <Input
                type="text"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                className="text-center text-2xl tracking-widest"
                disabled={isLoading}
              />
              <Button onClick={handleVerify} isLoading={isLoading}>
                Verifizieren
              </Button>
            </div>
          </div>

          {/* Cancel */}
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              setStep('initial')
              setQrCode('')
              setSecret('')
              setVerifyCode('')
            }}
            disabled={isLoading}
          >
            Abbrechen
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔐 Zwei-Faktor-Authentifizierung
        </CardTitle>
        <CardDescription>
          Erhöhen Sie die Sicherheit Ihres Accounts mit 2FA
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-700 rounded-lg">
          <span className="text-xl">⚠</span>
          <span>2FA ist nicht aktiviert</span>
        </div>

        <p className="text-sm text-gray-600">
          Mit der Zwei-Faktor-Authentifizierung benötigen Sie neben Ihrem Passwort
          auch einen zeitbasierten Code aus einer Authenticator-App (z.B. Google
          Authenticator, Authy, Microsoft Authenticator).
        </p>

        <Button onClick={handleSetup} isLoading={isLoading} className="w-full">
          2FA aktivieren
        </Button>
      </CardContent>
    </Card>
  )
}

            
