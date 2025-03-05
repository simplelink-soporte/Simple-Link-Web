import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

type PlanType = Database['public']['Tables']['subscription_plans']['Row']['code']

interface SubscriptionData {
  subscriptionId: string
  expiresAt: Date
  planType: PlanType
}

export const empresaService = {
  async getEmpresaByUserId(userId: string) {
    if (!userId) {
      throw new Error('userId es requerido')
    }

    console.log('📍 Buscando empresa para el usuario:', userId)

    try {
      const { data, error } = await supabase
        .from('empresas')
        .select()
        .eq('auth_user_id', userId)
        .single()

      if (error) {
        console.error('❌ Error al buscar la empresa:', error)
        throw new Error(`Error al buscar la empresa: ${error.message}`)
      }

      if (!data) {
        console.error('❌ No se encontró empresa para el usuario:', userId)
        throw new Error('No se encontró la empresa')
      }

      console.log('✅ Empresa encontrada:', data)
      return data
    } catch (error) {
      console.error('❌ Error en el servicio de búsqueda de empresa:', error)
      throw error
    }
  },

  async updatePlanType(empresaId: string, planType: PlanType) {
    console.log('📍 Actualizando plan de empresa:', { empresaId, planType })
    const supabase = createClientComponentClient<Database>()
    
    try {
      const updateData = {
        plan_type: planType,
        updated_at: new Date().toISOString()
      }
      
      console.log('📍 Datos a actualizar:', updateData)
      
      const { data, error } = await supabase
        .from('empresas')
        .update(updateData)
        .eq('id', empresaId)
        .select()
        .single()

      if (error) throw error

      console.log('✅ Plan actualizado exitosamente:', data)
      return data
    } catch (error) {
      console.error('❌ Error al actualizar el plan:', error)
      throw error
    }
  },

  async updateSubscription(empresaId: string, subscriptionData: SubscriptionData) {
    if (!empresaId) {
      throw new Error('empresaId es requerido')
    }

    console.log('📍 Actualizando suscripción:', { empresaId, subscriptionData })
    
    try {
      const updateData = {
        plan_type: subscriptionData.planType,
        subscription_id: subscriptionData.subscriptionId,
        subscription_expires_at: subscriptionData.expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      }

      console.log('📍 Datos a actualizar:', updateData)

      const { data, error } = await supabase
        .from('empresas')
        .update(updateData)
        .eq('id', empresaId)
        .select()
        .single()

      if (error) {
        console.error('❌ Error al actualizar la suscripción:', error)
        throw new Error(`Error al actualizar la suscripción: ${error.message}`)
      }

      if (!data) {
        console.error('❌ No se encontró la empresa con ID:', empresaId)
        throw new Error('No se encontró la empresa')
      }

      console.log('✅ Suscripción actualizada exitosamente:', data)
      return data
    } catch (error) {
      console.error('❌ Error en el servicio de actualización de suscripción:', error)
      throw error
    }
  }
} 