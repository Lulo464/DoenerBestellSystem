import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(num)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function generateOrderNumber(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
  return `ORD-${year}-${random}`
}

export function calculateItemPrice(
  basePrice: number,
  selectedOptions: Array<{ priceModifier: number }> = [],
  quantity: number = 1
): number {
  const optionsTotal = selectedOptions.reduce((sum, opt) => sum + opt.priceModifier, 0)
  return (basePrice + optionsTotal) * quantity
}

// IBAN formatieren (DE89370400440532013000 -> DE89 3704 0044 0532 0130 00)
export function formatIBAN(iban: string): string {
  if (!iban) return ''
  const clean = iban.replace(/\s/g, '').toUpperCase()
  return clean.replace(/(.{4})/g, '$1 ').trim()
}

// IBAN validieren (einfache Prüfung für deutsche IBANs)
export function validateIBAN(iban: string): boolean {
  if (!iban) return false
  const clean = iban.replace(/\s/g, '').toUpperCase()
  
  // Deutsche IBAN: 22 Zeichen, beginnt mit DE
  if (!/^DE\d{20}$/.test(clean)) {
    return false
  }
  
  // IBAN-Prüfsummenvalidierung
  const rearranged = clean.slice(4) + clean.slice(0, 4)
  const numeric = rearranged.replace(/[A-Z]/g, (char) => 
    (char.charCodeAt(0) - 55).toString()
  )
  
  // Modulo 97 Prüfung
  let remainder = numeric
  while (remainder.length > 2) {
    const block = remainder.slice(0, 9)
    remainder = (parseInt(block, 10) % 97).toString() + remainder.slice(9)
  }
  
  return parseInt(remainder, 10) % 97 === 1
}
