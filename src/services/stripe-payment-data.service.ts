import { createId } from '@paralleldrive/cuid2';
import { Database } from '@/types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

interface StripePaymentData {
  customerId: string;
  accountId: string;
  userId: string;
  paymentMethodId: string;
}

export class StripePaymentDataService {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async getPaymentData(params: {
    paymentMethodId: string;
    empresaId?: string;
    existingCustomerId?: string;
    existingAccountId?: string;
  }): Promise<StripePaymentData | null> {
    const requestId = createId();
    console.log(`🔍 [${requestId}] Obteniendo datos de pago Stripe:`, {
      paymentMethodId: params.paymentMethodId,
      empresaId: params.empresaId,
      hasExistingCustomerId: !!params.existingCustomerId,
      hasExistingAccountId: !!params.existingAccountId,
      timestamp: new Date().toISOString()
    });

    try {
      // Si ya tenemos customerId y accountId, no necesitamos hacer consultas adicionales
      if (params.existingCustomerId && params.existingAccountId) {
        console.log(`✅ [${requestId}] Usando datos existentes de Stripe`);
        return {
          customerId: params.existingCustomerId,
          accountId: params.existingAccountId,
          userId: '', // Se podría buscar si es necesario
          paymentMethodId: params.paymentMethodId
        };
      }
      
      // 1. Buscar información del método de pago para obtener customerId
      console.log(`🔍 [${requestId}] Buscando información del método de pago:`, params.paymentMethodId);
      const { data: paymentMethod } = await this.supabase
        .from('stripe_payment_methods')
        .select('stripe_customer_id, user_id')
        .eq('stripe_payment_method_id', params.paymentMethodId)
        .single();
      
      if (!paymentMethod?.stripe_customer_id) {
        console.error(`❌ [${requestId}] Método de pago no encontrado o sin customer_id:`, params.paymentMethodId);
        return null;
      }
      
      console.log(`✅ [${requestId}] Método de pago encontrado, customer_id:`, paymentMethod.stripe_customer_id);
      
      // 2. Obtener accountId de la empresa
      let accountId = '';
      
      if (params.empresaId) {
        console.log(`🔍 [${requestId}] Buscando cuenta Stripe de empresa:`, params.empresaId);
        const { data: empresa } = await this.supabase
          .from('empresas')
          .select('stripe_account_id')
          .eq('id', params.empresaId)
          .single();
          
        if (!empresa?.stripe_account_id) {
          console.error(`❌ [${requestId}] Empresa no encontrada o sin account_id:`, params.empresaId);
          return null;
        }
        
        accountId = empresa.stripe_account_id;
        console.log(`✅ [${requestId}] Cuenta Stripe de empresa encontrada:`, accountId);
      } else {
        // Alternativa: buscar por el customer y su cuenta asociada
        console.log(`🔍 [${requestId}] Buscando account_id para customer:`, paymentMethod.stripe_customer_id);
        const { data: customer } = await this.supabase
          .from('stripe_customers')
          .select('stripe_account_id')
          .eq('stripe_customer_id', paymentMethod.stripe_customer_id)
          .single();
          
        if (!customer?.stripe_account_id) {
          console.error(`❌ [${requestId}] No se pudo determinar account_id para el customer:`, paymentMethod.stripe_customer_id);
          return null;
        }
        
        accountId = customer.stripe_account_id;
        console.log(`✅ [${requestId}] Cuenta asociada al customer encontrada:`, accountId);
      }
      
      console.log(`✅ [${requestId}] Datos de Stripe completos:`, {
        customerId: paymentMethod.stripe_customer_id,
        accountId,
        userId: paymentMethod.user_id || ''
      });
      
      return {
        customerId: paymentMethod.stripe_customer_id,
        accountId: accountId,
        userId: paymentMethod.user_id || '',
        paymentMethodId: params.paymentMethodId
      };
    } catch (error) {
      console.error(`❌ [${requestId}] Error al obtener datos de pago:`, error);
      
      if (error instanceof Error) {
        console.error(`❌ [${requestId}] Detalles del error:`, {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      
      return null;
    }
  }
} 