import { FormStepField } from "@/types/form-steps";
import { PreviewContainer } from "../../layout/PreviewContainer";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSummaryState } from "./hooks/useSummaryState";
import { PAYMENT_METHODS, AVAILABLE_COUPONS } from "./constants";
import { PriceBreakdown } from "./components/PriceBreakdown";
import { PaymentSection } from "./components/PaymentSection";
import { PaymentTypeSection } from "./components/PaymentTypeSection";
import { CouponsSection } from "./components/CouponsSection";
import { ItemsDetailsModal } from "./modals/ItemsDetailsModal";
import { PaymentMethodModal } from "./modals/PaymentMethodModal";
import { PaymentTypeModal } from "./modals/PaymentTypeModal";
import { CouponsModal } from "./modals/CouponsModal";
import { TotalPrice } from "./components/TotalPrice";
import { PreviewPopup } from "../../shared/PreviewPopup";
import { useState, useEffect, useCallback, useMemo } from "react";
import { SummaryStepField } from "@/components/steps/summary/types";
import { PaymentMethod, PaymentType, PaymentMethodEnum } from "./types";
import { StripeProvider } from "@/providers/StripeProvider";
import { useFormConfig } from '@/hooks/useFormConfig';
import { Loader2 } from "lucide-react";
import { StripeConfigProvider } from "@/contexts/StripeConfigContext";
import { useSummaryBooking } from './hooks/use-summary-booking';
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { useForm } from '@/contexts/FormContext';
import { MobilePaymentContainer } from './components/mobile/MobilePaymentContainer';
import { MobileNavigation } from "@/components/preview/layout/MobileNavigation";
import { PaymentState } from '@/contexts/FormContext';
import { PaymentTypeEnum } from '@/types/bookings';
import { useSummaryBooking as useSummaryBookingHook } from './hooks/use-summary-booking';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { DesktopSummaryLayout } from "./layout/DesktopSummaryLayout";
import { DesktopReservationDetails } from "./components/desktop/DesktopReservationDetails";
import { PaymentState as PaymentStateType } from '@/types/payments';
import { Coupon } from './types';
import { useStoredCards } from "@/hooks/useStoredCards";
import { useStripe } from "@/contexts/StripeContext";

interface SummaryPreviewProps {
  field: SummaryStepField;
  theme: 'light' | 'dark';
  viewType: "mobile" | "desktop";
  onNext: () => void;
  onPrev: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  isPublicView?: boolean;
  slug: string;
}

// Función de utilidad para asegurar que nunca se usa un valor null donde se espera un string
const ensureString = (value: string | null | undefined): string => {
  return value || '';
};

export function SummaryPreview({ 
  field, 
  theme, 
  viewType,
  onNext,
  onPrev,
  isFirstStep,
  isLastStep,
  isPublicView = false,
  slug
}: SummaryPreviewProps) {
  const { empresaId, isLoading: isConfigLoading, error: configError } = useFormConfig(slug);
  const [showStripeError, setShowStripeError] = useState(false);
  const [stripeInitialized, setStripeInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { state, setPayment } = useForm();
  
  useEffect(() => {
    if (!isConfigLoading) {
      if (!empresaId) {
        console.error('[SummaryPreview] Error: No se encontró el ID de empresa');
        setShowStripeError(true);
      } else {
        console.log('[SummaryPreview] ID de empresa encontrado:', empresaId);
        setStripeInitialized(true);
      }
    }
  }, [empresaId, isConfigLoading]);

  // Este es un componente interno que maneja la lógica de procesamiento de pago
  // Solo se renderiza cuando StripeProvider está disponible
  const SummaryContent = useCallback(() => {
    // Hooks y estado seguros aquí porque estamos dentro del StripeProvider
    const { cards, customerInfo } = useStoredCards();
    const stripeContext = useStripe();
    const [isValidForNextStep, setIsValidForNextStep] = useState(false);
    const [showCoupons, setShowCoupons] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState<string | null>(null);
    const [showPopup, setShowPopup] = useState(false);
    
    // Coupon state
    const [couponCode, setCouponCode] = useState('');
    const [couponError, setCouponError] = useState('');

  const { 
    calculations,
    showItemsDetails,
    showPaymentMethods,
    showPaymentTypes,
    setShowItemsDetails,
    setShowPaymentMethods,
    setShowPaymentTypes,
    handleSelectPaymentMethod,
    handleSelectPaymentType,
    selectedPaymentMethod,
    selectedPaymentType,
  } = useSummaryState();

  const {
    isValid,
    hasWarnings,
    validationErrors,
  } = useSummaryBooking({
    onSuccess: () => {
      toast.success('Configuración completada');
    },
    onError: (error) => {
      toast.error(error.message);
      }
    });

    // Determinar si el paso requiere pago
    const requiresPayment = useMemo(() => {
      return calculations?.total > 0 && selectedPaymentType === 'full';
    }, [calculations?.total, selectedPaymentType]);

  useEffect(() => {
    const validateStep = () => {
      const isValid = Boolean(
        selectedPaymentType && 
        selectedPaymentMethod
      );
      setIsValidForNextStep(isValid);
    };

    validateStep();
  }, [selectedPaymentType, selectedPaymentMethod]);

    // Procesar pago con el servicio de pago completo
    const processPayment = async (): Promise<{success: boolean, paymentIntentId?: string}> => {
      console.log('[SummaryPreview] Procesando pago con stripe...');
      
      if (!selectedPaymentMethod) {
        console.error('[SummaryPreview] Error: selectedPaymentMethod es null');
        toast.error('Error en la configuración del método de pago');
        return { success: false };
      }
      
      // Obtener datos necesarios para procesar el pago
        const stripeAccountId = stripeContext?.stripeAccountId;
        const stripeCustomerId = customerInfo?.customerId || customerInfo?.stripeCustomerId;
        
        if (!stripeCustomerId) {
        toast.error('No se encontró información del cliente de Stripe');
        return { success: false };
        }
        
        if (!stripeAccountId) {
        toast.error('No se encontró la cuenta de Stripe');
        return { success: false };
        }
        
      try {
        // Importar el servicio de pago dinámicamente (esto sí es válido)
        const { fullPaymentService } = await import('@/services/full-payment-client.service');
        
        console.log('[SummaryPreview] Procesando pago con tarjeta guardada:', {
          cardId: selectedPaymentMethod.id,
          amount: calculations.total,
          stripeCustomerId: stripeCustomerId,
          stripeAccountId: stripeAccountId
        });
        
        // Procesar el pago con todos los datos necesarios
        const result = await fullPaymentService.processPayment({
          paymentMethodId: selectedPaymentMethod.id,
          amount: calculations.total,
          empresaId: ensureString(empresaId),
          description: 'Pago completo de reserva',
          stripeCustomerId: stripeCustomerId,
          stripeAccountId: stripeAccountId as string
        });
        
        if (!result.success) {
          console.error('[SummaryPreview] Error al procesar pago:', result.error);
          toast.error(result.message || 'Error al procesar el pago');
          return { success: false };
        }

        // Si el pago fue exitoso, actualizar el estado global
        if (result.paymentIntentId) {
          try {
            localStorage.setItem('lastPaymentIntentId', result.paymentIntentId);
            localStorage.setItem('lastPaymentTimestamp', new Date().toISOString());
          } catch (storageError) {
            console.warn('[SummaryPreview] No se pudo guardar en localStorage:', storageError);
          }
          
          // Actualizar estado local
          setPaymentIntent(result.paymentIntentId);
          
          // Actualizar el estado global con el paymentIntentId
          const paymentState: PaymentState = {
            method: 'card' as PaymentMethodEnum,
            type: selectedPaymentType as PaymentTypeEnum,
            processed: true,
            paymentIntentId: ensureString(result.paymentIntentId),
            status: 'completed',
            selectedPaymentMethod: {
              id: selectedPaymentMethod.id,
              brand: selectedPaymentMethod.brand,
              last4: selectedPaymentMethod.last4,
              expMonth: selectedPaymentMethod.expMonth,
              expYear: selectedPaymentMethod.expYear,
              type: selectedPaymentMethod.type,
              name: ensureString(selectedPaymentMethod.name),
              description: ensureString(selectedPaymentMethod.description)
            }
          };
          
          setPayment(paymentState);
          
          return { 
            success: true, 
            paymentIntentId: result.paymentIntentId 
          };
        }
        
        return { success: true };
      } catch (error: any) {
        console.error('[SummaryPreview] Error procesando pago:', error);
        toast.error(`Error al procesar el pago: ${error.message || 'Error desconocido'}`);
        return { success: false };
      }
    };

    // Método específico para el botón "Completar Reserva" en desktop
    const handleReservar = async () => {
      if (!isValid) {
        const errors = validationErrors.map(err => err.message).join('\n');
        toast.error(`Por favor, verifica los siguientes campos:\n${errors}`);
        return;
      }

      if (!selectedPaymentMethod || !selectedPaymentType) {
        toast.error('Por favor, completa la configuración de pago');
        return;
      }

      // Iniciar procesamiento de pago
      setIsProcessing(true);
      toast.loading('Procesando pago...', { id: 'payment-processing' });
      
      try {
        // Si se requiere pago, procesarlo primero
        if (requiresPayment) {
          const paymentResult = await processPayment();
          
          // Limpiar indicador de carga
          toast.dismiss('payment-processing');
          
          if (!paymentResult.success) {
            setIsProcessing(false);
            return;
          }
          
          toast.success('Pago procesado correctamente');
        }
        
        // Solo avanzar al siguiente paso si todo está bien
        setIsProcessing(false);
        onNext();
      } catch (error: any) {
        toast.dismiss('payment-processing');
        console.error('[SummaryPreview] Error en handleReservar:', error);
        toast.error(`Error: ${error.message || 'Error desconocido'}`);
        setIsProcessing(false);
      }
    };

    const handleModalAction = (action: () => void) => {
      if (viewType === 'mobile' || isPublicView) {
        action();
        return;
      }
      setShowPopup(true);
    };

  // Función para manejar la selección de cupones
    const handleSelectCoupon = (coupon: Coupon) => {
    // Implementa la lógica para manejar cupones aquí
    console.log('Cupón seleccionado:', coupon);
    setShowCoupons(false);
    };

  const isMobilePublic = viewType === "mobile" && isPublicView;

  // Renderizar contenido para el layout de desktop
  const renderDesktopLayout = () => {
    return (
      <DesktopSummaryLayout
        theme={theme}
        leftContent={
          <div className="space-y-6">
            {/* Título y subtítulo principal */}
            <div className="mb-6">
              <h2 className={cn(
                "text-xl font-semibold mb-1",
                theme === 'dark' ? "text-white/90" : "text-gray-900"
              )}>
                Finaliza tu reserva
              </h2>
              <p className={cn(
                "text-sm",
                theme === 'dark' ? "text-gray-400" : "text-gray-500"
              )}>
                Configura los detalles de pago para confirmar tu reserva
              </p>
            </div>
            
            {/* Título para la sección de tipo de pago */}
            <div className="mb-2">
              <h3 className={cn(
                "text-sm font-medium",
                theme === 'dark' ? "text-white/80" : "text-gray-700"
              )}>
                Elige cómo deseas realizar el pago
              </h3>
            </div>
            
            <PaymentTypeSection
              theme={theme}
              selectedType={selectedPaymentType}
              onShowTypes={() => handleModalAction(() => setShowPaymentTypes(true))}
              onRemoveType={() => handleSelectPaymentType(null)}
              viewType="desktop"
              onSelectType={handleSelectPaymentType}
                empresaId={ensureString(empresaId)}
            />

            {/* Título para la sección de método de pago */}
            <div className="mt-6 mb-2">
              <h3 className={cn(
                "text-sm font-medium",
                theme === 'dark' ? "text-white/80" : "text-gray-700"
              )}>
                Selecciona tu método de pago
              </h3>
            </div>

            <PaymentSection
              theme={theme}
              selectedMethod={selectedPaymentMethod}
              onShowMethods={() => handleModalAction(() => setShowPaymentMethods(true))}
              onRemoveMethod={() => handleSelectPaymentMethod(null)}
              onUpdateMethod={async (method) => {
                console.log('[SummaryPreview] onUpdateMethod llamado con:', method);
                handleSelectPaymentMethod(method);
                return Promise.resolve();
              }}
              viewType={viewType}
                empresaId={ensureString(empresaId)}
              directCardSelect={viewType === 'desktop'}
            />
            
            {isValid ? (
              <div className="mt-6">
                <Button 
                  onClick={handleReservar}
                  disabled={!isValid || isProcessing}
                  className={cn(
                    "w-full py-3 text-sm",
                    theme === 'dark' ? "bg-indigo-600 hover:bg-indigo-700" : "bg-primary hover:bg-primary/90"
                  )}
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                      Procesando...
                    </div>
                  ) : (
                    "Completar Reserva"
                  )}
                </Button>
              </div>
            ) : (
              validationErrors && validationErrors.length > 0 && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="text-sm">No se puede completar la reserva</AlertTitle>
                  <AlertDescription className="text-xs">
                    Por favor, complete todos los campos requeridos.
                  </AlertDescription>
                </Alert>
              )
            )}
          </div>
        }
        rightContent={
          <div className="space-y-6">
            <TotalPrice 
              total={calculations.total} 
              theme={theme} 
              className="mb-4"
              disableAnimation={true}
            />
            
            <DesktopReservationDetails
              theme={theme}
              calculations={calculations}
            />
          </div>
        }
      />
    );
  };

  return (
            <div className="min-h-full flex flex-col relative">
              <div className={cn(
                "flex-1",
                viewType === "mobile" && isPublicView && "pt-16 pb-24"
              )}>
                {viewType === 'desktop' ? (
                  renderDesktopLayout()
                ) : (
                  <div className={cn(
                    viewType === 'mobile' 
                      ? "px-4 pb-0" 
                      : "space-y-4 px-4 pt-6"
                  )}>
                    <MobilePaymentContainer
                      theme={theme}
                      viewType={viewType}
                      calculations={calculations}
                      selectedPaymentType={selectedPaymentType}
                      selectedPaymentMethod={selectedPaymentMethod}
                      onShowItemsDetails={() => handleModalAction(() => setShowItemsDetails(true))}
                      onShowPaymentTypes={() => handleModalAction(() => setShowPaymentTypes(true))}
                      onShowPaymentMethods={() => handleModalAction(() => setShowPaymentMethods(true))}
                      onRemovePaymentType={() => handleSelectPaymentType(null)}
                      onRemovePaymentMethod={() => handleSelectPaymentMethod(null)}
                      onSelectPaymentMethod={(method) => {
                        console.log('[SummaryPreview] onSelectPaymentMethod de MobilePaymentContainer llamado:', method);
                        
                        // Verificar si se incluye un contexto de pago con un tipo
                        const paymentContext = (method as any).__paymentContext;
                        const paymentType = paymentContext?.selectedPaymentType || selectedPaymentType;
                        const isTypeOnlyUpdate = paymentContext?.isTypeOnlyUpdate === true;
                        
                        // PASO 1: Manejar la actualización del tipo de pago
                        if (paymentContext?.selectedPaymentType) {
                          console.log('[SummaryPreview] Actualizando tipo de pago:', {
                            prevType: selectedPaymentType,
                            newType: paymentContext.selectedPaymentType,
                            isTypeOnlyUpdate
                          });
                          
                          // Actualizar siempre el tipo de pago en el estado local
                          handleSelectPaymentType(paymentContext.selectedPaymentType);
                          
                          // Si es solo actualización de tipo, no procesamos el método de pago
                          if (isTypeOnlyUpdate) {
                            console.log('[SummaryPreview] Evento especial de actualización solo de tipo de pago');
                            
                            // En este caso, solo actualizamos el tipo de pago en el estado global
                            const updatedPaymentState: PaymentState = {
                              ...state.payment,
                              type: paymentContext.selectedPaymentType as unknown as PaymentTypeEnum,
                              // Mantener otros valores del estado actual
                              method: state.payment.method,
                              selectedPaymentMethod: state.payment.selectedPaymentMethod,
                              config: state.payment.config
                            };
                            setPayment(updatedPaymentState);
                            
                            console.log('[SummaryPreview] Tipo de pago actualizado en estado global');
                            return; // Salir para no procesar el método ficticio
                          }
                        }
                        
                        // PASO 2: Solo si no es actualización solo de tipo, procesar el método de pago
                        if (!isTypeOnlyUpdate) {
                          // Extraer y eliminar el contexto para trabajar con un método limpio
                          const { __paymentContext, ...cleanMethod } = method as any;
                          
                          // Actualizar estado local primero
                          handleSelectPaymentMethod(cleanMethod);
                          
                          // Construir un objeto de pago completo para el estado global
                          const paymentToUpdate = {
                            method: cleanMethod.type === 'card' ? 'stripe' : cleanMethod.type as any,
                            // Usar el tipo de pago del contexto o el seleccionado actualmente
                            type: paymentType as any,
                            config: {
                              paymentMethodId: cleanMethod.id,
                              brand: cleanMethod.brand,
                              last4: cleanMethod.last4,
                              expMonth: cleanMethod.expMonth,
                              expYear: cleanMethod.expYear
                            },
                            selectedPaymentMethod: cleanMethod
                          };
                          
                          console.log('[SummaryPreview] Actualizando estado global con:', {
                            method: paymentToUpdate.method,
                            type: paymentToUpdate.type,
                            hasType: !!paymentToUpdate.type
                          });
                          
                          // Actualizar el estado global directamente
                          setPayment(paymentToUpdate);
                        }
                        
                        console.log('[SummaryPreview] Estado de pago actualizado desde MobilePaymentContainer');
                      }}
                      onNext={handleReservar}
                      onPrev={onPrev}
                      isPublicView={isPublicView}
                empresaId={ensureString(empresaId)}
                    />
                  </div>
                )}
              </div>
              
              <ItemsDetailsModal
                isOpen={showItemsDetails}
                onClose={() => setShowItemsDetails(false)}
                theme={theme}
                viewType={viewType}
                items={calculations.selectedItems}
                isPublicView={isPublicView}
              />

              <PaymentTypeModal
                isOpen={showPaymentTypes}
                onClose={() => setShowPaymentTypes(false)}
                theme={theme}
                viewType={viewType}
                onSelect={handleSelectPaymentType}
                onShowCardModal={() => handleModalAction(() => setShowPaymentMethods(true))}
                isPublicView={isPublicView}
          empresaId={ensureString(empresaId)}
              />

              <PaymentMethodModal
                isOpen={showPaymentMethods}
                onClose={() => setShowPaymentMethods(false)}
                theme={theme}
                viewType={viewType}
                onSelect={handleSelectPaymentMethod}
                isPublicView={isPublicView}
          empresaId={ensureString(empresaId)}
              />

              <CouponsModal
                isOpen={showCoupons}
                onClose={() => setShowCoupons(false)}
                theme={theme}
                viewType={viewType}
                onApply={handleSelectCoupon}
                couponCode={couponCode}
                setCouponCode={setCouponCode}
                error={couponError}
                isPublicView={isPublicView}
              />

              <PreviewPopup
                isOpen={showPopup}
                onClose={() => setShowPopup(false)}
                theme={theme}
              />
            </div>
    );
  }, [empresaId, isProcessing, onNext, onPrev, setPayment, state.payment, theme, viewType, isPublicView]); // Solo dependencias externas

  // Esta función se llama cuando se hace clic en "Siguiente" en PreviewContainer
  const handleNext = useCallback(async () => {
    console.log('[SummaryPreview] handleNext invocado desde PreviewContainer');
    
    // Si estamos en la vista desktop y procesando un pago, no avanzar automáticamente
    // El botón de "Completar Reserva" manejará esto
    if (viewType === 'desktop' && isProcessing) {
      console.log('[SummaryPreview] En procesamiento, no avanzar automáticamente');
      return;
    }
    
    // Para el caso estándar, simplemente avanzar
    onNext();
  }, [onNext, viewType, isProcessing]);

  // Verificar si debe ocultarse la navegación estándar
  // Ocultamos navegación si:
  // 1. En vista mobile con isPublicView
  // 2. En vista desktop con botón "Completar Reserva"
  const shouldHideNavigation = (viewType === "mobile" && isPublicView) || (viewType === "desktop");

  return (
    <PreviewContainer 
      viewType={viewType} 
      theme={theme}
      onNext={handleNext}
      onPrev={onPrev}
      isFirstStep={isFirstStep}
      isLastStep={isLastStep}
      isPublicView={isPublicView}
      isNextDisabled={isProcessing}
      hideNavigation={shouldHideNavigation}
      nextLabel="Reservar"
      customLayout={viewType === "desktop"}
    >
      {empresaId && stripeInitialized ? (
        <StripeConfigProvider empresaId={empresaId}>
          <StripeProvider empresaId={empresaId}>
            <SummaryContent />
          </StripeProvider>
        </StripeConfigProvider>
      ) : (
        <div className="flex flex-col items-center justify-center p-6 h-full">
          {showStripeError ? (
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Error de conexión con Stripe</h3>
              <p className="text-sm text-gray-500 mb-4">
                No se pudo conectar con la pasarela de pago. Por favor, inténtalo de nuevo más tarde.
              </p>
              <Button onClick={() => window.location.reload()}>
                Reintentar
              </Button>
            </div>
          ) : (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          )}
        </div>
      )}
    </PreviewContainer>
  );
} 