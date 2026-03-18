import nodemailer from 'nodemailer'
import { OrderStatus } from '@prisma/client'

// ==================== Transporter ====================

function createTransporter() {
  const host = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT || '587')
  const secure = process.env.SMTP_SECURE === 'true'
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    return null
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  })
}

const appName = process.env.NEXT_PUBLIC_APP_NAME || process.env.APP_NAME || 'Bestellsystem'
const from = process.env.SMTP_FROM || `${appName} <noreply@example.com>`
const emailsEnabled = process.env.EMAILS_ENABLED !== 'false' // Default: true

// ==================== HTML-Basis-Template ====================

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
    .wrapper { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #e8520a; color: #fff; padding: 24px 32px; }
    .header h1 { margin: 0; font-size: 20px; }
    .body { padding: 32px; color: #333; line-height: 1.6; }
    .body h2 { margin-top: 0; font-size: 18px; color: #111; }
    .info-box { background: #f9f9f9; border: 1px solid #e5e5e5; border-radius: 6px; padding: 16px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee; }
    .info-row:last-child { border-bottom: none; }
    .label { color: #666; font-size: 14px; }
    .value { font-weight: bold; font-size: 14px; }
    .amount { font-size: 22px; color: #e8520a; font-weight: bold; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: bold; }
    .footer { background: #f5f5f5; padding: 16px 32px; text-align: center; font-size: 12px; color: #999; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th { background: #f0f0f0; text-align: left; padding: 8px 12px; font-size: 13px; color: #555; }
    td { padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 14px; }
    tr:last-child td { border-bottom: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>🥙 ${appName}</h1>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      Diese Mail wurde automatisch generiert · ${appName}
    </div>
  </div>
</body>
</html>`
}

// ==================== Mail-Typen ====================

interface OrderMailData {
  to: string
  customerName: string
  orderNumber: string
  items: { name: string; quantity: number; unitPrice: number }[]
  totalAmount: number
  finalAmount?: number | null
  notes?: string | null
  paymentAccount?: {
    name: string
    accountHolder: string
    iban: string
    bic?: string | null
    paypalMeLink?: string | null
  } | null
}

function itemsTable(items: OrderMailData['items']): string {
  const rows = items
    .map(
      (item) => `
    <tr>
      <td>${item.quantity}× ${item.name}</td>
      <td style="text-align:right">${formatEur(item.unitPrice)}</td>
      <td style="text-align:right">${formatEur(item.unitPrice * item.quantity)}</td>
    </tr>`
    )
    .join('')

  return `
  <table>
    <thead><tr><th>Artikel</th><th style="text-align:right">Einzelpreis</th><th style="text-align:right">Gesamt</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`
}

function formatEur(amount: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount)
}

// ==================== Einzelne Mails ====================

export async function sendOrderConfirmation(data: OrderMailData, shouldSend: boolean = true) {
  if (!shouldSend || !emailsEnabled) return

  const transporter = createTransporter()
  if (!transporter) return

  const html = baseTemplate(`
    <h2>Deine Bestellung ist eingegangen!</h2>
    <p>Hallo ${data.customerName},</p>
    <p>wir haben deine Bestellung <strong>${data.orderNumber}</strong> erhalten und bearbeiten sie in Kürze.</p>

    ${itemsTable(data.items)}

    <div class="info-box">
      <div class="info-row">
        <span class="label">Bestellnummer</span>
        <span class="value">${data.orderNumber}</span>
      </div>
      <div class="info-row">
        <span class="label">Ungefähre Summe</span>
        <span class="value">${formatEur(data.totalAmount)}</span>
      </div>
    </div>

    ${data.notes ? `<p><strong>Deine Anmerkungen:</strong> ${data.notes}</p>` : ''}

    <p style="color:#888;font-size:13px">Der genaue Betrag wird nach der Lieferung mitgeteilt.</p>
  `)

  await transporter.sendMail({
    from,
    to: data.to,
    subject: `✅ Bestellung ${data.orderNumber} eingegangen – ${appName}`,
    html,
  })
}

export async function sendStatusUpdate(
  data: OrderMailData,
  status: OrderStatus,
  shouldSend: boolean = true
) {
  if (!shouldSend || !emailsEnabled) return

  const transporter = createTransporter()
  if (!transporter) return

  const statusTexts: Partial<Record<OrderStatus, { subject: string; headline: string; body: string }>> = {
    CONFIRMED: {
      subject: `Bestellung ${data.orderNumber} bestätigt`,
      headline: 'Deine Bestellung wurde bestätigt!',
      body: 'Deine Bestellung wurde von uns bestätigt und wird bald auf den Weg gebracht.',
    },
    ON_THE_WAY: {
      subject: `Bestellung ${data.orderNumber} ist unterwegs`,
      headline: 'Deine Bestellung ist unterwegs! 🚀',
      body: 'Deine Bestellung ist jetzt auf dem Weg zu dir.',
    },
    DELIVERED: {
      subject: `Bestellung ${data.orderNumber} wurde abgeliefert`,
      headline: 'Bestellung abgeliefert!',
      body: 'Deine Bestellung wurde abgeliefert. Die Zahlungsdetails folgen in Kürze.',
    },
    CANCELLED: {
      subject: `Bestellung ${data.orderNumber} wurde storniert`,
      headline: 'Bestellung storniert',
      body: 'Deine Bestellung wurde storniert. Bei Fragen melde dich bei uns.',
    },
  }

  const info = statusTexts[status]
  if (!info) return

  const html = baseTemplate(`
    <h2>${info.headline}</h2>
    <p>Hallo ${data.customerName},</p>
    <p>${info.body}</p>

    <div class="info-box">
      <div class="info-row">
        <span class="label">Bestellnummer</span>
        <span class="value">${data.orderNumber}</span>
      </div>
      <div class="info-row">
        <span class="label">Ungefähre Summe</span>
        <span class="value">${formatEur(data.totalAmount)}</span>
      </div>
    </div>
  `)

  await transporter.sendMail({
    from,
    to: data.to,
    subject: `${info.subject} – ${appName}`,
    html,
  })
}

export async function sendPaymentDue(data: OrderMailData, shouldSend: boolean = true) {
  if (!shouldSend || !emailsEnabled) return

  const transporter = createTransporter()
  if (!transporter) return

  if (!data.finalAmount || !data.paymentAccount) return

  const paypalSection = data.paymentAccount.paypalMeLink
    ? `<p style="margin-top:12px">
        <strong>Alternativ per PayPal:</strong><br/>
        <a href="${data.paymentAccount.paypalMeLink}/${data.finalAmount.toFixed(2)}" style="color:#e8520a">
          ${data.paymentAccount.paypalMeLink}
        </a>
      </p>`
    : ''

  const html = baseTemplate(`
    <h2>Bitte überweise den Betrag 💳</h2>
    <p>Hallo ${data.customerName},</p>
    <p>deine Bestellung <strong>${data.orderNumber}</strong> wurde geliefert. Bitte überweise den folgenden Betrag:</p>

    <div style="text-align:center;margin:24px 0">
      <span class="amount">${formatEur(data.finalAmount)}</span>
    </div>

    ${itemsTable(data.items)}

    <div class="info-box">
      <p style="margin:0 0 12px;font-weight:bold">Bankverbindung</p>
      <div class="info-row">
        <span class="label">Kontoinhaber</span>
        <span class="value">${data.paymentAccount.accountHolder}</span>
      </div>
      <div class="info-row">
        <span class="label">IBAN</span>
        <span class="value" style="font-family:monospace">${data.paymentAccount.iban}</span>
      </div>
      ${data.paymentAccount.bic ? `
      <div class="info-row">
        <span class="label">BIC</span>
        <span class="value">${data.paymentAccount.bic}</span>
      </div>` : ''}
      <div class="info-row">
        <span class="label">Verwendungszweck</span>
        <span class="value">${data.orderNumber}</span>
      </div>
    </div>

    ${paypalSection}

    <p style="color:#888;font-size:13px">Bitte verwende die Bestellnummer als Verwendungszweck.</p>
  `)

  await transporter.sendMail({
    from,
    to: data.to,
    subject: `💳 Zahlung ausstehend: ${formatEur(data.finalAmount)} – ${data.orderNumber}`,
    html,
  })
}

export async function sendOrderCompleted(data: OrderMailData, shouldSend: boolean = true) {
  if (!shouldSend || !emailsEnabled) return

  const transporter = createTransporter()
  if (!transporter) return

  const html = baseTemplate(`
    <h2>Bestellung abgeschlossen – Danke! ✅</h2>
    <p>Hallo ${data.customerName},</p>
    <p>deine Bestellung <strong>${data.orderNumber}</strong> ist abgeschlossen. Vielen Dank!</p>

    <div class="info-box">
      <div class="info-row">
        <span class="label">Bestellnummer</span>
        <span class="value">${data.orderNumber}</span>
      </div>
      ${data.finalAmount ? `
      <div class="info-row">
        <span class="label">Bezahlter Betrag</span>
        <span class="value">${formatEur(data.finalAmount)}</span>
      </div>` : ''}
    </div>
  `)

  await transporter.sendMail({
    from,
    to: data.to,
    subject: `✅ Bestellung ${data.orderNumber} abgeschlossen – ${appName}`,
    html,
  })
}
