import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useOrganization } from '@/contexts/OrganizationContext'
import { toast } from '@/components/ui/use-toast'

// Hooks personalizados
import { useInvoiceData } from './hooks/useInvoiceData'
import { useStripeConnection } from './hooks/useStripeConnection'
import { useRefundProcessing } from './hooks/useRefundProcessing'

// Componentes
import { GuaranteeSection } from './components/GuaranteeSection'
import { RefundSection } from './components/RefundSection'
import { CancellationReasonField } from './components/CancellationReasonField'
import { ModalFooter } from './components/ModalFooter'

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

  // Usamos el porcentaje de garantía de la BD o el valor predeterminado si no está disponible
  const effectiveGuaranteePercentage = guaranteePercentage || 40;
  
  // Utilizamos nuestros hooks personalizados
  const {
    stripeEnabled,
    isLoadingStripe,
    stripePaymentMethodId,
    stripeAccountId,
    stripeCustomerId,
    customerDetails
  } = useStripeConnection({ isOpen, booking, hasGuarantee });
  
  const {
    isLoadingInvoice,
    invoiceData
  } = useInvoiceData({ 
    isOpen, 
    bookingId: booking?.id, 
    stripeAccountId, 
    paymentType: booking?.payment_type 
  });
  
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
    stripeAccountId,
    bookingId: booking?.id || ''
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



  // Función para manejar la cancelación
  const handleCancelBooking = async () => {
    setIsProcessing(true);
    
    try {
      // Generar parámetros de cancelación
      const cancelParams: any = { reason };
      
      // Si debe aplicar cargo por garantía
      if (hasGuarantee && shouldCharge) {
        cancelParams.shouldCharge = true;
      }
      
      // Si debe procesar reembolso
      if (shouldProcessRefund && !hasGuarantee && invoiceData.hasInvoice) {
        // Procesamos el reembolso según el método seleccionado
        let refundSuccess = false;
        
        if (refundMethod === 'stripe') {
          refundSuccess = await processStripeRefund();
        } else { // external
          refundSuccess = await registerExternalRefund();
        }
        
        // Si el reembolso fue exitoso, añadimos la información
        if (refundSuccess) {
          cancelParams.refundAction = {
            type: refundType,
            percentage: refundType === 'percentage' ? refundPercentage : undefined,
            processMethod: refundMethod
          };
        }
      }
      
      // Confirmar la cancelación
      await onConfirm(cancelParams);
      onClose();
      
    } catch (error) {
      console.error('Error al procesar la cancelación:', error);
      toast({
        title: 'Error',
        description: 'Ocurrió un error al procesar la cancelación',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Cargar datos de Stripe cuando se abre el modal y hay garantía
  useEffect(() => {
    if (isOpen && hasGuarantee && !loadAttempted) {
      const loadStripeData = async () => {
        console.log('🔄 Iniciando carga de datos Stripe:', {
          booking_id: booking?.id,
          timestamp: new Date().toISOString()
        });

        setIsLoadingStripe(true);
        setLoadAttempted(true);
        setStripeEnabled(false); // Reset inicial

        try {
          // 1. Cargar conexión Stripe
          const connection = await loadStripeConnection();
          console.log('✅ Conexión Stripe cargada:', connection);

          if (!connection || !connection.charges_enabled || connection.account_status !== 'active') {
            console.log('⚠️ Conexión Stripe no válida:', {
              hasConnection: Boolean(connection),
              charges_enabled: connection?.charges_enabled,
              status: connection?.account_status
            });
            setStripeEnabled(false);
            setShouldCharge(false);
            return;
          }

          // 2. Si Stripe está habilitado, obtener datos de pago
          if (booking?.id) {
            const stripeData = await paymentService.getStripePaymentData(booking.id);
            console.log('💳 Datos de pago obtenidos:', {
              hasPaymentMethod: Boolean(stripeData?.paymentMethodId),
              hasAccountId: Boolean(stripeData?.accountId),
              hasCustomerId: Boolean(stripeData?.customerId),
              timestamp: new Date().toISOString()
            });

            if (stripeData?.paymentMethodId && stripeData?.accountId && stripeData?.customerId) {
              setStripePaymentMethodId(stripeData.paymentMethodId);
              setStripeAccountId(stripeData.accountId);
              setStripeCustomerId(stripeData.customerId);
              setStripeEnabled(true);
            } else {
              console.log('⚠️ Datos de Stripe incompletos:', {
                hasPaymentMethod: Boolean(stripeData?.paymentMethodId),
                hasAccountId: Boolean(stripeData?.accountId),
                hasCustomerId: Boolean(stripeData?.customerId)
              });
              setStripeEnabled(false);
              setShouldCharge(false);
            }
          }
        } catch (error) {
          console.error('❌ Error al cargar datos Stripe:', error);
          setStripeEnabled(false);
          setShouldCharge(false);
        } finally {
          setIsLoadingStripe(false);
        }
      };

      loadStripeData();
    }
  }, [isOpen, hasGuarantee, loadAttempted, loadStripeConnection, booking?.id]);

  // Obtener datos del cliente cuando se abre el modal - optimizado para evitar consultas innecesarias
  useEffect(() => {
    if (isOpen && booking?.id) {
      // Usamos directamente la información del objeto booking sin realizar consultas adicionales
      // Esto evita consultas innecesarias a la base de datos cuando ya tenemos la información
      console.log('🧩 Usando datos directamente del objeto booking:', {
        booking_id: booking.id,
        customer_name: booking.customer_name || 'No disponible',
        customer_email: booking.customer_email || 'No disponible'
      });
      
      setCustomerDetails({
        name: booking.customer_name || '',
        email: booking.customer_email || ''
      });
    }
  }, [isOpen, booking]);

  // Establecer cargo por defecto solo cuando se complete la carga
  useEffect(() => {
    if (isOpen && hasGuarantee && !isLoadingStripe && stripeEnabled) {
      console.log('🔄 Estableciendo cargo por defecto:', {
        stripeEnabled,
        isLoadingStripe
      });
      setShouldCharge(true);
    } else {
      setShouldCharge(false);
    }
  }, [isOpen, hasGuarantee, isLoadingStripe, stripeEnabled]);

  // Calcular el monto del cargo (usando el porcentaje de garantía o 40% por defecto)
  const chargeAmount = totalAmount * (effectiveGuaranteePercentage / 100);
  
  // Obtener el país de la organización para determinar la moneda
  const organizationCountry = organization?.country || null;
  
  // Logs para depuración
  useEffect(() => {
    if (isOpen && hasGuarantee) {
      console.log('💰 Datos del cargo por garantía:', {
        guaranteePercentage: effectiveGuaranteePercentage,
        totalAmount,
        chargeAmount,
        country: organizationCountry,
        canApplyCharge: hasGuarantee && stripeEnabled && chargeAmount > 0
      });
    }
  }, [isOpen, hasGuarantee, effectiveGuaranteePercentage, totalAmount, chargeAmount, stripeEnabled, organizationCountry]);

  // Validar si se puede aplicar cargo
  const canApplyCharge = hasGuarantee && stripeEnabled && chargeAmount > 0

  // Mostrar estado de carga mientras se verifica Stripe
  const showLoadingState = isLoadingStripe && hasGuarantee;

  // Mostrar mensajes de diagnóstico para depuración
  useEffect(() => {
    if (isOpen) {
      console.log('📊 DIAGNÓSTICO DE MODAL DE CANCELACIÓN:', {
        hasGuarantee,
        stripeAccountIdPresente: Boolean(stripeAccountId),
        stripeEnabled,
        isLoadingStripe,
        datosFactura: {
          hasInvoice: invoiceData.hasInvoice,
          invoicesCount: invoiceData.invoices.length
        },
        condicionMostrarOpciones: !hasGuarantee && invoiceData.hasInvoice,
        timestamp: new Date().toISOString()
      });
    }
  }, [isOpen, hasGuarantee, invoiceData, stripeAccountId, stripeEnabled, isLoadingStripe]);

  // Determinar el título del modal basado en el estado
  const modalTitle = useMemo(() => {
    if (!hasGuarantee && invoiceData.hasInvoice) return "Cancelación con Opciones de Factura";
    if (!hasGuarantee) return "Confirmar Cancelación";
    if (isLoadingStripe) return "Verificando Garantía";
    if (!stripeEnabled) return "Cancelación sin Cargo";
    return "Cancelación con Garantía";
  }, [hasGuarantee, isLoadingStripe, stripeEnabled, invoiceData.hasInvoice]);

  // Función para crear factura contraparte
  const createCounterpartInvoice = async () => {
    if (!booking?.id || !stripeAccountId) {
      console.error('❌ Faltan datos necesarios para crear factura contraparte');
      return { success: false };
    }

    try {
      // Simplificamos los parámetros para centrarnos solo en lo esencial para la factura contraparte
      const invoiceParams = {
        bookingId: booking.id,
        stripeAccountId,
        // Si no tenemos stripeCustomerId, usamos 'cus_' + booking.id como alternativa
        customerId: stripeCustomerId || `cus_${booking.id.replace(/-/g, '')}_temp`,
        amount: 0, // Factura con monto cero como contraparte
        description: `Cancelación de reserva - Factura contraparte - ${booking.id}`,
        customerEmail: customerDetails.email || booking.customer_email || '',
        customerName: customerDetails.name || booking.customer_name || 'Cliente',
        empresaId: organization?.id,
        metadata: {
          original_invoice_id: invoiceData.invoices[0]?.id || '',
          booking_id: booking.id, // Siempre incluimos el booking_id en los metadatos
          cancellation_reason: reason || 'Sin motivo especificado',
          cancellation_date: new Date().toISOString(),
          country: organizationCountry || '',
          cancellation_type: 'counterpart'
        }
      };

      const result = await bookingInvoiceService.createCancellationInvoice(invoiceParams);
      
      if (result.success) {
        console.log('✅ Factura contraparte creada exitosamente:', result);
        toast({
          title: "Factura contraparte creada",
          description: "Se ha creado una factura contraparte para la cancelación"
        });
        return { success: true };
      } else {
        console.error('❌ Error al crear factura contraparte:', result.error);
        toast({
          title: "Error",
          description: result.error?.message || "No se pudo crear la factura contraparte",
          variant: "destructive"
        });
        return { success: false };
      }
    } catch (error) {
      console.error('❌ Error inesperado al crear factura contraparte:', error);
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado al crear la factura contraparte",
        variant: "destructive"
      });
      return { success: false };
    }
  };

  // Función para eliminar factura existente
  const deleteExistingInvoice = async () => {
    if (!stripeAccountId || !invoiceData.invoices[0]?.id) {
      console.error('❌ Faltan datos necesarios para eliminar factura');
      return { success: false };
    }
    
    console.log('🗑️ Eliminando factura con ID:', invoiceData.invoices[0].id, 'asociada a booking:', booking?.id);

    try {
      const result = await bookingInvoiceService.deleteInvoice(
        stripeAccountId,
        invoiceData.invoices[0].id
      );
      
      if (result.success) {
        console.log('✅ Factura eliminada exitosamente');
        toast({
          title: "Factura eliminada",
          description: "La factura asociada a esta reserva ha sido eliminada"
        });
        return { success: true };
      } else {
        console.error('❌ Error al eliminar factura:', result.error);
        toast({
          title: "Error",
          description: result.error?.message || "No se pudo eliminar la factura",
          variant: "destructive"
        });
        return { success: false };
      }
    } catch (error) {
      console.error('❌ Error inesperado al eliminar factura:', error);
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado al eliminar la factura",
        variant: "destructive"
      });
      return { success: false };
    }
  };

  const handleCancelBooking = async () => {
    if (!booking?.id) return;

    setIsProcessing(true);
    try {
      // 1. Si hay cargo, procesarlo primero (caso de garantía)
      if (shouldCharge && stripeEnabled) {
        console.log('💳 Procesando cargo por no-show:', {
          bookingId: booking.id,
          amount: totalAmount * (effectiveGuaranteePercentage / 100),
          country: organizationCountry,
          timestamp: new Date().toISOString()
        });

        // Preparar los datos para la API incluyendo stripeData cuando estén disponibles
        const requestData = {
          bookingId: booking.id,
          amount: totalAmount * (effectiveGuaranteePercentage / 100),
          reason,
          empresaId: organization?.id,
          customerEmail: customerDetails.email || booking.customer_email,
          customerName: customerDetails.name || booking.customer_name,
          country: organizationCountry // Añadir el país para determinar la moneda en el servidor
        };

        // Si tenemos los datos de Stripe, incluirlos directamente para evitar problemas en el servidor
        if (stripeAccountId && stripePaymentMethodId) {
          console.log('✅ Enviando datos Stripe al servidor:', {
            hasAccountId: Boolean(stripeAccountId),
            hasPaymentMethodId: Boolean(stripePaymentMethodId),
            hasCustomerId: Boolean(stripeCustomerId),
            hasCustomerEmail: Boolean(customerDetails.email || booking.customer_email)
          });

          Object.assign(requestData, {
            stripeData: {
              accountId: stripeAccountId,
              paymentMethodId: stripePaymentMethodId,
              customerId: stripeCustomerId
            }
          });
        }

        console.log('📤 Enviando solicitud de cargo con datos:', {
          ...requestData,
          hasCustomerEmail: Boolean(requestData.customerEmail),
          hasCustomerName: Boolean(requestData.customerName),
          timestamp: new Date().toISOString()
        });

        const response = await fetch('/api/stripe/charge-no-show', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData)
        });

        const result = await response.json();

        if (!result.success) {
          console.error('❌ Error al procesar cargo:', result.error);
          toast({
            title: "Error al procesar el cargo",
            description: result.error.message || "No se pudo procesar el cargo",
            variant: "destructive"
          });
          return;
        }

        console.log('✅ Cargo procesado exitosamente:', result);
      }

      // 2. Manejar reembolso si es necesario
      let refundResult: { success: boolean; refundId: string | null } = { success: false, refundId: null };
      
      if (!hasGuarantee && invoiceData.hasInvoice && shouldProcessRefund) {
        // Procesamos el reembolso según el método seleccionado
        if (refundMethod === 'stripe') {
          console.log(`💳 [Refund] Procesando reembolso por Stripe - Tipo: ${refundType}, Porcentaje: ${refundPercentage}%`);
          const result = await processStripeRefund();
          refundResult = { success: result.success, refundId: result.refundId || null };
        } else if (refundMethod === 'external') {
          console.log(`💰 [Refund] Registrando reembolso externo - Tipo: ${refundType}, Porcentaje: ${refundPercentage}%`);
          const result = await registerExternalRefund();
          refundResult = { success: result.success, refundId: result.refundId || null };
        }
        
        if (!refundResult.success) {
          console.warn('⚠️ [Refund] El reembolso no se pudo procesar completamente, pero continuamos con la cancelación');
          // No interrumpimos el proceso, continuamos con la cancelación
        }
      }

      // 3. Cancelar la reserva
      const { data, error } = await supabase.rpc('cancel_booking_v1', {
        p_booking_id: booking.id,
        p_reason: reason,
        p_should_charge: false // El cargo ya se procesó si era necesario
      });

      if (error) throw error;
      
      // Preparar mensaje de confirmación según las acciones realizadas
      let description = "La reserva ha sido cancelada exitosamente";
      
      if (shouldCharge) {
        description = "La reserva ha sido cancelada y se ha procesado el cargo";
      } else if (invoiceData.hasInvoice && shouldProcessRefund) {
        const refundAmount = refundType === 'full' 
          ? totalAmount 
          : (totalAmount * refundPercentage) / 100;
        
        if (refundMethod === 'stripe' && refundResult.success) {
          description = `La reserva ha sido cancelada y se ha procesado un reembolso de ${formatCurrencyByCountry(refundAmount, organization?.country)} a través de Stripe`;
        } else if (refundMethod === 'external' && refundResult.success) {
          description = `La reserva ha sido cancelada y se ha registrado un reembolso externo de ${formatCurrencyByCountry(refundAmount, organization?.country)}`;
        } else if (refundResult.success) {
          description = `La reserva ha sido cancelada y se ha procesado el reembolso`;
        }
      } else if (invoiceData.hasInvoice && !shouldProcessRefund) {
        description = "La reserva ha sido cancelada sin procesar reembolso";
      }

      toast({
        title: "Reserva cancelada",
        description
      });

      // Construir datos de reembolso para el callback
      const refundAction = (invoiceData.hasInvoice && shouldProcessRefund) ? {
        type: refundType,
        percentage: refundType === 'percentage' ? refundPercentage : undefined,
        processMethod: refundMethod
      } : undefined;

      onConfirm?.({ 
        reason, 
        shouldCharge,
        refundAction
      });
      onClose();
    } catch (error) {
      console.error('❌ Error al cancelar reserva:', error);
      toast({
        title: "Error",
        description: "No se pudo procesar la cancelación",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Función para procesar reembolso a través de Stripe
  const processStripeRefund = async () => {
    if (!booking?.id || !stripeAccountId) {
      console.error('❌ [Refund] No se pudo procesar reembolso por Stripe: Datos faltantes', {
        bookingId: booking?.id,
        accountId: stripeAccountId
      });
      return { success: false };
    }
    
    setIsProcessing(true);
    try {
      console.log('💳 [Refund] Procesando reembolso por Stripe para booking:', booking.id);
      
      // Calcular monto de reembolso
      const refundAmount = refundType === 'full' 
        ? totalAmount 
        : (totalAmount * refundPercentage) / 100;
      
      // Verificamos que haya facturas y cargos asociados
      if (!invoiceData.hasInvoice || invoiceData.invoices.length === 0) {
        console.error('❌ [Refund] No hay facturas para asociar al reembolso');
        toast({
          title: "Error de reembolso",
          description: "No se encontraron facturas asociadas para procesar el reembolso",
          variant: "destructive"
        });
        return { success: false };
      }
      
      // Tomamos la primera factura (normalmente solo habría una)
      const existingInvoice = invoiceData.invoices[0];
      
      // Procesar reembolso a través de Stripe
      const response = await fetch('/api/stripe/process-refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          accountId: stripeAccountId,
          invoiceId: existingInvoice.id,
          customerId: stripeCustomerId || existingInvoice.customer,
          amount: refundAmount,
          reason: reason || 'Cancelación de reserva',
          isFullRefund: refundType === 'full'
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        console.error('❌ [Refund] Error al procesar reembolso:', result.error);
        toast({
          title: "Error de reembolso",
          description: result.error?.message || "No se pudo procesar el reembolso",
          variant: "destructive"
        });
        return { success: false };
      }
      
      console.log('✅ [Refund] Reembolso procesado:', result);
      toast({
        title: "Reembolso procesado",
        description: `Se ha procesado un reembolso de ${formatCurrencyByCountry(refundAmount, organization?.country)}`
      });
      
      return { success: true, refundId: result.refund?.id };
    } catch (error) {
      console.error('❌ [Refund] Error al procesar reembolso:', error);
      return { success: false };
    }
  };

  // Función para registrar reembolso externo
  const registerExternalRefund = async () => {
    if (!booking?.id) {
      console.error('❌ [Refund] No se pudo registrar reembolso externo: ID de reserva faltante');
      return { success: false };
    }
    
    setIsProcessing(true);
    try {
      console.log('💰 [Refund] Registrando reembolso externo para booking:', booking.id);
      
      // Calcular monto de reembolso
      const refundAmount = refundType === 'full' 
        ? totalAmount 
        : (totalAmount * refundPercentage) / 100;
      
      // Registrar reembolso externo en el sistema (solo registro, no procesamiento)
      const response = await fetch('/api/bookings/register-external-refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          amount: refundAmount,
          reason: reason || 'Cancelación de reserva',
          isFullRefund: refundType === 'full',
          percentage: refundType === 'percentage' ? refundPercentage : 100,
          notes: `Reembolso procesado manualmente por ${organization?.name || 'administrador'}`
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        console.error('❌ [Refund] Error al registrar reembolso externo:', result.error);
        // Esto no es crítico, podemos continuar con la cancelación
        return { success: false };
      }
      
      console.log('✅ [Refund] Reembolso externo registrado:', result);
      toast({
        title: "Reembolso registrado",
        description: `Se ha registrado un reembolso externo de ${formatCurrencyByCountry(refundAmount, organization?.country)}`
      });
      
      return { success: true, refundId: result.refund?.id };
    } catch (error) {
      console.error('❌ [Refund] Error al registrar reembolso externo:', error);
      // Esto no es crítico, podemos continuar con la cancelación
      return { success: false };
    }
  };
  
  // Reset estado al cerrar
  useEffect(() => {
    if (!isOpen) {
      setReason('');
      setShouldCharge(false);
      setIsProcessing(false);
      setLoadAttempted(false);
      setInvoiceData({ hasInvoice: false, invoices: [] });
      setShouldProcessRefund(false);
      setShowRefundOptions(false);
      setRefundType('full');
      setRefundPercentage(100);
      setRefundMethod('stripe');
    }
  }, [isOpen]);

  if (!isOpen) return null

  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-[999] isolate">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white/30 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-md bg-white rounded-lg shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <IconAlertCircle className="w-6 h-6 text-red-600" strokeWidth={2} />
                </div>
                <div className="flex-1 space-y-1.5">
                  <h3 className="text-lg font-semibold leading-6 text-gray-900">
                    {modalTitle}
                  </h3>
                  <p className="text-sm leading-5 text-gray-500">
                    ¿Estás seguro de que deseas cancelar esta reserva? Esta acción no se puede deshacer.
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-4">
                {/* Sección de Garantía */}
                {hasGuarantee && (
                  <div className={cn(
                    "rounded-lg border p-4",
                    isLoadingStripe ? "bg-gray-50 border-gray-200" :
                    stripeEnabled ? "bg-yellow-50 border-yellow-200" :
                    "bg-red-50 border-red-200"
                  )}>
                    <h4 className="text-sm font-medium mb-2">
                      {isLoadingStripe ? "Verificando disponibilidad de cargo..." :
                       stripeEnabled ? "Cargo por Cancelación" :
                       "Cargo no Disponible"}
                    </h4>
                    
                    {isLoadingStripe ? (
                      <div className="flex items-center text-gray-500">
                        <IconLoader className="w-4 h-4 animate-spin mr-2" />
                        <span className="text-sm">Verificando conexión con Stripe...</span>
                      </div>
                    ) : stripeEnabled ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 bg-white p-3 rounded-md border border-yellow-200">
                          <Checkbox
                            id="shouldCharge"
                            checked={shouldCharge}
                            onCheckedChange={(checked) => setShouldCharge(checked as boolean)}
                            disabled={isProcessing}
                            className="data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"
                          />
                          <div className="space-y-1">
                            <label 
                              htmlFor="shouldCharge" 
                              className="text-sm font-medium text-gray-700 block"
                            >
                              Aplicar cargo por no presentarse
                            </label>
                            <p className="text-xs text-gray-500">
                              Se cobrará el {effectiveGuaranteePercentage}% del total ({formatCurrencyByCountry(chargeAmount, organizationCountry)})
                            </p>
                          </div>
                        </div>
                        
                        {shouldCharge && (
                          <Alert variant="default" className="bg-white border-yellow-200">
                            <AlertDescription className="text-sm">
                              El cargo se realizará automáticamente a la tarjeta registrada como garantía.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-red-600">
                        No se puede aplicar el cargo porque la conexión con Stripe no está activa.
                      </p>
                    )}
                  </div>
                )}

                {/* Motivo de cancelación */}
                {/* Sección de opciones de reembolso - Solo para pagos completos */}
                {/* Log de depuración */}
                {isOpen && console.log('🔧 Condiciones para mostrar opciones de reembolso:', {
                  noEsGarantia: !hasGuarantee, 
                  tieneFactura: invoiceData.hasInvoice, 
                  tipoPago: booking.payment_type,
                  esTipoValido: booking.payment_type === 'full' || booking.payment_type === 'booking',
                  deberiaVerse: !hasGuarantee && invoiceData.hasInvoice && (booking.payment_type === 'full' || booking.payment_type === 'booking')
                })}
                
                {!hasGuarantee && invoiceData.hasInvoice && (booking.payment_type === 'full' || booking.payment_type === 'booking') && (
                  <div className="space-y-4 mb-4">
                    <div className="border rounded-lg p-4 bg-white">
                      {/* Estado 1: Selección inicial, solo si no estamos mostrando las opciones de reembolso */}
                      {!showRefundOptions && (
                        <div className="animate-in fade-in duration-300">
                          <label className="text-sm font-medium text-gray-700 mb-2 block">
                            ¿Cómo deseas procesar esta cancelación?
                          </label>
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
                          country={organization?.country}
                          initialValues={{
                            refundType,
                            percentage: refundPercentage,
                            processMethod: refundMethod
                          }}
                          onBack={() => {
                            setShowRefundOptions(false);
                            setShouldProcessRefund(false); // Al volver, seleccionar "sin reembolso"
                          }}
                          onOptionsSelected={(options) => {
                            // Guardar las opciones seleccionadas
                            setRefundType(options.refundType);
                            if (options.percentage) {
                              setRefundPercentage(options.percentage);
                            }
                            setRefundMethod(options.processMethod);
                            
                            // Cerrar el panel de opciones y mantener "con reembolso"
                            setShowRefundOptions(false);
                            setShouldProcessRefund(true);
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Motivo de cancelación */}
                <CancellationReasonField
                  reason={reason}
                  setReason={setReason}
                  isProcessing={isProcessing}
                />
              </div>

              {/* Footer */}
              <ModalFooter
                onCancel={handleCancelBooking}
                onClose={onClose}
                isProcessing={isProcessing}
                shouldCharge={shouldCharge}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
} 