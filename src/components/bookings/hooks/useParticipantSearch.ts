"use client"

import { useQuery } from '@tanstack/react-query'
import { createSupabaseClient } from '@/lib/supabase'
import { useCurrentEmpresa } from '@/hooks/useCurrentEmpresa'
import { queryKeys } from '@/config/query-keys'

interface Participant {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
}

export function useParticipantSearch(searchTerm: string = '') {
  const { empresa } = useCurrentEmpresa()
  const supabase = createSupabaseClient()

  return useQuery({
    queryKey: queryKeys.participants.search(empresa?.id, searchTerm),
    queryFn: async () => {
      if (!empresa?.id) return []

      try {
        // 1. Obtener vinculaciones activas
        const { data: vinculaciones, error: vincError } = await supabase
          .from('vinculaciones')
          .select('user_id')
          .eq('empresa_id', empresa.id)
          .eq('estado', 'activo')

        if (vincError) {
          console.error('Error al obtener vinculaciones:', vincError)
          return []
        }

        if (!vinculaciones?.length) return []

        const userIds = vinculaciones.map(v => v.user_id)

        // 2. Buscar usuarios vinculados
        const { data: usuarios, error: userError } = await supabase
          .from('usuarios')
          .select('id, nombre, email, telefono')
          .in('id', userIds)
          .or(searchTerm ? [
            `nombre.ilike.%${searchTerm}%`,
            `email.ilike.%${searchTerm}%`,
            `telefono.ilike.%${searchTerm}%`
          ].join(',') : undefined)
          .limit(10)
          .order('nombre')

        if (userError) {
          console.error('Error al obtener usuarios:', userError)
          return []
        }

        // 3. Transformar al formato esperado por el componente
        // Como solo tenemos 'nombre', lo dividimos en first_name y last_name
        return usuarios.map(user => {
          const nameParts = (user.nombre || '').split(' ')
          const firstName = nameParts[0] || ''
          const lastName = nameParts.slice(1).join(' ') || ''

          return {
            id: user.id,
            first_name: firstName,
            last_name: lastName,
            email: user.email,
            phone: user.telefono
          }
        }) as Participant[]

      } catch (error) {
        console.error('Error en la búsqueda de participantes:', error)
        return []
      }
    },
    enabled: Boolean(empresa?.id) && searchTerm.length >= 2,
    staleTime: 1000 * 60 * 5,
    retry: false,
    refetchOnWindowFocus: false,
  })
} 