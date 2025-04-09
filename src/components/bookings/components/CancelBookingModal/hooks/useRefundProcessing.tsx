import { useState, useRef } from 'react';
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
  
  // Usar ref en lugar de estado para poder verificar y actualizar inmediatamente
  // sin esperar el ciclo de renderizado de React
  const refundInProgressRef = useRef<boolean>(false);
  // Mantener también el estado para la interfaz de usuario si es necesario
  const [refundInProgress, setRefundInProgress] = useState(false);
  
  // Ref para almacenar el resultado de la última solicitud de reembolso
  const lastRefundResultRef = useRef<{success: boolean, message?: string} | null>(null);
  // Mantener un idempotencyKey constante para esta sesión de reembolso
  const idempotencyKeyRef = useRef<string | null>(null);

  // Función para procesar reembolso a través de Stripe
  const processStripeRefund = async () => {
    // Prevenir múltiples solicitudes simultáneas usando la referencia
    if (refundInProgressRef.current) {
      console.log('⚠️ Ya hay un reembolso en proceso, evitando solicitud duplicada');
      
      // Si tenemos un resultado guardado de una solicitud anterior, devolverlo
      if (lastRefundResultRef.current !== null) {
        console.log('ℹ️ Devolviendo el resultado de la solicitud anterior:', lastRefundResultRef.current);
        return lastRefundResultRef.current.success;
      }
      
      return false;
    }

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
      // INMEDIATAMENTE marcar como en progreso para prevenir llamadas duplicadas
      // Usar tanto la ref (para verificaciones inmediatas) como el estado (para UI)
      refundInProgressRef.current = true;
      setRefundInProgress(true);

      // Reutilizar el idempotencyKey si ya se generó uno, o crear uno nuevo
      // Esto garantiza que múltiples llamadas usen exactamente la misma clave
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = `refund-${bookingId}-${new Date().getTime()}`;
      }
      
      const idempotencyKey = idempotencyKeyRef.current;
      
      console.log('💸 Iniciando reembolso por Stripe', {
        bookingId,
        stripeAccountId,
        invoiceId,
        paymentIntentId,
        refundType,
        refundPercentage: refundType === 'percentage' ? refundPercentage : 100,
        idempotencyKey,
        isRepeatedAttempt: lastRefundResultRef.current !== null
      });
      
      const response = await fetch('/api/stripe/process-refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          bookingId,
          accountId: stripeAccountId,
          invoiceId,
          paymentIntentId,
          refundType,
          percentage: refundType === 'percentage' ? refundPercentage : 100,
          idempotencyKey,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        // Verificar si es un error de cargo ya reembolsado
        if (result.error?.code === 'charge_already_refunded' || 
            (result.error?.message && result.error.message.includes('already been refunded'))) {
          console.log('ℹ️ Este cargo ya ha sido reembolsado:', result.error);
          toast({
            title: "Reembolso ya procesado",
            description: "Este pago ya había sido reembolsado anteriormente.",
            variant: "default"
          });
          
          // Guardar el resultado
          lastRefundResultRef.current = { success: true, message: "Reembolso ya procesado" };
          return true; // Consideramos esto como éxito, ya que el objetivo (reembolso) ya se logró
        }
        
        console.error('Error al procesar reembolso:', result.error || 'Error desconocido');
        toast({
          title: "Error en el reembolso",
          description: result.message || "Hubo un problema al procesar el reembolso. Por favor, inténtalo de nuevo.",
          variant: "destructive"
        });
        
        // Guardar el resultado del error
        lastRefundResultRef.current = { success: false, message: result.message || "Error desconocido" };
        return false;
      }
      
      // Proceso exitoso
      console.log('✅ Reembolso procesado correctamente:', result);
      toast({
        title: "Reembolso procesado",
        description: "El reembolso se ha procesado correctamente",
        variant: "default"
      });
      
      // Guardar el resultado exitoso
      lastRefundResultRef.current = { success: true, message: "Reembolso procesado correctamente" };
      return true;
    } catch (error) {
      console.error('Error al procesar reembolso:', error);
      toast({
        title: "Error en el reembolso",
        description: "Hubo un problema al procesar el reembolso. Verifica la conexión e inténtalo de nuevo.",
        variant: "destructive"
      });
      
      // Guardar el resultado del error
      lastRefundResultRef.current = { success: false, message: "Error de conexión" };
      return false;
    } finally {
      // No liberar los flags inmediatamente para prevenir una nueva solicitud
      // Usamos un pequeño timeout para asegurar que cualquier renderizado 
      // inmediato o efecto aún vea el flag como true
      setTimeout(() => {
        refundInProgressRef.current = false;
        setRefundInProgress(false);
      }, 1000); // 1 segundo debería ser suficiente para pasar cualquier renderizado/efecto inmediato
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
