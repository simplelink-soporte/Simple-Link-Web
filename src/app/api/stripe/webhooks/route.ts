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

    // Procesar sólo eventos de pago exitoso
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log(`✅ [${requestId}] Pago exitoso detectado:`, {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
      });

      // Verificar si la generación automática de facturas está habilitada
      if (createInvoiceService.isInvoiceFeatureEnabled()) {
        // Extraer el ID de cuenta de Stripe desde los metadatos
        const stripeAccountId = paymentIntent.metadata?.empresa_stripe_id || '';
        
        // Solo procesar si el flag de factura automática está activo
        if (paymentIntent.metadata?.invoice_auto_generate === 'true') {
          // Procesar la factura automáticamente
          if (stripeAccountId) {
            try {
              const invoiceResult = await createInvoiceService.createAndSendInvoice({
                paymentIntentId: paymentIntent.id,
                stripeAccountId,
                customerId: paymentIntent.customer as string,
                amount: paymentIntent.amount / 100,
                description: paymentIntent.description || 'Pago de reserva',
                metadata: paymentIntent.metadata
              });
              
              console.log(`📄 [${requestId}] Resultado de creación de factura:`, {
                success: invoiceResult.success,
                invoiceId: invoiceResult.invoiceId || 'N/A'
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
    } else {
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
