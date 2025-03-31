/**
 * Servicio cliente para procesar pagos con seña
 * Implementa la lógica para conectar con el endpoint de pagos con seña
 */

import { createId } from '@paralleldrive/cuid2';
import { toast } from 'sonner';

interface DepositPaymentParams {
  paymentMethodId: string;
  amount: number;
  totalAmount?: number;        // Monto total de la reserva
  depositPercentage?: number;  // Porcentaje de la seña (default: 30%)
  empresaId: string;
  description?: string;
  stripeCustomerId: string;
  stripeAccountId: string;
  off_session?: boolean;      // Default: false porque el usuario está presente durante el pago
  customerEmail?: string;     // Email del cliente para facturación
}

interface DepositPaymentResult {
  success: boolean;
  paymentIntentId?: string;
  chargeStatus?: string;
  depositAmount?: number;     // Monto de la seña cobrada
  totalAmount?: number;       // Monto total de la reserva
  depositPercentage?: number; // Porcentaje cobrado como seña
  message?: string;
  error?: any;
}

class DepositPaymentService {
  /**
   * Procesa un pago con seña utilizando Stripe
   * @param params Parámetros para procesar el pago con seña
   */
  async processPayment(params: DepositPaymentParams): Promise<DepositPaymentResult> {
    const requestId = createId();
    
    console.log(`🔄 [${requestId}] Iniciando proceso de pago con seña:`, {
      paymentMethodId: params.paymentMethodId,
      amount: params.amount,
      totalAmount: params.totalAmount || params.amount,
      depositPercentage: params.depositPercentage || 30,
      timestamp: new Date().toISOString()
    });

    try {
      // Validar parámetros
      if (!params.paymentMethodId || !params.stripeCustomerId || !params.stripeAccountId) {
        console.error(`❌ [${requestId}] Faltan datos requeridos para el pago con seña`);
        return {
          success: false,
          message: 'Faltan datos necesarios para procesar el pago',
          error: {
            code: 'missing_data',
            details: 'Se requieren paymentMethodId, stripeCustomerId y stripeAccountId'
          }
        };
      }

      // Si no se proporciona totalAmount, usamos amount como el total
      const totalAmount = params.totalAmount || params.amount;
      const depositPercentage = params.depositPercentage || 30;
      
      // Calculamos el monto exacto de la seña (30% por defecto si no se proporciona amount)
      const depositAmount = params.amount || (totalAmount * (depositPercentage / 100));
      
      console.log(`💰 [${requestId}] Datos calculados para el pago con seña:`, {
        totalAmount,
        depositPercentage,
        depositAmount
      });

      // Realizar la solicitud al endpoint de pago con seña
      const response = await fetch('/api/stripe/process-deposit-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stripePaymentMethodId: params.paymentMethodId,
          amount: depositAmount,
          totalAmount,
          depositPercentage,
          empresaId: params.empresaId,
          description: params.description || 'Pago de seña para reserva',
          stripeCustomerId: params.stripeCustomerId,
          stripeAccountId: params.stripeAccountId,
          off_session: params.off_session !== undefined ? params.off_session : false,
          customerEmail: params.customerEmail || '' // Añadir el email del cliente para facturación
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [${requestId}] Error en respuesta HTTP: ${response.status}`, errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          return {
            success: false,
            message: errorData.error?.message || 'Error al procesar el pago con seña',
            error: errorData.error
          };
        } catch (e) {
          return {
            success: false,
            message: 'Error al procesar el pago con seña',
            error: { code: 'response_error', status: response.status, text: errorText }
          };
        }
      }

      const data = await response.json();
      
      console.log(`✅ [${requestId}] Respuesta de API de pago con seña:`, {
        success: data.success,
        paymentIntentId: data.paymentIntentId,
        status: data.chargeStatus,
        depositAmount: data.depositAmount,
        totalAmount: data.totalAmount,
        depositPercentage: data.depositPercentage
      });

      return {
        success: data.success,
        paymentIntentId: data.paymentIntentId,
        chargeStatus: data.chargeStatus,
        depositAmount: data.depositAmount,
        totalAmount: data.totalAmount,
        depositPercentage: data.depositPercentage,
        message: data.success 
          ? 'Pago de seña procesado correctamente' 
          : (data.error?.message || 'Error al procesar el pago con seña'),
        error: data.error
      };
    } catch (error: any) {
      console.error(`❌ [${requestId}] Error al procesar pago con seña:`, error);
      
      return {
        success: false,
        message: error.message || 'Error inesperado al procesar el pago con seña',
        error: {
          code: 'unexpected_error',
          message: error.message,
          stack: error.stack
        }
      };
    }
  }
}

// Exportar una única instancia del servicio
export const depositPaymentService = new DepositPaymentService(); 