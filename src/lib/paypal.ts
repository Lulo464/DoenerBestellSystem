interface PayPalLinkParams {
  paypalMeLink: string
  amount: number | { toString(): string }
  currency?: string
  description?: string
}

/**
 * Generiert einen PayPal.me Zahlungslink
 */
export function generatePayPalLink(params: PayPalLinkParams): string {
  const { paypalMeLink, amount, currency = 'EUR' } = params

  // Normalisiere den PayPal.me Link
  let baseUrl = paypalMeLink.trim()

  // Entferne trailing slash
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1)
  }

  // Stelle sicher, dass es ein vollständiger URL ist
  if (!baseUrl.startsWith('http')) {
    baseUrl = `https://paypal.me/${baseUrl}`
  }

  // Füge Betrag hinzu
  const formattedAmount = Number(amount).toFixed(2)
  const paymentUrl = `${baseUrl}/${formattedAmount}${currency}`
  
  return paymentUrl
}

/**
 * Generiert einen PayPal Checkout Link (alternativ zu PayPal.me)
 */
export function generatePayPalCheckoutLink(params: {
  businessEmail: string
  amount: number | { toString(): string }
  itemName: string
  orderNumber: string
  returnUrl?: string
  cancelUrl?: string
}): string {
  const { businessEmail, amount, itemName, orderNumber, returnUrl, cancelUrl } = params

  const baseUrl = 'https://www.paypal.com/cgi-bin/webscr'

  const queryParams = new URLSearchParams({
    cmd: '_xclick',
    business: businessEmail,
    item_name: itemName,
    item_number: orderNumber,
    amount: Number(amount).toFixed(2),
    currency_code: 'EUR',
    no_shipping: '1',
    no_note: '1',
  })
  
  if (returnUrl) {
    queryParams.set('return', returnUrl)
  }
  
  if (cancelUrl) {
    queryParams.set('cancel_return', cancelUrl)
  }
  
  return `${baseUrl}?${queryParams.toString()}`
}

/**
 * Validiert einen PayPal.me Link
 */
export function validatePayPalMeLink(link: string): boolean {
  if (!link) return false
  
  // Akzeptiere vollständige URLs oder nur den Username
  const paypalMeRegex = /^(https?:\/\/)?(www\.)?paypal\.me\/[\w.-]+\/?$/i
  const usernameRegex = /^[\w.-]+$/
  
  return paypalMeRegex.test(link) || usernameRegex.test(link)
}

/**
 * Normalisiert einen PayPal.me Link
 */
export function normalizePayPalMeLink(input: string): string {
  if (!input) return ''
  
  let link = input.trim()
  
  // Wenn es nur ein Username ist
  if (/^[\w.-]+$/.test(link)) {
    return `https://paypal.me/${link}`
  }
  
  // Wenn es bereits ein Link ist, normalisieren
  if (!link.startsWith('http')) {
    link = `https://${link}`
  }
  
  // Ersetze http mit https
  link = link.replace(/^http:/, 'https:')
  
  return link
}
