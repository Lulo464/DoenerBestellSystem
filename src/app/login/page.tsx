import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { LoginForm } from '@/components/auth/login-form'

export default async function LoginPage() {
  const session = await getSession()

  if (session) {
    redirect('/catalog')
  }

  // Check OIDC config at runtime
  const oidcEnabled = !!(
    process.env.OIDC_ISSUER &&
    process.env.OIDC_CLIENT_ID &&
    process.env.OIDC_CLIENT_SECRET
  )

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-gradient-to-br from-primary-50 to-white dark:from-slate-950 dark:to-slate-900">
      <LoginForm oidcEnabled={oidcEnabled} />
    </div>
  )
}
