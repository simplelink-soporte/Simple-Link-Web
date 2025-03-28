'use client'

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
    // Escuchar cambios en el estado de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Callback - Estado de autenticación:', event)
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('Usuario autenticado, verificando onboarding...')
        
        try {
          const onboardingStatus = await checkEmpresaOnboarding(session.user.id)
          
          if (!onboardingStatus.hasEmpresa || !onboardingStatus.isOnboardingComplete) {
            console.log('Usuario requiere onboarding')
            window.location.href = '/admin/onboarding'
            return
          }

          console.log('Usuario verificado, redirigiendo al panel...')
          window.location.href = '/admin/dashboard/bookings/reservations'
        } catch (error) {
          console.error('Error al verificar onboarding:', error)
          toast.error('Error al verificar el estado de tu cuenta')
          router.push('/admin/login')
        }
      }

      if (event === 'SIGNED_OUT') {
        console.log('Usuario cerró sesión')
        router.push('/admin/login')
      }
    })

    // Verificar estado inicial
    const checkInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        console.log('No hay sesión activa')
        router.push('/admin/login')
        return
      }

      try {
        const onboardingStatus = await checkEmpresaOnboarding(session.user.id)
        
        if (!onboardingStatus.hasEmpresa || !onboardingStatus.isOnboardingComplete) {
          console.log('Usuario requiere onboarding')
          window.location.href = '/admin/onboarding'
          return
        }

        console.log('Usuario verificado, redirigiendo al panel...')
        window.location.href = '/admin/dashboard/bookings/reservations'
      } catch (error) {
        console.error('Error al verificar onboarding:', error)
        toast.error('Error al verificar el estado de tu cuenta')
        router.push('/admin/login')
      }
    }

    checkInitialSession()

    return () => {
      subscription.unsubscribe()
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