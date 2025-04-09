import { useState, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { toast } from '@/components/ui/use-toast'
import { useOrganization } from '@/contexts/OrganizationContext'
import { IconAlertCircle, IconLoader } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { formatAmountWithoutCurrency } from '@/lib/currency-utils'
import { supabase } from '@/lib/supabase'
import { GuaranteeService } from '@/services/GuaranteeService'
import { useGuaranteeCharge } from './hooks/useGuaranteeCharge'

// Hooks personalizados
import { useStripeConnection } from './hooks/useStripeConnection'
import { useInvoiceData } from './hooks/useInvoiceData'
import { useStripeRefund } from './hooks/useStripeRefund'
import { useRefundProcessing } from './hooks/useRefundProcessing'

// Componentes
import { GuaranteeSection } from './components/GuaranteeSection'
import { RefundSection } from './components/RefundSection'
import { CancellationReasonField } from './components/CancellationReasonField'
import { ModalFooter } from './components/ModalFooter'
import { RefundOptions } from './RefundOptions'

// Nuevo contexto de reembolso
import { useRefundContext, RefundProvider } from './context/RefundContext';

interface CancelBookingModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (params: { 
    reason?: string; 
    shouldCharge?: boolean;
    refundAction?: {
      type: 'full' | 'percentage';
      percentage?: number; // Valor entre 0 y 100
      processMethod: 'stripe' | 'external';
      amount?: number;
      refundId?: string;
    };
  }) => void
  hasGuarantee?: boolean
  totalAmount?: number
  guaranteePercentage?: number
  booking: {
    id: string
    stripe_payment_method_id?: string
    customer_name?: string
    customer_email?: string
    customer_id?: string
    payment_type?: string // 'full', 'deposit', 'guarantee'...
  }
}

interface CancelBookingParams {
  reason?: string;
  refundAction?: {
    type: 'full' | 'percentage';
    percentage?: number;
    processMethod: 'stripe' | 'external';
    amount?: number;
    refundId?: string;
  };
  chargeWasProcessed?: boolean;
  chargeAmount?: number;
  guaranteeChargeId?: string;
  [key: string]: any; // Para permitir propiedades adicionales
}

export function CancelBookingModal({
  isOpen,
  onClose,
  onConfirm,
  hasGuarantee = false,
  totalAmount = 0,
  guaranteePercentage,
  booking
}: CancelBookingModalProps) {
  const { organization } = useOrganization();
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // ESTADO UNIFICADO para shouldCharge - Esto es crítico para que funcione el cobro
  const [shouldCharge, setShouldCharge] = useState(hasGuarantee || false);

  // Mostrar la razón seleccionada en los logs
  useEffect(() => {
    if (reason) {
      console.log('🔖 Razón de cancelación seleccionada:', reason);
    }
  }, [reason]);
  
  // Depuración: Cada vez que shouldCharge cambia, lo registramos
  useEffect(() => {
    console.log('💲 Estado de cobro de garantía actualizado (COMPONENTE PRINCIPAL):', {
      shouldCharge,
      hasGuarantee,
      timestamp: new Date().toISOString()
    });
  }, [shouldCharge, hasGuarantee]);
  
  // Función de manejo de cambio de shouldCharge - Se pasará al componente hijo
  const handleShouldChargeChange = useCallback((value: boolean) => {
    console.log('🔄 Cambiando shouldCharge a:', value, 'en CancelBookingModal');
    setShouldCharge(value);
  }, []);

  // Usamos el porcentaje de garantía específico de la reserva (tabla bookings) o el valor predeterminado si no está disponible
  const effectiveGuaranteePercentage = guaranteePercentage || 40;
  
  // Log para verificar el porcentaje de garantía que se está utilizando
  useEffect(() => {
    if (isOpen && hasGuarantee) {
      console.log('🔍 Porcentaje de garantía:', {
        bookingId: booking?.id,
        guaranteePercentage: guaranteePercentage, // Valor específico de la reserva
        effectiveGuaranteePercentage, // Valor que se va a utilizar
        usandoValorPredeterminado: !guaranteePercentage
      });
    }
  }, [isOpen, booking?.id, guaranteePercentage, effectiveGuaranteePercentage, hasGuarantee]);
  
  // Hook para el cobro de garantía
  const { processGuaranteeCharge } = useGuaranteeCharge();
  
  // Hook para obtener la conexión con Stripe
  const {
    stripeEnabled,
    isLoadingStripe,
    stripePaymentMethodId,
    stripeAccountId,
    stripeCustomerId,
    customerDetails: guaranteeCustomerDetails
  } = useStripeConnection({ isOpen, booking, hasGuarantee });
  
  // Hook especializado para reembolsos
  const {
    isLoading: isLoadingRefund,
    refundData
  } = useStripeRefund({
    isOpen,
    booking
  });
  
  // Extraer todos los IDs importantes para el procesamiento de reembolsos
  const invoiceData = useMemo(() => {
    // Extraer los datos de factura necesarios para el reembolso
    let invoiceId: string | undefined = undefined;
    let paymentIntentId: string | undefined = undefined;
    
    if (refundData?.invoiceData?.invoices?.[0]) {
      const invoice = refundData.invoiceData.invoices[0];
      const metadata = invoice.metadata || {};
      
      // Extraer el invoiceId
      invoiceId = invoice.id;
      
      // Extraer el paymentIntentId (buscando en múltiples ubicaciones posibles)
      paymentIntentId = invoice.payment_intent || 
                       metadata.payment_intent_id || 
                       undefined;
                       
      console.log('📑 Datos de factura extraídos para reembolso:', {
        invoice_id: invoiceId,
        payment_intent_id: paymentIntentId,
        metadata_keys: Object.keys(metadata),
        has_invoice_id: Boolean(invoiceId),
        has_payment_intent: Boolean(paymentIntentId),
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('❌ No se encontraron datos de factura para reembolso');
    }
    
    return { invoiceId, paymentIntentId };
  }, [refundData]);
  
  const {
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
    isProcessing: isProcessingRefund,
    setIsProcessing: setIsProcessingRefund,
    processStripeRefund,
    registerExternalRefund
  } = useRefundProcessing({
    totalAmount,
    stripeAccountId: refundData?.stripeAccountId || stripeAccountId || null,
    bookingId: booking?.id || '',
    invoiceId: invoiceData.invoiceId,
    paymentIntentId: invoiceData.paymentIntentId
  });

  /**
   * Procesa el cargo de garantía si es necesario
   * @returns Objeto con resultado del cargo de garantía
   */
  const processGuaranteeChargeIfNeeded = async () => {
    // Verificación adicional con logs detallados
    console.log('🧐 Verificando si se debe procesar cargo de garantía:', {
      hasGuarantee,
      shouldCharge,
      stripeEnabled,
      timestamp: new Date().toISOString()
    });
    
    // Si no hay garantía o no se debe cobrar, no es necesario el cargo
    if (!hasGuarantee || !shouldCharge) {
      console.log('🚫 No es necesario procesar cargo de garantía:', {
        hasGuarantee,
        shouldCharge,
        timestamp: new Date().toISOString()
      });
      return { success: true, chargeProcessed: false };
    }

    // Verificar la conexión con Stripe
    if (!stripeEnabled) {
      console.log('🚫 Stripe no está habilitado para el cobro');
      return { success: false, error: { message: 'Stripe no está habilitado' } };
    }

    // Calcular el monto a cargar basado en el porcentaje específico de garantía
    const chargeAmount = totalAmount * (effectiveGuaranteePercentage / 100);
    
    console.log('💳 Iniciando proceso de cargo por no-show:', {
      bookingId: booking.id,
      guaranteePercentage: effectiveGuaranteePercentage,
      amount: chargeAmount,
      stripeEnabled,
      hasPaymentMethod: Boolean(stripePaymentMethodId),
      timestamp: new Date().toISOString()
    });

    // Preparar los datos para el servicio de cargo
    const chargeParams = {
      bookingId: booking.id,
      amount: chargeAmount,
      reason,
      empresaId: organization?.id,
      customerEmail: guaranteeCustomerDetails?.email || booking.customer_email,
      customerName: guaranteeCustomerDetails?.name || booking.customer_name,
      country: organization?.country || 'MX', // Valor predeterminado
    };

    // Si tenemos los datos de Stripe, incluirlos para el procesamiento
    if (stripeAccountId && stripePaymentMethodId) {
      console.log('✅ Preparando datos de Stripe para el cargo:', {
        hasAccountId: Boolean(stripeAccountId),
        hasPaymentMethodId: Boolean(stripePaymentMethodId),
        hasCustomerId: Boolean(stripeCustomerId),
      });

      Object.assign(chargeParams, {
        stripeData: {
          accountId: stripeAccountId,
          paymentMethodId: stripePaymentMethodId,
          customerId: stripeCustomerId
        }
      });
    } else {
      console.error('❌ Faltan datos de Stripe para procesar el cargo');
      return { success: false, error: { message: 'Faltan datos de Stripe para el cargo' } };
    }

    // Utilizar el hook para procesar el cargo
    try {
      const result = await processGuaranteeCharge(chargeParams);

      if (!result.success) {
        // Si el resultado no fue exitoso, enviar una alerta al usuario
        console.error('❌ Error al procesar el cargo de garantía:', result.error);
        
        // Mostrar modal de confirmación para decidir si continuar con la cancelación
        // a pesar de que falló el cobro de garantía
        const shouldContinue = window.confirm(
          `No se pudo procesar el cargo de garantía. ¿Desea continuar con la cancelación sin procesar el cargo?\n\nError: ${result.error?.message || 'Error desconocido'}`
        );
        
        if (!shouldContinue) {
          console.log('🛑 Usuario decidió no continuar con la cancelación');
          return { success: false, error: { message: 'Cancelación abortada por el usuario' } };
        }
        
        console.log('⚠️ Usuario decidió continuar con la cancelación a pesar del error en el cargo');
        // Retornamos success: false para indicar que el cargo falló, pero con userConfirmedContinue: true
        return { 
          success: false, 
          error: result.error,
          userConfirmedContinue: true // Flag especial para permitir continuar con la cancelación
        };
      }
      
      // Si llegamos aquí, el cargo fue exitoso
      console.log('✅ Cargo de garantía procesado exitosamente:', result);
      return { success: true, chargeProcessed: true, chargeId: result.chargeId };
      
    } catch (error: any) {
      console.error('❌ Error inesperado al procesar el cargo de garantía:', error);
      
      // Mostrar confirmación al usuario
      const shouldContinue = window.confirm(
        `Ocurrió un error inesperado al procesar el cargo de garantía. ¿Desea continuar con la cancelación sin procesar el cargo?\n\nError: ${error.message || 'Error desconocido'}`
      );
      
      if (!shouldContinue) {
        return { success: false, error: { message: 'Cancelación abortada por el usuario' } };
      }
      
      // Si el usuario confirma, permitimos continuar a pesar del error
      return { 
        success: false, 
        error: { message: error.message || 'Error desconocido' },
        userConfirmedContinue: true
      };
    }
  };

  const handleCancelBooking = async (cancelParams: CancelBookingParams = {}) => {
    setIsProcessing(true);
    
    try {
      // Log importante para depuración
      console.log('🚀 Iniciando proceso de cancelación en CancelBookingModal:', {
        hasGuarantee,
        shouldCharge, // ESTE ES EL ESTADO CLAVE QUE DEBE SER CORRECTO
        stripeEnabled,
        params: cancelParams,
        timestamp: new Date().toISOString()
      });
      
      // Asegurarnos de que cancelParams tenga al menos la propiedad reason
      cancelParams = {
        reason: '',
        ...cancelParams
      };
      
      let chargeWasProcessed = false;
      
      // Paso 1: Procesar cargo de garantía si es necesario
      if (hasGuarantee && shouldCharge && stripeEnabled) {
        console.log('🔄 Iniciando flujo de cobro de garantía:', {
          booking_id: booking.id,
          stripe_enabled: stripeEnabled,
          has_payment_method: Boolean(stripePaymentMethodId),
          has_account_id: Boolean(stripeAccountId),
          timestamp: new Date().toISOString()
        });
        
        const guaranteeResult = await processGuaranteeChargeIfNeeded();
        
        // Verificar el resultado del cargo de garantía
        if (!guaranteeResult.success && !guaranteeResult.userConfirmedContinue) {
          // Si falla el cargo de garantía y el usuario no confirmó continuar, detenemos el proceso
          console.error('❌ Cancelación abortada: el cargo de garantía falló');
          toast({
            title: "Error de procesamiento",
            description: "No se pudo procesar el cargo de garantía. La reserva no ha sido cancelada.",
            variant: "destructive"
          });
          setIsProcessing(false);
          return;
        }
        
        // Registrar si se procesó un cargo para la notificación final
        chargeWasProcessed = guaranteeResult.chargeProcessed || false;
        
        // Si se procesó el cargo, incluirlo en los parámetros de cancelación
        if (chargeWasProcessed && guaranteeResult.chargeId) {
          cancelParams.guaranteeChargeId = guaranteeResult.chargeId;
          console.log('💵 Cargo de garantía registrado en cancelación:', {
            charge_id: guaranteeResult.chargeId,
            timestamp: new Date().toISOString()
          });
        } else {
          console.warn('⚠️ No se procesó el cargo de garantía a pesar de que shouldCharge=true:', {
            has_guarantee: hasGuarantee,
            should_charge: shouldCharge,
            stripe_enabled: stripeEnabled,
            payment_method_id: Boolean(stripePaymentMethodId),
            account_id: Boolean(stripeAccountId)
          });
        }
      }
      
      // Si debe procesar reembolso
      if (shouldProcessRefund && !hasGuarantee && refundData?.hasValidInvoice) {
        // Procesamos el reembolso según el método seleccionado
        let refundResult;
        const refundAction = {
          type: refundType,
          percentage: refundType === 'percentage' ? refundPercentage : undefined,
          processMethod: refundMethod
        };
        
        try {
          // Según el método seleccionado, procesamos de manera diferente
          if (refundMethod === 'stripe') {
            console.log('💳 Procesando reembolso vía Stripe:', {
              paymentType: booking?.payment_type,
              fullRefund: refundType === 'full',
              percentage: refundType === 'percentage' ? refundPercentage : 100,
              hasPaymentIntent: Boolean(refundData.invoiceData.paymentIntent),
              hasChargeId: Boolean(refundData.invoiceData.chargeId),
              paymentIntentPrefix: refundData.invoiceData.paymentIntent ? refundData.invoiceData.paymentIntent.substring(0, 10) + '...' : 'N/A',
              chargeIdPrefix: refundData.invoiceData.chargeId ? refundData.invoiceData.chargeId.substring(0, 10) + '...' : 'N/A',
              stripeAccountId: refundData.stripeAccountId?.substring(0, 5) + '...',
              timestamp: new Date().toISOString()
            });
            
            // Procesar reembolso vía Stripe (asegúrate de que esta función exista o créala)
            refundResult = await processStripeRefund();
          } else {
            // Registrar reembolso externo (sin parámetros)
            console.log('📝 Registrando reembolso externo:', {
              fullRefund: refundType === 'full',
              percentage: refundType === 'percentage' ? refundPercentage : 100
            });
            refundResult = await registerExternalRefund();
          }
          
          // Si el reembolso fue exitoso, incluimos la info en los parámetros
          // (el resultado es un booleano, true significa éxito)
          if (refundResult === true) {
            console.log('✅ Reembolso externo registrado exitosamente');
            cancelParams.refundAction = refundAction;
          }
        } catch (refundError) {
          console.error('🔴 Error al procesar reembolso:', refundError);
          toast({
            variant: 'destructive',
            title: 'Error al procesar el reembolso',
            description: 'Ha ocurrido un error al procesar el reembolso. Intente nuevamente.'
          });
          setIsProcessing(false);
          return;
        }
      }
      
      // Realizar la cancelación a través de Supabase RPC directamente
      try {
        console.log('🔐 Ejecutando RPC cancel_booking_v1 con parámetros:', {
          booking_id: booking.id,
          reason,
          should_charge: false, // El cargo ya se procesó anteriormente
          charge_was_processed: chargeWasProcessed,
          timestamp: new Date().toISOString()
        });

        // Llamar a la función RPC con los parámetros correctos
        const { data, error } = await supabase.rpc('cancel_booking_v1', {
          p_booking_id: booking.id,
          p_reason: reason,
          p_should_charge: false, // El cargo ya se procesó si era necesario
          // Si tenemos datos de Stripe, los incluimos como opcional
          ...(stripePaymentMethodId ? { p_stripe_payment_method_id: stripePaymentMethodId } : {}),
          // Como p_charge_amount y p_stripe_payment_intent_id son requeridos, enviamos valores nulos o default
          p_charge_amount: 0, // No usar este valor para el cargo, ya se procesó anteriormente
          p_stripe_payment_intent_id: null
        });

        if (error) {
          console.error('❌ Error en RPC cancel_booking_v1:', error);
          throw error;
        }

        console.log('✅ Reserva cancelada exitosamente:', data);

        // Enviamos la acción de cancelación al componente padre
        onConfirm({
          ...cancelParams,
          chargeWasProcessed,
          chargeAmount: chargeWasProcessed ? (totalAmount * (effectiveGuaranteePercentage / 100)) : 0
        } as CancelBookingParams);
        
        // Mostrar mensaje de éxito
        toast({
          title: "Reserva cancelada",
          description: (hasGuarantee && shouldCharge && chargeWasProcessed)
            ? "La reserva ha sido cancelada y se ha procesado el cargo de garantía"
            : "La reserva ha sido cancelada exitosamente"
        });
        
        // Cerrar modal
        onClose();
      } catch (rpcError) {
        console.error('❌ Error al ejecutar RPC para cancelar la reserva:', rpcError);
        toast({
          variant: 'destructive',
          title: 'Error al cancelar la reserva',
          description: 'Ha ocurrido un error al procesar la cancelación en el servidor. Intente nuevamente.'
        });
        setIsProcessing(false);
        return;
      }
      
    } catch (error) {
      console.error('🔴 Error al cancelar reserva:', error);
      toast({
        variant: 'destructive',
        title: 'Error al cancelar la reserva',
        description: 'Ha ocurrido un error al procesar la cancelación. Intente nuevamente.'
      });
      setIsProcessing(false);
    }
  };
  
  // Verificamos si hay pagos disponibles para reembolsar
  const canProcessRefund = useMemo(() => {
    // Si es un pago con garantía, no aplica reembolso
    if (hasGuarantee) return false;
    
    // NUEVA CONDICIÓN: Si el tipo de pago es 'guarantee', tampoco aplica reembolso
    if (booking?.payment_type === 'guarantee') {
      console.log('ℹ️ No se puede reembolsar: reserva con tipo de pago "guarantee"');
      return false;
    }
    
    // Información de depuración sobre el estado actual
    console.log('🟢 Verificando si se puede procesar reembolso:', {
      paymentType: booking?.payment_type,
      hasInvoice: refundData?.invoiceData?.hasInvoice || false,
      hasValidInvoice: refundData?.hasValidInvoice || false,
      hasPaymentIntent: Boolean(refundData?.invoiceData?.paymentIntent),
      hasChargeId: Boolean(refundData?.invoiceData?.chargeId),
      stripeAccountId: refundData?.stripeAccountId ? (refundData.stripeAccountId.substring(0, 5) + '...') : 'N/A',
      isReady: refundData?.isReady || false,
      timestamp: new Date().toISOString()
    });
    
    // Si no está listo el hook de reembolso o está cargando, no podemos procesar
    if (isLoadingRefund || !refundData) {
      return false;
    }
    
    // SOLUCIÓN: Si hay una factura válida asociada, debemos permitir el reembolso
    // Independientemente del estado isReady, que puede ser false por otras razones
    if (refundData.hasValidInvoice) {
      console.log('✅ Factura válida encontrada, habilitando opciones de reembolso');
      return true;
    }
    
    // Si no hay factura válida, no se puede reembolsar
    if (!refundData.hasValidInvoice) {
      console.log('ℹ️ No se puede reembolsar: no hay factura válida asociada');
      return false;
    }
    
    // Si es tipo 'booking' o 'full', se permite reembolso si tiene factura válida
    if (['booking', 'full'].includes(booking?.payment_type || '')) {
      if (refundData.hasValidInvoice) {
        console.log('✅ Se puede procesar reembolso para reserva:', {
          paymentType: booking?.payment_type,
          hasValidInvoice: refundData.hasValidInvoice,
          hasPaymentIntent: Boolean(refundData.invoiceData.paymentIntent),
          hasChargeId: Boolean(refundData.invoiceData.chargeId)
        });
        return true;
      }
    }
    
    return false;
  }, [hasGuarantee, refundData, isLoadingRefund, booking?.payment_type]);

  // Si el modal no está abierto, no renderizamos nada
  if (!isOpen) return null;

  // Wrapper para usar el proveedor de contexto
  return (
    <RefundProvider
      booking={booking}
      isOpen={isOpen}
      totalAmount={totalAmount}
      stripeAccountId={stripeAccountId}
    >
      <CancelBookingModalContent
        booking={booking}
        isOpen={isOpen}
        onClose={onClose}
        onConfirm={handleCancelBooking} // Pasamos la función handleCancelBooking directamente
        hasGuarantee={hasGuarantee}
        totalAmount={totalAmount}
        guaranteePercentage={effectiveGuaranteePercentage}
        canProcessRefund={canProcessRefund}
        isLoadingRefund={isLoadingRefund}
        refundData={refundData}
        invoiceId={invoiceData.invoiceId}
        shouldProcessRefund={shouldProcessRefund}
        setShouldProcessRefund={setShouldProcessRefund}
        showRefundOptions={showRefundOptions}
        setShowRefundOptions={setShowRefundOptions}
        refundType={refundType}
        setRefundType={setRefundType}
        refundPercentage={refundPercentage}
        setRefundPercentage={setRefundPercentage}
        refundMethod={refundMethod}
        setRefundMethod={setRefundMethod}
        isProcessing={isProcessing}
        setIsProcessing={setIsProcessing}
        processStripeRefund={processStripeRefund}
        registerExternalRefund={registerExternalRefund}
        shouldCharge={shouldCharge}
        setShouldCharge={handleShouldChargeChange}
      />
    </RefundProvider>
  );
}

// Definir una interfaz específica para el componente CancelBookingModalContent para evitar duplicaciones
interface CancelBookingModalContentProps {
  booking: {
    id: string;
    stripe_payment_method_id?: string;
    customer_name?: string;
    customer_email?: string;
    customer_id?: string;
    payment_type?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (params: CancelBookingParams) => void;
  hasGuarantee: boolean;
  totalAmount: number;
  guaranteePercentage: number;
  canProcessRefund: boolean;
  isLoadingRefund: boolean;
  refundData: any;
  invoiceId: string | undefined;
  shouldProcessRefund: boolean;
  setShouldProcessRefund: (shouldProcess: boolean) => void;
  showRefundOptions: boolean;
  setShowRefundOptions: (show: boolean) => void;
  refundType: string;
  setRefundType: (type: string) => void;
  refundPercentage: number;
  setRefundPercentage: (percentage: number) => void;
  refundMethod: string;
  setRefundMethod: (method: string) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  processStripeRefund: () => Promise<boolean>;
  registerExternalRefund: () => Promise<boolean>;
  shouldCharge: boolean;
  setShouldCharge: (shouldCharge: boolean) => void;
}

// Componente de contenido que utiliza el contexto de reembolso
function CancelBookingModalContent({
  booking,
  isOpen,
  onClose,
  onConfirm,
  hasGuarantee,
  totalAmount,
  guaranteePercentage,
  canProcessRefund,
  isLoadingRefund,
  refundData,
  invoiceId,
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
  registerExternalRefund,
  shouldCharge,
  setShouldCharge
}: CancelBookingModalContentProps) {
  // Hooks para manejar la conexión Stripe
  const {
    stripeEnabled,
    isLoadingStripe,
    stripePaymentMethodId,
    stripeAccountId,
    stripeCustomerId,
    customerDetails
  } = useStripeConnection({ isOpen, booking, hasGuarantee });

  // Usamos el porcentaje de garantía recibido directamente
  const effectiveGuaranteePercentage = guaranteePercentage || 25; // Valor por defecto 25%
  
  // Extraer la función para verificar si está lista para procesar un cargo
  const isReadyForGuaranteeCharge = () => {
    if (!hasGuarantee || !stripeEnabled) return false;
    if (!stripeAccountId || !stripePaymentMethodId) return false;
    if (totalAmount <= 0 || effectiveGuaranteePercentage <= 0) return false;
    return true;
  };

  // Función para depurar el estado actual
  const logChargeStatus = () => {
    console.log('🧪 Debug estado de cobro de garantía:', {
      shouldCharge,
      hasGuarantee,
      stripeEnabled,
      hasStripePaymentMethod: Boolean(stripePaymentMethodId),
      hasStripeAccount: Boolean(stripeAccountId),
      totalAmount,
      guaranteePercentage: effectiveGuaranteePercentage,
      calculatedAmount: totalAmount * (effectiveGuaranteePercentage / 100),
      ready: isReadyForGuaranteeCharge(),
      timestamp: new Date().toISOString()
    });
  };

  // Llamar a logChargeStatus cuando cambian las dependencias relevantes
  useEffect(() => {
    if (isOpen && hasGuarantee) {
      logChargeStatus();
    }
  }, [isOpen, hasGuarantee, shouldCharge, stripeEnabled, stripePaymentMethodId, 
      stripeAccountId, totalAmount, effectiveGuaranteePercentage]);
      
  // Actualiza la caja de verificación cuando cambia
  const handleShouldChargeChange = (value: boolean) => {
    console.log('🔄 Cambiando shouldCharge a:', value);
    setShouldCharge(value);
  };

  // Log inicial de props y estado para depuración
  console.log('🔍 CancelBookingModal - Props y Contexto:', {
    booking_id: booking?.id,
    has_invoice_id: Boolean(invoiceId),
    invoice_id: invoiceId,
    has_payment_intent_id: Boolean(refundData?.invoiceData?.paymentIntent),
    payment_intent_id: refundData?.invoiceData?.paymentIntent,
    has_stripe_account: Boolean(stripeAccountId),
    can_process_refund: shouldProcessRefund && refundData?.hasValidInvoice,
    timestamp: new Date().toISOString()
  });

  // Función para cerrar el modal
  function handleClose() {
    // Prevenir el cierre si hay un proceso activo
    if (isProcessing || isLoadingRefund) {
      return;
    }
    
    // Reiniciar estados al cerrar
    setShouldProcessRefund(false);
    setShowRefundOptions(false);
    onClose();
  }

  // IMPORTANTE: Esta función ahora PREPARA los datos para handleCancelBooking
  // pero NO ejecuta la cancelación directamente
  async function prepareRefundData() {
    // Procesamiento de reembolso
    let refundSuccess = true;
    let refundAmount = 0;
    let refundId = '';
    let refundParams: any = undefined;
    
    // Si se debe procesar un reembolso, intentarlo primero
    if (shouldProcessRefund) {
      setIsProcessing(true);
      
      // Calcular el monto basado en el tipo de reembolso
      refundAmount = refundType === 'full' 
        ? totalAmount 
        : totalAmount * (refundPercentage / 100);
        
      if (refundMethod === 'stripe') {
        refundSuccess = await processStripeRefund();
        // Intentar obtener el ID del reembolso si está disponible en la respuesta
        try {
          const refundResponse = await fetch(`/api/bookings/${booking.id}/refund-data`, {
            method: 'GET'
          });
          if (refundResponse.ok) {
            const data = await refundResponse.json();
            if (data.refundId) {
              refundId = data.refundId;
            }
          }
        } catch (error) {
          console.error('Error al obtener detalles del reembolso:', error);
        }
      } else {
        refundSuccess = await registerExternalRefund();
      }
      
      setIsProcessing(false);
      
      // Si el reembolso falló, detener el proceso
      if (!refundSuccess) {
        return null;
      }
      
      // Crear los parámetros de reembolso
      refundParams = {
        type: refundType,
        percentage: refundType === 'percentage' ? refundPercentage : undefined,
        processMethod: refundMethod,
        amount: refundAmount,
        refundId: refundId
      };
    }
    
    // Devolver los datos necesarios para la cancelación
    return { 
      reason: '',
      refundAction: shouldProcessRefund ? refundParams : undefined
    };
  }

  // Función que ahora actúa como puente hacia el componente padre
  async function confirmCancel() {
    console.log('🚀 Iniciando proceso de cancelación desde ModalContent:', {
      hasGuarantee,
      shouldCharge,
      stripeEnabled,
      timestamp: new Date().toISOString()
    });
    
    // Preparar los datos de reembolso si es necesario
    const refundData = await prepareRefundData();
    
    // Si el reembolso falló y devolvió null, no continuar
    if (shouldProcessRefund && refundData === null) {
      return;
    }
    
    // PASO CRUCIAL: Ahora llamamos a onConfirm que está enlazado a handleCancelBooking
    // Esto ejecutará la lógica de cobro de garantía en el componente padre
    onConfirm(refundData as CancelBookingParams);
  }

  // Función para mostrar opciones de reembolso al usuario
  function showReembolsoOptions() {
    setShouldProcessRefund(true);
    setShowRefundOptions(true);
  }

  // Función para ocultar opciones de reembolso
  function hideReembolsoOptions() {
    setShouldProcessRefund(false);
    setShowRefundOptions(false);
  }

  // Generar descripción personalizada para el botón de reembolso
  const refundButtonLabel = (() => {
    if (refundType === 'full') {
      return `Cancelar con Reembolso Total (${formatAmountWithoutCurrency(totalAmount)})`;
    } else {
      const amount = (totalAmount * refundPercentage) / 100;
      return `Cancelar con Reembolso Parcial (${formatAmountWithoutCurrency(amount)})`;
    }
  })();

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center z-[999] isolate">
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-white/30 backdrop-blur-[2px]"
        onClick={handleClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-md bg-white rounded-lg shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <IconAlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Cancelar reserva
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Confirme los detalles para cancelar esta reserva
              </p>
              {/* Indicador de carga para reservas elegibles para reembolso */}
              {booking?.payment_type !== 'guarantee' && booking?.payment_type !== 'deposit' && isLoadingRefund && (
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                  <IconLoader className="w-3.5 h-3.5 animate-spin" />
                  <span>Comprobando si es aplicable reembolso...</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-5">
            {/* Mostrar sección de garantía si el tipo de pago es 'guarantee' */}
            {booking?.payment_type === 'guarantee' && (
              <div className="space-y-4 mb-4">
                <h4 className="text-sm font-medium text-yellow-700">
                  Cobro de garantía
                </h4>
                <GuaranteeSection 
                  totalAmount={totalAmount || 0}
                  guaranteePercentage={guaranteePercentage}
                  country={'MX'} // Usar un valor por defecto en lugar de organization?.country
                  shouldCharge={shouldCharge}
                  setShouldCharge={handleShouldChargeChange}
                  isProcessing={isProcessing}
                  isLoading={isLoadingStripe}
                  stripeEnabled={stripeEnabled || false}
                />
              </div>
            )}
            
            {/* Sección de reembolso (si aplica) */}
            {/* Excluimos tipos 'guarantee' y 'deposit' */}
            {!isLoadingRefund && booking?.payment_type !== 'guarantee' && booking?.payment_type !== 'deposit' && refundData && refundData.hasValidInvoice && (
              <div className="space-y-4">
                <div className="rounded-md border border-gray-200 overflow-hidden">
                  <div className="p-4 space-y-3 bg-white">
                    <h4 className="text-sm font-medium text-gray-700">
                      ¿Desea procesar un reembolso?
                    </h4>

                    
                    {/* Opciones de reembolso */}
                    {!showRefundOptions && (
                      <div className="pt-1">
                        <RadioGroup
                          value={shouldProcessRefund ? 'with-refund' : 'without-refund'}
                          onValueChange={(value) => {
                            const willProcessRefund = value === 'with-refund';
                            setShouldProcessRefund(willProcessRefund);
                            if (willProcessRefund) {
                              setShowRefundOptions(true);
                            }
                          }}
                          className="space-y-3"
                        >
                          <div className="flex items-start space-x-3">
                            <RadioGroupItem value="without-refund" id="without-refund" className="mt-1" />
                            <div className="space-y-1 flex-1">
                              <Label htmlFor="without-refund" className="text-sm font-medium text-gray-700">
                                Cancelar sin reembolso
                              </Label>
                              <p className="text-xs text-gray-500">
                                Solo se cancelará la reserva sin procesar ningún reembolso
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-start space-x-3">
                            <RadioGroupItem value="with-refund" id="with-refund" className="mt-1" />
                            <div className="space-y-1 flex-1">
                              <Label htmlFor="with-refund" className="text-sm font-medium text-gray-700">
                                Cancelar con reembolso
                              </Label>
                              <p className="text-xs text-gray-500">
                                Se cancelará la reserva y se procesará un reembolso al cliente
                              </p>
                            </div>
                          </div>
                        </RadioGroup>
                      </div>
                    )}
                    
                    {/* Estado 2: Mostrar componente de opciones de reembolso */}
                    {showRefundOptions && (
                      <RefundOptions
                        totalAmount={totalAmount}
                        country={'MX'} // Usar un valor por defecto en lugar de organization?.country
                        initialValues={{
                          refundType: refundType,
                          percentage: refundPercentage,
                          processMethod: refundMethod
                        }}
                        onBack={() => {
                          setShowRefundOptions(false);
                          setShouldProcessRefund(false); // Al volver, seleccionar "sin reembolso"
                        }}
                        onOptionsSelected={(options: { refundType: 'full' | 'percentage', percentage?: number, processMethod: 'stripe' | 'external' }) => {
                          // Guardar las opciones seleccionadas
                          // Arreglar los errores de tipo usando el tipo correcto para cada setter
                          setRefundType(options.refundType as 'full' | 'percentage');
                          if (options.percentage) {
                            setRefundPercentage(options.percentage);
                          }
                          setRefundMethod(options.processMethod as 'stripe' | 'external');
                          
                          // Cerrar el panel de opciones y mantener "con reembolso"
                          setShowRefundOptions(false);
                          setShouldProcessRefund(true);
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Motivo de cancelación */}
            <CancellationReasonField
              reason={''}
              setReason={(reason) => {}}
              isProcessing={isProcessing}
            />
          </div>

          {/* Footer */}
          <ModalFooter
            onCancel={confirmCancel}
            onClose={handleClose}
            isProcessing={isProcessing}
            shouldCharge={shouldCharge} // Valor por defecto para evitar el error
          />
        </div>
      </motion.div>
    </div>,
    document.body
  )
}
