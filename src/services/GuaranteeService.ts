/**
 * Service for handling booking guarantee operations
 */

export interface GuaranteeChargeParams {
  bookingId: string;
  amount: number;
  reason?: string;
  empresaId?: string;
  customerEmail?: string;
  customerName?: string;
  country?: string;
  stripeData?: {
    accountId: string;
    paymentMethodId: string;
    customerId?: string;
  };
}

export interface GuaranteeChargeResult {
  success: boolean;
  chargeId?: string;
  paymentIntentId?: string;
  error?: any;
}

export class GuaranteeService {
  /**
   * Process a guarantee charge through the API
   */
  static async processCharge(params: GuaranteeChargeParams): Promise<GuaranteeChargeResult> {
    try {
      // Validar que tenemos los datos mínimos necesarios
      if (!params.bookingId || !params.amount) {
        return {
          success: false,
          error: { message: "Faltan datos requeridos (ID de reserva o monto)" }
        };
      }

      // Realizar la petición a la API
      const response = await fetch('/api/stripe/charge-no-show', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        // Si el servidor responde con error (no 2xx)
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error || { 
            message: `Error en la respuesta del servidor: ${response.status} ${response.statusText}` 
          }
        };
      }

      // Procesar la respuesta exitosa
      const result = await response.json();
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || { message: "Error desconocido al procesar el cargo" }
        };
      }

      return {
        success: true,
        chargeId: result.chargeId,
        paymentIntentId: result.paymentIntentId
      };
    } catch (error) {
      // Capturar errores de red o de procesamiento
      console.error('Error al procesar cargo de garantía:', error);
      return {
        success: false,
        error: { 
          message: error instanceof Error ? error.message : "Error de conexión al procesar el cargo" 
        }
      };
    }
  }
}
