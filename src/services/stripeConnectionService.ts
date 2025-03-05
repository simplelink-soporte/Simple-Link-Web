import { supabase } from '@/lib/supabase'

export interface StripeConnection {
  id: string
  empresa_id: string
  stripe_account_id: string
  stripe_account_email: string | null
  account_status: 'pending' | 'active' | 'restricted' | 'disabled'
  charges_enabled: boolean
  payouts_enabled: boolean
  requirements: any
  created_at: string
  updated_at: string
  last_webhook_received_at: string | null
}

class StripeConnectionService {
  /**
   * Obtiene la conexión de Stripe para una empresa específica
   */
  async getConnection(empresaId: string): Promise<StripeConnection | null> {
    try {
      const { data, error } = await supabase
        .from('stripe_connections')
        .select('*')
        .eq('empresa_id', empresaId)
        .single()

      if (error) {
        console.error('Error al obtener la conexión de Stripe:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error en getConnection:', error)
      return null
    }
  }

  /**
   * Elimina la conexión de Stripe de una empresa
   */
  async deleteConnection(connectionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('stripe_connections')
        .delete()
        .eq('id', connectionId)

      if (error) {
        console.error('Error al eliminar la conexión de Stripe:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error en deleteConnection:', error)
      return false
    }
  }

  /**
   * Actualiza el estado de una conexión de Stripe
   */
  async updateConnectionStatus(
    connectionId: string, 
    status: StripeConnection['account_status']
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('stripe_connections')
        .update({ account_status: status })
        .eq('id', connectionId)

      if (error) {
        console.error('Error al actualizar el estado de la conexión:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error en updateConnectionStatus:', error)
      return false
    }
  }
}

export const stripeConnectionService = new StripeConnectionService() 