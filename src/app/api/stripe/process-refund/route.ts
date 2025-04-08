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
    apiVersion: '2025-02-24.acacia',
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
      accountId: body.accountId,
      invoiceId: body.invoiceId,
      refundType: body.refundType,
      percentage: body.percentage
    });

    const { 
      bookingId, 
      accountId,      // ID de cuenta Stripe del negocio
      invoiceId,      // ID de la factura a reembolsar
      customerId,     // ID del cliente en Stripe
      refundType,     // 'full' o 'percentage'
      percentage,     // Porcentaje a reembolsar (solo si refundType es 'percentage')
      reason,         // Razón del reembolso
      paymentIntentId // Añadir soporte para payment_intent_id como alternativa
    } = body;

    // Determinar si es reembolso completo basado en refundType
    const isFullRefund = refundType === 'full';
    
    // Inicializamos Stripe con el accountId proporcionado
    const { stripe, accountId: verifiedAccountId } = await getStripeInstance(accountId);

    // Validar que tenemos los datos mínimos requeridos
    if (!bookingId || !accountId) {
      logger.error('❌ [API] Error: Faltan datos básicos para procesar reembolso', {
        hasBookingId: Boolean(bookingId),
        hasAccountId: Boolean(accountId)
      });
      return NextResponse.json({ 
        success: false, 
        error: { message: 'Faltan datos básicos (bookingId, accountId) para procesar el reembolso' } 
      }, { status: 400 });
    }

    // Si no tenemos invoiceId ni paymentIntentId, no podemos continuar
    if (!invoiceId && !paymentIntentId) {
      logger.error('❌ [API] Error: No se proporcionó ni invoiceId ni paymentIntentId', {
        hasBookingId: Boolean(bookingId),
        hasAccountId: Boolean(accountId),
        hasInvoiceId: Boolean(invoiceId),
        hasPaymentIntentId: Boolean(paymentIntentId)
      });
      return NextResponse.json({ 
        success: false, 
        error: { message: 'Se requiere invoiceId o paymentIntentId para procesar el reembolso' } 
      }, { status: 400 });
    }

    let invoice;
    let chargeId;
    
    // Utilizar primero invoiceId si está disponible
    if (invoiceId) {
      try {
        // 1. Obtener información de la factura para encontrar el cargo asociado
        logger.info('🔍 [API] Obteniendo información de la factura:', { invoiceId });
        invoice = await stripe.invoices.retrieve(invoiceId, {
          stripeAccount: verifiedAccountId
        });
        
        if (!invoice) {
          logger.error('❌ [API] Error: No se encontró la factura', { invoiceId });
          return NextResponse.json({ 
            success: false, 
            error: { message: 'No se encontró la factura especificada' } 
          }, { status: 404 });
        }
        
        // Extraer el charge_id de la factura
        chargeId = invoice.charge;
      } catch (error) {
        logger.error('❌ [API] Error al obtener factura:', { invoiceId, error });
        // Continuamos el flujo para intentar con payment_intent_id si está disponible
      }
    }
    
    // Si no tenemos chargeId pero tenemos paymentIntentId, buscamos el cargo asociado al PaymentIntent
    if (!chargeId && paymentIntentId) {
      try {
        logger.info('🔍 [API] Buscando cargo a partir del paymentIntent:', { paymentIntentId });
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
          stripeAccount: verifiedAccountId
        });
        
        if (paymentIntent && paymentIntent.latest_charge) {
          chargeId = paymentIntent.latest_charge;
          logger.info('✅ [API] Cargo encontrado a través del paymentIntent:', { chargeId });
        } else {
          logger.error('❌ [API] El paymentIntent no tiene un cargo asociado', { paymentIntentId });
        }
      } catch (error) {
        logger.error('❌ [API] Error al obtener paymentIntent:', { paymentIntentId, error });
      }
    }
    
    // Si después de ambos intentos no tenemos chargeId, no podemos procesar el reembolso
    if (!chargeId) {
      logger.error('❌ [API] Error: No se encontró un cargo asociado para reembolsar');
      return NextResponse.json({ 
        success: false, 
        error: { message: 'No se encontró un cargo que pueda ser reembolsado' } 
      }, { status: 400 });
    }

    // 2. Verificar si la factura tiene un cargo asociado
    if (!invoice && !chargeId) {
      logger.error('❌ [API] Error: La factura no tiene un cargo asociado', { invoiceId });
      return NextResponse.json({ 
        success: false, 
        error: { message: 'La factura no tiene un cargo asociado que pueda ser reembolsado' } 
      }, { status: 400 });
    }

    // 3. Convertir el monto a centavos para Stripe
    // Obtener el monto a reembolsar según el tipo de reembolso
    let refundAmount;
    let amountSource = 'default';
    
    if (body.amount) {
      // Si se proporciona directamente un monto, usarlo
      refundAmount = body.amount;
      amountSource = 'request';
    } else {
      // Estrategia en cascada para obtener el monto a reembolsar
      let originalAmount = 0;
      
      // 1. Verificar si la factura tiene amount_paid
      if (invoice && invoice.amount_paid > 0) {
        originalAmount = invoice.amount_paid;
        amountSource = 'invoice';
        logger.info('💰 [API] Usando monto de factura:', { 
          amount: originalAmount / 100,
          source: 'invoice.amount_paid'
        });
      } 
      // 2. Si no hay amount_paid, verificar si tenemos un chargeId para obtener el monto
      else if (chargeId) {
        try {
          // Obtener detalles del cargo
          const charge = await stripe.charges.retrieve(chargeId as string, {
            stripeAccount: verifiedAccountId
          });
          
          if (charge && charge.amount > 0) {
            originalAmount = charge.amount;
            amountSource = 'charge';
            logger.info('💰 [API] Usando monto del cargo:', { 
              amount: originalAmount / 100,
              source: 'charge.amount'
            });
          }
        } catch (error) {
          logger.error('⚠️ [API] Error al obtener detalles del cargo:', { chargeId, error });
          // Continuamos con la siguiente opción
        }
      }
      // 3. Si tampoco tenemos monto del cargo, verificar si podemos obtenerlo del paymentIntent
      if (originalAmount === 0 && paymentIntentId) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
            stripeAccount: verifiedAccountId
          });
          
          if (paymentIntent && paymentIntent.amount > 0) {
            originalAmount = paymentIntent.amount;
            amountSource = 'paymentIntent';
            logger.info('💰 [API] Usando monto del paymentIntent:', { 
              amount: originalAmount / 100,
              source: 'paymentIntent.amount'
            });
          }
        } catch (error) {
          logger.error('⚠️ [API] Error al obtener detalles del paymentIntent:', { paymentIntentId, error });
        }
      }
      
      // Si después de todo no tenemos un monto, fallamos
      if (originalAmount === 0) {
        logger.error('❌ [API] Error: No se puede determinar el monto a reembolsar por ninguna vía', { 
          invoiceId,
          paymentIntentId,
          chargeId
        });
        return NextResponse.json({ 
          success: false, 
          error: { message: 'No se puede determinar el monto a reembolsar' } 
        }, { status: 400 });
      }
      
      // Calcular el monto a reembolsar basado en el tipo de reembolso y porcentaje
      if (isFullRefund) {
        refundAmount = originalAmount / 100; // Convertir de centavos a unidades
      } else {
        // Reembolso parcial basado en porcentaje
        refundAmount = (originalAmount * (percentage / 100)) / 100;
      }
    }
    
    const refundAmountCents = Math.round(refundAmount * 100);

    logger.info('💰 [API] Monto calculado para reembolso:', { 
      refundAmount,
      refundAmountCents,
      isFullRefund,
      amountSource,
      percentage: percentage || 100
    });
    
    // 4. Crear el reembolso
    logger.info('💳 [API] Procesando reembolso:', { 
      chargeId, 
      amount: refundAmountCents 
    });

    const refundParams: Stripe.RefundCreateParams = {
      charge: chargeId as string,
      amount: refundAmountCents,
      reason: 'requested_by_customer', // Opciones de Stripe: 'duplicate', 'fraudulent', o 'requested_by_customer'
      metadata: {
        bookingId,
        reason: reason || 'Cancelación de reserva',
        isFullRefund: isFullRefund ? 'true' : 'false',
        refundType,
        percentage: percentage?.toString() || '100'
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

    // Usar la nueva función RPC para actualizar el estado de pago a refunded
    // en ambas tablas (bookings y payments) de manera transaccional
    logger.info('🔄 [API] Actualizando estados de pago a "refunded" mediante RPC:', { bookingId });
    const { data: updateResult, error: updateRpcError } = await supabase.rpc('update_payment_status_refund', {
      p_booking_id: bookingId,
      p_refund_id: refund.id,
      p_refund_amount: refundAmount,
      p_reason: reason || 'Reembolso por cancelación',
      p_update_cancellation: true // marcar la reserva como cancelada también
    });

    if (updateRpcError) {
      logger.error('⚠️ [API] Error al actualizar estados de pago mediante RPC:', { error: updateRpcError });
      // Aunque hay error en la actualización, el reembolso ya se procesó en Stripe, así que continuamos
      return NextResponse.json({ 
        success: true, 
        refund,
        warning: 'El reembolso se procesó en Stripe pero hubo un error al actualizar los estados en la base de datos'
      });
    }

    logger.info('✅ [API] Estados de pago actualizados correctamente:', { updateResult });
    return NextResponse.json({ 
      success: true, 
      refund,
      updateResult,
      message: `Reembolso de ${refundAmount} procesado correctamente y estados actualizados a refunded en todas las tablas`
    });
  } catch (error: any) {
    logger.error('❌ [API] Error al procesar reembolso:', { error });
    return NextResponse.json({ 
      success: false, 
      error: { message: error.message || 'Error desconocido al procesar el reembolso' } 
    }, { status: 500 });
  }
}
