import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useOrganization } from '@/contexts/OrganizationContext'
import { toast } from '@/components/ui/use-toast'
import { IconAlertCircle, IconLoader } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { formatCurrencyByCountry } from '@/lib/currency-utils'
import { supabase } from '@/lib/supabase'

// Hooks personalizados
import { useStripeConnection } from './hooks/useStripeConnection'
import { useStripeRefund } from './hooks/useStripeRefund'
import { useRefundProcessing } from './hooks/useRefundProcessing'

// Componentes
import { GuaranteeSection } from './components/GuaranteeSection'
import { RefundSection } from './components/RefundSection'
import { CancellationReasonField } from './components/CancellationReasonField'
import { ModalFooter } from './components/ModalFooter'
import { RefundOptions } from './RefundOptions'

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
  const handleCancelBooking = async () => {
    setIsProcessing(true);
    
    try {
      // Generar parámetros de cancelación
      const cancelParams: any = { reason };
      
      // Si debe aplicar cargo por garantía
      if (hasGuarantee && shouldCharge && stripeEnabled) {
        console.log('💳 Procesando cargo por no-show:', {
          bookingId: booking.id,
          amount: totalAmount * (effectiveGuaranteePercentage / 100),
          stripeEnabled,
          hasPaymentMethod: Boolean(stripePaymentMethodId),
          hasAccountId: Boolean(guaranteeStripeAccountId),
          hasCustomerId: Boolean(guaranteeStripeCustomerId),
          timestamp: new Date().toISOString()
        });

        // Preparar los datos para la API incluyendo stripeData cuando estén disponibles
        const requestData = {
          bookingId: booking.id,
          amount: totalAmount * (effectiveGuaranteePercentage / 100),
          reason,
          empresaId: organization?.id,
          customerEmail: guaranteeCustomerDetails?.email || booking.customer_email,
          customerName: guaranteeCustomerDetails?.name || booking.customer_name
        };

        // Si tenemos los datos de Stripe, incluirlos directamente para evitar problemas en el servidor
        if (guaranteeStripeAccountId && stripePaymentMethodId) {
          console.log('✅ Enviando datos Stripe al servidor:', {
            hasAccountId: Boolean(guaranteeStripeAccountId),
            hasPaymentMethodId: Boolean(stripePaymentMethodId),
            hasCustomerId: Boolean(guaranteeStripeCustomerId),
            hasCustomerEmail: Boolean(guaranteeCustomerDetails?.email || booking.customer_email)
          });

          Object.assign(requestData, {
            stripeData: {
              accountId: guaranteeStripeAccountId,
              paymentMethodId: stripePaymentMethodId,
              customerId: guaranteeStripeCustomerId
            }
          });
        }
        
        console.log('📤 Enviando solicitud de cargo con datos:', {
          ...requestData,
          hasCustomerEmail: Boolean(requestData.customerEmail),
          hasCustomerName: Boolean(requestData.customerName),
          timestamp: new Date().toISOString()
        });

        try {
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
              description: result.error?.message || "No se pudo procesar el cargo",
              variant: "destructive"
            });
            setIsProcessing(false);
            return;
          }

          console.log('✅ Cargo procesado exitosamente:', result);
          
          // No modificamos cancelParams.shouldCharge porque el cargo ya se hizo
          // Solo avisamos que hubo cargo en la notificación al final
          cancelParams.chargeProcessed = true;
        } catch (error) {
          console.error('❌ Error al comunicarse con API de cargo:', error);
          toast({
            title: "Error en la comunicación",
            description: "No se pudo procesar el cargo de garantía. Intente nuevamente.",
            variant: "destructive"
          });
          setIsProcessing(false);
          return;
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
            refundResult = await processStripeRefund({
              fullRefund: refundType === 'full',
              percentage: refundType === 'percentage' ? refundPercentage : 100,
              paymentIntent: refundData.invoiceData.paymentIntent || '',
              chargeId: refundData.invoiceData.chargeId || '',
              accountId: refundData.stripeAccountId || ''
            });
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
    if (isLoadingRefund || !refundData?.isReady) {
      return false;
    }
    
    // Si no hay factura válida, no se puede reembolsar
    if (!refundData?.hasValidInvoice) {
      console.log('ℹ️ No se puede reembolsar: no hay factura válida asociada');
      return false;
    }
    
    // Si es tipo 'booking' o 'full', se permite reembolso si tiene factura válida
    if (['booking', 'full'].includes(booking?.payment_type || '')) {
      if (refundData?.hasValidInvoice) {
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

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center z-[999] isolate">
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-white/30 backdrop-blur-[2px]"
        onClick={onClose}
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
            {/* Mostrar sección de garantía si es aplicable */}
            {hasGuarantee && (
              <div className="space-y-4 mb-4">
                {isLoadingStripe ? (
                  <div className="border rounded-lg p-4 bg-white">
                    <div className="flex items-center justify-center p-4">
                      <IconLoader className="animate-spin text-gray-400" size={24} />
                      <span className="ml-2 text-sm text-gray-600">Verificando disponibilidad de Stripe...</span>
                    </div>
                  </div>
                ) : (
                  <GuaranteeSection 
                    totalAmount={totalAmount}
                    guaranteePercentage={effectiveGuaranteePercentage}
                    shouldCharge={shouldCharge}
                    setShouldCharge={setShouldCharge}
                    isProcessing={isProcessing}
                    stripeEnabled={stripeEnabled}
                    country={organization?.country}
                  />
                )}
              </div>
            )}
            
            {/* Sección de reembolso (si aplica) */}
            {!isLoadingRefund && canProcessRefund && !hasGuarantee && (
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
    </div>,
    document.body
  )
}
