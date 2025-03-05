"use client"

import { useQuery } from '@tanstack/react-query'
import { createSupabaseClient } from '@/lib/supabase'
import type { ServiceResponse, Vinculacion } from '../types'

const supabase = createSupabaseClient()

export function useVinculaciones(userId: string) {
  return useQuery<Vinculacion[], Error>({
    queryKey: ['vinculaciones', userId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('vinculaciones')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
      } catch (error: any) {
        console.error('Error al obtener vinculaciones:', error)
        throw error
      }
    },
    enabled: !!userId
  })
} 