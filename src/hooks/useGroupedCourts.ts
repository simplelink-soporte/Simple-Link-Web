"use client"

import { useQuery } from '@tanstack/react-query'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'

interface UseGroupedCourtsProps {
  branchId?: string
  sportFilter?: string
}

interface CourtOption {
  value: string
  label: string
}

interface GroupedCourtOption {
  label: string
  options: CourtOption[]
}

export function useGroupedCourts({ branchId, sportFilter }: UseGroupedCourtsProps) {
  const supabase = createClientComponentClient<Database>()

  const { data: courts = [], isLoading, error } = useQuery({
    queryKey: ['courts', branchId, sportFilter],
    queryFn: async () => {
      if (!branchId) return []

      console.log('🎾 Obteniendo canchas para sede:', branchId, sportFilter ? `(filtro: ${sportFilter})` : '')
      let query = supabase
        .from('courts')
        .select('*')
        .eq('branch_id', branchId)
        .eq('is_active', true)
      
      // Aplicar filtro de deporte si existe
      if (sportFilter) {
        query = query.eq('sport', sportFilter)
      }
        
      const { data, error } = await query.order('name')

      if (error) {
        console.error('❌ Error al obtener canchas:', error)
        throw error
      }

      console.log('✅ Canchas obtenidas:', data?.length || 0)
      return data || []
    },
    enabled: !!branchId
  })

  // Agrupar canchas por deporte
  const courtOptions = courts.reduce<GroupedCourtOption[]>((groups, court) => {
    const sportGroup = groups.find(g => g.label === court.sport)
    const courtOption = {
      value: court.id,
      label: court.name
    }

    if (sportGroup) {
      sportGroup.options.push(courtOption)
    } else {
      groups.push({
        label: court.sport,
        options: [courtOption]
      })
    }

    return groups
  }, [])

  return {
    courtOptions,
    isLoading,
    error: error as Error | null
  }
}       