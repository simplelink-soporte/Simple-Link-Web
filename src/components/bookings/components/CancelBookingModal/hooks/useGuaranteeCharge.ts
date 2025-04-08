import { useState } from 'react';
import { toast } from '@/components/ui/use-toast';

interface GuaranteeChargeParams {
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

interface GuaranteeChargeResult {
  success: boolean;
  chargeId?: string;
  error?: any;
}

export function useGuaranteeCharge() {
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Process a guarantee charge through Stripe
   */
  const processGuaranteeCharge = async (params: GuaranteeChargeParams): Promise<GuaranteeChargeResult> => {
    setIsProcessing(true);
    
    try {
      // Validar que los datos requeridos estén presentes
      if (!params.bookingId || !params.amount) {
        console.error('❌ Error: faltan datos requeridos para el cargo de garantía:', { params });
        return {
          success: false,
          error: { message: 'Faltan datos requeridos para el cargo (ID o monto)' }
        };
      }
      
      console.log('💳 Procesando cargo de garantía:', {
        bookingId: params.bookingId,
        amount: params.amount,
        hasStripeData: !!params.stripeData,
        hasAccountId: params.stripeData?.accountId ? 'Sí' : 'No',
        hasPaymentMethodId: params.stripeData?.paymentMethodId ? 'Sí' : 'No',
        timestamp: new Date().toISOString()
      });
      
      // Realizar la petición a la API
      const response = await fetch('/api/stripe/charge-no-show', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      const result = await response.json();

      if (!result.success) {
        console.error('❌ Error al procesar cargo de garantía:', result.error);
        toast({
          title: "Error al procesar el cargo",
          description: result.error?.message || "No se pudo procesar el cargo de garantía",
          variant: "destructive"
        });
        
        return { 
          success: false, 
          error: result.error 
        };
      }

      console.log('✅ Cargo de garantía procesado exitosamente:', result);
      return {
        success: true,
        chargeId: result.chargeId || result.paymentIntentId
      };
    } catch (error) {
      console.error('❌ Error en la comunicación con API de cargo:', error);
      toast({
        title: "Error en la comunicación",
        description: "No se pudo procesar el cargo de garantía. Intente nuevamente.",
        variant: "destructive"
      });
      
      return { 
        success: false, 
        error 
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
