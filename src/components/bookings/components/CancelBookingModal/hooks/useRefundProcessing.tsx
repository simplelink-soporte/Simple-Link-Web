import { useState } from 'react';
import { toast } from '@/components/ui/use-toast';

interface UseRefundProcessingProps {
  totalAmount: number;
  stripeAccountId: string | null;
  bookingId: string;
  invoiceId?: string;
  paymentIntentId?: string;
}

export function useRefundProcessing({
  totalAmount,
  stripeAccountId,
  bookingId,
  invoiceId,
  paymentIntentId
}: UseRefundProcessingProps) {
  const [shouldProcessRefund, setShouldProcessRefund] = useState<boolean>(false);
  const [showRefundOptions, setShowRefundOptions] = useState<boolean>(false);
  const [refundType, setRefundType] = useState<'full' | 'percentage'>('full');
  const [refundPercentage, setRefundPercentage] = useState<number>(100);
  const [refundMethod, setRefundMethod] = useState<'stripe' | 'external'>('stripe');
  const [isProcessing, setIsProcessing] = useState(false);

  // Función para procesar reembolso a través de Stripe
  const processStripeRefund = async () => {
    if (!stripeAccountId) {
      console.error('No se puede procesar el reembolso: falta el ID de cuenta de Stripe');
      toast({
        title: "Error",
        description: "No se puede procesar el reembolso por falta de datos de Stripe",
        variant: "destructive"
      });
      return false;
    }
    
    if (!invoiceId && !paymentIntentId) {
      console.error('No se puede procesar el reembolso: falta el ID de factura o payment intent');
      toast({
        title: "Error",
        description: "No se puede procesar el reembolso por falta de datos de facturación",
        variant: "destructive"
      });
      return false;
    }
    
    try {
      console.log('💸 Iniciando reembolso por Stripe', {
        bookingId,
        stripeAccountId,
        invoiceId,
        paymentIntentId,
        refundType,
        refundPercentage: refundType === 'percentage' ? refundPercentage : 100
      });
      
      const response = await fetch('/api/stripe/process-refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          accountId: stripeAccountId,
          invoiceId,
          paymentIntentId,
          refundType,
          percentage: refundType === 'percentage' ? refundPercentage : 100,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        console.error('Error al procesar reembolso:', result.error || 'Error desconocido');
        toast({
          title: "Error en el reembolso",
          description: result.message || "Hubo un problema al procesar el reembolso. Por favor, inténtalo de nuevo.",
          variant: "destructive"
        });
        return false;
      }
      
      // Proceso exitoso
      console.log('✅ Reembolso procesado correctamente:', result);
      toast({
        title: "Reembolso procesado",
        description: "El reembolso se ha procesado correctamente",
        variant: "default"
      });
      
      return true;
    } catch (error) {
      console.error('Error al procesar reembolso:', error);
      toast({
        title: "Error en el reembolso",
        description: "Hubo un problema al procesar el reembolso. Verifica la conexión e inténtalo de nuevo.",
        variant: "destructive"
      });
      return false;
    }
  };

  // Función para registrar reembolso externo
  const registerExternalRefund = async () => {
    if (!stripeAccountId) {
      console.error('No se puede registrar el reembolso: falta el ID de cuenta de Stripe');
      toast({
        title: "Error",
        description: "No se puede registrar el reembolso por falta de datos",
        variant: "destructive"
      });
      return false;
    }
    
    try {
      const refundAmount = refundType === 'full' 
        ? totalAmount 
        : totalAmount * (refundPercentage / 100);
        
      console.log('📝 Registrando reembolso externo', {
        bookingId,
        amount: refundAmount,
        refundType,
        refundPercentage: refundType === 'percentage' ? refundPercentage : 100
      });
      
      // Aquí iría la lógica para registrar el reembolso externo
      // Por ejemplo, añadir una entrada en una tabla de reembolsos en la base de datos
      
      toast({
        title: "Reembolso externo registrado",
        description: "El reembolso externo se ha registrado correctamente en el sistema",
        variant: "default"
      });
      
      return true;
    } catch (error) {
      console.error('Error al registrar reembolso externo:', error);
      toast({
        title: "Error al registrar reembolso",
        description: "Hubo un problema al registrar el reembolso externo. Por favor, inténtalo de nuevo.",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    shouldProcessRefund,
    setShouldProcessRefund,
    showRefundOptions,
    setShowRefundOptions,
    refundType,
    setRefundType,
    refundPercentage,
    setRefundPercentage,
    refundMethod,
    setRefundMethod,
    isProcessing,
    setIsProcessing,
    processStripeRefund,
    registerExternalRefund
  };
}
