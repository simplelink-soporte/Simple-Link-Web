import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createSupabaseClient } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

interface UpdatePayPalDetailsData {
  empresaId: string
  subscriptionId: string
  subscriptionExpiresAt: Date
  paymentAmount: number
  paypalData: {
    orderID?: string
    subscriptionID: string
    facilitatorAccessToken?: string
    paymentSource?: string
    paymentStatus?: string
    lastPaymentDate?: string
    nextPaymentDate?: string
  }
}

interface PayPalSubscriptionDetails {
  id: string
  status: string
  start_time: string
  quantity: string
  create_time: string
  plan_overridden: boolean
  plan_id: string
  next_billing_time: string
}

type SubscriptionPlan = Database['public']['Tables']['subscription_plans']['Row']
type SubscriptionPlanInsert = Database['public']['Tables']['subscription_plans']['Insert']
type SubscriptionPlanUpdate = Database['public']['Tables']['subscription_plans']['Update']

export interface ServiceResponse<T> {
  data?: T
  error?: {
    message: string
    code: string
    details?: string
  }
}

const MAX_RETRIES = 3
const RETRY_DELAY = 2000 // 2 segundos

export const subscriptionService = {
  async updatePayPalDetails(data: UpdatePayPalDetailsData) {
    console.log('📍 Actualizando detalles de PayPal:', data)
    const supabase = createClientComponentClient<Database>()
    
    try {
      // Validar que la empresa existe
      const { data: empresa, error: empresaError } = await supabase
        .from('empresas')
        .select('id')
        .eq('id', data.empresaId)
        .single()

      if (empresaError || !empresa) {
        throw new Error('Empresa no encontrada')
      }

      // Procesamos las fechas de PayPal
      const lastPaymentDate = data.paypalData.lastPaymentDate ? 
        new Date(data.paypalData.lastPaymentDate) : 
        new Date()

      const nextPaymentDate = data.paypalData.nextPaymentDate ? 
        new Date(data.paypalData.nextPaymentDate) : 
        data.subscriptionExpiresAt

      // Crear el registro de suscripción
      const { data: subscription, error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert({
          empresa_id: data.empresaId,
          subscription_id: data.subscriptionId,
          plan_status: 'active',
          subscription_expires_at: data.subscriptionExpiresAt.toISOString(),
          last_payment_date: lastPaymentDate.toISOString(),
          next_payment_date: nextPaymentDate.toISOString(),
          payment_amount: data.paymentAmount,
          payment_status: 'paid',
          currency: 'EUR',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (subscriptionError) {
        throw new Error(`Error al crear suscripción: ${subscriptionError.message}`)
      }

      console.log('✅ Suscripción creada exitosamente:', subscription)
      return subscription
    } catch (error) {
      console.error('❌ Error en el servicio de suscripción:', error)
      throw error
    }
  },

  async getActiveSubscription(empresaId: string) {
    console.log('📍 Buscando suscripción activa para empresa:', empresaId)
    const supabase = createClientComponentClient<Database>()

    try {
      const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('plan_status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) {
        console.error('❌ Error al buscar la suscripción:', error)
        return null
      }

      return subscriptions && subscriptions.length > 0 ? subscriptions[0] : null
    } catch (error) {
      console.error('❌ Error en el servicio de suscripción:', error)
      return null
    }
  },

  async getPlans(): Promise<ServiceResponse<SubscriptionPlan[]>> {
    try {
      const supabase = createSupabaseClient()
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price', { ascending: true })
        .eq('is_active', true)

      if (error) {
        console.error('Error fetching plans:', error)
        return {
          error: {
            message: 'Error al obtener los planes',
            code: 'FETCH_ERROR',
            details: error.message
          }
        }
      }

      return { data }
    } catch (error: any) {
      console.error('Unexpected error in getPlans:', error)
      return {
        error: {
          message: 'Error inesperado al obtener los planes',
          code: 'UNEXPECTED_ERROR',
          details: error.message
        }
      }
    }
  },

  async getPlanById(id: string): Promise<ServiceResponse<SubscriptionPlan>> {
    try {
      const supabase = createSupabaseClient()
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching plan:', error)
        return {
          error: {
            message: 'Error al obtener el plan',
            code: 'FETCH_ERROR',
            details: error.message
          }
        }
      }

      return { data }
    } catch (error: any) {
      console.error('Unexpected error in getPlanById:', error)
      return {
        error: {
          message: 'Error inesperado al obtener el plan',
          code: 'UNEXPECTED_ERROR',
          details: error.message
        }
      }
    }
  },

  async getCompanyPlan(empresaId: string): Promise<ServiceResponse<SubscriptionPlan>> {
    try {
      const supabase = createSupabaseClient()
      const { data: empresa, error: empresaError } = await supabase
        .from('empresas')
        .select('plan_id')
        .eq('id', empresaId)
        .single()

      if (empresaError) throw empresaError

      if (!empresa?.plan_id) {
        // Si no tiene plan asignado, obtener el plan FREE por defecto
        const { data: freePlan, error: planError } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('code', 'FREE')
          .single()

        if (planError) throw planError
        return { data: freePlan }
      }

      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', empresa.plan_id)
        .single()

      if (planError) throw planError

      return { data: plan }
    } catch (error: any) {
      console.error('Error in getCompanyPlan:', error)
      return {
        error: {
          message: 'Error al obtener el plan de la empresa',
          code: 'FETCH_ERROR',
          details: error.message
        }
      }
    }
  },

  async updateCompanyPlan(empresaId: string, planId: string): Promise<ServiceResponse<void>> {
    try {
      const supabase = createSupabaseClient()
      const { error } = await supabase
        .from('empresas')
        .update({ 
          plan_id: planId,
          updated_at: new Date().toISOString()
        })
        .eq('id', empresaId)

      if (error) throw error

      return {}
    } catch (error: any) {
      console.error('Error in updateCompanyPlan:', error)
      return {
        error: {
          message: 'Error al actualizar el plan de la empresa',
          code: 'UPDATE_ERROR',
          details: error.message
        }
      }
    }
  }
} 