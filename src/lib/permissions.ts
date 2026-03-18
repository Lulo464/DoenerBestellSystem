import { Role } from '@prisma/client'

export type Permission =
  | 'view_catalog'
  | 'place_order'
  | 'view_own_orders'
  | 'view_all_orders'
  | 'manage_products'
  | 'change_prices'
  | 'manage_payment_accounts'
  | 'manage_users'
  | 'manage_roles'
  | 'manage_settings'
  | 'access_admin'

const rolePermissions: Record<Role, Permission[]> = {
  EMPLOYEE: [
    'view_catalog',
    'place_order',
    'view_own_orders',
  ],
  ADMIN: [
    'view_catalog',
    'place_order',
    'view_own_orders',
    'view_all_orders',
    'manage_products',
    'access_admin',
  ],
  HEAD_ADMIN: [
    'view_catalog',
    'place_order',
    'view_own_orders',
    'view_all_orders',
    'manage_products',
    'change_prices',
    'manage_payment_accounts',
    'access_admin',
  ],
  SUPER_ADMIN: [
    'view_catalog',
    'place_order',
    'view_own_orders',
    'view_all_orders',
    'manage_products',
    'change_prices',
    'manage_payment_accounts',
    'manage_users',
    'manage_roles',
    'manage_settings',
    'access_admin',
  ],
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false
}

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p))
}

export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p))
}

export function getPermissions(role: Role): Permission[] {
  return rolePermissions[role] ?? []
}

export function isAdmin(role: Role): boolean {
  return ['ADMIN', 'HEAD_ADMIN', 'SUPER_ADMIN'].includes(role)
}

export function isHeadAdminOrAbove(role: Role): boolean {
  return ['HEAD_ADMIN', 'SUPER_ADMIN'].includes(role)
}

export function isSuperAdmin(role: Role): boolean {
  return role === 'SUPER_ADMIN'
}

export const roleLabels: Record<Role, string> = {
  EMPLOYEE: 'Mitarbeiter',
  ADMIN: 'Administrator',
  HEAD_ADMIN: 'Hauptadministrator',
  SUPER_ADMIN: 'Superadministrator',
}

export const roleColors: Record<Role, string> = {
  EMPLOYEE: 'bg-gray-100 text-gray-800',
  ADMIN: 'bg-blue-100 text-blue-800',
  HEAD_ADMIN: 'bg-purple-100 text-purple-800',
  SUPER_ADMIN: 'bg-red-100 text-red-800',
}
