import { requireAuth } from '@/lib/auth'
import { TOTPSetup } from '@/components/auth/totp-setup'

export default async function SetupTOTPPage() {
  await requireAuth()

  return (
    <div className="max-w-md mx-auto p-4 py-8">
      <TOTPSetup />
    </div>
  )
}
