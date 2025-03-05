"use client"

import { useQuery } from '@tanstack/react-query'
import { createSupabaseClient } from '@/lib/supabase'
import type { Usuario, ServiceResponse, UserPackage } from '../types'
import { useAuth } from '@/contexts/AuthContext'
import { useBranchContext } from '@/contexts/BranchContext'

export interface UserWithPackage extends Usuario {
  hasActivePackage: boolean;
  activePackageId?: string;
}

export function useUsers() {
  const { user, isLoading: isLoadingAuth } = useAuth()
  const { currentBranch } = useBranchContext()
  const supabase = createSupabaseClient()

  // Obtener la empresa del usuario actual
  const { 
    data: empresa,
    isLoading: isLoadingEmpresa,
    error: empresaError
  } = useQuery({
    queryKey: ['empresa', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No hay usuario autenticado')

      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

      if (error) throw error
      if (!data) throw new Error('No se encontró la empresa')

      return data
    },
    enabled: !!user?.id && !isLoadingAuth,
    retry: false
  })

  // Obtener usuarios vinculados a la empresa
  const {
    data: usersResponse,
    isLoading: isLoadingUsers,
    error: usersError,
    refetch
  } = useQuery({
    queryKey: ['users', empresa?.id, currentBranch?.id],
    queryFn: async () => {
      if (!empresa?.id) {
        throw new Error('No se ha encontrado la empresa')
      }

      console.log('🔍 Iniciando búsqueda de usuarios vinculados para empresa:', empresa.id)

      // Consulta de vinculaciones
      const { data: vinculaciones, error: vincError } = await supabase
        .from('vinculaciones')
        .select('user_id, estado, empresa_id')
        .eq('empresa_id', empresa.id)
        .eq('estado', 'activo')

      if (vincError) {
        console.error('❌ Error al obtener vinculaciones:', vincError)
        throw vincError
      }

      console.log('📋 Vinculaciones activas encontradas:', vinculaciones?.length || 0)

      if (!vinculaciones?.length) {
        console.log('ℹ️ No se encontraron vinculaciones activas')
        return { data: [] }
      }

      const userIds = vinculaciones.map(v => v.user_id)
      console.log('🔑 IDs de usuarios encontrados:', userIds)

      // Obtener usuarios
      const { data: usuarios, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .in('id', userIds)

      if (userError) {
        console.error('❌ Error al obtener usuarios:', userError)
        throw userError
      }

      // Obtener paquetes activos para estos usuarios
      const { data: userPackages, error: packagesError } = await supabase
        .from('user_packages')
        .select('user_id, package_id, sessions_left, expires_at')
        .in('user_id', userIds)
        .eq('empresa_id', empresa.id)
        .eq('status', 'active')
        .gt('sessions_left', 0) // Solo paquetes con sesiones disponibles
        .gte('expires_at', new Date().toISOString()) // Solo paquetes no expirados

      if (packagesError) {
        console.error('❌ Error al obtener paquetes:', packagesError)
        throw packagesError
      }

      console.log('📦 Paquetes activos encontrados:', userPackages?.length || 0)

      // Crear un mapa de usuarios con sus paquetes
      const usersWithPackages: UserWithPackage[] = usuarios?.map(user => {
        const userActivePackages = userPackages?.filter(pkg => 
          pkg.user_id === user.id && 
          pkg.sessions_left > 0 && 
          new Date(pkg.expires_at) > new Date()
        )
        
        const hasActivePackage = userActivePackages?.length > 0
        console.log(`Usuario ${user.nombre}: ${hasActivePackage ? 'tiene' : 'no tiene'} paquete activo`)
        
        return {
          ...user,
          hasActivePackage,
          activePackageId: userActivePackages?.[0]?.package_id
        }
      }) || []

      console.log('👥 Usuarios procesados con información de paquetes:', usersWithPackages.length)
      return { data: usersWithPackages }
    },
    enabled: !!empresa?.id && !!currentBranch?.id && !isLoadingAuth && !isLoadingEmpresa,
    retry: false
  })

  // Procesar errores
  let error: ServiceResponse<any>['error'] | undefined
  if (empresaError || usersError) {
    const err = empresaError || usersError
    error = {
      message: err instanceof Error ? err.message : 'Error desconocido',
      details: err instanceof Error ? err.stack : undefined
    }
    console.error('❌ Error en useUsers:', error)
  }

  return {
    users: usersResponse?.data || [],
    isLoading: isLoadingAuth || isLoadingEmpresa || isLoadingUsers,
    error,
    refetch
  }
}
