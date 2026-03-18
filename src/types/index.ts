import { Role, OrderStatus } from '@prisma/client'

// ==================== NextAuth Erweiterungen ====================

declare module 'next-auth' {
  interface User {
    id: string
    email: string
    name: string
    role: Role
    totpEnabled: boolean
  }
  
  interface Session {
    user: User & {
      id: string
      role: string
      totpEnabled: boolean
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    totpEnabled: boolean
  }
}

// ==================== Selected Option ====================

export interface SelectedOption {
  optionId: string
  optionName: string
  groupName: string
  priceModifier: number
}

// ==================== Product Types ====================

export interface ProductWithDetails {
  id: string
  name: string
  description: string | null
  basePrice: number
  imageUrl: string | null
  isActive: boolean
  isConfigurable: boolean
  sortOrder: number
  categoryId: string
  category: {
    id: string
    name: string
  }
  optionGroups: OptionGroupWithOptions[]
}

export interface OptionGroupWithOptions {
  id: string
  name: string
  description: string | null
  isRequired: boolean
  isMultiple: boolean
  minSelections: number
  maxSelections: number | null
  sortOrder: number
  options: OptionItem[]
}

export interface OptionItem {
  id: string
  name: string
  priceModifier: number
  isDefault: boolean
  isActive: boolean
  sortOrder: number
}

// ==================== Box Types ====================

export interface BoxItemConfiguration {
  productId: string
  productName: string
  selectedOptions: SelectedOption[]
}

export interface BoxItem {
  id: string
  quantity: number
  product: {
    id: string
    name: string
    basePrice: number
  }
}

export interface BoxWithItems {
  id: string
  name: string
  description: string | null
  totalPrice: number
  isActive: boolean
  sortOrder: number
  items: BoxItem[]
}

// ==================== Cart Types ====================

export interface CartItemWithProduct {
  id: string
  quantity: number
  unitPrice: number
  selectedOptions: SelectedOption[] | null
  boxItemConfigurations?: BoxItemConfiguration[] | null
  isCustomRequest: boolean
  customRequestText: string | null
  product: {
    id: string
    name: string
    basePrice: number
    imageUrl: string | null
  } | null
  box?: {
    id: string
    name: string
    totalPrice: number
    items: {
      id: string
      quantity: number
      product: {
        id: string
        name: string
        basePrice: number
      }
    }[]
  } | null
}

export interface CartData {
  items: CartItemWithProduct[]
  total: number
  itemCount: number
}

// ==================== Order Types ====================

export interface OrderWithDetails {
  id: string
  orderNumber: string
  status: OrderStatus
  totalAmount: number
  finalAmount: number | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
  completedAt: Date | null
  user: {
    id: string
    name: string
    email: string
  } | null
  paymentAccount: {
    id: string
    name: string
    iban: string
    accountHolder: string
    bic: string | null
    paypalMeLink: string | null
  } | null
  items: OrderItemWithProduct[]
}

export interface OrderItemWithProduct {
  id: string
  quantity: number
  unitPrice: number
  totalPrice: number
  notes: string | null
  selectedOptions: SelectedOption[] | null
  boxItemConfigurations?: BoxItemConfiguration[] | null
  isCustomRequest: boolean
  customRequestText: string | null
  product: {
    id: string
    name: string
  } | null
  box?: {
    id: string
    name: string
  } | null
}

// ==================== Payment Account Types ====================

export interface PaymentAccountData {
  id: string
  name: string
  iban: string
  accountHolder: string
  bic: string | null
  paypalEmail: string | null
  paypalMeLink: string | null
  isDefault: boolean
  isActive: boolean
}

// ==================== Category Types ====================

export interface CategoryData {
  id: string
  name: string
  description: string | null
  sortOrder: number
  isActive: boolean
  _count?: {
    products: number
  }
}

// ==================== User Types ====================

export interface UserData {
  id: string
  email: string
  name: string
  role: Role
  totpEnabled: boolean
  createdAt: Date
  updatedAt: Date
  _count?: {
    orders: number
  }
}

// ==================== Form Data Types ====================

export interface ProductFormData {
  name: string
  description: string
  basePrice: number
  categoryId: string
  isActive: boolean
  isConfigurable: boolean
  imageUrl?: string
}

export interface OptionGroupFormData {
  name: string
  description?: string
  isRequired: boolean
  isMultiple: boolean
  minSelections: number
  maxSelections?: number
  options: OptionFormData[]
}

export interface OptionFormData {
  id?: string
  name: string
  priceModifier: number
  isDefault: boolean
}

export interface PaymentAccountFormData {
  name: string
  iban: string
  accountHolder: string
  bic?: string
  paypalEmail?: string
  paypalMeLink?: string
  isDefault: boolean
  isActive: boolean
}

export interface BoxFormData {
  name: string
  description?: string
  totalPrice: number
  isActive: boolean
  items: {
    productId: string
    quantity: number
  }[]
}

// ==================== API Response Types ====================

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ==================== Filter & Sorting Types ====================

export interface OrderFilters {
  status?: OrderStatus
  userId?: string
  paymentAccountId?: string
  dateFrom?: Date
  dateTo?: Date
  search?: string
}

export interface ProductFilters {
  categoryId?: string
  isActive?: boolean
  isConfigurable?: boolean
  search?: string
}

// ==================== Checkout Types ====================

export interface CheckoutData {
  paymentAccountId: string
  notes?: string
}

// ==================== Status Labels & Colors ====================

export const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING: 'Ausstehend',
  CONFIRMED: 'Bestätigt',
  ON_THE_WAY: 'Unterwegs',
  DELIVERED: 'Abgeliefert',
  PAYMENT_PENDING: 'Zahlung ausstehend',
  COMPLETED: 'Abgeschlossen',
  CANCELLED: 'Storniert',
  EXITED: 'Ausgetreten',
}

export const orderStatusColors: Record<OrderStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  ON_THE_WAY: 'bg-orange-100 text-orange-800',
  DELIVERED: 'bg-teal-100 text-teal-800',
  PAYMENT_PENDING: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
  EXITED: 'bg-slate-100 text-slate-800',
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
