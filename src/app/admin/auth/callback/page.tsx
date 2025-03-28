"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

export default function AuthCallbackPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const { checkEmpresaOnboarding } = useAuth()

  useEffect(() => {
    let retryCount = 0
    const maxRetries = 3
    const retryInterval = 1000 // 1 segundo

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          if (retryCount < maxRetries) {
            retryCount++
            console.log(`Reintentando obtener sesión (${retryCount}/${maxRetries})...`)
            setTimeout(checkSession, retryInterval)
            return
          }
          console.error('No se pudo obtener la sesión después de reintentos')
          router.push('/admin/login')
          return
        }

        console.log('Sesión obtenida, verificando onboarding...')
        const onboardingStatus = await checkEmpresaOnboarding(session.user.id)
        
        if (!onboardingStatus.hasEmpresa || !onboardingStatus.isOnboardingComplete) {
          console.log('Usuario requiere onboarding')
          window.location.href = '/admin/onboarding'
          return
        }

        console.log('Usuario verificado, redirigiendo al panel...')
        window.location.href = '/admin/dashboard/bookings/reservations'
      } catch (error) {
        console.error('Error al verificar sesión:', error)
        toast.error('Error al verificar el estado de tu cuenta')
        router.push('/admin/login')
      }
    }

    // Iniciar verificación de sesión
    checkSession()

    // Cleanup
    return () => {
      retryCount = maxRetries // Detener reintentos si el componente se desmonta
    }
  }, [router, supabase, checkEmpresaOnboarding])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Verificando cuenta</h1>
        <p className="text-gray-500 mb-4">Esto tomará solo un momento...</p>
        <Button
          variant="outline"
          onClick={() => router.push('/admin/login')}
        >
          Volver al inicio de sesión
        </Button>
      </div>
    </div>
  )
}