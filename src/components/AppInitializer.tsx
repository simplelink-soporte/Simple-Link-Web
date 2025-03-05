"use client"

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useAppStore } from '@/store/appStore'
import { useRouter, usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface AppInitializerProps {
  children: React.ReactNode
}

export function AppInitializer({ children }: AppInitializerProps) {
  const { user, isLoading: isLoadingAuth } = useAuth()
  const { initialize, reset, isInitialized } = useAppStore()
  const router = useRouter()
  const pathname = usePathname()
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    const initApp = async () => {
      try {
        if (!user?.id) {
          reset()
          if (pathname.startsWith('/admin/dashboard')) {
            router.replace('/admin/login')
          }
          return
        }

        if (!isInitialized) {
          await initialize(user.id)
        }
      } catch (error) {
        console.error('Error initializing app:', error)
        reset()
        router.replace('/admin/login')
      } finally {
        setIsInitializing(false)
      }
    }

    if (!isLoadingAuth) {
      initApp()
    }
  }, [user, isLoadingAuth, initialize, reset, router, pathname, isInitialized])

  // Si estamos en una ruta del dashboard y aún está cargando, mostrar loading
  if ((isLoadingAuth || isInitializing) && pathname.startsWith('/admin/dashboard')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          <p className="text-sm text-gray-500">
            {isLoadingAuth ? 'Verificando sesión...' : 'Inicializando aplicación...'}
          </p>
        </div>
      </div>
    )
  }

  // Si no hay usuario autenticado y estamos en una ruta protegida, no renderizar nada
  if (!user && pathname.startsWith('/admin/dashboard')) {
    return null
  }

  return <>{children}</>
} 