import { SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { createId } from '@paralleldrive/cuid2';
import type { Database } from '@/types/supabase';
import { ValidationService } from './ValidationService';
import { StripePaymentService } from './stripe-payment.service';
import { stripeDataService } from './server/stripe-data.service';

interface NoShowServiceConfig {
  stripe: Stripe;
  supabase: SupabaseClient<Database>;
  validationService: ValidationService;
}

interface NoShowChargeParams {
  bookingId: string;
  amount: number;
  reason?: string;
  empresaId: string;
}

interface NoShowResult {
  success: boolean;
  data?: {
    booking_id: string;
    cancelled_at: string;
    charge_status?: string;
    payment_id?: string;
    charge_amount?: number;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export class NoShowService {
  private readonly stripePaymentService: StripePaymentService;

  constructor(private readonly config: NoShowServiceConfig) {
    this.stripePaymentService = new StripePaymentService(
      config.stripe,
      config.supabase,
      config.validationService
    );
  }

  async processNoShow(params: NoShowChargeParams): Promise<NoShowResult> {
    const requestId = createId();
    console.log(`🔄 [${requestId}] Iniciando proceso de no-show:`, {
      bookingId: params.bookingId,
      amount: params.amount
    });

    try {
      // 1. Obtener datos de Stripe
      const stripeData = await stripeDataService.getStripePaymentData(params.bookingId);
      if (!stripeData) {
        return {
          success: false,
          error: {
            code: 'STRIPE_DATA_NOT_FOUND',
            message: 'No se encontraron datos de Stripe para la reserva'
          }
        };
      }

      // 2. Procesar el cargo en Stripe
      const chargeResult = await this.stripePaymentService.chargeNoShow({
        bookingId: params.bookingId,
        amount: params.amount,
        reason: params.reason,
        stripeAccountId: stripeData.accountId,
        stripePaymentMethodId: stripeData.paymentMethodId,
        empresaId: params.empresaId
      });

      if (!chargeResult.success) {
        return {
          success: false,
          error: chargeResult.error
        };
      }

      // 3. Cancelar la reserva y registrar el pago usando RPC
      const { data: cancelResult, error: cancelError } = await this.config.supabase
        .rpc('cancel_booking_v1', {
          p_booking_id: params.bookingId,
          p_reason: params.reason || 'Cargo por no-show aplicado',
          p_should_charge: true,
          p_charge_amount: params.amount,
          p_stripe_payment_intent_id: chargeResult.paymentIntentId,
          p_stripe_payment_method_id: stripeData.paymentMethodId
        });

      if (cancelError) {
        console.error(`❌ [${requestId}] Error al cancelar reserva:`, cancelError);
        throw cancelError;
      }

      return {
        success: true,
        data: {
          booking_id: params.bookingId,
          cancelled_at: new Date().toISOString(),
          charge_status: chargeResult.chargeStatus,
          ...cancelResult
        }
      };

    } catch (error: any) {
      console.error(`❌ [${requestId}] Error en processNoShow:`, error);
      return {
        success: false,
        error: {
          code: 'PROCESS_ERROR',
          message: 'Error al procesar no-show',
          details: error.message
        }
      };
    }
  }
} 