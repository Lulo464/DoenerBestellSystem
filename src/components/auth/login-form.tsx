'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

interface LoginFormProps {
  oidcEnabled?: boolean
}

export function LoginForm({ oidcEnabled = false }: LoginFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/catalog'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [showTotp, setShowTotp] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        totpCode: showTotp ? totpCode : undefined,
        redirect: false,
      })

      if (result?.error) {
        if (result.error === 'TOTP_REQUIRED') {
          setShowTotp(true)
          setError('')
        } else {
          setError(result.error)
        }
      } else if (result?.ok) {
        router.push(callbackUrl)
      }
    } catch (err) {
      setError('Ein Fehler ist aufgetreten')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOIDCSignIn = async () => {
    setIsLoading(true)
    try {
      await signIn('oidc', { callbackUrl })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">🍔 {process.env.NEXT_PUBLIC_APP_NAME || 'Bestellsystem'}</CardTitle>
        <CardDescription>
          Melden Sie sich an, um fortzufahren
        </CardDescription>
      </CardHeader>
      <CardContent>
        {oidcEnabled ? (
          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}
            <Button onClick={handleOIDCSignIn} className="w-full" isLoading={isLoading}>
              Mit SSO anmelden
            </Button>
          </div>
        ) : (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <Input
              label="E-Mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ihre.email@firma.de"
              required
              disabled={isLoading}
              autoComplete="email"
            />

            <Input
              label="Passwort"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isLoading}
              autoComplete="current-password"
            />

            {showTotp && (
              <Input
                label="2FA Code"
                type="text"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                required
                disabled={isLoading}
                autoComplete="one-time-code"
                maxLength={6}
                helperText="Geben Sie den Code aus Ihrer Authenticator-App ein"
              />
            )}

            <Button type="submit" className="w-full" isLoading={isLoading}>
              {showTotp ? 'Verifizieren' : 'Anmelden'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
