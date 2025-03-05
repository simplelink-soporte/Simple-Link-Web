"use client"

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { toast } from 'sonner'
import type { Database } from '@/types/supabase'
import { useCurrentEmpresa } from '@/hooks/useCurrentEmpresa'
import { queryKeys } from '@/config/query-keys'
import { keepPreviousData } from '@tanstack/react-query'

// Clave para el caché de React Query
const PACKAGES_CACHE_KEY = 'packages'

interface UsePackagesProps {
  enabled?: boolean
}

// Tipo base para los paquetes
type BasePackage = Database['public']['Tables']['packages']['Row']

// Extender el tipo base con información adicional si es necesario
interface PackageWithMetadata extends BasePackage {
  empresa?: {
    id: string
    name: string
  }
}

async function fetchPackages(empresaId: string) {
  const supabase = createClientComponentClient<Database>()
  
  try {
    console.log('🔍 Iniciando carga de paquetes...', { empresaId })

    // Obtener los paquetes de la empresa
    const { data: packagesData, error: packagesError } = await supabase
      .from('packages')
      .select(`
        *,
        empresa:empresa_id (
          id,
          name
        )
      `)
      .eq('empresa_id', empresaId)
      .in('status', ['active', 'inactive'])
      .order('created_at', { ascending: false })

    if (packagesError) {
      console.error('❌ Error al cargar los paquetes:', packagesError)
      throw new Error(`Error al cargar los paquetes: ${packagesError.message}`)
    }

    // Si no hay paquetes, retornar array vacío
    if (!packagesData || packagesData.length === 0) {
      console.log('⚠️ No se encontraron paquetes para la empresa:', empresaId)
      return []
    }

    // Procesar los paquetes
    const validPackages = packagesData.map(pkg => ({
      ...pkg,
      class_count: Number(pkg.class_count),
      price: Number(pkg.price),
      expiration_days: Number(pkg.expiration_days),
      advance_booking_days: Number(pkg.advance_booking_days),
      branch_ids: Array.isArray(pkg.branch_ids) ? pkg.branch_ids : [],
      available_payment_methods: Array.isArray(pkg.available_payment_methods) ? pkg.available_payment_methods : []
    })) as PackageWithMetadata[]

    console.log('✅ Paquetes procesados:', {
      empresaId,
      count: validPackages.length
    })

    return validPackages
  } catch (error) {
    console.error('❌ Error en fetchPackages:', error)
    throw error
  }
}

async function updatePackageStatusFn(
  supabase: ReturnType<typeof createClientComponentClient<Database>>,
  packageId: string,
  empresaId: string,
  newStatus: 'active' | 'inactive' | 'archived'
) {
  const { error: updateError } = await supabase
    .from('packages')
    .update({ 
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', packageId)
    .eq('empresa_id', empresaId)

  if (updateError) throw updateError
}

export function usePackages({ enabled = true }: UsePackagesProps = {}) {
  const { empresa, isLoading: isLoadingEmpresa } = useCurrentEmpresa()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: queryKeys.packages.list({ empresaId: empresa?.id }),
    queryFn: () => {
      if (!empresa?.id) throw new Error('No se encontró la empresa asociada')
      return fetchPackages(empresa.id)
    },
    enabled: enabled && !isLoadingEmpresa && !!empresa?.id,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 30, // 30 minutos
  })

  const updatePackageStatus = async (packageId: string, newStatus: 'active' | 'inactive' | 'archived') => {
    if (!empresa?.id) {
      toast.error('No se encontró la empresa asociada')
      return
    }

    try {
      const supabase = createClientComponentClient<Database>()
      
      // Optimistic update
      const previousPackages = queryClient.getQueryData<PackageWithMetadata[]>(
        queryKeys.packages.list({ empresaId: empresa.id })
      )

      // Update cache optimistically
      queryClient.setQueryData<PackageWithMetadata[]>(
        queryKeys.packages.list({ empresaId: empresa.id }),
        old => old?.map(pkg => 
          pkg.id === packageId ? { ...pkg, status: newStatus } : pkg
        ) || []
      )

      // Perform update
      await updatePackageStatusFn(supabase, packageId, empresa.id, newStatus)
      
      // Refetch to ensure cache is in sync
      await query.refetch()
      
      toast.success(`Paquete ${newStatus === 'archived' ? 'eliminado' : newStatus === 'inactive' ? 'ocultado' : 'visible'} exitosamente`)
    } catch (err) {
      // Revert optimistic update on error
      queryClient.setQueryData(
        queryKeys.packages.list({ empresaId: empresa.id }),
        previousPackages
      )
      
      const error = err as Error
      console.error('Error al actualizar el estado del paquete:', error)
      toast.error(error.message || 'Error al actualizar el estado del paquete')
      throw error
    }
  }

  return {
    ...query,
    data: query.data || [],
    updatePackageStatus
  }
} 