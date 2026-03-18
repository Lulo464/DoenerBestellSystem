import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from './auth-options'
import { Role } from '@prisma/client'
import { hasPermission, Permission, isAdmin } from './permissions'

export async function getSession() {
  return await getServerSession(authOptions)
}

export async function getCurrentUser() {
  const session = await getSession()
  return session?.user
}

export async function requireAuth() {
  const session = await getSession()
  
  if (!session?.user) {
    redirect('/login')
  }
  
  return session.user
}

export async function requireAdmin() {
  const user = await requireAuth()
  
  if (!isAdmin(user.role as Role)) {
    redirect('/')
  }
  
  return user
}

export async function requirePermission(permission: Permission) {
  const user = await requireAuth()
  
  if (!hasPermission(user.role as Role, permission)) {
    redirect('/')
  }
  
  return user
}

export async function checkPermission(permission: Permission): Promise<boolean> {
  const session = await getSession()
  
  if (!session?.user) {
    return false
  }
  
  return hasPermission(session.user.role as Role, permission)
}
