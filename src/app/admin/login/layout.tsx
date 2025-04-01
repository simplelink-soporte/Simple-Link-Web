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
  return (
    <div className="flex h-screen w-full overflow-hidden">
      {children}
    </div>
  )
} 