import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';

// Inicializamos Stripe con la clave secreta
// Observe que en este caso utilizamos una implementación indirecta para obtener la clave
// Esto se maneja a través de Stripe Connect, y requerimos el Stripe accountId
async function getStripeInstance(stripeAccountId: string) {
  // Obtenemos la clave secreta para la plataforma (no para la cuenta específica)
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16',
    // Utilizaremos el stripeAccountId para actuar en nombre de la cuenta conectada
  });
  
  return { stripe, accountId: stripeAccountId };
}

export async function POST(req: Request) {
  try {
    // Parseamos el body de la request
    const body = await req.json();
    logger.info('🔄 [API] Procesando solicitud de reembolso:', {
      bookingId: body.bookingId,
      amount: body.amount,
      isFullRefund: body.isFullRefund
    });

    const { 
      bookingId, 
      accountId,      // ID de cuenta Stripe del negocio
      invoiceId,      // ID de la factura a reembolsar
      customerId,     // ID del cliente en Stripe
      amount,         // Monto a reembolsar
      reason,         // Razón del reembolso
      isFullRefund    // Si es reembolso total o parcial
    } = body;

    if (!bookingId || !accountId || !invoiceId) {
      logger.error('❌ [API] Error: Datos faltantes para procesar reembolso', {
        hasBookingId: Boolean(bookingId),
        hasAccountId: Boolean(accountId),
        hasInvoiceId: Boolean(invoiceId)
      });
      return NextResponse.json({ 
        success: false, 
        error: { message: 'Faltan datos requeridos para procesar el reembolso' } 
      }, { status: 400 });
    }

    // Inicializamos Stripe con el accountId proporcionado
    const { stripe, accountId: verifiedAccountId } = await getStripeInstance(accountId);

    // 1. Obtener información de la factura para encontrar el cargo asociado
    logger.info('🔍 [API] Obteniendo información de la factura:', { invoiceId });
    const invoice = await stripe.invoices.retrieve(invoiceId, {
      stripeAccount: verifiedAccountId
    });

    if (!invoice) {
      logger.error('❌ [API] Error: No se encontró la factura', { invoiceId });
      return NextResponse.json({ 
        success: false, 
        error: { message: 'No se encontró la factura especificada' } 
      }, { status: 404 });
    }

    // 2. Verificar si la factura tiene un cargo asociado
    if (!invoice.charge) {
      logger.error('❌ [API] Error: La factura no tiene un cargo asociado', { invoiceId });
      return NextResponse.json({ 
        success: false, 
        error: { message: 'La factura no tiene un cargo asociado que pueda ser reembolsado' } 
      }, { status: 400 });
    }

    // 3. Convertir el monto a centavos para Stripe
    const refundAmountCents = Math.round(amount * 100);

    // 4. Crear el reembolso
    logger.info('💳 [API] Procesando reembolso:', { 
      chargeId: invoice.charge, 
      amount: refundAmountCents 
    });

    const refundParams: Stripe.RefundCreateParams = {
      charge: invoice.charge as string,
      amount: refundAmountCents,
      reason: 'requested_by_customer', // Opciones de Stripe: 'duplicate', 'fraudulent', o 'requested_by_customer'
      metadata: {
        bookingId,
        reason: reason || 'Cancelación de reserva',
        isFullRefund: isFullRefund ? 'true' : 'false'
      }
    };

    const refund = await stripe.refunds.create(refundParams, {
      stripeAccount: verifiedAccountId
    });

    // 5. Registrar el reembolso en nuestra base de datos
    logger.info('✅ [API] Reembolso procesado correctamente:', { 
      refundId: refund.id, 
      status: refund.status 
    });

    // Registramos en la BD que este booking tiene un reembolso
    const { error } = await supabase
      .from('booking_refunds')
      .insert({
        booking_id: bookingId,
        amount: amount,
        stripe_refund_id: refund.id,
        refund_method: 'stripe',
        refund_type: isFullRefund ? 'full' : 'partial',
        reason: reason || 'Cancelación de reserva',
        status: refund.status,
        metadata: {
          invoice_id: invoiceId,
          charge_id: invoice.charge,
          stripe_account_id: verifiedAccountId,
          customer_id: customerId || invoice.customer
        }
      });

    if (error) {
      logger.error('⚠️ [API] Error al registrar el reembolso en la BD:', { error });
      // Aunque hay error en la BD, el reembolso ya se procesó en Stripe, así que devolvemos éxito
      return NextResponse.json({ 
        success: true, 
        refund,
        warning: 'El reembolso se procesó en Stripe pero hubo un error al registrarlo en la base de datos'
      });
    }

    return NextResponse.json({ 
      success: true, 
      refund,
      message: `Reembolso de ${amount} procesado correctamente`
    });
  } catch (error: any) {
    logger.error('❌ [API] Error al procesar reembolso:', { error });
    return NextResponse.json({ 
      success: false, 
      error: { message: error.message || 'Error desconocido al procesar el reembolso' } 
    }, { status: 500 });
  }
}
