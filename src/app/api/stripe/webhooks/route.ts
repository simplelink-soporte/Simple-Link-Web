import { createId } from '@paralleldrive/cuid2';
import { Stripe } from 'stripe';
import { createInvoiceService } from '@/services/stripe-invoice.service';

/**
 * Endpoint para recibir webhooks de Stripe
 * Procesa eventos como payment_intent.succeeded para generar facturas automáticamente
 */
export async function POST(request: Request) {
  const requestId = createId();
  console.log(`🔄 [${requestId}] Webhook de Stripe recibido`);

  try {
    // Verificar la firma del webhook
    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      console.error(`❌ [${requestId}] Webhook sin firma`);
      return Response.json({ error: 'Falta la firma del webhook' }, { status: 400 });
    }

    const body = await request.text();
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
    
    // Verificar que el evento es válido
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET as string
      );
    } catch (err: any) {
      console.error(`❌ [${requestId}] Error de verificación del webhook:`, err.message);
      return Response.json({ error: `Error de firma: ${err.message}` }, { status: 400 });
    }

    // Procesar eventos según su tipo
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent, requestId);
        break;
        
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice, stripe, requestId);
        break;
        
      default:
        console.log(`ℹ️ [${requestId}] Evento no procesado: ${event.type}`);
    }

    return Response.json({ received: true });
  } catch (error: any) {
    console.error(`❌ [${requestId}] Error al procesar webhook:`, error);
    return Response.json(
      { error: 'Error al procesar el webhook' },
      { status: 500 }
    );
  }
}

/**
 * Procesa el evento payment_intent.succeeded
 * @param paymentIntent - El objeto PaymentIntent recibido
 * @param requestId - ID de la solicitud para logs
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent, requestId: string) {
  console.log(`✅ [${requestId}] Pago exitoso detectado:`, {
    id: paymentIntent.id,
    amount: paymentIntent.amount / 100,
    status: paymentIntent.status,
    customer: paymentIntent.customer,
    timestamp: new Date().toISOString()
  });

  // Verificar si la generación automática de facturas está habilitada
  if (createInvoiceService.isInvoiceFeatureEnabled()) {
    // Extraer el ID de cuenta de Stripe desde los metadatos
    const stripeAccountId = paymentIntent.metadata?.empresa_stripe_id || '';
    
    // Asegurarse de que tenemos los metadatos completos, incluyendo el país
    const country = paymentIntent.metadata?.country || '';
    console.log(`🌎 [${requestId}] País en metadatos del PaymentIntent:`, country || 'No especificado');
    
    // Solo procesar si el flag de factura automática está activo
    if (paymentIntent.metadata?.invoice_auto_generate === 'true') {
      // Procesar la factura automáticamente
      if (stripeAccountId) {
        try {
          console.log(`📄 [${requestId}] Generando factura profesional...`);
          
          // Obtener una instancia fresca del PaymentIntent para asegurar tener todos los metadatos
          const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
            stripeAccount: stripeAccountId
          });
          
          // Recuperar el PaymentIntent completo para asegurar que tenemos todos los metadatos
          const refreshedPaymentIntent = await stripe.paymentIntents.retrieve(paymentIntent.id);
          
          // Crear la factura usando los metadatos completos
          const invoiceResult = await createInvoiceService.createAndSendInvoice({
            paymentIntentId: paymentIntent.id,
            stripeAccountId,
            customerId: paymentIntent.customer as string,
            amount: paymentIntent.amount / 100,
            description: paymentIntent.description || 'Pago de reserva',
            metadata: refreshedPaymentIntent.metadata || paymentIntent.metadata
          });
          
          console.log(`📄 [${requestId}] Factura generada:`, {
            success: invoiceResult.success,
            invoiceId: invoiceResult.invoiceId || 'N/A',
            invoiceUrl: invoiceResult.invoiceUrl || 'N/A',
            pdfUrl: invoiceResult.pdfUrl || 'N/A'
          });
        } catch (invoiceError) {
          console.error(`❌ [${requestId}] Error al generar factura automática:`, invoiceError);
          // Continuamos con el proceso aunque falle la factura
        }
      } else {
        console.warn(`⚠️ [${requestId}] No se encontró ID de cuenta Stripe en metadatos`);
      }
    } else {
      console.log(`ℹ️ [${requestId}] Factura automática no solicitada para este pago`);
    }
  } else {
    console.log(`ℹ️ [${requestId}] Característica de facturas automáticas deshabilitada`);
  }
}

/**
 * Procesa el evento invoice.paid
 * Este manejador actualiza el estado de una reserva de "señado" a "pagado"
 * cuando se completa el pago de una factura
 * 
 * @param invoice - El objeto Invoice recibido
 * @param stripe - Instancia de Stripe configurada
 * @param requestId - ID de la solicitud para logs
 */
async function handleInvoicePaid(invoice: Stripe.Invoice, stripe: Stripe, requestId: string) {
  console.log(`✅ [${requestId}] Factura pagada detectada:`, {
    id: invoice.id,
    amount: invoice.amount_paid / 100,
    status: invoice.status,
    metadata: invoice.metadata
  });
  
  try {
    // 1. Verificar que la factura tenga metadatos
    if (!invoice.metadata) {
      console.log(`ℹ️ [${requestId}] La factura no contiene metadatos necesarios`);
      return;
    }
    
    // Determinar el tipo de recurso: reserva normal o clase
    const isClassBooking = invoice.metadata.is_class_booking === 'true' || 
                          invoice.metadata.invoice_origin === 'manual_class_booking' ||
                          invoice.metadata.resource_type === 'class';
                          
    const isRegularBooking = invoice.metadata.booking_id && !isClassBooking;
    
    // Si no es una reserva de clase ni una reserva normal, salir
    if (!isClassBooking && !isRegularBooking) {
      console.log(`ℹ️ [${requestId}] La factura no corresponde a una reserva conocida`);
      return;
    }
    
    // 2. Extraer IDs y propiedades relevantes
    const bookingId = invoice.metadata.booking_id;
    const classId = invoice.metadata.class_id;
    const paymentType = invoice.metadata.payment_type;
    const isPartialPayment = invoice.metadata.is_partial_payment === 'true';
    
    // 3. Solo procesar si es una factura de pago parcial (seña)
    if (!isPartialPayment && paymentType !== 'deposit') {
      console.log(`ℹ️ [${requestId}] La factura no corresponde a una seña o pago parcial`);
      return;
    }
    
    // 4. Conectar con Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    );
    
    // 5. Procesar según el tipo de reserva
    if (isRegularBooking && bookingId) {
      // Reserva normal (turnos)
      console.log(`🔄 [${requestId}] Actualizando estado de reserva con seña a pagado:`, bookingId);
      
      const { data, error } = await supabase
        .from('bookings')
        .update({
          payment_status: 'completed',  // Actualizar de 'partial' a 'completed'
          updated_at: new Date().toISOString(),
          payment_completed_at: new Date().toISOString(),
          payment_metadata: {
            ...(invoice.metadata || {}),
            final_payment_invoice_id: invoice.id,
            final_payment_amount: invoice.amount_paid / 100,
            final_payment_date: new Date().toISOString()
          }
        })
        .eq('id', bookingId)
        .eq('payment_status', 'partial')  // Verificar que estaba en estado señado
        .select();
      
      if (error) {
        console.error(`❌ [${requestId}] Error al actualizar estado de reserva:`, error);
        return;
      }
      
      if (data && data.length > 0) {
        console.log(`✅ [${requestId}] Reserva actualizada correctamente de SEÑADO a PAGADO:`, {
          bookingId,
          previousStatus: 'partial',
          newStatus: 'completed'
        });
      } else {
        console.warn(`⚠️ [${requestId}] No se encontró la reserva o ya estaba en estado pagado:`, bookingId);
      }
    } 
    else if (isClassBooking && (bookingId || classId)) {
      // Reserva de clase
      const bookingIdToUse = bookingId || invoice.metadata.class_booking_id;
      
      if (!bookingIdToUse) {
        console.warn(`⚠️ [${requestId}] No se encontró ID de reserva para la clase`);
        return;
      }
      
      console.log(`🔄 [${requestId}] Actualizando estado de reserva de clase con seña a pagado:`, bookingIdToUse);
      
      // Actualizar en la tabla class_bookings
      const { data, error } = await supabase
        .from('class_bookings')
        .update({
          payment_status: 'completed',  // Actualizar de 'partial' a 'completed'
          updated_at: new Date().toISOString(),
          payment_metadata: {
            ...(invoice.metadata || {}),
            final_payment_invoice_id: invoice.id,
            final_payment_amount: invoice.amount_paid / 100,
            final_payment_date: new Date().toISOString()
          }
        })
        .eq('id', bookingIdToUse)
        .eq('payment_status', 'partial')  // Verificar que estaba en estado señado
        .select();
      
      if (error) {
        console.error(`❌ [${requestId}] Error al actualizar estado de reserva de clase:`, error);
        return;
      }
      
      if (data && data.length > 0) {
        console.log(`✅ [${requestId}] Reserva de clase actualizada correctamente de SEÑADO a PAGADO:`, {
          bookingId: bookingIdToUse,
          previousStatus: 'partial',
          newStatus: 'completed'
        });
      } else {
        console.warn(`⚠️ [${requestId}] No se encontró la reserva de clase o ya estaba en estado pagado:`, bookingIdToUse);
      }
    }
    
  } catch (error: any) {
    console.error(`❌ [${requestId}] Error al procesar pago de factura:`, error);
  }
}
