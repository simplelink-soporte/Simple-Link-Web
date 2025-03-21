import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import { DateProvider } from "@/contexts/DateContext"
import '../styles/calendar.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Panel Admin - Padel',
  description: 'Panel administrativo para gestión de canchas de padel',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <DateProvider>
          <Providers>
            {children}
          </Providers>
        </DateProvider>
      </body>
    </html>
  )
}
