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
import { useState, useEffect, useCallback } from "react";
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
import { PaymentTypeEnum } from './types';
import { useSummaryBooking as useSummaryBookingHook } from './hooks/use-summary-booking';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

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
  const [isValidForNextStep, setIsValidForNextStep] = useState(false);
  const [showStripeError, setShowStripeError] = useState(false);
  const [stripeInitialized, setStripeInitialized] = useState(false);
  const [showCoupons, setShowCoupons] = useState(false);
  const { state, setPayment } = useForm();

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
    isCreating: isProcessing
  } = useSummaryBooking({
    onSuccess: () => {
      toast.success('Configuración completada');
    },
    onError: (error) => {
      toast.error(error.message);
      setShowStripeError(true);
    }
  });

  const [showPopup, setShowPopup] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState<string | undefined>(undefined);

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

  useEffect(() => {
    if (selectedPaymentMethod && selectedPaymentType) {
      console.log('[SummaryPreview] Actualizando estado global de pago:', {
        method: selectedPaymentMethod,
        type: selectedPaymentType,
        currentState: state.payment
      });
      
      // Crear un objeto de pago completo con todos los datos necesarios
      const paymentUpdate = {
        method: selectedPaymentMethod.type === 'card' ? 'stripe' : selectedPaymentMethod.type as any,
        type: selectedPaymentType as any,
        config: {
          paymentMethodId: selectedPaymentMethod.id,
          brand: selectedPaymentMethod.brand,
          last4: selectedPaymentMethod.last4,
          expMonth: selectedPaymentMethod.expMonth,
          expYear: selectedPaymentMethod.expYear
        },
        // Agregar selectedPaymentMethod completo para tener todas las propiedades
        selectedPaymentMethod: selectedPaymentMethod
      };
      
      console.log('[SummaryPreview] Objeto de pago a actualizar:', paymentUpdate);
      
      // Actualizar el estado global con el objeto completo
      setPayment(paymentUpdate);
      
      console.log('[SummaryPreview] Estado global actualizado');
    }
  }, [selectedPaymentMethod, selectedPaymentType, setPayment]);

  const handleNext = useCallback(async (paymentData?: any) => {
    // Log detallado al inicio para diagnóstico
    console.log('[SummaryPreview] Datos recibidos para avance:', {
      hasPaymentData: !!paymentData,
      paymentIntentId: paymentData?.paymentIntentId,
      processed: paymentData?.processed,
      paymentType: paymentData?.paymentType,
      timestamp: new Date().toISOString()
    });

    // 1. Validaciones iniciales
    if (!isValid) {
      const errors = validationErrors.map(err => err.message).join('\n');
      toast.error(`Por favor, verifica los siguientes campos:\n${errors}`);
      return;
    }

    if (!selectedPaymentType || !selectedPaymentMethod) {
      toast.error('Por favor, completa la configuración de pago');
      return;
    }

    // 2. Verificar si el pago ya fue procesado por MobilePaymentContainer
    if (paymentData?.paymentIntentId && paymentData?.processed) {
      console.log('[SummaryPreview] Pago ya procesado en MobilePaymentContainer:', {
        paymentIntentId: paymentData.paymentIntentId,
        status: paymentData.paymentStatus
      });
      
      // Actualizar estado con el PaymentIntent recibido
      setPaymentIntent(paymentData.paymentIntentId);
      
      // Actualizar el estado global del pago - CRUCIAL para la validación
      setPayment({
        method: 'card',
        type: 'full',
        processed: true,
        paymentIntentId: paymentData.paymentIntentId,
        status: 'completed',
        selectedPaymentMethod: selectedPaymentMethod
      });
      
      // Avanzar al siguiente paso
      onNext();
      return;
    }

    // 3. Si tenemos shouldChargeFullAmount, procesar el pago aquí
    if (paymentData?.shouldChargeFullAmount === true) {
      console.log('[SummaryPreview] Procesando pago completo localmente');
      
      // Mostrar indicador de carga
      toast.loading('Procesando pago...', { id: 'payment-processing' });
      
      try {
        // Importar dinámicamente el servicio de pago
        const { fullPaymentService } = await import('@/services/full-payment-client.service');
        
        // Procesar el pago
        const result = await fullPaymentService.processPayment({
          paymentMethodId: paymentData.stripePaymentMethodId,
          amount: paymentData.amount,
          empresaId: empresaId || '',
          description: 'Pago completo de reserva'
        });
        
        // Limpiar indicador de carga
        toast.dismiss('payment-processing');
        
        if (!result.success) {
          console.error('[SummaryPreview] Error al procesar pago:', result.error);
          toast.error(result.message || 'Error al procesar el pago');
          return; // No avanzar si hay error
        }
        
        // Actualizar estado con el PaymentIntent
        setPaymentIntent(result.paymentIntentId);
        
        // Actualizar el estado global del pago
        setPayment(prevState => ({
          ...prevState,
          method: 'card',
          type: 'full',
          processed: true,
          paymentIntentId: result.paymentIntentId,
          status: 'completed'
        }));
        
        // Notificar éxito
        toast.success('Pago procesado correctamente');
        
        // Avanzar al siguiente paso
        onNext();
        return;
      } catch (error: any) {
        // Limpiar indicador de carga
        toast.dismiss('payment-processing');
        
        // Log detallado del error
        console.error('[SummaryPreview] Error al procesar pago:', error);
        toast.error(`Error al procesar el pago: ${error.message || 'Error desconocido'}`);
        return; // No avanzar si hay error
      }
    }

    // 4. Para otros tipos de pago, continuar normalmente
    console.log('[SummaryPreview] Avanzando sin procesamiento de pago');
    onNext();
  }, [isValid, validationErrors, selectedPaymentType, selectedPaymentMethod, onNext, empresaId, setPayment]);

  const handleModalAction = (action: () => void) => {
    if (viewType === 'mobile' || isPublicView) {
      action();
      return;
    }
    setShowPopup(true);
  };

  const handleReservar = async () => {
    if (!isValid) {
      console.warn('Formulario inválido, no se puede proceder');
      return;
    }

    if (!selectedPaymentMethod || !selectedPaymentType) {
      toast.error('Por favor, completa la configuración de pago');
      return;
    }

    console.log('Formulario válido, procediendo a farewell');
    await onNext();
  };

  // Función para manejar la selección de cupones
  const handleSelectCoupon = useCallback((coupon: string) => {
    // Implementa la lógica para manejar cupones aquí
    console.log('Cupón seleccionado:', coupon);
    setShowCoupons(false);
  }, []);

  const isMobilePublic = viewType === "mobile" && isPublicView;

  // Determinar si debemos ocultar la navegación estándar
  // La ocultamos en móvil público o cuando hay botones específicos del componente
  // que reemplazan la funcionalidad de navegación estándar
  const shouldHideNavigation = isMobilePublic || (viewType === "desktop" && calculations?.total > 0);

  return (
    <PreviewContainer 
      viewType={viewType} 
      theme={theme}
      onNext={handleNext}
      onPrev={onPrev}
      isFirstStep={isFirstStep}
      isLastStep={isLastStep}
      isPublicView={isPublicView}
      isNextDisabled={!isValid || isProcessing}
      hideNavigation={shouldHideNavigation}
      nextLabel="Reservar"
    >
      {empresaId && stripeInitialized ? (
        <StripeConfigProvider empresaId={empresaId}>
          <StripeProvider empresaId={empresaId}>
            <div className="min-h-full flex flex-col relative">
              <div className={cn(
                "flex-1",
                viewType === "mobile" && isPublicView && "pt-16 pb-24"
              )}>
                <div className={cn(
                  viewType === 'mobile' 
                    ? "px-4 pb-0" 
                    : "space-y-4 px-4 pt-6"
                )}>
                  {viewType === 'desktop' && (
                    <div className="relative">
                      <TotalPrice total={calculations.total} theme={theme} />
                    </div>
                  )}

                  {viewType === 'mobile' ? (
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
                            setPayment(prevState => ({
                              ...prevState,
                              type: paymentContext.selectedPaymentType as any,
                              // Mantener otros valores del estado actual
                              method: prevState.method,
                              selectedPaymentMethod: prevState.selectedPaymentMethod,
                              config: prevState.config
                            }));
                            
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
                      empresaId={empresaId}
                    />
                  ) : (
                    <>
                      <PriceBreakdown
                        theme={theme}
                        calculations={calculations}
                        onShowItemsDetails={() => handleModalAction(() => setShowItemsDetails(true))}
                      />

                      <PaymentTypeSection
                        theme={theme}
                        selectedType={selectedPaymentType}
                        onShowTypes={() => handleModalAction(() => setShowPaymentTypes(true))}
                        onRemoveType={() => handleSelectPaymentType(null)}
                      />

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
                        empresaId={empresaId}
                      />
                    </>
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
                  empresaId={empresaId}
                />

                <PaymentMethodModal
                  isOpen={showPaymentMethods}
                  onClose={() => setShowPaymentMethods(false)}
                  theme={theme}
                  viewType={viewType}
                  onSelect={handleSelectPaymentMethod}
                  isPublicView={isPublicView}
                  empresaId={empresaId}
                />

                <CouponsModal
                  isOpen={showCoupons}
                  onClose={() => setShowCoupons(false)}
                  theme={theme}
                  viewType={viewType}
                  onSelect={handleSelectCoupon}
                  isPublicView={isPublicView}
                />

                <PreviewPopup
                  isOpen={showPopup}
                  onClose={() => setShowPopup(false)}
                  theme={theme}
                />
              </div>
            </div>
          </StripeProvider>
        </StripeConfigProvider>
      ) : (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      )}
    </PreviewContainer>
  );
} 