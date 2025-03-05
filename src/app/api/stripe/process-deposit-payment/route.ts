import { createId } from '@paralleldrive/cuid2';
import { z } from 'zod';
import { Stripe } from 'stripe';

// Esquema optimizado para la solicitud de pago con seña
const depositPaymentSchema = z.object({
  amount: z.number().positive(),
  totalAmount: z.number().positive(), // Monto total de la reserva
  depositPercentage: z.number().positive().default(30), // Porcentaje de seña, por defecto 30%
  stripePaymentMethodId: z.string(),
  stripeAccountId: z.string(),
  stripeCustomerId: z.string(),
  empresaId: z.string().optional(),
  description: z.string().optional(),
  paymentType: z.string().optional().default('deposit'),
  off_session: z.boolean().optional().default(false)
});

/**
 * API para procesar pagos con seña con Stripe
 * Implementa el flujo off-session optimizado cobrando solo el porcentaje de seña
 */
export async function POST(request: Request) {
  const requestId = createId();
  console.log(`🔄 [${requestId}] API process-deposit-payment iniciada`);

  try {
    // Obtener y validar el body
    const body = await request.json().catch(error => {
      console.error(`❌ [${requestId}] Error al parsear JSON:`, error);
      throw new Error('Invalid JSON payload');
    });
    
    console.log(`📦 [${requestId}] Datos recibidos para pago con seña:`, {
      amount: body.amount,
      totalAmount: body.totalAmount,
      depositPercentage: body.depositPercentage || 30,
      stripePaymentMethodId: body.stripePaymentMethodId?.substring(0, 10) + '...',
      hasCustomerId: !!body.stripeCustomerId,
      hasAccountId: !!body.stripeAccountId,
      sessionMode: body.off_session ? 'off-session' : 'on-session',
      timestamp: new Date().toISOString()
    });
    
    const parseResult = depositPaymentSchema.safeParse(body);
    
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
    console.log(`🔧 [${requestId}] Inicializando Stripe para pago con seña ${data.off_session ? 'off-session' : 'on-session'}`);
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    try {
      // Calcular el monto de la seña (por defecto 30% del total)
      const depositAmount = Math.round((data.amount || (data.totalAmount * (data.depositPercentage / 100))) * 100);
      
      console.log(`💰 [${requestId}] Calculando monto de seña:`, {
        totalAmount: data.totalAmount,
        percentage: data.depositPercentage,
        depositAmount: depositAmount / 100, // Para mostrar en formato decimal
      });
      
      // Crear PaymentIntent directamente con confirm=true para procesamiento inmediato
      console.log(`💳 [${requestId}] Creando y confirmando PaymentIntent para seña ${data.off_session ? 'off-session' : 'on-session'}:`, {
        amount: depositAmount / 100,
        customerId: data.stripeCustomerId.substring(0, 10) + '...',
        accountId: data.stripeAccountId.substring(0, 10) + '...'
      });
      
      // Configuración para pagos según documentación de Stripe
      const paymentIntentConfig: Stripe.PaymentIntentCreateParams = {
        amount: depositAmount, // Ya está en centavos
        currency: 'eur',
        customer: data.stripeCustomerId,
        payment_method: data.stripePaymentMethodId,
        off_session: data.off_session,
        confirm: true, // Confirmar inmediatamente
        payment_method_types: ['card'],
        metadata: {
          request_id: requestId,
          payment_type: 'deposit',
          deposit_percentage: data.depositPercentage.toString(),
          total_amount: (data.totalAmount * 100).toString(),
          description: data.description || 'Pago de seña para reserva',
          empresa_id: data.empresaId || ''
        },
        description: data.description || 'Pago de seña para reserva',
        confirmation_method: 'automatic',
        capture_method: 'automatic'
      };
      
      // Solo agregar setup_future_usage si estamos on-session (el usuario está presente)
      if (!data.off_session) {
        paymentIntentConfig.setup_future_usage = 'off_session';
      }
      
      const paymentIntent = await stripe.paymentIntents.create(
        paymentIntentConfig, 
        {
          stripeAccount: data.stripeAccountId
        }
      );
      
      console.log(`✅ [${requestId}] PaymentIntent para seña creado y confirmado:`, {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100, // Convertir de centavos
        customer: paymentIntent.customer?.toString().substring(0, 10) + '...',
        timestamp: new Date().toISOString()
      });
      
      return Response.json({
        success: true,
        paymentIntentId: paymentIntent.id,
        chargeStatus: paymentIntent.status,
        depositAmount: paymentIntent.amount / 100,
        totalAmount: data.totalAmount,
        depositPercentage: data.depositPercentage
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
        message: error.message || 'Error en el servidor',
        details: errorDetails
      }
    }, { status: 500 });
  }
} 