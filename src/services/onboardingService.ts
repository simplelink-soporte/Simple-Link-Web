import { supabase } from '@/lib/supabase'

type OnboardingStep = 'Empresa' | 'Sedes' | 'Integración' | 'Planes' | 'Completo'

// Mapa para controlar las consultas en progreso
const pendingUpdates = new Map<string, Promise<any>>()

// Caché para almacenar los pasos recientes
const stepsCache = new Map<string, {
  step: OnboardingStep,
  timestamp: number
}>()

// Tiempo de expiración de la caché (10 segundos)
const CACHE_EXPIRATION = 10000

class OnboardingService {
  /**
   * Actualiza el estado del onboarding para una empresa
   * @param empresaId - ID de la empresa
   * @param step - Paso actual del onboarding
   * @returns Object con el resultado de la operación
   */
  async updateOnboardingStep(empresaId: string, step: OnboardingStep) {
    if (!empresaId) {
      throw new Error('ID de empresa requerido')
    }

    const cacheKey = `update_${empresaId}`
    
    // Si ya hay una actualización en curso para esta empresa, esperar a que termine
    if (pendingUpdates.has(cacheKey)) {
      console.log('⏳ Ya hay una actualización en progreso, esperando...')
      try {
        return await pendingUpdates.get(cacheKey)
      } catch (error) {
        console.error('Error en actualización pendiente:', error)
        // Si falla, continuamos con una nueva actualización
      }
    }
    
    // Iniciar nueva actualización
    const updatePromise = (async () => {
      try {
        console.log('📍 Actualizando paso del onboarding:', { empresaId, step })
  
        // Verificar si el paso actual ya es el mismo que queremos actualizar
        const currentStepData = await this.getCurrentStep(empresaId)
        if (currentStepData.data === step) {
          console.log('⏭️ El paso ya está actualizado, omitiendo')
          return { data: { id: empresaId, onboarding: step }, error: null }
        }
  
        const { data, error } = await supabase
          .from('empresas')
          .update({ onboarding: step })
          .eq('id', empresaId)
          .select()
          .single()
  
        if (error) {
          console.error('Error al actualizar el paso del onboarding:', error)
          throw error
        }
  
        // Actualizar caché
        stepsCache.set(empresaId, {
          step: step,
          timestamp: Date.now()
        })
  
        console.log('✅ Paso del onboarding actualizado:', data)
        return { data, error: null }
      } catch (error) {
        console.error('Error en updateOnboardingStep:', error)
        return { data: null, error }
      } finally {
        // Eliminar de pendientes después de un pequeño retraso
        // para evitar condiciones de carrera
        setTimeout(() => {
          pendingUpdates.delete(cacheKey)
        }, 100)
      }
    })()
    
    // Guardar la promesa para poder reutilizarla
    pendingUpdates.set(cacheKey, updatePromise)
    
    return await updatePromise
  }

  /**
   * Obtiene el estado actual del onboarding de una empresa
   * @param empresaId - ID de la empresa
   * @returns El paso actual del onboarding
   */
  async getCurrentStep(empresaId: string) {
    if (!empresaId) {
      throw new Error('ID de empresa requerido')
    }

    // Verificar caché
    const cached = stepsCache.get(empresaId)
    if (cached && (Date.now() - cached.timestamp < CACHE_EXPIRATION)) {
      console.log('🔄 Usando caché para paso de onboarding:', cached.step)
      return { data: cached.step, error: null }
    }
    
    const cacheKey = `get_${empresaId}`
    
    // Si ya hay una consulta en curso, esperar a que termine
    if (pendingUpdates.has(cacheKey)) {
      console.log('⏳ Ya hay una consulta en progreso, esperando...')
      try {
        return await pendingUpdates.get(cacheKey)
      } catch (error) {
        console.error('Error en consulta pendiente:', error)
        // Si falla, continuamos con una nueva consulta
      }
    }
    
    // Iniciar nueva consulta
    const getPromise = (async () => {
      try {
        console.log('📍 Obteniendo paso actual del onboarding:', empresaId)
  
        const { data, error } = await supabase
          .from('empresas')
          .select('onboarding')
          .eq('id', empresaId)
          .single()
  
        if (error) {
          console.error('Error al obtener el paso del onboarding:', error)
          throw error
        }
  
        const step = data.onboarding as OnboardingStep
        
        // Actualizar caché
        stepsCache.set(empresaId, {
          step,
          timestamp: Date.now()
        })
  
        console.log('✅ Paso actual del onboarding:', step)
        return { data: step, error: null }
      } catch (error) {
        console.error('Error en getCurrentStep:', error)
        return { data: null, error }
      } finally {
        // Eliminar de pendientes después de un pequeño retraso
        setTimeout(() => {
          pendingUpdates.delete(cacheKey)
        }, 100)
      }
    })()
    
    // Guardar la promesa para poder reutilizarla
    pendingUpdates.set(cacheKey, getPromise)
    
    return await getPromise
  }
  
  // Limpiar caché
  clearCache() {
    stepsCache.clear()
    pendingUpdates.clear()
  }
}

export const onboardingService = new OnboardingService() 