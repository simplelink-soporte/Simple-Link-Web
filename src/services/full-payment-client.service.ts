import { createId } from "@paralleldrive/cuid2";

interface FullPaymentRequest {
  paymentMethodId: string;
  amount: number;
  empresaId: string;
  description?: string;
  stripeCustomerId?: string;
  stripeAccountId?: string;
  customerEmail?: string; // Email para facturación
}

interface FullPaymentResponse {
  success: boolean;
  paymentIntentId?: string;
  chargeStatus?: string;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Servicio para procesar pagos completos con Stripe
 * Implementa el flujo optimizado usando los datos ya disponibles
 */
export class FullPaymentClientService {
  /**
   * Procesa un pago completo con Stripe
   * @param params Datos necesarios para el pago
   * @returns Resultado del procesamiento
   */
  async processPayment(params: FullPaymentRequest): Promise<FullPaymentResponse> {
    const requestId = createId();
    
    console.log(`🔄 [${requestId}] Iniciando procesamiento de pago completo:`, {
      amount: params.amount,
      paymentMethodId: params.paymentMethodId?.substring(0, 10) + '...',
      empresaId: params.empresaId,
      hasCustomerId: !!params.stripeCustomerId,
      hasAccountId: !!params.stripeAccountId,
      timestamp: new Date().toISOString()
    });
    
    // Validaciones fundamentales
    if (!params.paymentMethodId || !params.amount || params.amount <= 0) {
      console.error(`❌ [${requestId}] Parámetros inválidos:`, {
        hasPaymentMethodId: !!params.paymentMethodId,
        hasAmount: !!params.amount,
        amount: params.amount
      });
      return {
        success: false,
        message: 'Parámetros de pago incompletos o inválidos'
      };
    }
    
    // Verificar explícitamente el customerId, esencial para pagos
    if (!params.stripeCustomerId) {
      console.error(`❌ [${requestId}] Falta customerId, obligatorio para procesar pagos`);
      return {
        success: false,
        message: 'Se requiere el ID de cliente de Stripe (stripeCustomerId) para procesar pagos'
      };
    }
    
    try {
      // Usar los datos proporcionados directamente sin búsquedas adicionales
      const stripeData = {
        customerId: params.stripeCustomerId,
        accountId: params.stripeAccountId // Ya no usar empresaId como fallback
      };
      
      // Validar que tenemos un accountId válido para Stripe
      if (!stripeData.accountId || !stripeData.accountId.startsWith('acct_')) {
        console.error(`❌ [${requestId}] stripeAccountId inválido:`, {
          providedAccountId: stripeData.accountId,
          isValid: stripeData.accountId?.startsWith('acct_')
        });
        return {
          success: false,
          message: 'ID de cuenta de Stripe inválido o no proporcionado',
          error: {
            code: 'invalid_account_id',
            message: 'El ID de cuenta de Stripe debe empezar con "acct_"'
          }
        };
      }
      
      console.log(`✅ [${requestId}] Datos para procesamiento directo:`, {
        customerId: stripeData.customerId.substring(0, 10) + '...',
        accountId: stripeData.accountId
      });
      
      // Procesar el pago a través de la API optimizada
      console.log(`🔄 [${requestId}] Enviando solicitud para procesamiento de pago on-session`);
      const response = await fetch('/api/stripe/process-full-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: params.amount,
          stripePaymentMethodId: params.paymentMethodId,
          stripeAccountId: stripeData.accountId,
          stripeCustomerId: stripeData.customerId,
          empresaId: params.empresaId,
          description: params.description || 'Pago completo de reserva',
          paymentType: 'booking',
          off_session: false, // Cambiar a false porque el cliente está presente (on-session)
          customerEmail: params.customerEmail // Agregar el correo electrónico del cliente
        })
      });
      
      console.log(`🔄 [${requestId}] Respuesta HTTP recibida: ${response.status} ${response.statusText}`);
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        console.error(`❌ [${requestId}] Error en respuesta de API:`, {
          status: response.status,
          error: result.error,
          message: result.error?.message || 'Error desconocido'
        });
        return {
          success: false,
          message: result.error?.message || 'Error al procesar el pago',
          error: result.error
        };
      }
      
      if (!result.paymentIntentId) {
        console.error(`❌ [${requestId}] Respuesta sin paymentIntentId:`, result);
        return {
          success: false,
          message: 'No se recibió confirmación del pago',
          error: { code: 'missing_payment_intent', message: 'No se recibió el ID del PaymentIntent' }
        };
      }
      
      console.log(`✅ [${requestId}] Pago procesado exitosamente:`, {
        paymentIntentId: result.paymentIntentId,
        status: result.chargeStatus,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        paymentIntentId: result.paymentIntentId,
        chargeStatus: result.chargeStatus,
        message: 'Pago procesado exitosamente'
      };
    } catch (error: any) {
      console.error(`❌ [${requestId}] Error inesperado:`, error);
      console.error(`❌ [${requestId}] Detalles adicionales:`, {
        stack: error.stack,
        message: error.message,
        name: error.name,
        params: {
          paymentMethodId: params.paymentMethodId,
          amount: params.amount
        },
        timestamp: new Date().toISOString()
      });
      
      return {
        success: false,
        message: error.message || 'Error inesperado al procesar el pago',
        error: {
          code: 'unexpected_error',
          message: error.message || 'Error inesperado',
          details: error
        }
      };
    }
  }
}

// Instancia exportable
export const fullPaymentService = new FullPaymentClientService();