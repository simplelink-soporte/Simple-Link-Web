"use client"

import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import { AuthProvider } from '@/contexts/AuthContext'
import { OrganizationProvider } from '@/contexts/OrganizationContext'
import { BranchProvider } from '@/contexts/BranchContext'
import { RentalProvider } from '@/contexts/RentalContext'
import { AppInitializer } from '@/components/AppInitializer'

interface AdminLayoutProps {
  children: React.ReactNode
}

// Componente que solo se renderiza en el cliente
const ClientSideProviders = dynamic(
  () => Promise.resolve(({ children }: { children: React.ReactNode }) => (
    <AuthProvider>
      <AppInitializer>
        <OrganizationProvider>
          <BranchProvider>
            <RentalProvider>
              {children}
            </RentalProvider>
          </BranchProvider>
        </OrganizationProvider>
      </AppInitializer>
    </AuthProvider>
  )),
  { ssr: false }
)

const AUTH_ROUTES = ['/admin/login', '/admin/auth/callback', '/admin/onboarding']

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()
  const isAuthRoute = AUTH_ROUTES.some(route => pathname?.startsWith(route))

  // Si es una ruta de autenticación, envolver solo con AuthProvider
  if (isAuthRoute) {
    return <AuthProvider>{children}</AuthProvider>
  }

  // Para el resto de rutas admin, usar todos los providers
  return <ClientSideProviders>{children}</ClientSideProviders>
} 