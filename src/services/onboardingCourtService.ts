import { createSupabaseClient } from '@/lib/supabase'
import { CourtData } from '@/app/admin/onboarding/components/steps/Branches/components/CourtsList'

const supabase = createSupabaseClient()

// Cache para almacenar las pistas por sede ID
const courtsCache = new Map<string, {
  data: any[],
  timestamp: number
}>()

// Tiempo de expiración de la caché (10 segundos)
const CACHE_EXPIRATION = 10000

// Evitar consultas simultáneas
let pendingRequests = new Map<string, Promise<any>>()

// Mapea características a una superficie para usar cuando no hay superficie definida
const getDefaultSurfaceFromCharacteristics = (characteristics: string[]): string => {
  const surfaceMap: Record<string, string> = {
    'cristal-estandar': 'crystal',
    'cristal-panoramico': 'panoramic',
    'muro-hormigon': 'concrete',
    'cesped-sintetico': 'synthetic',
    'tierra-batida': 'clay',
    'hormigon-pulido': 'concrete',
    'goma-profesional': 'rubber'
  }
  
  // Buscar la primera característica que corresponda a una superficie
  for (const characteristic of characteristics) {
    if (surfaceMap[characteristic]) {
      return surfaceMap[characteristic]
    }
  }
  
  // Valor por defecto si no se encuentra coincidencia
  return 'synthetic'
}

class OnboardingCourtService {
  // Método para guardar varias pistas para una sede
  async saveCourts(
    branchId: string,
    courts: CourtData[]
  ): Promise<{
    success: boolean,
    data: any[] | null,
    error: Error | null
  }> {
    try {
      console.log('📍 Guardando pistas para sede:', branchId)
      
      if (!branchId) {
        throw new Error('Se requiere el ID de la sede para guardar las pistas')
      }
      
      if (!courts || courts.length === 0) {
        console.warn('No hay pistas para guardar')
        return { success: true, data: [], error: null }
      }
      
      // Convertir datos de la interfaz al formato de la tabla courts
      const courtsToInsert = courts.map(court => ({
        name: court.name,
        branch_id: branchId,
        sport: court.sports[0], // Tomamos el primer deporte como principal
        court_type: court.type || 'indoor',
        surface: getDefaultSurfaceFromCharacteristics(court.characteristics), // Derivamos superficie de características
        features: JSON.stringify(court.characteristics || []), 
        is_active: court.is_active !== undefined ? court.is_active : true,
        available_durations: court.available_durations || [60],
        duration_pricing: court.duration_pricing || {},
        custom_pricing: court.custom_pricing || {}
      }))
      
      // Primero eliminamos las pistas existentes para esta sede (si las hay)
      await this.deleteCourtsByBranchId(branchId)
      
      // Insertar las nuevas pistas
      const { data, error } = await supabase
        .from('courts')
        .insert(courtsToInsert)
        .select()
      
      if (error) throw error
      
      // Actualizar caché
      courtsCache.set(branchId, {
        data: data,
        timestamp: Date.now()
      })
      
      return { success: true, data, error: null }
    } catch (error: any) {
      console.error('Error al guardar pistas:', error)
      return { success: false, data: null, error }
    }
  }
  
  /**
   * Crea automáticamente 4 pistas por defecto (2 racket y 2 swimming) para una sede
   * @param branchId - ID de la sede
   * @returns Resultado de la operación con las pistas creadas
   */
  async createDefaultCourts(
    branchId: string
  ): Promise<{
    success: boolean,
    data: any[] | null,
    error: Error | null
  }> {
    try {
      console.log('📍 Creando pistas por defecto para sede:', branchId)
      
      if (!branchId) {
        throw new Error('Se requiere el ID de la sede para crear las pistas por defecto')
      }
      
      // Definir las 4 pistas por defecto (2 racket y 2 swimming)
      const defaultCourts = [
        {
          name: "Pista Raqueta 1",
          branch_id: branchId,
          sport: "racket",
          court_type: "indoor",
          surface: "synthetic",
          features: JSON.stringify(["climate-control", "lighting"]),
          is_active: true,
          available_durations: [60, 90, 120],
          duration_pricing: {
            "60": 15,
            "90": 20,
            "120": 25
          },
          custom_pricing: {}
        },
        {
          name: "Pista Raqueta 2",
          branch_id: branchId,
          sport: "racket",
          court_type: "outdoor",
          surface: "concrete",
          features: JSON.stringify(["lighting"]),
          is_active: true,
          available_durations: [60, 90, 120],
          duration_pricing: {
            "60": 10,
            "90": 15,
            "120": 20
          },
          custom_pricing: {}
        },
        {
          name: "Piscina Olímpica",
          branch_id: branchId,
          sport: "swimming",
          court_type: "indoor",
          surface: "concrete",
          features: JSON.stringify(["climate-control", "lighting", "heated"]),
          is_active: true,
          available_durations: [60],
          duration_pricing: {
            "60": 0
          },
          custom_pricing: {}
        },
        {
          name: "Piscina Recreativa",
          branch_id: branchId,
          sport: "swimming",
          court_type: "outdoor",
          surface: "concrete",
          features: JSON.stringify(["lighting"]),
          is_active: true,
          available_durations: [60],
          duration_pricing: {
            "60": 0
          },
          custom_pricing: {}
        }
      ]
      
      // Verificar si ya existen pistas para esta sede
      const existingCourts = await this.getCourtsByBranchId(branchId)
      
      // Si ya existen pistas, no crear nuevas
      if (existingCourts.data && existingCourts.data.length > 0) {
        console.log('⏭️ La sede ya tiene pistas, no se crearán nuevas')
        return { success: true, data: existingCourts.data, error: null }
      }
      
      // Insertar las pistas por defecto
      const { data, error } = await supabase
        .from('courts')
        .insert(defaultCourts)
        .select()
      
      if (error) throw error
      
      // Actualizar caché
      courtsCache.set(branchId, {
        data: data,
        timestamp: Date.now()
      })
      
      console.log('✅ Pistas por defecto creadas exitosamente')
      return { success: true, data, error: null }
    } catch (error: any) {
      console.error('Error al crear pistas por defecto:', error)
      return { success: false, data: null, error }
    }
  }
  
  // Método para eliminar todas las pistas de una sede
  async deleteCourtsByBranchId(branchId: string): Promise<{
    success: boolean,
    error: Error | null
  }> {
    try {
      const { error } = await supabase
        .from('courts')
        .delete()
        .eq('branch_id', branchId)
      
      if (error) throw error
      
      // Invalidar caché
      courtsCache.delete(branchId)
      
      return { success: true, error: null }
    } catch (error: any) {
      console.error('Error al eliminar pistas de la sede:', error)
      return { success: false, error }
    }
  }
  
  // Método para obtener las pistas de una sede
  async getCourtsByBranchId(branchId: string): Promise<{
    data: any[] | null,
    error: Error | null
  }> {
    try {
      // Verificar si ya hay una consulta en curso
      const cacheKey = `courts_${branchId}`
      if (pendingRequests.has(cacheKey)) {
        console.log('⏳ Usando consulta pendiente para pistas')
        return await pendingRequests.get(cacheKey) as { data: any[] | null, error: Error | null }
      }
      
      // Iniciar nueva consulta
      const request = (async () => {
        try {
          // Verificar caché
          const cached = courtsCache.get(branchId)
          if (cached && (Date.now() - cached.timestamp < CACHE_EXPIRATION)) {
            console.log('🔄 Usando caché para pistas de sede:', branchId)
            return { data: cached.data, error: null }
          }
          
          console.log('📍 Obteniendo pistas para sede:', branchId)
          
          const { data, error } = await supabase
            .from('courts')
            .select('*')
            .eq('branch_id', branchId)
            .order('created_at', { ascending: false })
          
          if (error) throw error
          
          // Guardar en caché
          courtsCache.set(branchId, {
            data: data || [],
            timestamp: Date.now()
          })
          
          return { data, error: null }
        } catch (error: any) {
          console.error('Error al obtener pistas:', error)
          return { data: null, error }
        } finally {
          // Eliminar de consultas pendientes
          setTimeout(() => pendingRequests.delete(cacheKey), 100)
        }
      })()
      
      // Guardar la promesa para poder reutilizarla
      pendingRequests.set(cacheKey, request)
      return await request
    } catch (error: any) {
      console.error('Error inesperado al obtener pistas:', error)
      return { data: null, error }
    }
  }
  
  // Limpiar caché
  clearCache() {
    courtsCache.clear()
    pendingRequests.clear()
  }
}

export const onboardingCourtService = new OnboardingCourtService()
