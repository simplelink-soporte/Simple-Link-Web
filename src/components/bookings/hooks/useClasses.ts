"use client"

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import { useCurrentEmpresa } from '@/hooks/useCurrentEmpresa'
import { queryKeys } from '@/config/query-keys'
import { keepPreviousData } from '@tanstack/react-query'
import { useCallback } from 'react'

interface UseClassesProps {
  branchId?: string
}

// Definir el tipo base primero
type BaseClass = Database['public']['Tables']['classes']['Row']

// Extender el tipo base
interface ClassWithLink extends BaseClass {
  shareableLink: string | null
  isExpired?: boolean
  empresa?: {
    id: string
    name: string
    company_links?: Array<{
      slug: string
    }>
  }
}

interface FetchClassesOptions {
  empresaId: string
  branchId?: string
  includeCompleted?: boolean // Nuevo parámetro para incluir clases completadas
}

async function fetchClasses({
  empresaId,
  branchId,
  includeCompleted = false
}: FetchClassesOptions) {
  const supabase = createClientComponentClient<Database>()
  
  try {
    console.log('🔍 Iniciando carga de clases...', { empresaId, branchId, includeCompleted })

    // 1. Obtener el company_link de la empresa
    const { data: companyLink, error: linkError } = await supabase
      .from('company_links')
      .select('slug')
      .eq('type', 'classes')
      .eq('empresa_id', empresaId)
      .eq('is_active', true)
      .single()

    if (linkError && linkError.code !== 'PGRST116') {
      console.error('⚠️ Error al obtener company_link:', linkError)
    }

    // 2. Consulta principal de clases
    let query = supabase
      .from('classes')
      .select(`
        *,
        empresa:empresa_id (
          id,
          name,
          company_links (
            slug
          )
        )
      `)
      .eq('empresa_id', empresaId)
    
    // Filtrar clases completadas a menos que se soliciten explícitamente
    if (!includeCompleted) {
      query = query.neq('status', 'completed')
    }

    // 3. Aplicar filtro por sede si existe
    if (branchId) {
      console.log('🔍 Filtrando por sede:', branchId)
      query = query.eq('branch_id', branchId)
    }

    const { data: classesData, error: classesError } = await query
      .order('created_at', { ascending: false })

    if (classesError) {
      console.error('❌ Error al cargar las clases:', classesError)
      throw new Error(`Error al cargar las clases: ${classesError.message}`)
    }

    if (!classesData) {
      console.log('ℹ️ No se encontraron clases para la empresa:', empresaId)
      return []
    }

    // 4. Procesar las clases y agregar información adicional
    const classesWithLinks = classesData.map(classItem => {
      const companySlug = classItem.empresa?.company_links?.[0]?.slug || companyLink?.slug
      const now = new Date()
      
      // Verificar si la clase única ha expirado
      const isExpired = !classItem.is_recurring && 
        classItem.start_date && 
        new Date(classItem.start_date) < now

      return {
        ...classItem,
        isExpired,
        shareableLink: companySlug 
          ? `${window.location.origin}/clases/${companySlug}/${classItem.id}`
          : null
      }
    }) as ClassWithLink[]

    console.log('✅ Clases cargadas:', {
      empresaId,
      branchId,
      count: classesWithLinks.length,
      includeCompleted
    })

    return classesWithLinks
  } catch (error) {
    console.error('❌ Error en fetchClasses:', error)
    throw error
  }
}

export function useClasses({
  branchId,
  includeCompleted = false
}: UseClassesProps & { includeCompleted?: boolean } = {}) {
  const { empresa, isLoading: isLoadingEmpresa } = useCurrentEmpresa()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: queryKeys.classes.list({ branchId, empresaId: empresa?.id, includeCompleted }),
    queryFn: () => {
      if (!empresa?.id) throw new Error('No se encontró la empresa asociada')
      return fetchClasses({
        empresaId: empresa.id,
        branchId,
        includeCompleted
      })
    },
    enabled: !isLoadingEmpresa && !!empresa?.id,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 30, // 30 minutos
  })

  // Función para actualizar el caché después de crear/editar una clase
  const updateClassesCache = useCallback((newClass: ClassWithLink) => {
    if (!empresa?.id) return

    queryClient.setQueryData<ClassWithLink[]>(
      queryKeys.classes.list({ branchId, empresaId: empresa.id, includeCompleted }),
      old => {
        if (!old) return [newClass]
        // Si la clase ya existe, la actualizamos, si no, la agregamos al inicio
        const exists = old.some(c => c.id === newClass.id)
        if (exists) {
          return old.map(c => c.id === newClass.id ? newClass : c)
        }
        return [newClass, ...old]
      }
    )
  }, [empresa?.id, branchId, includeCompleted, queryClient])

  // Función para invalidar y refrescar los datos
  const invalidateClasses = useCallback(async () => {
    if (!empresa?.id) return
    await queryClient.invalidateQueries({
      queryKey: queryKeys.classes.list({ empresaId: empresa.id })
    })
  }, [empresa?.id, queryClient])

  // Prefetch de la siguiente página o datos relacionados
  const prefetchRelatedData = async () => {
    if (!empresa?.id) return

    if (branchId) {
      await queryClient.prefetchQuery({
        queryKey: queryKeys.classes.list({ empresaId: empresa.id }),
        queryFn: () => fetchClasses({
          empresaId: empresa.id,
          branchId,
          includeCompleted: false
        }),
      })
    }
  }

  return {
    ...query,
    prefetchRelatedData,
    data: query.data || [],
    updateClassesCache,
    invalidateClasses
  }
} 