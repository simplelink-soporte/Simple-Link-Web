"use client"

import { useEffect, useState } from 'react'
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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isProcessing = false

    // Función para procesar la autenticación
    const processAuth = async (userId: string) => {
      if (isProcessing) return
      isProcessing = true

      try {
        console.log('Verificando onboarding para usuario:', userId)
        const onboardingStatus = await checkEmpresaOnboarding(userId)
        
        // Recuperar la URL de redirección guardada en localStorage
        const savedReturnUrl = typeof window !== 'undefined' 
          ? localStorage.getItem('auth_return_url') 
          : null
        
        console.log('URL de redirección recuperada:', savedReturnUrl)
        
        if (!onboardingStatus.hasEmpresa || !onboardingStatus.isOnboardingComplete) {
          console.log('Usuario requiere onboarding')
          router.push('/admin/onboarding')
          return
        }

        // Limpiar el returnUrl del localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_return_url')
        }

        console.log('Usuario verificado, redirigiendo al panel...')
        
        // Usar la URL guardada o la ruta por defecto
        const redirectTo = savedReturnUrl || '/admin/dashboard/bookings/reservations'
        console.log('Redirigiendo a:', redirectTo)
        
        // Usar router.push para navegar sin recargar la página
        router.push(redirectTo)
      } catch (error) {
        console.error('Error al verificar onboarding:', error)
        setError('Error al verificar el estado de tu cuenta')
        toast.error('Error al verificar el estado de tu cuenta')
      } finally {
        isProcessing = false
      }
    }

    // Escuchar cambios en el estado de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Callback - Estado de autenticación:', event)
      
      if (event === 'SIGNED_IN' && session?.user) {
        await processAuth(session.user.id)
      }

      if (event === 'SIGNED_OUT') {
        console.log('Usuario cerró sesión')
        router.push('/admin/login')
      }
    })

    // Verificar estado inicial después de un breve delay
    const checkInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        await processAuth(session.user.id)
      } else {
        console.log('No hay sesión activa')
        setError('No se pudo iniciar sesión. Por favor, intenta nuevamente.')
        setTimeout(() => {
          router.push('/admin/login')
        }, 2000)
      }
    }

    // Dar tiempo para que la sesión se establezca
    const timer = setTimeout(checkInitialSession, 1000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [router, supabase, checkEmpresaOnboarding])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Verificando cuenta</h1>
        <p className="text-gray-500 mb-4">Esto puede tomar unos momentos...</p>
        {error && (
          <p className="text-red-500 mb-4">{error}</p>
        )}
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