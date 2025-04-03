import { createSupabaseClient } from '@/lib/supabase'

const supabase = createSupabaseClient()

// Cache para almacenar los items por empresa ID
const itemsCache = new Map<string, {
  data: any[],
  timestamp: number
}>()

// Tiempo de expiración de la caché (10 segundos)
const CACHE_EXPIRATION = 10000

// Evitar consultas simultáneas
let pendingRequests = new Map<string, Promise<any>>()

class OnboardingItemsService {
  /**
   * Crea automáticamente items predeterminados para una empresa
   * @param empresaId - ID de la empresa
   * @param sedeId - ID de la sede (opcional)
   * @returns Resultado de la operación con los items creados
   */
  async createDefaultItems(
    empresaId: string,
    sedeId?: string
  ): Promise<{
    success: boolean,
    data: any[] | null,
    error: Error | null
  }> {
    try {
      console.log('📍 Creando items predeterminados para empresa:', empresaId)
      
      if (!empresaId) {
        throw new Error('Se requiere el ID de la empresa para crear los items por defecto')
      }

      // Obtener información de la empresa para conocer el país
      const { data: companyData, error: companyError } = await supabase
        .from('empresas')
        .select('country')
        .eq('id', empresaId)
        .single()

      if (companyError) {
        console.warn('Error al obtener la información de la empresa:', companyError)
      }

      // Valor por defecto para el precio de los items
      let raquetaPrices = {
        "60": 10,
        "90": 15,
        "120": 20,
        "150": 25,
        "180": 30
      }
      let pelotasPrices = {
        "60": 5,
        "90": 7.5,
        "120": 10,
        "150": 12.5,
        "180": 15
      }

      // Si la empresa es de México, ajustamos los precios
      if (companyData?.country === 'Mexico') {
        console.log('🇲🇽 Empresa de México: Aplicando precios especiales para items')
        raquetaPrices = {
          "60": 150,
          "90": 225,
          "120": 300,
          "150": 375,
          "180": 450
        }
        pelotasPrices = {
          "60": 75,
          "90": 112.5,
          "120": 150,
          "150": 187.5,
          "180": 225
        }
      }
      
      // Definir los items predeterminados (una raqueta y pelotas de padel)
      const defaultItems = [
        {
          name: "Raqueta de Padel",
          type: "equipment",
          duration_pricing: raquetaPrices,
          default_duration: 60,
          stock: 50,
          requires_deposit: false,
          is_active: true,
          empresa_id: empresaId,
          sede_id: sedeId || null
        },
        {
          name: "Set de Pelotas de Padel",
          type: "equipment",
          duration_pricing: pelotasPrices,
          default_duration: 60,
          stock: 100,
          requires_deposit: false,
          is_active: true,
          empresa_id: empresaId,
          sede_id: sedeId || null
        }
      ]
      
      // Verificar si ya existen items para esta empresa
      const { data: existingItems, error: existingError } = await supabase
        .from('items')
        .select('id')
        .eq('empresa_id', empresaId)
        
      if (existingError) {
        console.warn('Error al verificar items existentes:', existingError)
      }
      
      // Si ya existen items, no crear nuevos
      if (existingItems && existingItems.length > 0) {
        console.log('⏭️ La empresa ya tiene items, no se crearán nuevos')
        return { success: true, data: existingItems, error: null }
      }
      
      // Insertar los items por defecto
      const { data, error } = await supabase
        .from('items')
        .insert(defaultItems)
        .select()
      
      if (error) throw error
      
      // Actualizar caché
      itemsCache.set(empresaId, {
        data: data,
        timestamp: Date.now()
      })
      
      return { success: true, data, error: null }
    } catch (error: any) {
      console.error('Error al crear items predeterminados:', error)
      return { success: false, data: null, error }
    }
  }

  /**
   * Obtiene los items para una empresa
   * @param empresaId - ID de la empresa
   * @returns Resultado de la operación con los items obtenidos
   */
  async getItemsByEmpresaId(
    empresaId: string
  ): Promise<{
    success: boolean,
    data: any[] | null,
    error: Error | null
  }> {
    try {
      if (!empresaId) {
        throw new Error('Se requiere el ID de la empresa para obtener los items')
      }
      
      // Verificar si hay datos en caché que no hayan expirado
      const cachedData = itemsCache.get(empresaId)
      if (cachedData && (Date.now() - cachedData.timestamp < CACHE_EXPIRATION)) {
        return { success: true, data: cachedData.data, error: null }
      }
      
      // Verificar si hay una consulta pendiente para este ID
      if (pendingRequests.has(empresaId)) {
        const result = await pendingRequests.get(empresaId)
        return result
      }
      
      // Crear una promesa para la consulta
      const requestPromise = new Promise<{
        success: boolean,
        data: any[] | null,
        error: Error | null
      }>(async (resolve) => {
        try {
          const { data, error } = await supabase
            .from('items')
            .select('*')
            .eq('empresa_id', empresaId)
            .order('created_at', { ascending: false })
          
          if (error) throw error
          
          // Actualizar caché
          itemsCache.set(empresaId, {
            data: data,
            timestamp: Date.now()
          })
          
          resolve({ success: true, data, error: null })
        } catch (error: any) {
          console.error('Error al obtener items:', error)
          resolve({ success: false, data: null, error })
        } finally {
          // Eliminar la solicitud pendiente
          pendingRequests.delete(empresaId)
        }
      })
      
      // Guardar la promesa de la consulta
      pendingRequests.set(empresaId, requestPromise)
      
      // Devolver la promesa
      return requestPromise
    } catch (error: any) {
      console.error('Error en getItemsByEmpresaId:', error)
      return { success: false, data: null, error }
    }
  }

  /**
   * Elimina todos los items para una empresa
   * @param empresaId - ID de la empresa
   * @returns Resultado de la operación
   */
  async deleteItemsByEmpresaId(
    empresaId: string
  ): Promise<{
    success: boolean,
    error: Error | null
  }> {
    try {
      if (!empresaId) {
        throw new Error('Se requiere el ID de la empresa para eliminar los items')
      }
      
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('empresa_id', empresaId)
      
      if (error) throw error
      
      // Eliminar de la caché
      itemsCache.delete(empresaId)
      
      return { success: true, error: null }
    } catch (error: any) {
      console.error('Error al eliminar items:', error)
      return { success: false, error }
    }
  }
}

export const onboardingItemsService = new OnboardingItemsService()
