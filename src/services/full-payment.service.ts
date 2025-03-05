import { SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { createId } from '@paralleldrive/cuid2';
import type { Database } from '@/types/supabase';

// Mapeo de tipos de pago de UI a tipos válidos en la base de datos
const PAYMENT_TYPE_MAPPING: Record<string, string> = {
  'full': 'booking',  // Mapeo explícito de "full" a "booking"
  'guarantee': 'guarantee',
  'deposit': 'deposit',
  'remaining': 'remaining',
  'no_show_charge': 'no_show_charge'
};

interface FullPaymentRequest {
  bookingId: string;
  amount: number;
  stripePaymentMethodId: string;
  stripeAccountId: string;
  stripeCustomerId: string;
  empresaId: string;
  description?: string;
  paymentType?: string;
  paymentMethod?: string;
}

interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  chargeStatus?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export class FullPaymentService {
  private readonly MAX_RETRY_ATTEMPTS = 3;

  constructor(
    private stripe: Stripe,
    private supabase: SupabaseClient<Database>
  ) {}

  /**
   * Procesa el pago completo de una reserva
   */
  async processFullPayment(params: FullPaymentRequest): Promise<PaymentResult> {
    const requestId = createId();
    console.log(`🔄 [${requestId}] Iniciando proceso de cobro completo:`, {
      amount: params.amount,
      empresaId: params.empresaId,
      paymentType: params.paymentType || 'full',
      timestamp: new Date().toISOString()
    });

    try {
      // 1. Validar datos necesarios
      if (!params.stripePaymentMethodId || !params.stripeAccountId || !params.stripeCustomerId) {
        throw {
          code: 'INVALID_PAYMENT_DATA',
          message: 'Datos de pago incompletos'
        };
      }

      // 2. Crear y confirmar el PaymentIntent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(params.amount * 100),
        currency: 'eur',
        customer: params.stripeCustomerId,
        payment_method: params.stripePaymentMethodId,
        off_session: true,
        confirm: true,
        payment_method_types: ['card'],
        metadata: {
          request_id: requestId,
          payment_type: 'full',
          description: params.description || 'Pago completo de reserva',
          empresa_id: params.empresaId
        },
        description: params.description || 'Pago completo de reserva',
        confirmation_method: 'automatic',
        capture_method: 'automatic',
        setup_future_usage: 'off_session'  // Importante para futuros cargos
      }, {
        stripeAccount: params.stripeAccountId,
        idempotencyKey: `full_payment_${requestId}`
      });

      console.log(`✅ [${requestId}] PaymentIntent creado:`, {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        customer: paymentIntent.customer
      });

      // 3. Si el pago fue exitoso, registrar en caché para asociarlo después
      if (paymentIntent.status === 'succeeded') {
        await this.cacheSuccessfulPayment({
          paymentIntentId: paymentIntent.id,
          amount: params.amount,
          stripeAccountId: params.stripeAccountId,
          stripeCustomerId: params.stripeCustomerId,
          empresaId: params.empresaId,
          requestId,
          description: params.description
        });

        console.log(`✅ [${requestId}] Pago registrado en caché para asociación posterior`);
      }

      return {
        success: paymentIntent.status === 'succeeded',
        paymentIntentId: paymentIntent.id,
        chargeStatus: paymentIntent.status
      };

    } catch (error: any) {
      console.error(`❌ [${requestId}] Error en processFullPayment:`, error);
      
      // Registrar el error para análisis posterior
      await this.logError(error, {
        requestId,
        type: 'full_payment_error'
      });

      // Transformar errores de Stripe en errores más legibles
      if (error.code === 'authentication_required') {
        return {
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'La tarjeta requiere autenticación',
            details: {
              payment_intent_id: error.payment_intent?.id,
              type: error.type
            }
          }
        };
      }

      if (error.code === 'card_declined') {
        return {
          success: false,
          error: {
            code: 'CARD_DECLINED',
            message: 'La tarjeta fue rechazada',
            details: {
              decline_code: error.decline_code,
              type: error.type
            }
          }
        };
      }
      
      return {
        success: false,
        error: {
          code: error.code || 'PAYMENT_ERROR',
          message: error.message || 'Error al procesar el pago completo',
          details: error.details || error
        }
      };
    }
  }

  /**
   * Registra el pago en la base de datos
   */
  private async registerPaymentInDatabase({
    bookingId,
    amount,
    paymentIntentId,
    status,
    description,
    paymentType = 'booking',
    stripeAccountId,
    stripeCustomerId
  }: {
    bookingId: string;
    amount: number;
    paymentIntentId: string;
    status: 'pending' | 'completed' | 'failed';
    description?: string;
    paymentType?: string;
    stripeAccountId: string;
    stripeCustomerId: string;
  }) {
    try {
      const { error } = await this.supabase
        .from('payments')
        .insert({
          booking_id: bookingId,
          deposit_amount: amount,
          total_price: amount,
          payment_method: 'card',
          payment_status: status,
          payment_type: paymentType,
          stripe_payment_intent_id: paymentIntentId,
          stripe_account_id: stripeAccountId,
          stripe_customer_id: stripeCustomerId,
          notes: description || 'Pago completo de reserva'
        });

      if (error) {
        console.error('Error al registrar pago en la base de datos:', error);
        throw {
          code: 'DATABASE_ERROR',
          message: 'Error al registrar el pago en la base de datos',
          details: error
        };
      }
    } catch (error) {
      console.error('Error inesperado al registrar pago:', error);
      throw error;
    }
  }

  /**
   * Registra un error en la base de datos
   */
  private async logError(
    error: any,
    context: {
      requestId: string;
      type: string;
    }
  ) {
    try {
      const errorLog = {
        type: 'payment_error' as const,
        error_message: error.message || JSON.stringify(error),
        metadata: {
          ...context,
          error_details: {
            code: error.code,
            type: error.type,
            details: error.details
          }
        }
      };

      await this.supabase
        .from('error_logs')
        .insert(errorLog);
    } catch (logError) {
      console.error('Error al registrar error:', logError);
    }
  }

  /**
   * Método utilitario para reintentar operaciones
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    attempt = 1
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      if (attempt >= this.MAX_RETRY_ATTEMPTS || !this.isRetryableError(error)) {
        throw error;
      }

      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));

      return this.retryOperation(operation, attempt + 1);
    }
  }

  /**
   * Determina si un error puede ser reintentado
   */
  private isRetryableError(error: any): boolean {
    const retryableCodes = [
      'rate_limit_exceeded',
      'timeout',
      'connection_error',
      'api_error'
    ];

    return retryableCodes.includes(error.code);
  }

  /**
   * Almacena temporalmente los datos del pago exitoso para asociarlos después
   */
  private async cacheSuccessfulPayment(data: {
    paymentIntentId: string;
    amount: number;
    stripeAccountId: string;
    stripeCustomerId: string;
    empresaId: string;
    requestId: string;
    description?: string;
  }) {
    try {
      const { error } = await this.supabase
        .from('payment_cache')
        .insert({
          payment_intent_id: data.paymentIntentId,
          amount: data.amount,
          stripe_account_id: data.stripeAccountId,
          stripe_customer_id: data.stripeCustomerId,
          empresa_id: data.empresaId,
          request_id: data.requestId,
          description: data.description,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutos
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error al cachear pago:', error);
      // No lanzamos el error para no afectar el flujo principal
    }
  }
} 