import { Database } from '@/types/supabase'
import { SupabaseClient } from '@supabase/supabase-js'
import { createId } from '@paralleldrive/cuid2'

export type ValidationErrorCode = 
  | 'BOOKING_NOT_FOUND'
  | 'BOOKING_ALREADY_CANCELLED'
  | 'BOOKING_NOT_CANCELLED'
  | 'INVALID_AMOUNT'
  | 'STRIPE_ACCOUNT_NOT_FOUND'
  | 'STRIPE_ACCOUNT_NOT_ACTIVE'
  | 'STRIPE_CUSTOMER_NOT_FOUND'
  | 'STRIPE_CUSTOMER_INACTIVE'
  | 'NO_PAYMENT_METHOD'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'PAYMENT_METHOD_REQUIRED'

export interface ValidationError {
  code: ValidationErrorCode
  message: string
  field?: string
  details?: Record<string, any>
}

export interface ValidationResult<T = any> {
  isValid: boolean
  errors: ValidationError[]
  data?: T
  context?: Record<string, any>
}

export interface BookingValidationContext {
  booking: Database['public']['Tables']['bookings']['Row']
  empresa_id: string
  user_id: string
}

export interface StripeAccountValidationContext {
  stripe_connection: Database['public']['Tables']['stripe_connections']['Row']
  account_status: string
  charges_enabled: boolean
}

export interface StripeCustomerValidationContext {
  stripe_customer: Database['public']['Tables']['stripe_customers']['Row']
  payment_methods_count: number
}

export interface NoShowChargeValidationContext {
  booking: BookingValidationContext['booking']
  stripe_connection: StripeAccountValidationContext['stripe_connection']
  stripe_customer: StripeCustomerValidationContext['stripe_customer']
  amount: number
  payment_method_id: string
}

interface CancellationValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  data?: {
    booking: any;
    stripe_payment_method_id?: string;
    stripe_account_id?: string;
    charge_amount?: number;
  };
}

export class ValidationService {
  constructor(
    private readonly supabase: SupabaseClient<Database>
  ) {}

  async validateNoShowCharge(
    empresaId: string,
    bookingId: string,
    amount: number
  ): Promise<ValidationResult> {
    const requestId = createId();
    console.log(`🔄 [${requestId}] Iniciando validación de cargo no-show:`, {
      empresaId,
      bookingId,
      amount
    });

    try {
      // 1. Validar la reserva
      console.log(`📋 [${requestId}] Validando reserva...`);
      const bookingResult = await this.validateBooking(bookingId, empresaId);
      
      console.log(`✅ [${requestId}] Resultado validación reserva:`, {
        isValid: bookingResult.isValid,
        hasPaymentMethod: bookingResult.data?.payment_method_id ? 'Sí' : 'No',
        errors: bookingResult.errors
      });

      if (!bookingResult.isValid) {
        return bookingResult;
      }

      // 2. Validar la cuenta de Stripe
      console.log(`💳 [${requestId}] Validando cuenta Stripe...`);
      const stripeAccountResult = await this.validateStripeAccount(empresaId);
      
      console.log(`✅ [${requestId}] Resultado validación Stripe:`, {
        isValid: stripeAccountResult.isValid,
        accountStatus: stripeAccountResult.data?.account_status,
        errors: stripeAccountResult.errors
      });

      if (!stripeAccountResult.isValid) {
        return stripeAccountResult;
      }

      // 3. Validar el cliente de Stripe
      console.log(`👤 [${requestId}] Validando cliente Stripe...`);
      const stripeCustomerResult = await this.validateStripeCustomer(
        bookingResult.data.user_id,
        stripeAccountResult.data.stripe_account_id
      );

      console.log(`✅ [${requestId}] Resultado validación cliente:`, {
        isValid: stripeCustomerResult.isValid,
        customerId: stripeCustomerResult.data?.stripe_customer_id,
        errors: stripeCustomerResult.errors
      });

      if (!stripeCustomerResult.isValid) {
        return stripeCustomerResult;
      }

      // 4. Retornar resultado final
      return {
        isValid: true,
        errors: [],
        data: {
          booking: bookingResult.data,
          stripe_connection: stripeAccountResult.data,
          stripe_customer: stripeCustomerResult.data,
          payment_method_id: bookingResult.data.payment_method_id
        }
      };
    } catch (error: any) {
      console.error(`❌ [${requestId}] Error en validateNoShowCharge:`, error);
      return {
        isValid: false,
        errors: [{
          code: 'VALIDATION_ERROR',
          message: error.message
        }],
        context: error
      };
    }
  }

  private async validateBooking(
    booking_id: string,
    empresa_id: string
  ): Promise<ValidationResult<Database['public']['Tables']['bookings']['Row']>> {
    const requestId = createId();
    console.log(`🔍 [${requestId}] Validando reserva:`, { booking_id, empresa_id });

    // Primero obtener el pago asociado
    const { data: payments, error: paymentsError } = await this.supabase
      .from('payments')
      .select('*')
      .eq('booking_id', booking_id)
      .order('created_at', { ascending: false })
      .limit(1);

    console.log(`💳 [${requestId}] Datos del pago:`, {
      success: !paymentsError,
      hasPayments: payments && payments.length > 0,
      paymentMethod: payments?.[0]?.payment_method,
      stripePaymentMethodId: payments?.[0]?.stripe_payment_method_id
    });

    if (paymentsError) {
      console.error(`❌ [${requestId}] Error al obtener pagos:`, paymentsError);
      return {
        isValid: false,
        errors: [{
          code: 'PAYMENT_METHOD_REQUIRED',
          message: 'Error al obtener información del pago'
        }]
      };
    }

    if (!payments || payments.length === 0 || !payments[0].stripe_payment_method_id) {
      return {
        isValid: false,
        errors: [{
          code: 'PAYMENT_METHOD_REQUIRED',
          message: 'No se encontró un método de pago válido para esta reserva'
        }]
      };
    }

    // Ahora obtener la reserva
    const { data: booking, error: bookingError } = await this.supabase
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .eq('empresa_id', empresa_id)
      .single();

    if (bookingError || !booking) {
      return {
        isValid: false,
        errors: [{
          code: 'BOOKING_NOT_FOUND',
          message: 'La reserva no existe o no tienes permisos para acceder a ella'
        }]
      };
    }

    if (booking.cancelled_at === null) {
      return {
        isValid: false,
        errors: [{
          code: 'BOOKING_NOT_CANCELLED',
          message: 'La reserva debe estar cancelada para poder realizar un cargo por no presentarse'
        }]
      };
    }

    return {
      isValid: true,
      errors: [],
      data: {
        ...booking,
        payment_method_id: payments[0].stripe_payment_method_id
      }
    };
  }

  private async validateStripeAccount(
    empresa_id: string
  ): Promise<ValidationResult<Database['public']['Tables']['stripe_connections']['Row']>> {
    const { data: stripeConnection, error } = await this.supabase
      .from('stripe_connections')
      .select('*')
      .eq('empresa_id', empresa_id)
      .single()

    if (error || !stripeConnection) {
      return {
        isValid: false,
        errors: [{
          code: 'STRIPE_ACCOUNT_NOT_FOUND',
          message: 'No se encontró una cuenta de Stripe conectada para esta empresa'
        }]
      }
    }

    if (stripeConnection.account_status !== 'active' || !stripeConnection.charges_enabled) {
      return {
        isValid: false,
        errors: [{
          code: 'STRIPE_ACCOUNT_NOT_ACTIVE',
          message: 'La cuenta de Stripe no está activa o no tiene los cargos habilitados'
        }],
        context: { stripe_connection: stripeConnection }
      }
    }

    return {
      isValid: true,
      errors: [],
      data: stripeConnection,
      context: { stripe_connection: stripeConnection }
    }
  }

  private async validateStripeCustomer(
    user_id: string,
    stripe_account_id: string
  ): Promise<ValidationResult<Database['public']['Tables']['stripe_customers']['Row']>> {
    const { data: stripeCustomer, error } = await this.supabase
      .from('stripe_customers')
      .select('*')
      .eq('user_id', user_id)
      .eq('stripe_account_id', stripe_account_id)
      .single()

    if (error || !stripeCustomer) {
      return {
        isValid: false,
        errors: [{
          code: 'STRIPE_CUSTOMER_NOT_FOUND',
          message: 'No se encontró un cliente de Stripe para este usuario'
        }]
      }
    }

    if (stripeCustomer.status !== 'active') {
      return {
        isValid: false,
        errors: [{
          code: 'STRIPE_CUSTOMER_INACTIVE',
          message: 'El cliente de Stripe no está activo'
        }],
        context: { stripe_customer: stripeCustomer }
      }
    }

    if (stripeCustomer.payment_methods_count === 0) {
      return {
        isValid: false,
        errors: [{
          code: 'NO_PAYMENT_METHOD',
          message: 'El cliente no tiene métodos de pago registrados'
        }],
        context: { stripe_customer: stripeCustomer }
      }
    }

    return {
      isValid: true,
      errors: [],
      data: stripeCustomer,
      context: { stripe_customer: stripeCustomer }
    }
  }

  private validateAmount(
    amount: number,
    totalPrice: number
  ): ValidationResult<number> {
    if (amount <= 0) {
      return {
        isValid: false,
        errors: [{
          code: 'INVALID_AMOUNT',
          message: 'El monto debe ser mayor a 0',
          field: 'amount'
        }]
      }
    }

    if (amount > totalPrice) {
      return {
        isValid: false,
        errors: [{
          code: 'INVALID_AMOUNT',
          message: 'El monto no puede ser mayor al precio total de la reserva',
          field: 'amount',
          details: { totalPrice }
        }]
      }
    }

    return {
      isValid: true,
      errors: [],
      data: amount
    }
  }

  async validateCancellation(
    bookingId: string,
    shouldCharge: boolean,
    amount?: number
  ): Promise<CancellationValidationResult> {
    const requestId = createId();
    console.log(`🔍 [${requestId}] Validando cancelación:`, {
      bookingId,
      shouldCharge,
      amount
    });

    try {
      // Obtener la reserva con sus datos de pago
      const { data: booking, error } = await this.supabase
        .from('bookings')
        .select(`
          *,
          payments (
            stripe_payment_method_id,
            stripe_account_id
          )
        `)
        .eq('id', bookingId)
        .single();

      if (error || !booking) {
        return {
          isValid: false,
          errors: [{
            code: 'BOOKING_NOT_FOUND',
            message: 'Reserva no encontrada'
          }]
        };
      }

      if (booking.cancelled_at) {
        return {
          isValid: false,
          errors: [{
            code: 'BOOKING_ALREADY_CANCELLED',
            message: 'La reserva ya está cancelada'
          }]
        };
      }

      if (shouldCharge) {
        const payment = booking.payments?.[0];
        if (!payment?.stripe_payment_method_id) {
          return {
            isValid: false,
            errors: [{
              code: 'PAYMENT_METHOD_REQUIRED',
              message: 'No hay método de pago registrado para esta reserva'
            }]
          };
        }

        if (!amount || amount <= 0) {
          return {
            isValid: false,
            errors: [{
              code: 'INVALID_AMOUNT',
              message: 'El monto del cargo debe ser mayor a 0'
            }]
          };
        }

        return {
          isValid: true,
          data: {
            booking,
            stripe_payment_method_id: payment.stripe_payment_method_id,
            stripe_account_id: payment.stripe_account_id,
            charge_amount: amount
          }
        };
      }

      return {
        isValid: true,
        data: {
          booking
        }
      };
    } catch (error) {
      console.error(`❌ [${requestId}] Error en validateCancellation:`, error);
      return {
        isValid: false,
        errors: [{
          code: 'VALIDATION_ERROR',
          message: 'Error al validar la cancelación'
        }]
      };
    }
  }
} 