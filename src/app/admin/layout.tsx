import { requireAdmin } from '@/lib/auth'
import { AdminSidebar } from '@/components/layout/sidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdmin()

  return (
    <div className="flex">
      <AdminSidebar />
      <div className="flex-1 min-h-[calc(100vh-4rem)]">
        {children}
      </div>
    </div>
  )
}
