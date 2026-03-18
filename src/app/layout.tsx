import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/layout/providers'
import { Header } from '@/components/layout/header'

const inter = Inter({ subsets: ['latin'] })

const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Bestellsystem'

export const metadata: Metadata = {
  title: appName,
  description: 'Mitarbeiter-Bestellplattform für Speisen und Getränke',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
