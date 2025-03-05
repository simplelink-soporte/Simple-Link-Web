"use client"

import { useQuery } from '@tanstack/react-query'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { toast } from 'sonner'
import type { Database } from '@/types/supabase'

// Clave para el caché de React Query
const PACKAGES_CACHE_KEY = 'packages'

interface UsePackagesProps {
  enabled?: boolean
}

export function usePackages({ enabled = true }: UsePackagesProps = {}) {
  const supabase = createClientComponentClient<Database>()

  const query = useQuery({
    queryKey: [PACKAGES_CACHE_KEY],
    queryFn: async () => {
      try {
        // 1. Obtener la sesión actual
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('❌ Error al obtener la sesión:', sessionError)
          throw new Error('Error al obtener la sesión')
        }

        if (!session?.user?.id) {
          console.error('❌ No hay sesión activa')
          throw new Error('No hay sesión activa')
        }

        console.log('🔍 Buscando empresa para usuario:', session.user.id)

        // 2. Obtener la empresa del usuario
        const { data: empresaData, error: empresaError } = await supabase
          .from('empresas')
          .select('id')
          .eq('auth_user_id', session.user.id)
          .single()

        if (empresaError) {
          console.error('❌ Error al obtener empresa:', empresaError)
          throw new Error('Error al obtener la empresa')
        }

        if (!empresaData) {
          console.error('❌ No se encontró empresa para el usuario')
          throw new Error('No se encontró empresa asociada')
        }

        console.log('✅ Empresa encontrada:', empresaData.id)

        // 3. Obtener los paquetes
        const { data: packagesData, error: packagesError } = await supabase
          .from('packages')
          .select(`
            id,
            name,
            class_count,
            price,
            expiration_days,
            advance_booking_days,
            branch_ids,
            include_private_classes,
            tag,
            available_payment_methods,
            status,
            created_at,
            updated_at
          `)
          .eq('empresa_id', empresaData.id)
          .in('status', ['active', 'inactive'])
          .order('created_at', { ascending: false })

        if (packagesError) {
          console.error('❌ Error al cargar paquetes:', packagesError)
          throw new Error('Error al cargar los paquetes')
        }

        console.log('📦 Paquetes encontrados:', packagesData?.length || 0)

        // 4. Procesar los paquetes
        const validPackages = (packagesData || []).map(pkg => ({
          ...pkg,
          class_count: Number(pkg.class_count),
          price: Number(pkg.price),
          expiration_days: Number(pkg.expiration_days),
          advance_booking_days: Number(pkg.advance_booking_days),
          branch_ids: Array.isArray(pkg.branch_ids) ? pkg.branch_ids : [],
          available_payment_methods: Array.isArray(pkg.available_payment_methods) ? pkg.available_payment_methods : []
        }))

        console.log('✅ Paquetes procesados:', {
          empresa_id: empresaData.id,
          total: validPackages.length,
          paquetes: validPackages.map(pkg => ({
            id: pkg.id,
            name: pkg.name,
            status: pkg.status,
            price: pkg.price
          }))
        })

        return validPackages
      } catch (error) {
        console.error('❌ Error en usePackages:', error)
        throw error
      }
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 30, // 30 minutos
  })

  const updatePackageStatus = async (packageId: string, newStatus: 'active' | 'inactive' | 'archived') => {
    try {
      // 1. Obtener la sesión actual
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) throw new Error('No hay sesión activa')

      // 2. Obtener la empresa del usuario
      const { data: empresaData } = await supabase
        .from('empresas')
        .select('id')
        .eq('auth_user_id', session.user.id)
        .single()

      if (!empresaData) throw new Error('No se encontró empresa asociada')

      console.log('📦 Actualizando estado del paquete:', {
        packageId,
        newStatus,
        empresa_id: empresaData.id
      })

      // 3. Actualizar el estado
      const { error: updateError } = await supabase
        .from('packages')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', packageId)
        .eq('empresa_id', empresaData.id)

      if (updateError) {
        console.error('❌ Error al actualizar estado:', updateError)
        throw updateError
      }

      console.log('✅ Estado actualizado correctamente')
      await query.refetch()
      
      toast.success(`Paquete ${newStatus === 'archived' ? 'eliminado' : newStatus === 'inactive' ? 'ocultado' : 'visible'} exitosamente`)
    } catch (err) {
      const error = err as Error
      console.error('❌ Error al actualizar estado del paquete:', error)
      toast.error(error.message || 'Error al actualizar el estado del paquete')
      throw error
    }
  }

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    updatePackageStatus
  }
} 