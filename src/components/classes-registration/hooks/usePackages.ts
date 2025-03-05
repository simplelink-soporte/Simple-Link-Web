"use client"

import { useState, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PackageService } from '../services'
import { useClassRegistrationAuth } from './useAuth'
import { useClassRegistration } from '../context'
import type { ClassPackage } from '../types/models'
import type { ClassRegistrationError } from '../types/error'

const packageService = new PackageService()

export function usePackages(empresaId: string) {
  const { user } = useClassRegistrationAuth()
  const { dispatch } = useClassRegistration()

  // Usar React Query para el manejo de cache y re-fetching
  const {
    data: packages = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['packages', empresaId],
    queryFn: async () => {
      try {
        console.log('🔍 Iniciando búsqueda de paquetes una sola vez')
        return await packageService.getPackages(empresaId)
      } catch (error) {
        console.error('Error al cargar paquetes:', error)
        dispatch({ 
          type: 'SET_ERROR', 
          payload: { 
            type: 'LOAD_ERROR',
            message: 'Error al cargar los paquetes disponibles'
          }
        })
        throw error
      }
    },
    enabled: !!empresaId,
    staleTime: 5 * 60 * 1000, // Datos considerados frescos por 5 minutos
    gcTime: 30 * 60 * 1000, // Garbage collection después de 30 minutos
    refetchOnWindowFocus: false, // Evitar refetch al cambiar de ventana
    refetchOnMount: false // Evitar refetch al montar el componente
  })

  const getPackageById = useCallback(async (packageId: string) => {
    if (!user) return null

    try {
      return await packageService.getPackageById(packageId)
    } catch (error: any) {
      console.error('❌ Error al obtener el paquete:', error)
      return null
    }
  }, [user])

  const createUserPackage = useCallback(async (packageId: string, empresaId?: string) => {
    if (!user) {
      console.error('❌ No hay usuario autenticado')
      return null
    }

    try {
      const userPackage = await packageService.createUserPackage(packageId, user.id, empresaId)
      if (userPackage) {
        console.log('✅ Paquete de usuario creado:', userPackage)
      }
      return userPackage
    } catch (error: any) {
      console.error('❌ Error al crear el paquete de usuario:', error)
      dispatch({ 
        type: 'SET_ERROR', 
        payload: { 
          type: 'CREATE_ERROR',
          message: 'Error al crear el paquete de usuario'
        }
      })
      return null
    }
  }, [user, dispatch])

  return {
    packages,
    isLoading,
    error,
    refetch,
    getPackageById,
    createUserPackage
  }
} 