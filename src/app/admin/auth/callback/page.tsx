"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAppStore } from '@/store/appStore'

export default function AuthCallbackPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const { checkEmpresaOnboarding } = useAuth()
  const { initialize, isInitialized } = useAppStore()
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
    // Evitar múltiples ejecuciones
    if (!isProcessing) return

    const processAuth = async () => {
      try {
        // Obtener la sesión actual
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          console.error('No se encontró sesión activa')
          router.replace('/admin/login')
          setIsProcessing(false)
          return
        }

        // Recuperar la acción de autenticación (registro o login)
        const searchParams = new URLSearchParams(window.location.search)
        const urlAction = searchParams.get('action')
        const authAction = urlAction || 
          (typeof window !== 'undefined' ? localStorage.getItem('auth_action') || 'login' : 'login')
          
        console.log('Procesando autenticación:', { 
          userId: session.user.id, 
          authAction,
          provider: session.user.app_metadata.provider 
        })
        
        // Verificar onboarding
        const onboardingStatus = await checkEmpresaOnboarding(session.user.id)
        
        // Recuperar la URL de redirección guardada en localStorage
        const savedReturnUrl = typeof window !== 'undefined' 
          ? localStorage.getItem('auth_return_url') 
          : null
        
        // Limpiar localStorage para evitar problemas en futuras autenticaciones
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_return_url')
          localStorage.removeItem('auth_action')
        }
        
        // Si es un registro nuevo o no tiene empresa, redirigir a onboarding
        if (authAction === 'register' || !onboardingStatus.hasEmpresa) {
          router.replace('/admin/onboarding')
          setIsProcessing(false)
          return
        }
        
        // Si el onboarding está incompleto, redirigir a onboarding
        if (!onboardingStatus.isOnboardingComplete) {
          router.replace('/admin/onboarding')
          setIsProcessing(false)
          return
        }

        // Inicializar la aplicación antes de redirigir
        if (!isInitialized) {
          try {
            await initialize(session.user.id)
          } catch (error) {
            console.error('Error al inicializar la aplicación:', error)
            // Continuar con la redirección a pesar del error
          }
        }

        // Usar la URL guardada o la ruta por defecto
        const redirectTo = savedReturnUrl || '/admin/dashboard/bookings/reservations'
        
        // Usar router.replace en lugar de window.location.replace para evitar recargas completas
        router.replace(redirectTo)
        setIsProcessing(false)
      } catch (error) {
        console.error('Error al procesar autenticación:', error)
        router.replace('/admin/login')
        setIsProcessing(false)
      }
    }

    // Procesar autenticación inmediatamente para evitar retrasos
    processAuth()
  }, [router, supabase, checkEmpresaOnboarding, initialize, isInitialized, isProcessing])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    </div>
  )
}