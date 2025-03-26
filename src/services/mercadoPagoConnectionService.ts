import { supabase } from '@/lib/supabase'

export interface MercadoPagoConnection {
  id: string
  empresa_id: string
  mercadopago_user_id: string
  mercadopago_email: string | null
  account_status: 'pending' | 'active' | 'restricted' | 'disabled'
  access_token: string
  refresh_token: string
  token_expiry: string
  created_at: string
  updated_at: string
  last_webhook_received_at: string | null
}

class MercadoPagoConnectionService {
  /**
   * Obtiene la conexión de Mercado Pago para una empresa específica
   */
  async getConnection(empresaId: string): Promise<MercadoPagoConnection | null> {
    try {
      const { data, error } = await supabase
        .from('mercadopago_connections')
        .select('*')
        .eq('empresa_id', empresaId)
        .single()

      if (error) {
        console.error('Error al obtener la conexión de Mercado Pago:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error en getConnection:', error)
      return null
    }
  }

  /**
   * Elimina la conexión de Mercado Pago de una empresa
   */
  async deleteConnection(connectionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('mercadopago_connections')
        .delete()
        .eq('id', connectionId)

      if (error) {
        console.error('Error al eliminar la conexión de Mercado Pago:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error en deleteConnection:', error)
      return false
    }
  }

  /**
   * Actualiza el estado de una conexión de Mercado Pago
   */
  async updateConnectionStatus(
    connectionId: string, 
    status: MercadoPagoConnection['account_status']
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('mercadopago_connections')
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
  
  /**
   * Verifica si el país es compatible con Mercado Pago
   * Solo Argentina y México son compatibles actualmente
   */
  isCountrySupported(country: string | null): boolean {
    if (!country) return false;
    const supportedCountries = ['Argentina', 'Mexico', 'México']; // Incluimos posibles variaciones
    return supportedCountries.includes(country);
  }
}

export const mercadoPagoConnectionService = new MercadoPagoConnectionService()
