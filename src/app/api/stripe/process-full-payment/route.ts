import { createId } from '@paralleldrive/cuid2';
import { z } from 'zod';
import { Stripe } from 'stripe';
import { createInvoiceService } from '@/services/stripe-invoice.service';

// Esquema optimizado para la solicitud de pago
const fullPaymentSchema = z.object({
  amount: z.number().positive(),
  stripePaymentMethodId: z.string(),
  stripeAccountId: z.string(),
  stripeCustomerId: z.string(),
  empresaId: z.string().optional(),
  description: z.string().optional(),
  paymentType: z.string().optional().default('booking'),
  off_session: z.boolean().optional().default(true),
  customerEmail: z.string().optional(), // Nuevo campo para guardar email para facturación
  metadata: z.record(z.string()).optional() // Campo para metadatos adicionales como país
});

/**
 * API para procesar pagos completos con Stripe
 * Implementa el flujo off-session optimizado
 */
export async function POST(request: Request) {
  const requestId = createId();
  console.log(`🔄 [${requestId}] API process-full-payment iniciada`);

  try {
    // Obtener y validar el body
    const body = await request.json().catch(error => {
      console.error(`❌ [${requestId}] Error al parsear JSON:`, error);
      throw new Error('Invalid JSON payload');
    });
    
    console.log(`📦 [${requestId}] Datos recibidos para pago:`, {
      amount: body.amount,
      stripePaymentMethodId: body.stripePaymentMethodId?.substring(0, 10) + '...',
      hasCustomerId: !!body.stripeCustomerId,
      hasAccountId: !!body.stripeAccountId,
      sessionMode: body.off_session ? 'off-session' : 'on-session',
      timestamp: new Date().toISOString()
    });
    
    const parseResult = fullPaymentSchema.safeParse(body);
    
    if (!parseResult.success) {
      console.error(`❌ [${requestId}] Error de validación:`, parseResult.error);
      return Response.json({
        success: false,
        error: {
          code: 'validation_error',
          message: 'Datos de pago inválidos',
          details: parseResult.error.errors
        }
      }, { status: 400 });
    }
    
    const data = parseResult.data;
    
    // Verificar que tengamos la clave API de Stripe
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error(`❌ [${requestId}] Error: STRIPE_SECRET_KEY no configurada`);
      return Response.json({
        success: false,
        error: {
          code: 'config_error',
          message: 'Error de configuración de Stripe'
        }
      }, { status: 500 });
    }
    
    // Inicializar Stripe sin dependencia de Supabase
    console.log(`🔧 [${requestId}] Inicializando Stripe para pago ${data.off_session ? 'off-session' : 'on-session'}`);
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    let invoiceResult = null;

    try {
      // Si hay email de cliente, preparar la factura primero antes de cobrar
      // Esto permite integrar todo en una sola operación conceptual
      if (data.customerEmail) {
        console.log(`📝 [${requestId}] Preparando facturación con email: ${data.customerEmail}`);
        
        // Asegurarse que el cliente tenga email en Stripe (requisito para facturas)
        try {
          console.log(`📝 [${requestId}] Actualizando cliente de Stripe con email:`, data.customerEmail);
          await stripe.customers.update(
            data.stripeCustomerId,
            {
              email: data.customerEmail
            },
            {
              stripeAccount: data.stripeAccountId
            }
          );
          console.log(`✔️ [${requestId}] Cliente actualizado con email exitosamente`);
        } catch (updateError) {
          console.error(`⚠️ [${requestId}] Error al actualizar email del cliente:`, updateError);
          // Continuamos aunque haya error, por si acaso el email ya estaba configurado
        }
      }
      
      // Determinar la moneda según el país si está en los metadatos
      const country = data.metadata?.country;
      const currencyCode = getCurrencyCodeByCountry(country);
      
      console.log(`🌎 [${requestId}] País detectado: ${country || 'No especificado'}, usando moneda: ${currencyCode}`);
      
      // Crear PaymentIntent directamente con confirm=true para procesamiento inmediato
      console.log(`💳 [${requestId}] Creando y confirmando PaymentIntent ${data.off_session ? 'off-session' : 'on-session'}:`, {
        amount: data.amount,
        customerId: data.stripeCustomerId.substring(0, 10) + '...',
        accountId: data.stripeAccountId.substring(0, 10) + '...'
      });
      
      // Configuración para pagos según documentación de Stripe
      // Usar off_session: false cuando el cliente esté presente (on-session)
      const paymentIntentConfig: Stripe.PaymentIntentCreateParams = {
        amount: Math.round(data.amount * 100), // Centavos
        currency: currencyCode, // Usar el código de moneda según el país
        customer: data.stripeCustomerId,
        payment_method: data.stripePaymentMethodId,
        off_session: data.off_session, // Usar el parámetro enviado por el cliente
        confirm: true, // Confirmar inmediatamente
        payment_method_types: ['card'],
        metadata: {
          request_id: requestId,
          payment_type: data.paymentType,
          description: data.description || 'Pago completo de reserva',
          empresa_id: data.empresaId || '',
          customer_email: data.customerEmail || '', // Agregar email del cliente a la metadata
          empresa_stripe_id: data.stripeAccountId, // ID de cuenta Stripe para el webhook
          invoice_auto_generate: 'true', // Flag para generar factura automáticamente
          country: country || '' // Pasar el país a los metadatos para la factura
        },
        description: data.description || 'Pago completo de reserva',
        confirmation_method: 'automatic',
        capture_method: 'automatic'
      };
      
      // Solo agregar setup_future_usage si estamos off_session
      if (data.off_session) {
        paymentIntentConfig.setup_future_usage = 'off_session';
      }
      
      const paymentIntent = await stripe.paymentIntents.create(
        paymentIntentConfig, 
        {
          stripeAccount: data.stripeAccountId
        }
      );
      
      console.log(`✔️ [${requestId}] PaymentIntent creado y confirmado:`, {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100, // Convertir de centavos
        customer: paymentIntent.customer?.toString().substring(0, 10) + '...',
        timestamp: new Date().toISOString()
      });
      
      // Generar factura profesional si hay email y el pago fue exitoso
      if (data.customerEmail && paymentIntent.status === 'succeeded') {
        try {
          console.log(`📄 [${requestId}] Generando factura profesional...`);
          invoiceResult = await createInvoiceService.createAndSendInvoice({
            paymentIntentId: paymentIntent.id,
            stripeAccountId: data.stripeAccountId,
            customerId: data.stripeCustomerId,
            amount: data.amount,
            description: data.description || 'Pago completo de reserva',
            metadata: {
              payment_type: data.paymentType,
              customer_email: data.customerEmail
            }
          });
          
          console.log(`📄 [${requestId}] Factura generada:`, {
            success: invoiceResult.success,
            invoiceId: invoiceResult.invoiceId || 'N/A',
            invoiceUrl: invoiceResult.invoiceUrl || 'N/A',
            pdfUrl: invoiceResult.pdfUrl || 'N/A'
          });
        } catch (invoiceError) {
          // Si falla la generación de la factura, no afecta el resultado del pago
          console.error(`⚠️ [${requestId}] Error al generar factura profesional:`, invoiceError);
        }
      }
      
      return Response.json({
        success: true,
        paymentIntentId: paymentIntent.id,
        chargeStatus: paymentIntent.status,
        invoiceId: invoiceResult?.invoiceId,
        invoiceUrl: invoiceResult?.invoiceUrl,
        pdfUrl: invoiceResult?.pdfUrl
      });
      
    } catch (stripeError: any) {
      console.error(`❌ [${requestId}] Error de Stripe:`, {
        code: stripeError.code,
        type: stripeError.type,
        message: stripeError.message,
        param: stripeError.param,
        decline_code: stripeError.decline_code
      });
      
      // Mejorar el mensaje de error para mayor claridad
      let errorMessage = stripeError.message || 'Error al procesar el pago con Stripe';
      if (stripeError.code === 'authentication_required') {
        errorMessage = 'Este pago requiere autenticación del cliente. Use el flujo on-session en su lugar.';
      } else if (stripeError.decline_code) {
        errorMessage = `Pago rechazado: ${stripeError.decline_code}. ${stripeError.message}`;
      }
      
      return Response.json({
        success: false,
        error: {
          code: stripeError.code || 'stripe_error',
          message: errorMessage,
          decline_code: stripeError.decline_code,
          details: stripeError
        }
      }, { status: 400 });
    }
    
  } catch (error: any) {
    console.error(`❌ [${requestId}] Error no controlado:`, error);
    
    const errorDetails = {
      message: error.message || 'Error desconocido',
      stack: error.stack,
      name: error.name,
      code: error.code,
      type: error.type
    };
    
    console.error(`❌ [${requestId}] Detalles completos:`, errorDetails);
    
    return Response.json({
      success: false,
      error: {
        code: 'server_error',
        message: 'Error interno del servidor',
        details: error.message
      }
    }, { status: 500 });
  }
}

/**
 * Obtiene el código de moneda según el país
 * @param country El país, si está disponible
 * @returns El código de moneda ISO 4217 (MXN para México, EUR para Europa, etc.)
 */
const getCurrencyCodeByCountry = (country?: string | null): string => {
  if (!country) return 'eur'; // Por defecto
  
  const countryLower = country.toLowerCase();
  switch (countryLower) {
    case 'mexico':
    case 'méxico':
      return 'mxn'; // Peso mexicano
    case 'argentina':
      return 'ars'; // Peso argentino
    case 'españa':
    case 'espana':
    case 'spain':
    case 'europe':
    case 'europa':
      return 'eur'; // Euro
    default:
      return 'eur'; // Por defecto para otros países
  }
};