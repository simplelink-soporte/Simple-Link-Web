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
  country?: string | null
  isArgentina?: boolean
}

export interface CountryVerificationResult {
  country: string | null
  isArgentina: boolean
  requiresStripeVerification: boolean
}

class StripeConnectionService {
  /**
   * Verifica el país de una empresa y determina si requiere integración con Stripe
   * @param empresaId ID de la empresa
   * @returns Resultado de la verificación con información del país
   */
  async verifyCountry(empresaId: string): Promise<CountryVerificationResult> {
    try {
      console.log('[StripeConnectionService] Verificando país de empresa:', { empresaId });
      
      const { data, error } = await supabase
        .from('empresas')
        .select('country')
        .eq('id', empresaId)
        .single();
        
      if (error) {
        console.error('[StripeConnectionService] Error al verificar país:', error);
        // Si hay error, asumimos que necesita verificación por seguridad
        return {
          country: null,
          isArgentina: false,
          requiresStripeVerification: true
        };
      }
      
      const country = data?.country || null;
      const isArgentina = country?.toLowerCase() === 'argentina';
      const requiresStripeVerification = !isArgentina;
      
      console.log('[StripeConnectionService] Resultado verificación de país:', {
        empresaId,
        country,
        isArgentina,
        requiresStripeVerification
      });
      
      return {
        country,
        isArgentina,
        requiresStripeVerification
      };
    } catch (error) {
      console.error('[StripeConnectionService] Error en verifyCountry:', error);
      // Si hay excepción, asumimos que necesita verificación por seguridad
      return {
        country: null,
        isArgentina: false,
        requiresStripeVerification: true
      };
    }
  }

  /**
   * Obtiene la conexión de Stripe para una empresa específica
   * SOLO SI no es de Argentina, caso contrario retorna null
   */
  async getConnection(empresaId: string): Promise<StripeConnection | null> {
    try {
      // PRIMERO verificamos el país
      const { isArgentina, country, requiresStripeVerification } = await this.verifyCountry(empresaId);
      
      // Si es Argentina, NO consultamos Stripe y retornamos null
      if (isArgentina) {
        console.log('[StripeConnectionService] Empresa argentina detectada, omitiendo consulta a Stripe:', { empresaId });
        return {
          id: 'no-stripe-for-argentina',
          empresa_id: empresaId,
          stripe_account_id: 'no-stripe-required',
          stripe_account_email: null,
          account_status: 'disabled', // No aplicable para Argentina
          charges_enabled: false,
          payouts_enabled: false,
          requirements: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_webhook_received_at: null,
          country,
          isArgentina: true
        };
      }
      
      console.log('[StripeConnectionService] Consultando conexión Stripe para empresa no-argentina:', { empresaId });
      
      const { data, error } = await supabase
        .from('stripe_connections')
        .select('*')
        .eq('empresa_id', empresaId)
        .single()

      if (error) {
        console.error('[StripeConnectionService] Error al obtener la conexión de Stripe:', error)
        return null
      }

      // Añadir información de país al resultado
      return {
        ...data,
        country,
        isArgentina: false
      }
    } catch (error) {
      console.error('[StripeConnectionService] Error en getConnection:', error)
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
        console.error('[StripeConnectionService] Error al eliminar la conexión de Stripe:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('[StripeConnectionService] Error en deleteConnection:', error)
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
        console.error('[StripeConnectionService] Error al actualizar el estado de la conexión:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('[StripeConnectionService] Error en updateConnectionStatus:', error)
      return false
    }
  }
}

export const stripeConnectionService = new StripeConnectionService()