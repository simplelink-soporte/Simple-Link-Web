import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Iniciar Sesión | Panel Administrativo',
  description: 'Accede al panel administrativo de Simple-link'
}

export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 