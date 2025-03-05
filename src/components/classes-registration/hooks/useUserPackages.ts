import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useAuth } from '@/contexts/AuthContext'
import type { Database } from '@/types/supabase'
import type { UserPackageFromDB } from '../types/models'

export function useUserPackages() {
  const [activePackage, setActivePackage] = useState<UserPackageFromDB | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { user } = useAuth()
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    async function fetchUserPackages() {
      if (!user?.id) {
        setIsLoading(false)
        return
      }

      try {
        const { data: packages, error } = await supabase
          .from('user_packages')
          .select(`
            id,
            user_id,
            package_id,
            sessions_left,
            expires_at,
            status,
            created_at,
            updated_at,
            package:package_id (
              id,
              name,
              branch_ids,
              class_count,
              expiration_days,
              advance_booking_days,
              include_private_classes,
              available_payment_methods,
              status
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .gt('sessions_left', 0)
          .gte('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)

        if (error) throw error

        // Si hay paquetes, tomamos el primero (el más reciente)
        if (packages && packages.length > 0) {
          const userPackage = packages[0] as UserPackageFromDB
          setActivePackage(userPackage)
        } else {
          setActivePackage(null)
        }
      } catch (err) {
        // Solo logueamos el error si no es el error de "no rows returned"
        if (!(err as any)?.message?.includes('no rows returned')) {
          console.error('Error al obtener paquetes del usuario:', err)
        }
        setError(err instanceof Error ? err : new Error('Error desconocido'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserPackages()
  }, [user?.id])

  return {
    activePackage,
    isLoading,
    error
  }
} 