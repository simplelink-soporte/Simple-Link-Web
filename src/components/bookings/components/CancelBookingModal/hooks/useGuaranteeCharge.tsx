import { useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import { useOrganization } from '@/contexts/OrganizationContext';

interface GuaranteeChargeParams {
  bookingId: string;
  amount: number;
  reason?: string;
  empresaId?: string;
  customerEmail?: string;
  customerName?: string;
  country?: string;
  stripeData?: {
    accountId?: string;
    paymentMethodId?: string;
    customerId?: string;
  };
}

interface ChargeResult {
  success: boolean;
  chargeId?: string;
  error?: {
    message: string;
    code?: string;
  };
}

export function useGuaranteeCharge() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { organization } = useOrganization();
  
  /**
   * Procesa un cargo de garantía por no-show
   */
  const processGuaranteeCharge = async (params: GuaranteeChargeParams): Promise<ChargeResult> => {
    const requestId = Math.random().toString(36).substring(2, 15);
    console.log(`🔄 [${requestId}] Iniciando proceso de no-show:`, {
      bookingId: params.bookingId,
      amount: params.amount,
      hasCustomerEmail: Boolean(params.customerEmail),
      country: params.country || organization?.country || 'Mexico',
      timestamp: new Date().toISOString()
    });
    
    setIsProcessing(true);
    
    try {
      // Validar que los datos requeridos estén presentes
      if (!params.bookingId) {
        console.error('❌ Error: falta ID de reserva para el cargo de garantía:', { params });
        return {
          success: false,
          error: { message: 'Falta ID de reserva para el cargo' }
        };
      }

      // Validar específicamente que el monto sea un número válido mayor que cero
      if (!params.amount || isNaN(params.amount) || params.amount <= 0) {
        console.error('❌ Error: monto inválido para el cargo de garantía:', { 
          amount: params.amount,
          isNumber: typeof params.amount === 'number',
          isPositive: params.amount > 0
        });
        return {
          success: false,
          error: { 
            message: 'El monto a cobrar debe ser un número positivo',
            code: 'INVALID_AMOUNT'
          }
        };
      }
      
      // Validar datos críticos de Stripe
      if (!params.stripeData?.accountId || !params.stripeData?.paymentMethodId) {
        console.error('❌ Error: faltan datos críticos de Stripe para el cargo:', {
          hasAccountId: Boolean(params.stripeData?.accountId),
          hasPaymentMethodId: Boolean(params.stripeData?.paymentMethodId),
          timestamp: new Date().toISOString()
        });
        return {
          success: false,
          error: { 
            message: 'Faltan datos críticos de Stripe para procesar el cargo (accountId o paymentMethodId)',
            code: 'MISSING_STRIPE_DATA'
          }
        };
      }
      
      // NUEVA VALIDACIÓN: Asegurar que customerId no esté vacío
      if (!params.stripeData?.customerId) {
        console.error('❌ Error: falta ID de cliente Stripe (customerId) para el cargo:', {
          hasCustomerId: Boolean(params.stripeData?.customerId), 
          actualValue: params.stripeData?.customerId || 'undefined',
          timestamp: new Date().toISOString()
        });
        return {
          success: false,
          error: { 
            message: 'Falta ID de cliente Stripe (customerId) o está vacío. Este dato es requerido para procesar cargos con métodos de pago guardados.',
            code: 'MISSING_CUSTOMER_ID'
          }
        };
      }
      
      // Construir payload para la API
      const payload = {
        bookingId: params.bookingId,
        amount: params.amount,
        reason: params.reason || 'Cargo por garantía de reserva cancelada',
        empresaId: params.empresaId || organization?.id,
        country: params.country || organization?.country || 'Mexico',
        customerEmail: params.customerEmail,
        customerName: params.customerName,
        stripeData: {
          accountId: params.stripeData?.accountId,
          paymentMethodId: params.stripeData?.paymentMethodId,
          customerId: params.stripeData?.customerId
        }
      };
      
      // Crear identificador único para los logs
      const logId = Math.random().toString(36).substring(2, 15);
      
      console.log(`🔄 [${logId}] Iniciando proceso de cargo por no-show:`, {
        bookingId: params.bookingId,
        amount: params.amount,
        empresaId: payload.empresaId,
        stripeAccountIdPrefix: params.stripeData?.accountId ? params.stripeData.accountId.substring(0, 10) + '...' : 'N/A',
        stripePaymentMethodIdPrefix: params.stripeData?.paymentMethodId ? params.stripeData.paymentMethodId.substring(0, 10) + '...' : 'N/A',
        customerIdPrefix: params.stripeData?.customerId ? params.stripeData.customerId.substring(0, 8) + '...' : 'N/A',
        timestamp: new Date().toISOString()
      });
      
      // Mostrar la URL completa para debugging pero ocultando valores sensibles
      console.log(`🌐 Enviando solicitud a:`, {
        url: '/api/stripe/charge-no-show',
        method: 'POST',
        contentType: 'application/json',
        bodySize: JSON.stringify(payload).length,
        timestamp: new Date().toISOString(),
        payload: {
          ...payload,
          stripeData: {
            accountIdPrefix: payload.stripeData.accountId?.substring(0, 8) + '...',
            paymentMethodIdPrefix: payload.stripeData.paymentMethodId?.substring(0, 8) + '...',
            customerIdPrefix: payload.stripeData.customerId?.substring(0, 8) + '...'
          }
        }
      });
      
      // Llamar a la API para procesar el cargo
      const response = await fetch('/api/stripe/charge-no-show', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      console.log('📡 Respuesta recibida de la API:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        timestamp: new Date().toISOString()
      });
      
      // Procesar la respuesta
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        console.error('❌ Error al procesar cargo de garantía:', data.error);
        return {
          success: false,
          error: data.error || {
            message: 'Error al procesar el cargo de garantía',
            code: 'CHARGE_PROCESSING_ERROR'
          }
        };
      }
      
      // Si fue exitoso, retornar los datos
      console.log('✅ Cargo de garantía procesado con éxito:', data.data);
      return {
        success: true,
        chargeId: data.data?.paymentIntentId || data.data?.chargeId
      };
      
    } catch (error: any) {
      console.error('❌ Error inesperado al procesar cargo de garantía:', error);
      return {
        success: false,
        error: {
          message: error.message || 'Error inesperado al procesar el cargo',
          code: 'UNEXPECTED_ERROR'
        }
      };
    } finally {
      setIsProcessing(false);
    }
  };
  
  return {
    isProcessing,
    processGuaranteeCharge
  };
}
