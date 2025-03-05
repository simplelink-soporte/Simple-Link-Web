import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createId } from '@paralleldrive/cuid2'
import type { Database } from '@/types/supabase'

interface StripePaymentData {
  paymentMethodId: string;
  accountId: string;
  customerId?: string | null;
}

export const stripeDataService = {
  async getStripePaymentData(bookingId: string): Promise<StripePaymentData | null> {
    const requestId = createId();
    try {
      const client = createServerComponentClient<Database>({ 
        cookies,
        options: { db: { schema: 'public' } }
      });

      console.log(`🔍 [${requestId}] Iniciando búsqueda de datos Stripe (Server):`, {
        bookingId,
        timestamp: new Date().toISOString()
      });
      
      // 1. Obtener la reserva con sus pagos y participante principal
      const { data: booking, error: bookingError } = await client
        .from('bookings')
        .select(`
          id,
          empresa_id,
          payments (
            id,
            stripe_payment_method_id,
            payment_method,
            created_at
          ),
          booking_participants!inner (
            user_id,
            role
          )
        `)
        .eq('id', bookingId)
        .eq('booking_participants.role', 'player')
        .single();

      if (bookingError) {
        console.error(`❌ [${requestId}] Error al obtener booking:`, {
          error: bookingError,
          bookingId
        });
        return null;
      }

      if (!booking) {
        console.log(`⚠️ [${requestId}] No se encontró la reserva:`, {
          bookingId
        });
        return null;
      }

      // 2. Obtener el customer de Stripe con su account_id
      const { data: stripeCustomer, error: customerError } = await client
        .from('stripe_customers')
        .select('stripe_customer_id, stripe_account_id, status')
        .eq('user_id', booking.booking_participants[0].user_id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (customerError) {
        console.error(`❌ [${requestId}] Error al obtener stripe_customer:`, {
          error: customerError,
          userId: booking.booking_participants[0].user_id,
          bookingId
        });
        return null;
      }

      // Validación específica para cliente Stripe no encontrado
      if (!stripeCustomer) {
        console.log(`⚠️ [${requestId}] No existe cliente Stripe para el usuario:`, {
          userId: booking.booking_participants[0].user_id,
          bookingId
        });
        return null;
      }

      // Validación de campos requeridos
      if (!stripeCustomer.stripe_customer_id || !stripeCustomer.stripe_account_id) {
        console.log(`⚠️ [${requestId}] Cliente Stripe incompleto:`, {
          userId: booking.booking_participants[0].user_id,
          hasCustomerId: Boolean(stripeCustomer.stripe_customer_id),
          hasAccountId: Boolean(stripeCustomer.stripe_account_id),
          status: stripeCustomer.status
        });
        return null;
      }

      // 3. Obtener el payment_method_id del pago más reciente con Stripe
      const validPayment = booking.payments
        ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        ?.find(payment => 
          payment.payment_method === 'stripe' && 
          payment.stripe_payment_method_id
        );

      if (!validPayment?.stripe_payment_method_id) {
        console.log(`⚠️ [${requestId}] No se encontró método de pago válido:`, {
          bookingId,
          userId: booking.booking_participants[0].user_id,
          paymentsCount: booking.payments?.length,
          hasStripePayments: booking.payments?.some(p => p.payment_method === 'stripe')
        });
        return null;
      }

      // 4. Construir y validar respuesta
      const response = {
        paymentMethodId: validPayment.stripe_payment_method_id,
        accountId: stripeCustomer.stripe_account_id,
        customerId: stripeCustomer.stripe_customer_id
      };

      console.log(`✅ [${requestId}] Datos de Stripe completos:`, {
        bookingId,
        userId: booking.booking_participants[0].user_id,
        response,
        timestamp: new Date().toISOString()
      });

      return response;

    } catch (error) {
      console.error(`❌ [${requestId}] Error inesperado al obtener datos de Stripe:`, {
        error,
        bookingId,
        timestamp: new Date().toISOString()
      });
      return null;
    }
  }
} 