'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export default function AuthCallbackPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    // Escuchar cambios en el estado de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Callback - Estado de autenticación:', event)
      
      if (event === 'SIGNED_IN') {
        // Verificar que el usuario tenga rol de admin
        const userRole = session?.user?.app_metadata?.role || 'client'
        
        if (userRole !== 'admin') {
          console.log('Usuario sin permisos de admin')
          await supabase.auth.signOut()
          toast.error('No tienes permisos de administrador')
          router.push('/admin/login')
          return
        }

        console.log('Redirigiendo al panel...')
        window.location.href = '/admin/dashboard/bookings/reservations'
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

      const userRole = session.user?.app_metadata?.role || 'client'
      if (userRole !== 'admin') {
        console.log('Usuario sin permisos de admin')
        await supabase.auth.signOut()
        toast.error('No tienes permisos de administrador')
        router.push('/admin/login')
        return
      }

      console.log('Sesión activa, redirigiendo...')
      window.location.href = '/admin/dashboard/bookings/reservations'
    }

    // Verificar sesión después de un breve delay
    const timer = setTimeout(checkInitialSession, 1000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [supabase, router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4 max-w-sm mx-auto p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Verificando autenticación...
        </p>
        <p className="text-xs text-gray-400">
          Serás redirigido automáticamente...
        </p>
      </div>
    </div>
  )
} 