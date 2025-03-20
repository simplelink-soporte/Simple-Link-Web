import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { IconAlertCircle, IconLoader } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from '@/components/ui/use-toast'
import { useOrganization } from '@/contexts/OrganizationContext'
import { supabase } from '@/lib/supabase'
import { paymentService } from '@/services/paymentService'

interface CancelBookingModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (params: { reason?: string; shouldCharge?: boolean }) => void
  hasGuarantee?: boolean
  totalAmount?: number
  guaranteePercentage?: number
  booking: {
    id: string
    stripe_payment_method_id?: string
  }
}

export function CancelBookingModal({
  isOpen,
  onClose,
  onConfirm,
  hasGuarantee = false,
  totalAmount = 0,
  guaranteePercentage = 30,
  booking
}: CancelBookingModalProps) {
  const { organization, stripeConnection, loadStripeConnection } = useOrganization();
  const [reason, setReason] = useState('')
  const [shouldCharge, setShouldCharge] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [stripeEnabled, setStripeEnabled] = useState(false)
  const [isLoadingStripe, setIsLoadingStripe] = useState(false)
  const [loadAttempted, setLoadAttempted] = useState(false)
  const [stripePaymentMethodId, setStripePaymentMethodId] = useState<string | null>(null)
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null)
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null)

  // Log inicial de props
  useEffect(() => {
    if (isOpen) {
      console.log('🔍 CancelBookingModal - Props iniciales:', {
        booking_id: booking?.id,
        hasGuarantee,
        totalAmount,
        timestamp: new Date().toISOString()
      });
    }
  }, [isOpen, booking, hasGuarantee, totalAmount]);

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

  // Calcular el monto del cargo (usando el porcentaje de garantía o 30% por defecto)
  const chargeAmount = totalAmount * ((guaranteePercentage || 30) / 100);
  
  // Logs para depuración
  useEffect(() => {
    if (isOpen && hasGuarantee) {
      console.log('💰 Datos del cargo por garantía:', {
        guaranteePercentage,
        totalAmount,
        chargeAmount,
        canApplyCharge: hasGuarantee && stripeEnabled && chargeAmount > 0
      });
    }
  }, [isOpen, hasGuarantee, guaranteePercentage, totalAmount, chargeAmount, stripeEnabled]);

  // Validar si se puede aplicar cargo
  const canApplyCharge = hasGuarantee && stripeEnabled && chargeAmount > 0

  // Mostrar estado de carga mientras se verifica Stripe
  const showLoadingState = isLoadingStripe && hasGuarantee;

  // Determinar el título del modal basado en el estado
  const modalTitle = useMemo(() => {
    if (!hasGuarantee) return "Confirmar Cancelación";
    if (isLoadingStripe) return "Verificando Garantía";
    if (!stripeEnabled) return "Cancelación sin Cargo";
    return "Cancelación con Garantía";
  }, [hasGuarantee, isLoadingStripe, stripeEnabled]);

  const handleCancelBooking = async () => {
    if (!booking?.id) return;

    setIsProcessing(true);
    try {
      // 1. Si hay cargo, procesarlo primero
      if (shouldCharge && stripeEnabled) {
        console.log('💳 Procesando cargo por no-show:', {
          bookingId: booking.id,
          amount: totalAmount * ((guaranteePercentage || 30) / 100),
          timestamp: new Date().toISOString()
        });

        // Preparar los datos para la API incluyendo stripeData cuando estén disponibles
        const requestData = {
          bookingId: booking.id,
          amount: totalAmount * ((guaranteePercentage || 30) / 100),
          reason,
          empresaId: organization?.id
        };

        // Si tenemos los datos de Stripe, incluirlos directamente para evitar problemas en el servidor
        if (stripeAccountId && stripePaymentMethodId) {
          console.log('✅ Enviando datos Stripe al servidor:', {
            hasAccountId: Boolean(stripeAccountId),
            hasPaymentMethodId: Boolean(stripePaymentMethodId)
          });

          Object.assign(requestData, {
            stripeData: {
              accountId: stripeAccountId,
              paymentMethodId: stripePaymentMethodId
            }
          });
        }

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

      // 2. Cancelar la reserva
      const { data, error } = await supabase.rpc('cancel_booking_v1', {
        p_booking_id: booking.id,
        p_reason: reason,
        p_should_charge: false // El cargo ya se procesó si era necesario
      });

      if (error) throw error;

      toast({
        title: "Reserva cancelada",
        description: shouldCharge 
          ? "La reserva ha sido cancelada y se ha procesado el cargo"
          : "La reserva ha sido cancelada exitosamente"
      });

      onConfirm?.({ reason, shouldCharge });
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

  // Reset estado al cerrar
  useEffect(() => {
    if (!isOpen) {
      setReason('');
      setShouldCharge(false);
      setIsProcessing(false);
      setLoadAttempted(false);
    }
  }, [isOpen]);

  if (!isOpen) return null

  return createPortal(
    <AnimatePresence>
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
                              Se cobrará el {guaranteePercentage}% del total ({new Intl.NumberFormat('es-ES', {
                                style: 'currency',
                                currency: 'EUR'
                              }).format(chargeAmount)})
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
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Motivo de la cancelación
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    disabled={isProcessing}
                    placeholder="Escribe el motivo de la cancelación (opcional)"
                    className={cn(
                      "w-full px-3 py-2 rounded-lg",
                      "border border-gray-200 bg-white",
                      "focus:outline-none focus:border-gray-300",
                      "transition-colors duration-200",
                      "placeholder:text-gray-400",
                      "text-sm",
                      "h-24 resize-none",
                      isProcessing && "opacity-50 cursor-not-allowed"
                    )}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3">
                <Button
                  onClick={handleCancelBooking}
                  variant="outline"
                  disabled={isProcessing}
                  className={cn(
                    "flex-1 border-gray-200",
                    shouldCharge 
                      ? "hover:border-yellow-200 hover:text-yellow-600 hover:bg-yellow-50"
                      : "hover:border-red-100 hover:text-red-600 hover:bg-red-50",
                    "transition-colors duration-200",
                    isProcessing && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <IconLoader className="animate-spin" />
                      Procesando...
                    </span>
                  ) : (
                    shouldCharge ? 'Cancelar y Aplicar Cargo' : 'Cancelar Reserva'
                  )}
                </Button>
                <Button
                  onClick={onClose}
                  variant="outline"
                  disabled={isProcessing}
                  className="flex-1 border-gray-200 bg-white hover:bg-gray-50/80 transition-colors duration-200"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
} 