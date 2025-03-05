import { supabase } from '@/lib/supabase'

type OnboardingStep = 'Empresa' | 'Sedes' | 'Integración' | 'Planes' | 'Completo'

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

    try {
      console.log('📍 Actualizando paso del onboarding:', { empresaId, step })

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

      console.log('✅ Paso del onboarding actualizado:', data)
      return { data, error: null }
    } catch (error) {
      console.error('Error en updateOnboardingStep:', error)
      return { data: null, error }
    }
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

      console.log('✅ Paso actual del onboarding:', data)
      return { data: data.onboarding as OnboardingStep, error: null }
    } catch (error) {
      console.error('Error en getCurrentStep:', error)
      return { data: null, error }
    }
  }
}

export const onboardingService = new OnboardingService() 