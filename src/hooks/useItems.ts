import { useQuery } from '@tanstack/react-query'
import { createSupabaseClient } from '@/lib/supabase'
import type { Item } from '@/types/items'

interface UseItemsOptions {
  onError?: (error: Error) => void
}

export function useItems(branchId?: string, options: UseItemsOptions = {}) {
  const supabase = createSupabaseClient()

  return useQuery<Item[], Error>({
    queryKey: ['items', branchId],
    queryFn: async () => {
      console.log('🔍 Iniciando carga de artículos para sede:', branchId)

      if (!branchId) {
        console.error('❌ No se proporcionó ID de sede')
        throw new Error('Se requiere el ID de la sede para cargar los artículos')
      }

      try {
        // Verificar primero si la sede existe
        console.log('👉 Verificando existencia de la sede:', branchId)
        const { data: branch, error: branchError } = await supabase
          .from('sedes')
          .select('id, name')
          .eq('id', branchId)
          .single()

        if (branchError) {
          console.error('❌ Error al verificar la sede:', branchError)
          throw new Error(`Error al verificar la sede: ${branchError.message}`)
        }

        if (!branch) {
          console.error('❌ Sede no encontrada:', branchId)
          throw new Error(`La sede ${branchId} no existe o no está disponible`)
        }

        console.log('✅ Sede verificada:', branch.name)

        // Obtener los artículos
        console.log('👉 Obteniendo artículos de la sede')
        const { data, error } = await supabase
          .from('items')
          .select('*')
          .eq('sede_id', branchId)
          .eq('is_active', true)
          .order('name')

        if (error) {
          console.error('❌ Error al cargar items:', error)
          throw new Error(`Error al cargar los artículos: ${error.message}`)
        }

        if (!data) {
          console.log('ℹ️ No se encontraron artículos')
          return []
        }

        console.log(`✅ ${data.length} artículos encontrados`)

        // Validar y transformar los datos
        const transformedItems = data.map(item => {
          // Asegurarnos de que duration_pricing sea un objeto con valores numéricos
          let duration_pricing = {}
          try {
            if (typeof item.duration_pricing === 'string') {
              duration_pricing = JSON.parse(item.duration_pricing)
            } else if (item.duration_pricing && typeof item.duration_pricing === 'object') {
              duration_pricing = item.duration_pricing
            }
            
            // Convertir todos los valores a números y asegurar que las claves sean strings
            duration_pricing = Object.entries(duration_pricing).reduce((acc, [key, value]) => {
              const numericKey = Number(key)
              if (isNaN(numericKey)) return acc
              
              const numericValue = Number(value)
              if (isNaN(numericValue)) return acc
              
              console.log('Procesando precio por duración:', {
                itemName: item.name,
                duration: numericKey,
                price: numericValue
              })
              
              return {
                ...acc,
                [numericKey.toString()]: numericValue
              }
            }, {})

            console.log('Procesando duration_pricing para item:', {
              itemName: item.name,
              originalPricing: item.duration_pricing,
              processedPricing: duration_pricing,
              availableDurations: Object.keys(duration_pricing)
            })
          } catch (error) {
            console.error('Error procesando duration_pricing para item:', item.name, error)
          }

          return {
            id: item.id,
            name: item.name,
            type: item.type,
            duration_pricing,
            default_duration: item.default_duration,
            stock: item.stock,
            requires_deposit: item.requires_deposit,
            deposit_amount: item.deposit_amount,
            is_active: item.is_active,
            created_at: item.created_at,
            updated_at: item.updated_at,
            empresa_id: item.empresa_id,
            sede_id: item.sede_id
          }
        })

        console.log('✅ Datos transformados correctamente')
        return transformedItems

      } catch (error) {
        console.error('❌ Error en useItems:', error)
        if (options.onError) {
          options.onError(error instanceof Error ? error : new Error('Error desconocido'))
        }
        throw error
      }
    },
    enabled: !!branchId,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000),
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 30, // 30 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: true
  })
} 