import QRCode from 'qrcode'

interface GiroCodeParams {
  iban: string
  bic?: string
  recipientName: string
  amount: number | { toString(): string }
  reference?: string
  purpose?: string
}

/**
 * Generiert einen GiroCode (EPC QR Code) für Überweisungen
 * Format: EPC069-12
 */
export function generateGiroCodeData(params: GiroCodeParams): string {
  const { iban, bic, recipientName, amount, reference, purpose } = params

  // EPC QR Code Format
  const lines = [
    'BCD',                          // Service Tag
    '002',                          // Version
    '1',                            // Encoding (1 = UTF-8)
    'SCT',                          // Identification (SEPA Credit Transfer)
    bic || '',                      // BIC (optional seit SEPA)
    recipientName.substring(0, 70), // Name (max 70 Zeichen)
    iban.replace(/\s/g, ''),        // IBAN (ohne Leerzeichen)
    `EUR${Number(amount).toFixed(2)}`,      // Betrag
    '',                             // Purpose Code (leer)
    reference?.substring(0, 35) || '', // Referenz (max 35 Zeichen)
    purpose?.substring(0, 140) || '',   // Verwendungszweck (max 140 Zeichen)
    '',                             // Hinweis an Nutzer (leer)
  ]
  
  return lines.join('\n')
}

export async function generateGiroCodeQR(params: GiroCodeParams): Promise<string> {
  const data = generateGiroCodeData(params)
  
  try {
    const qrCode = await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })
    
    return qrCode
  } catch (error) {
    console.error('GiroCode QR generation failed:', error)
    throw new Error('QR-Code konnte nicht generiert werden')
  }
}

export async function generateGiroCodeSVG(params: GiroCodeParams): Promise<string> {
  const data = generateGiroCodeData(params)
  
  try {
    const svg = await QRCode.toString(data, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      width: 256,
      margin: 2,
    })
    
    return svg
  } catch (error) {
    console.error('GiroCode SVG generation failed:', error)
    throw new Error('QR-Code konnte nicht generiert werden')
  }
}

export function validateIBAN(iban: string): boolean {
  // Entferne Leerzeichen und konvertiere zu Großbuchstaben
  const cleanIban = iban.replace(/\s/g, '').toUpperCase()
  
  // Deutsche IBAN: 22 Zeichen, beginnt mit DE
  if (!/^DE\d{20}$/.test(cleanIban)) {
    return false
  }
  
  // IBAN-Prüfsummenvalidierung
  const rearranged = cleanIban.slice(4) + cleanIban.slice(0, 4)
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

export function formatIBAN(iban: string): string {
  const clean = iban.replace(/\s/g, '').toUpperCase()
  return clean.replace(/(.{4})/g, '$1 ').trim()
}

export function validatePayPalMeLink(link: string): boolean {
  // Validiere PayPal.me Link Format
  // Akzeptiert: https://paypal.me/username oder paypal.me/username
  const paypalMeRegex = /^(https:\/\/)?paypal\.me\/[a-zA-Z0-9_-]+$/
  return paypalMeRegex.test(link.toLowerCase())
}

export function normalizePayPalMeLink(link: string): string {
  // Normalisiere PayPal.me Link zum Format: https://paypal.me/username
  let normalized = link.toLowerCase().trim()

  // Entferne https:// oder http:// Falls vorhanden
  normalized = normalized.replace(/^https?:\/\//, '')

  // Stelle sicher, dass es mit paypal.me/ beginnt
  if (!normalized.startsWith('paypal.me/')) {
    if (normalized.includes('/')) {
      // Falls nur der Username nach paypal.me/ vorhanden ist
      const username = normalized.split('/').pop()
      normalized = `paypal.me/${username}`
    } else {
      // Falls nur der Username vorhanden ist
      normalized = `paypal.me/${normalized}`
    }
  }

  return `https://${normalized}`
}
