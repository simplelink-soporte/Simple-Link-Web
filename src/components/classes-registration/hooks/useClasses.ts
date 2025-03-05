"use client"

import { useQuery } from '@tanstack/react-query'
import { ClassService } from '../services/classService'
import { useClassRegistration } from '../context'
import type { PublicClass } from '../types/models'

const classService = new ClassService()

export function useClasses(empresaId: string) {
  const { dispatch } = useClassRegistration()

  const {
    data: classes = [],
    isLoading,
    error,
    refetch
  } = useQuery<PublicClass[], Error>({
    queryKey: ['classes', empresaId],
    queryFn: async () => {
      try {
        if (!empresaId) {
          console.warn('⚠️ No se proporcionó ID de empresa')
          return []
        }

        // Intentar obtener las clases
        const classes = await classService.getPublicClasses(empresaId)
        console.log(`✅ Se cargaron ${classes.length} clases correctamente`)
        return classes

      } catch (error) {
        console.error('❌ Error al obtener las clases:', error)
        dispatch({ 
          type: 'SET_ERROR', 
          payload: { 
            type: 'LOAD_ERROR',
            message: 'Error al cargar las clases disponibles'
          }
        })
        throw error
      }
    },
    enabled: Boolean(empresaId),
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos para garbage collection
    retry: 2, // Intentar 2 veces más en caso de error
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    refetchOnWindowFocus: false,
    refetchOnMount: true // Permitimos refetch al montar para asegurar datos frescos
  })

  return {
    classes,
    isLoading,
    error,
    reloadClasses: refetch
  }
} 