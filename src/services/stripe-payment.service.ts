import { SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { createId } from '@paralleldrive/cuid2';
import type { NoShowChargeRequest, PaymentResult } from '@/types/api';
import { ValidationService } from './ValidationService';
import { stripeDataService } from './server/stripe-data.service';
import { Database } from '@/types/supabase';

interface PaymentInsert {
  booking_id: string;
  deposit_amount: number;
  total_price: number;
  payment_method: 'stripe' | 'cash' | 'transfer' | 'card';
  payment_status: 'pending' | 'completed' | 'failed';
  stripe_payment_intent_id?: string;
  notes?: string;
}

interface PaymentServiceError {
  code: string;
  message: string;
  details?: any;
}

export class StripePaymentService {
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly MAX_CHARGE_AMOUNT = 10000; // 100€ en céntimos

  constructor(
    private stripe: Stripe,
    private supabase: SupabaseClient<Database>,
    private validationService: ValidationService
  ) {}

  async chargeNoShow(params: NoShowChargeRequest): Promise<PaymentResult> {
    const requestId = createId();
    console.log(`🔄 [${requestId}] Iniciando proceso de cargo por no-show:`, {
      bookingId: params.bookingId,
      amount: params.amount,
      empresaId: params.empresaId,
      hasStripeAccountId: Boolean(params.stripeAccountId),
      hasStripePaymentMethodId: Boolean(params.stripePaymentMethodId)
    });

    try {
      // Verificar que tenemos los datos necesarios de Stripe
      if (!params.stripeAccountId || !params.stripePaymentMethodId) {
        console.log(`🔍 [${requestId}] Datos de Stripe no proporcionados, buscando en el servidor...`);
        // Solo buscar datos de Stripe si no fueron proporcionados
        const stripeData = await stripeDataService.getStripePaymentData(params.bookingId);
        
        if (!stripeData) {
          throw {
            code: 'STRIPE_DATA_NOT_FOUND',
            message: 'No se encontraron datos de Stripe para la reserva'
          };
        }
        
        // Utilizar los datos del servidor
        params.stripeAccountId = stripeData.accountId;
        params.stripePaymentMethodId = stripeData.paymentMethodId;
        // Guardar el customerId para usarlo más adelante
        var customerId = stripeData.customerId || '';
      } else {
        console.log(`✅ [${requestId}] Usando datos de Stripe proporcionados por parámetro`);
        // Intentar obtener customerId si no fue proporcionado
        var customerId = '';
        try {
          const { data } = await this.supabase
            .from('stripe_payment_methods')
            .select('stripe_customer_id')
            .eq('payment_method_id', params.stripePaymentMethodId)
            .single();
          
          if (data && data.stripe_customer_id) {
            customerId = data.stripe_customer_id;
            console.log(`✅ [${requestId}] Customer ID encontrado:`, customerId);
          }
        } catch (err) {
          console.warn(`⚠️ [${requestId}] No se pudo obtener el customerId:`, err);
        }
      }

      // 2. Procesar el cargo
      const paymentIntent = await this.processCharge({
        amount: params.amount,
        stripeAccountId: params.stripeAccountId,
        customerId: customerId,
        paymentMethodId: params.stripePaymentMethodId,
        metadata: {
          booking_id: params.bookingId,
          charge_type: 'no_show',
          reason: params.reason || 'No show charge'
        }
      });

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        chargeStatus: paymentIntent.status
      };

    } catch (error: any) {
      console.error(`❌ [${requestId}] Error en chargeNoShow:`, error);
      return {
        success: false,
        error: {
          code: error.code || 'PAYMENT_ERROR',
          message: error.message,
          details: error.details
        }
      };
    }
  }

  private async processCharge({
    amount,
    customerId,
    stripeAccountId,
    metadata,
    paymentMethodId
  }: {
    amount: number;
    customerId: string;
    stripeAccountId: string;
    metadata: Record<string, any>;
    paymentMethodId?: string;
  }) {
    const requestId = createId();
    console.log(`🔄 [${requestId}] Iniciando procesamiento de cargo:`, {
      customerId,
      amount,
      hasPaymentMethod: Boolean(paymentMethodId)
    });

    try {
      // Crear PaymentIntent con customer_id
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: 'eur',
        customer: customerId,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        payment_method_types: ['card'],
        metadata: {
          ...metadata,
          request_id: requestId,
          charge_type: 'no_show'
        },
        confirmation_method: 'automatic',
        capture_method: 'automatic'
      }, {
        stripeAccount: stripeAccountId,
        idempotencyKey: `noshow_${metadata.booking_id}_${Date.now()}`
      });

      console.log(`✅ [${requestId}] PaymentIntent creado:`, {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount
      });

      return paymentIntent;
    } catch (error: any) {
      console.error(`❌ [${requestId}] Error al procesar cargo:`, error);

      // Manejar errores específicos
      if (error.code === 'authentication_required') {
        throw {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'La tarjeta requiere autenticación',
          details: {
            payment_intent_id: error.payment_intent?.id,
            type: error.type
          }
        };
      }

      if (error.code === 'card_declined') {
        throw {
          code: 'CARD_DECLINED',
          message: 'La tarjeta fue rechazada',
          details: {
            decline_code: error.decline_code,
            type: error.type
          }
        };
      }

      throw {
        code: 'STRIPE_ERROR',
        message: 'Error al procesar el cargo',
        details: {
          type: error.type,
          code: error.code,
          message: error.message
        }
      };
    }
  }

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

  private isRetryableError(error: any): boolean {
    const retryableCodes = [
      'rate_limit_exceeded',
      'timeout',
      'connection_error',
      'api_error'
    ];

    return retryableCodes.includes(error.code);
  }

  private async recordPayment({
    bookingId,
    amount,
    paymentIntentId,
    reason,
    status
  }: {
    bookingId: string;
    amount: number;
    paymentIntentId: string;
    reason?: string;
    status: string;
  }) {
    try {
      const { error } = await this.supabase
        .from('payments')
        .insert({
          booking_id: bookingId,
          deposit_amount: amount,
          total_price: amount,
          payment_method: 'card',
          payment_status: status === 'succeeded' ? 'completed' : 'failed',
          stripe_payment_intent_id: paymentIntentId,
          notes: reason || 'Cargo por no-show'
        } as any);

      if (error) {
        console.error('Error al registrar pago:', error);
        throw {
          code: 'RECORD_ERROR',
          message: 'Error al registrar el pago',
          details: error
        };
      }
    } catch (error) {
      console.error('Error inesperado al registrar pago:', error);
      throw {
        code: 'UNEXPECTED_ERROR',
        message: 'Error inesperado al registrar el pago',
        details: error
      };
    }
  }

  private async updateBookingStatus(
    bookingId: string,
    {
      status,
      reason,
      chargeApplied
    }: {
      status: string;
      reason?: string;
      chargeApplied: boolean;
    }
  ) {
    const { error } = await this.supabase
      .from('bookings')
      .update({
        status,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
        no_show_charge_applied: chargeApplied
      })
      .eq('id', bookingId);

    if (error) {
      throw {
        code: 'UPDATE_ERROR',
        message: 'Error al actualizar el estado de la reserva',
        details: error
      };
    }
  }

  private async logError(
    error: any,
    context: {
      requestId: string;
      bookingId: string;
      type: string;
    }
  ) {
    try {
      const errorLog = {
        type: 'stripe_payment_error' as const,
        error_message: error.message,
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

  private async registerPayment(data: {
    bookingId: string;
    amount: number;
    totalPrice: number;
    paymentMethodId: string;
    accountId: string;
    reason: string;
    notes: string;
  }): Promise<Database['public']['Tables']['bookings_payments']['Row']> {
    const paymentData: Database['public']['Tables']['bookings_payments']['Insert'] = {
      booking_id: data.bookingId,
      amount: data.amount,
      type: 'no_show_charge',
      status: 'completed',
      notes: data.notes
    };

    const { data: payment, error } = await this.supabase
      .from('bookings_payments')
      .insert(paymentData)
      .select('*')
      .single();

    if (error) throw error;
    return payment;
  }
} 