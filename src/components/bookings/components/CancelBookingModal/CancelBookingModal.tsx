import { useState, useEffect, useMemo } from 'react'
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
  const [shouldCharge, setShouldCharge] = useState(false);

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
  const {
    stripeEnabled,
    isLoadingStripe,
    stripePaymentMethodId,
    stripeAccountId: guaranteeStripeAccountId,
    stripeCustomerId: guaranteeStripeCustomerId,
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
    isProcessing,
    setIsProcessing,
    processStripeRefund,
    registerExternalRefund
  } = useRefundProcessing({
    totalAmount,
    stripeAccountId: refundData?.stripeAccountId || guaranteeStripeAccountId || null,
    bookingId: booking?.id || '',
    invoiceId: invoiceData.invoiceId,
    paymentIntentId: invoiceData.paymentIntentId
  });

  // Log inicial de props
  useEffect(() => {
    if (isOpen) {
      console.log('🔍 CancelBookingModal - Props iniciales:', {
        booking_id: booking?.id,
        hasGuarantee,
        totalAmount,
        payment_type: booking?.payment_type,
        timestamp: new Date().toISOString()
      });
    }
  }, [isOpen, booking, hasGuarantee, totalAmount]);
  
  // Monitorear el estado de Stripe para depuración
  useEffect(() => {
    if (isOpen && hasGuarantee) {
      console.log('🔍 Estado de cancelación (garantía):', {
        paymentType: booking?.payment_type,
        canChargeNoShow: hasGuarantee && stripeEnabled,
        stripeConnection: {
          enabled: stripeEnabled,
          isLoading: isLoadingStripe
        },
        totalAmount,
        stripe_payment_method_id: Boolean(stripePaymentMethodId),
        stripe_account_id: Boolean(guaranteeStripeAccountId),
        stripe_customer_id: Boolean(guaranteeStripeCustomerId),
      });
    } else if (isOpen && ['booking', 'full'].includes(booking?.payment_type || '')) {
      console.log('🔍 Estado de cancelación (reembolso):', {
        paymentType: booking?.payment_type,
        refundReady: refundData?.isReady || false,
        hasValidInvoice: refundData?.hasValidInvoice || false,
        isLoading: isLoadingRefund
      });
    }
  }, [isOpen, hasGuarantee, stripeEnabled, isLoadingStripe, stripePaymentMethodId, 
      guaranteeStripeAccountId, guaranteeStripeCustomerId, booking?.payment_type, 
      totalAmount, refundData, isLoadingRefund]);

  // Función para manejar la cancelación
  // Utilizar el hook para procesar cargos de garantía
  const { isProcessing: isProcessingGuarantee, processGuaranteeCharge } = useGuaranteeCharge();

  /**
   * Procesa el cargo de garantía si es necesario
   * @returns Objeto con resultado del cargo de garantía
   */
  const processGuaranteeChargeIfNeeded = async () => {
    // Si no hay garantía, no es necesario el cargo
    if (!hasGuarantee || !shouldCharge || !stripeEnabled) {
      return { success: true, chargeProcessed: false };
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
    if (guaranteeStripeAccountId && stripePaymentMethodId) {
      console.log('✅ Preparando datos de Stripe para el cargo:', {
        hasAccountId: Boolean(guaranteeStripeAccountId),
        hasPaymentMethodId: Boolean(stripePaymentMethodId),
        hasCustomerId: Boolean(guaranteeStripeCustomerId),
      });

      Object.assign(chargeParams, {
        stripeData: {
          accountId: guaranteeStripeAccountId,
          paymentMethodId: stripePaymentMethodId,
          customerId: guaranteeStripeCustomerId
        }
      });
    }

    // Utilizar el hook para procesar el cargo
    try {
      const result = await processGuaranteeCharge(chargeParams);

      if (!result.success) {
        console.error('❌ Error al procesar cargo de garantía:', result.error);
        toast({
          title: "Error al procesar el cargo",
          description: result.error?.message || "No se pudo procesar el cargo de garantía",
          variant: "destructive"
        });
        return { success: false, error: result.error };
      }

      console.log('✅ Cargo de garantía procesado exitosamente:', result);
      toast({
        title: "Cargo de garantía procesado",
        description: "El cargo de garantía se ha procesado correctamente",
        variant: "default"
      });
      return { success: true, chargeProcessed: true, chargeId: result.chargeId };
    } catch (error) {
      console.error('❌ Error inesperado al procesar cargo de garantía:', error);
      toast({
        title: "Error inesperado",
        description: "Ocurrió un error al procesar el cargo de garantía",
        variant: "destructive"
      });
      return { success: false, error };
    }
  };

  const handleCancelBooking = async () => {
    setIsProcessing(true);
    
    try {
      // Generar parámetros de cancelación
      const cancelParams: any = { reason };
      
      // Paso 1: Procesar cargo de garantía si es necesario
      if (hasGuarantee && shouldCharge && stripeEnabled) {
        const guaranteeResult = await processGuaranteeChargeIfNeeded();
        
        if (!guaranteeResult.success) {
          // Si falla el cargo de garantía, detenemos el proceso
          setIsProcessing(false);
          return;
        }
        
        // Registrar si se procesó un cargo para la notificación final
        if (guaranteeResult.chargeProcessed) {
          cancelParams.chargeProcessed = true;
          cancelParams.guaranteeChargeId = guaranteeResult.chargeId;
        }
        
        console.log('✅ Cargo de garantía completado con éxito, procediendo con la cancelación');
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
        onConfirm(cancelParams);
        
        // Mostrar mensaje de éxito
        toast({
          title: "Reserva cancelada",
          description: (hasGuarantee && shouldCharge)
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
      guaranteeStripeAccountId={guaranteeStripeAccountId}
    >
      <CancelBookingModalContent
        booking={booking}
        isOpen={isOpen}
        onClose={onClose}
        onConfirm={onConfirm}
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
  onConfirm: (params: { 
    reason?: string; 
    shouldCharge?: boolean;
    refundAction?: {
      type: 'full' | 'percentage';
      percentage?: number;
      processMethod: 'stripe' | 'external';
      amount?: number;
      refundId?: string;
    };
  }) => void;
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
  registerExternalRefund
}: CancelBookingModalContentProps) {
  // Usar el contexto de reembolso que contiene todos los datos y funciones necesarias
  // En lugar de desestructurar totalAmount, usar el objeto context completo para evitar colisiones
  const refundContext = useRefundContext();
  
  // Desestructurar solo lo necesario, evitando totalAmount
  const {
    invoiceId: contextInvoiceId,
    paymentIntentId,
    stripeAccountId,
    hasValidInvoice,
    isLoading: isLoadingRefundContext,
    shouldProcessRefund: shouldProcessRefundContext,
    setShouldProcessRefund: setShouldProcessRefundContext,
    showRefundOptions: showRefundOptionsContext,
    setShowRefundOptions: setShowRefundOptionsContext,
    refundType: refundTypeContext,
    setRefundType: setRefundTypeContext,
    refundPercentage: refundPercentageContext,
    setRefundPercentage: setRefundPercentageContext,
    refundMethod: refundMethodContext,
    setRefundMethod: setRefundMethodContext,
    isProcessing: isProcessingContext,
    setIsProcessing: setIsProcessingContext,
    processStripeRefund: processStripeRefundContext,
    registerExternalRefund: registerExternalRefundContext
  } = refundContext;

  // Log inicial de props y estado para depuración
  console.log('🔍 CancelBookingModal - Props y Contexto:', {
    booking_id: booking?.id,
    has_invoice_id: Boolean(contextInvoiceId),
    invoice_id: contextInvoiceId,
    has_payment_intent_id: Boolean(paymentIntentId),
    payment_intent_id: paymentIntentId,
    has_stripe_account: Boolean(stripeAccountId),
    can_process_refund: shouldProcessRefundContext && hasValidInvoice,
    timestamp: new Date().toISOString()
  });

  // Función para cerrar el modal
  function handleClose() {
    // Prevenir el cierre si hay un proceso activo
    if (isProcessingContext || isLoadingRefund) {
      return;
    }
    
    // Reiniciar estados al cerrar
    setShouldProcessRefundContext(false);
    setShowRefundOptionsContext(false);
    onClose();
  }

  // Función para confirmar cancelación con reembolso opcional
  async function confirmCancel() {
    // Procesamiento de reembolso
    let refundSuccess = true;
    let refundAmount = 0;
    let refundId = '';
    
    // Si se debe procesar un reembolso, intentarlo primero
    if (shouldProcessRefundContext) {
      setIsProcessingContext(true);
      
      // Calcular el monto basado en el tipo de reembolso
      refundAmount = refundTypeContext === 'full' 
        ? refundContext.totalAmount 
        : refundContext.totalAmount * (refundPercentageContext / 100);
        
      if (refundMethodContext === 'stripe') {
        refundSuccess = await processStripeRefundContext();
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
        refundSuccess = await registerExternalRefundContext();
      }
      
      setIsProcessingContext(false);
      
      // Si el reembolso falló, detener el proceso
      if (!refundSuccess) {
        return;
      }
    }
    
    // Finalmente, procesar la cancelación de la reserva
    const cancelParams = { 
      reason: '',
      refundAction: shouldProcessRefundContext ? {
        type: refundTypeContext,
        percentage: refundTypeContext === 'percentage' ? refundPercentageContext : undefined,
        processMethod: refundMethodContext,
        amount: refundAmount,
        refundId: refundId
      } : undefined
    };
    
    console.log('📦 Enviando parámetros de cancelación con reembolso:', cancelParams);
    onConfirm(cancelParams);
    
    // Cerrar el modal después de completar
    handleClose();
  }

  // Función para mostrar opciones de reembolso al usuario
  function showReembolsoOptions() {
    setShouldProcessRefundContext(true);
    setShowRefundOptionsContext(true);
  }

  // Función para ocultar opciones de reembolso
  function hideReembolsoOptions() {
    setShouldProcessRefund(false);
    setShowRefundOptions(false);
  }

  // Generar descripción personalizada para el botón de reembolso
  const refundButtonLabel = (() => {
    if (refundTypeContext === 'full') {
      return `Cancelar con Reembolso Total (${formatAmountWithoutCurrency(refundContext.totalAmount)})`;
    } else {
      const amount = (refundContext.totalAmount * refundPercentageContext) / 100;
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
            </div>
          </div>

          <div className="space-y-5">
            {/* Mostrar sección de garantía si el tipo de pago es 'guarantee' */}
            {booking?.payment_type === 'guarantee' && (
              <div className="space-y-4 mb-4">
                <h4 className="text-sm font-medium text-yellow-700">
                  Cobro de garantía
                </h4>
                {/* Usamos un estado local para manejar el checkbox */}
                {(() => {
                  // Estado local para shouldCharge usando el hook useState
                  const [localShouldCharge, setLocalShouldCharge] = useState(false);
                  
                  // Efecto para sincronizar el estado local con refundData cuando sea necesario
                  useEffect(() => {
                    if (refundData && typeof refundData === 'object') {
                      refundData.shouldCharge = localShouldCharge;
                    }
                    console.log('🔔 Estado de cobro de garantía actualizado:', {
                      shouldCharge: localShouldCharge,
                      timestamp: new Date().toISOString()
                    });
                  }, [localShouldCharge, refundData]);
                  
                  return (
                    <GuaranteeSection 
                      totalAmount={totalAmount || 0}
                      guaranteePercentage={guaranteePercentage}
                      country={'MX'}
                      shouldCharge={localShouldCharge}
                      setShouldCharge={(value) => {
                        console.log('🔄 Cambiando shouldCharge a:', value);
                        setLocalShouldCharge(value);
                      }}
                      isProcessing={isProcessing}
                      isLoading={isLoadingRefund}
                      stripeEnabled={true} // Habilitado para mostrar la sección
                    />
                  );
                })()}
              </div>
            )}
            
            {/* Sección de reembolso (si aplica) */}
            {/* Modificamos la condición para eliminar la referencia a hasGuarantee */}
            {!isLoadingRefund && refundData && refundData.hasValidInvoice && (
              <div className="space-y-4">
                <div className="rounded-md border border-gray-200 overflow-hidden">
                  <div className="p-4 space-y-3 bg-white">
                    <h4 className="text-sm font-medium text-gray-700">
                      ¿Desea procesar un reembolso?
                    </h4>
                    <div className="mb-2 bg-blue-50 border border-blue-100 rounded-md p-2 text-xs text-blue-700">
                      <p>Se ha encontrado una factura asociada a esta reserva. Puede procesarse un reembolso automático.</p>
                    </div>
                    
                    {/* Opciones de reembolso */}
                    {!showRefundOptionsContext && (
                      <div className="pt-1">
                        <RadioGroup
                          value={shouldProcessRefundContext ? 'with-refund' : 'without-refund'}
                          onValueChange={(value) => {
                            const willProcessRefund = value === 'with-refund';
                            setShouldProcessRefundContext(willProcessRefund);
                            if (willProcessRefund) {
                              setShowRefundOptionsContext(true);
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
                    {showRefundOptionsContext && (
                      <RefundOptions
                        totalAmount={refundContext.totalAmount}
                        country={'MX'} // Usar un valor por defecto en lugar de organization?.country
                        initialValues={{
                          refundType: refundTypeContext,
                          percentage: refundPercentageContext,
                          processMethod: refundMethodContext
                        }}
                        onBack={() => {
                          setShowRefundOptionsContext(false);
                          setShouldProcessRefundContext(false); // Al volver, seleccionar "sin reembolso"
                        }}
                        onOptionsSelected={(options: { refundType: 'full' | 'percentage', percentage?: number, processMethod: 'stripe' | 'external' }) => {
                          // Guardar las opciones seleccionadas
                          // Arreglar los errores de tipo usando el tipo correcto para cada setter
                          setRefundTypeContext(options.refundType as 'full' | 'percentage');
                          if (options.percentage) {
                            setRefundPercentageContext(options.percentage);
                          }
                          setRefundMethodContext(options.processMethod as 'stripe' | 'external');
                          
                          // Cerrar el panel de opciones y mantener "con reembolso"
                          setShowRefundOptionsContext(false);
                          setShouldProcessRefundContext(true);
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
              isProcessing={isProcessingContext}
            />
          </div>

          {/* Footer */}
          <ModalFooter
            onCancel={confirmCancel}
            onClose={handleClose}
            isProcessing={isProcessingContext}
            shouldCharge={false} // Valor por defecto para evitar el error
          />
        </div>
      </motion.div>
    </div>,
    document.body
  )
}
