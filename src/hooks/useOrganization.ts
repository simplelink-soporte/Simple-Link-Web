import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { createSupabaseClient } from '@/lib/supabase'
import type { Database } from '@/types/supabase'
import { toast } from 'sonner'

type Organization = Database['public']['Tables']['empresas']['Row']

export default function useOrganization() {
  const { user } = useAuth()
  const supabase = createSupabaseClient()
  
  const { data: organization, isLoading, error } = useQuery({
    queryKey: ['organization', user?.id],
    queryFn: async () => {
      try {
        if (!user?.id) {
          throw new Error('Usuario no autenticado')
        }

        const { data: empresaData, error: empresaError } = await supabase
          .from('empresas')
          .select('*')
          .eq('auth_user_id', user.id)
          .eq('is_active', true)
          .maybeSingle()

        if (empresaError) {
          console.error('Error al cargar empresa:', empresaError)
          toast.error('Error al cargar la información de la empresa')
          throw empresaError
        }
        
        if (!empresaData) {
          console.warn('No se encontró la empresa para el usuario:', user.id)
          return null
        }

        return empresaData
      } catch (error) {
        console.error('Error al cargar la empresa:', error)
        throw error
      }
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: 1
  })

  return {
    organization,
    organizationId: organization?.id || null,
    isLoading,
    error
  }
} 