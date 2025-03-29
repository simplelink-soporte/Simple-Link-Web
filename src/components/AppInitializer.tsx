"use client"

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useAppStore } from '@/store/appStore'
import { useRouter, usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface AppInitializerProps {
  children: React.ReactNode
}

export function AppInitializer({ children }: AppInitializerProps) {
  const { user, isLoading: isLoadingAuth, refreshSession } = useAuth()
  const { initialize, reset, isInitialized } = useAppStore()
  const router = useRouter()
  const pathname = usePathname()
  const [isInitializing, setIsInitializing] = useState(false)
  const [initializationAttempts, setInitializationAttempts] = useState(0)
  const [initializationError, setInitializationError] = useState<string | null>(null)

  // Efecto para inicializar la aplicación
  useEffect(() => {
    // Evitar inicialización en rutas de autenticación
    const isAuthRoute = pathname.includes('/auth/callback') || 
                        pathname.includes('/login') || 
                        pathname.includes('/register') ||
                        pathname.includes('/onboarding') ||
                        pathname.includes('/auth/error')
    
    if (isAuthRoute) {
      console.log(' En ruta de autenticación, omitiendo inicialización en AppInitializer:', pathname)
      setIsInitializing(false)
      return
    }

    // Si ya está inicializado o está en proceso, no hacer nada
    if (isInitialized || isInitializing || isLoadingAuth) {
      return
    }

    const initApp = async () => {
      try {
        setIsInitializing(true)

        if (!user?.id) {
          console.log(' No hay usuario, reseteando estado y redirigiendo...')
          reset()
          if (pathname.startsWith('/admin/dashboard')) {
            // Usar window.location.replace para asegurar una recarga completa
            const returnUrl = encodeURIComponent(pathname)
            window.location.replace(`/admin/login?returnUrl=${returnUrl}`)
          } else {
            router.replace('/admin/login?returnUrl=' + encodeURIComponent(pathname))
          }
          setIsInitializing(false)
          return
        }

        console.log(' Inicializando aplicación para usuario:', user.id)
        await initialize(user.id)
        console.log(' Aplicación inicializada correctamente')
        // Eliminamos el toast de inicio de sesión exitoso para hacer el flujo más fluido
      } catch (error) {
        console.error(' Error initializing app:', error)
        setInitializationError('Error al cargar los datos. Intenta recargar la página.')
        toast.error('Error al cargar los datos de la aplicación')
        reset()
        
        // Incrementar contador de intentos
        setInitializationAttempts(prev => prev + 1)
        
        // Si hay demasiados intentos fallidos, redirigir al login
        if (initializationAttempts >= 2) {
          router.replace('/admin/login?error=init')
        }
      } finally {
        setIsInitializing(false)
      }
    }

    // Inicializar la aplicación
    initApp()
  }, [user, isLoadingAuth, initialize, reset, router, pathname, isInitialized, isInitializing, initializationAttempts])

  // Agregar un timeout para evitar quedarse atascado en la pantalla de carga
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    if ((isLoadingAuth || isInitializing) && pathname.startsWith('/admin/dashboard')) {
      // Si después de 6 segundos seguimos cargando, forzar la continuación
      timeoutId = setTimeout(() => {
        console.log(' Timeout de carga alcanzado, continuando...')
        setIsInitializing(false)
        
        // Si después del timeout aún no hay usuario, redirigir al login
        if (!user) {
          console.log(' No se pudo obtener la sesión después del timeout')
          router.replace('/admin/login?error=timeout')
        }
      }, 6000) // 6 segundos
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [isLoadingAuth, isInitializing, pathname, user, router])

  // Si estamos en una ruta del dashboard y aún está cargando, mostrar loading
  if ((isLoadingAuth || isInitializing) && pathname.startsWith('/admin/dashboard')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-gray-500" />
          <p className="text-sm text-gray-500">
            {isLoadingAuth ? 'Verificando sesión...' : 'Inicializando aplicación...'}
          </p>
          {initializationError && (
            <p className="text-sm text-red-500 mt-2">{initializationError}</p>
          )}
        </div>
      </div>
    )
  }

  return <>{children}</>
}