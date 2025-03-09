import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { PriceBreakdown } from "../PriceBreakdown";
import { PaymentTypeSection } from "../PaymentTypeSection";
import { PaymentSection } from "../PaymentSection";
import { withResponsiveView } from "../../hoc/withResponsiveView";
import { PaymentType, PaymentTypeEnum, PaymentMethod, PaymentMethodEnum, SelectedItem, PAYMENT_TYPES } from "../../types";
import { MobileNavigation } from "@/components/preview/layout/MobileNavigation";
import { MobileNextButton } from "@/components/preview/layout/MobileNextButton";
import { MobileReservationHeader } from "./MobileReservationHeader";
import { useState, useEffect, useRef, useCallback } from "react";
import { ReservationDetails } from "../ReservationDetails";
import { ChevronRight, ChevronDown, Check, X } from "lucide-react";
import { PaymentTypeList } from "../PaymentTypeList";
import { useStripeConnection } from "@/hooks/useStripeConnection";
import { toast } from "sonner";
import { PaymentUpdateEvent, PaymentSelectionHandlers } from "../../types";
import { useStoredCards } from "@/hooks/useStoredCards";
import { useStripe } from "@/contexts/StripeContext";
import { useForm } from "@/contexts/FormContext";

// Filtrar solo los tipos de pago que queremos mostrar
const FILTERED_PAYMENT_TYPES = PAYMENT_TYPES.filter(type => 
  !['card', 'cash'].includes(type.id)
);

// Definir los tipos de vista disponibles
type ViewStep = 'details' | 'payment';

interface MobilePaymentContainerProps {
  theme: 'light' | 'dark';
  viewType: 'mobile' | 'desktop';
  calculations: {
    courtPrice: number;
    itemsTotal: number;
    discount: number;
    total: number;
    selectedItems: SelectedItem[];
  };
  selectedPaymentType: PaymentTypeEnum | null;
  selectedPaymentMethod: PaymentMethod | null;
  onShowItemsDetails: () => void;
  onShowPaymentTypes: () => void;
  onShowPaymentMethods: () => void;
  onRemovePaymentType: () => void;
  onRemovePaymentMethod: () => void;
  onSelectPaymentMethod: (method: PaymentMethod) => void;
  onNext: (paymentData?: any) => void;
  onPrev?: () => void;
  isPublicView?: boolean;
  empresaId: string;
}

// Componente para el título de la sección
function SectionTitle({
  title,
  subtitle,
  theme
}: {
  title: string;
  subtitle: string;
  theme: 'light' | 'dark';
}) {
  return (
    <div className="mb-6">
      <h2 className={cn(
        "text-xl font-semibold mb-1",
        theme === 'dark' ? "text-white" : "text-gray-900"
      )}>
        {title}
      </h2>
      <p className={cn(
        "text-sm",
        theme === 'dark' ? "text-gray-400" : "text-gray-600"
      )}>
        {subtitle}
      </p>
    </div>
  );
}

// Componente para mostrar un elemento de la lista de tipos de pago
function PaymentTypeItem({
  type,
  isSelected,
  onClick,
  theme
}: {
  type: PaymentType;
  isSelected: boolean;
  onClick: () => void;
  theme: 'light' | 'dark';
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "p-4 rounded-lg cursor-pointer transition-all",
        "flex items-center justify-between",
        theme === 'dark'
          ? isSelected ? "bg-neutral-700" : "hover:bg-neutral-800"
          : isSelected ? "bg-gray-100" : "hover:bg-gray-50",
      )}
    >
      <div className="space-y-1">
        <p className={cn(
          "text-sm font-medium",
          theme === 'dark' ? "text-white" : "text-gray-900"
        )}>
          {type.name}
        </p>
        <p className={cn(
          "text-xs",
          theme === 'dark' ? "text-gray-400" : "text-gray-500"
        )}>
          {type.description}
        </p>
      </div>
      {isSelected && (
        <Check className={cn(
          "h-5 w-5",
          theme === 'dark' ? "text-blue-400" : "text-blue-600"
        )} />
      )}
    </div>
  );
}

// Componente para la lista desplegable de tipos de pago
function PaymentTypeDropdown({
  theme,
  isOpen,
  selectedType,
  onSelect,
  onClose
}: {
  theme: 'light' | 'dark';
  isOpen: boolean;
  selectedType: PaymentTypeEnum | null;
  onSelect: (type: PaymentTypeEnum) => void;
  onClose: () => void;
}) {
  // Referencia para detectar clics fuera del dropdown
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Efecto para cerrar el dropdown al hacer clic fuera
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Si no está abierto, no renderizamos nada
  if (!isOpen) return null;

  return (
    <motion.div
      ref={dropdownRef}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "absolute left-0 right-0 z-50 mt-2 origin-top",
        "rounded-lg shadow-lg",
        "overflow-hidden",
        theme === 'dark' ? "bg-neutral-900" : "bg-white",
        "border",
        theme === 'dark' ? "border-neutral-700" : "border-gray-200"
      )}
    >
      <div className="max-h-[300px] overflow-y-auto scrollbar-hide py-2 space-y-1">
        {FILTERED_PAYMENT_TYPES.map((type) => (
          <PaymentTypeItem
            key={type.id}
            type={type}
            isSelected={selectedType === type.id}
            onClick={() => {
              onSelect(type.id as PaymentTypeEnum);
              onClose();
            }}
            theme={theme}
          />
        ))}
      </div>
    </motion.div>
  );
}

// Componente para la selección de tipo de pago
function PaymentTypeSelector({
  theme,
  selectedType,
  onSelect,
  empresaId,
  onShowPaymentTypes,
  onShowCardModal,
  onRemovePaymentType
}: {
  theme: 'light' | 'dark';
  selectedType: PaymentTypeEnum | null;
  onSelect: (type: PaymentTypeEnum) => void;
  empresaId: string;
  onShowPaymentTypes: () => void;
  onShowCardModal?: () => void;
  onRemovePaymentType?: () => void;
}) {
  const [showOptions, setShowOptions] = useState(false);
  
  // Buscar el tipo de pago seleccionado para mostrar su nombre
  const selectedPaymentTypeData = selectedType 
    ? FILTERED_PAYMENT_TYPES.find(type => type.id === selectedType) 
    : null;

  const handleSelectType = (type: PaymentTypeEnum) => {
    // Para tipos que requieren validación especial (garantía y pago con seña)
    if (type === 'guarantee' || type === 'deposit') {
      if (!empresaId) {
        return;
      }

      // FLUJO CRÍTICO: Adaptado para el nuevo comportamiento sin modal
      // 1. Primero establecemos el tipo de pago
      onSelect(type);
      
      // 2. Cerramos las opciones de tipos de pago
      setShowOptions(false);
      
      // 3. Ya no mostramos el modal ni informamos al usuario
      // Mensaje eliminado
      /* 
      toast.info('Selecciona una tarjeta para continuar', {
        duration: 4000,
        description: 'La lista de tarjetas se ha expandido automáticamente'
      });
      */
      
      // La expansión de la lista de tarjetas ahora se maneja en handlePaymentTypeSelect
      // a través del estado expandCardList
    } else {
      // Para otros tipos de pago, selección directa
      onSelect(type);
      setShowOptions(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Título para la sección de tipo de pago */}
      <div className="flex items-center justify-between">
        <p className={cn(
          "text-sm font-medium",
          theme === 'dark' ? "text-gray-300" : "text-gray-700"
        )}>
          Elige cómo deseas realizar el pago
        </p>
      </div>

      {!selectedType ? (
        // Si no hay tipo seleccionado, mostrar un área clickeable para seleccionar
        <motion.div
          whileHover={{ scale: 1.0, boxShadow: "none" }}
          whileTap={{ scale: 1.0, boxShadow: "none" }}
          onClick={() => setShowOptions(!showOptions)}
          className={cn(
            "w-full rounded-lg cursor-pointer",
            "transition-all duration-200",
            "bg-white dark:bg-neutral-900",
            "border border-gray-100 dark:border-neutral-800",
            "hover:border-gray-200 dark:hover:border-neutral-700",
            "shadow-none",
            "h-[52px] flex items-center px-4"
          )}
        >
          <div className="flex items-center gap-3 w-full justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-1.5 rounded-md transition-colors",
                theme === 'dark' 
                  ? "bg-neutral-800" 
                  : "bg-gray-50"
              )}>
                <ChevronRight className={cn(
                  "h-4 w-4",
                  theme === 'dark' ? "text-gray-400" : "text-gray-500"
                )} />
              </div>
              <span className={cn(
                "text-[15px]",
                theme === 'dark' ? "text-gray-400" : "text-gray-500"
              )}>
                Seleccionar tipo de pago
              </span>
            </div>
            <ChevronDown className={cn(
              "h-4 w-4 transition-transform duration-300",
              showOptions && "transform rotate-180",
              theme === 'dark' ? "text-gray-400" : "text-gray-500"
            )} />
          </div>
        </motion.div>
      ) : (
        // Si hay un tipo seleccionado, mostrar la información con opciones
        <motion.div
          whileHover={{ scale: 1.0, boxShadow: "none" }}
          whileTap={{ scale: 1.0, boxShadow: "none" }}
          onClick={() => setShowOptions(!showOptions)}
          className={cn(
            "w-full rounded-lg cursor-pointer",
            "transition-all duration-200",
            "p-3",
            "bg-white dark:bg-neutral-900",
            "border border-gray-100 dark:border-neutral-800",
            "hover:border-gray-200 dark:hover:border-neutral-700",
            "shadow-none"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-1.5 rounded-md transition-colors",
                theme === 'dark' 
                  ? "bg-neutral-800" 
                  : "bg-gray-50"
              )}>
                <Check className={cn(
                  "h-4 w-4",
                  theme === 'dark' ? "text-green-400" : "text-green-500"
                )} />
              </div>
              <div className="flex flex-col">
                <span className={cn(
                  "text-sm font-medium",
                  theme === 'dark' ? "text-gray-200" : "text-gray-900"
                )}>
                  {selectedPaymentTypeData?.name || selectedType}
                </span>
                <span className={cn(
                  "text-xs",
                  theme === 'dark' ? "text-gray-400" : "text-gray-500"
                )}>
                  {selectedPaymentTypeData?.description || ''}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform duration-300",
                showOptions && "transform rotate-180",
                theme === 'dark' ? "text-gray-400" : "text-gray-500"
              )} />
              {/* Botón para eliminar el tipo de pago seleccionado */}
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Evitar que se propague al contenedor y abra las opciones
                  if (onRemovePaymentType) {
                    onRemovePaymentType();
                  }
                }}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  theme === 'dark' 
                    ? "text-gray-400 hover:bg-neutral-700"
                    : "text-gray-400 hover:bg-gray-100"
                )}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Mostrar la lista de opciones si está abierta */}
      <AnimatePresence>
        {showOptions && (
          <motion.div
            initial={{ opacity: 0, y: -5, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -5, height: 0 }}
            transition={{ 
              duration: 0.2,
              ease: [0.32, 0.72, 0, 1] // Curva de animación más suave
            }}
            className={cn(
              "rounded-lg overflow-hidden mt-1",
              theme === 'dark' 
                ? "bg-neutral-900 border-neutral-800" 
                : "bg-white border-gray-100",
              "border",
              "shadow-none"
            )}
          >
            <PaymentTypeList
              theme={theme}
              selectedType={selectedType}
              onSelect={handleSelectType}
              paymentTypes={FILTERED_PAYMENT_TYPES}
              isExpanded={true}
              noContainer={true}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MobilePaymentContainerBase({
  theme,
  viewType,
  calculations,
  selectedPaymentType,
  selectedPaymentMethod,
  onShowItemsDetails,
  onShowPaymentTypes,
  onShowPaymentMethods,
  onRemovePaymentType,
  onRemovePaymentMethod,
  onSelectPaymentMethod,
  onNext,
  onPrev,
  isPublicView,
  empresaId
}: MobilePaymentContainerProps) {
  const [currentView, setCurrentView] = useState<ViewStep>('details');
  const [localSelectedType, setLocalSelectedType] = useState<PaymentTypeEnum | null>(selectedPaymentType);
  const [localSelectedMethod, setLocalSelectedMethod] = useState<PaymentMethod | null>(selectedPaymentMethod);
  const [expandCardList, setExpandCardList] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  // Obtener datos de tarjetas guardadas que incluyen el customerId
  const { cards, isLoading: cardsLoading, customerInfo } = useStoredCards();
  
  // Obtener el stripeAccountId directamente del contexto de Stripe
  const stripeContext = useStripe();
  const stripeAccountId = stripeContext?.stripeAccountId;
  
  // Obtener acceso al contexto del formulario para actualizar el estado de pago
  const { setPayment } = useForm();
  
  // Estado para customerId (usando el valor del hook useStoredCards)
  const [stripeData, setStripeData] = useState<{
    customerId?: string | null;
    loaded: boolean;
  }>({ 
    customerId: null,
    loaded: false 
  });
  
  // Efecto para sincronizar el customerId desde useStoredCards
  useEffect(() => {
    console.log('[MobilePaymentContainer] Estado de customerInfo:', customerInfo);
    
    if (customerInfo?.customerId && !stripeData.loaded) {
      console.log('[MobilePaymentContainer] Usando customerId desde useStoredCards:', customerInfo.customerId);
      setStripeData({
        customerId: customerInfo.customerId,
        loaded: true
      });
    } else if (customerInfo?.stripeCustomerId && !stripeData.loaded) {
      // Usar stripeCustomerId como fallback
      console.log('[MobilePaymentContainer] Usando stripeCustomerId como fallback:', customerInfo.stripeCustomerId);
      setStripeData({
        customerId: customerInfo.stripeCustomerId,
        loaded: true
      });
    }
  }, [customerInfo, stripeData.loaded]);
  
  // Sincronizar estados locales con props
  useEffect(() => {
    setLocalSelectedType(selectedPaymentType);
  }, [selectedPaymentType]);
  
  useEffect(() => {
    setLocalSelectedMethod(selectedPaymentMethod);
  }, [selectedPaymentMethod]);
  
  // Manejadores para procesamiento de pago
  const handleNext = useCallback(async () => {
    if (currentView === 'details') {
      setCurrentView('payment');
      return;
    }

    if (!localSelectedType || !localSelectedMethod) {
      return;
    }

    console.log('[MobilePaymentContainer] Gestión de siguiente paso:', {
      currentView,
      selectedType: localSelectedType,
      selectedMethodId: localSelectedMethod.id,
      hasStripeCustomerId: !!stripeData.customerId,
      timestamp: new Date().toISOString()
    });

    // Si el tipo de pago es "full", procesamos el pago antes de avanzar
    if (localSelectedType === 'full' && localSelectedMethod) {
      console.log('[MobilePaymentContainer] Iniciando procesamiento de pago completo');
      
      try {
        // 1. Mostrar indicador de carga
        toast.loading('Procesando pago...', { id: 'payment-processing' });
        
        // 2. Verificar que tengamos los datos necesarios
        // Buscar el customerId en todas las fuentes posibles
        const effectiveCustomerId = 
          stripeData.customerId || 
          customerInfo?.customerId || 
          customerInfo?.stripeCustomerId;
        
        // Log para depuración
        console.log('[MobilePaymentContainer] Datos de customerId:', {
          fromState: stripeData.customerId,
          fromHook: customerInfo?.customerId,
          fromHookAlt: customerInfo?.stripeCustomerId,
          effective: effectiveCustomerId
        });
        
        if (!effectiveCustomerId) {
          console.error('[MobilePaymentContainer] No se encontró customer_id en ninguna de las fuentes disponibles');
          throw new Error('No se encontró información del cliente de Stripe necesaria para procesar el pago');
        }
        
        // 3. Importar el servicio de pago
        const { fullPaymentService } = await import('@/services/full-payment-client.service');
        
        // 4. Procesar el pago
        setIsProcessingPayment(true);
        
        console.log('Procesando pago on-session con tarjeta guardada:', {
          cardId: localSelectedMethod.id,
          last4: localSelectedMethod.last4,
          brand: localSelectedMethod.brand,
          amount: calculations.total,
          stripeCustomerId: effectiveCustomerId,
          stripeAccountId: stripeAccountId
        });
        
        const result = await fullPaymentService.processPayment({
          paymentMethodId: localSelectedMethod.id,
          amount: calculations.total,
          empresaId: empresaId,
          description: 'Pago completo de reserva',
          stripeCustomerId: effectiveCustomerId,   // Usar el dato ya disponible
          stripeAccountId: stripeAccountId as string  // Asegurarnos de que sea string
        });
        
        // 5. Limpiar indicador de carga
        toast.dismiss('payment-processing');
        
        // 6. Manejar el resultado
        if (!result.success) {
          console.error('[MobilePaymentContainer] Error al procesar pago:', result.error);
          toast.error(result.message || 'Error al procesar el pago');
          return; // No avanzar si hay error
        }
        
        console.log('[MobilePaymentContainer] Pago procesado exitosamente:', {
          paymentIntentId: result.paymentIntentId,
          status: result.chargeStatus
        });
        
        // 7. Actualizar tipo de pago seleccionado
        setLocalSelectedType(localSelectedType);
        
        // 8. Notificar éxito
        toast.success('Pago procesado correctamente');
        
        // IMPORTANTE: Guardar el paymentIntentId en localStorage como respaldo
        if (result.paymentIntentId) {
          try {
            localStorage.setItem('lastPaymentIntentId', result.paymentIntentId);
            localStorage.setItem('lastPaymentTimestamp', new Date().toISOString());
            console.log('[MobilePaymentContainer] PaymentIntentId guardado en localStorage como respaldo');
          } catch (storageError) {
            console.warn('[MobilePaymentContainer] No se pudo guardar en localStorage:', storageError);
          }
        }
        
        // 9. Preparar datos para siguiente paso
        const paymentData = {
          paymentType: localSelectedType,
          paymentMethod: localSelectedMethod,
          amount: calculations.total,
          stripePaymentMethodId: localSelectedMethod.id,
          empresaId: empresaId,
          paymentIntentId: result.paymentIntentId,    // Incluir el PaymentIntent
          processed: true,
          paymentStatus: 'completed'
        };
        
        // IMPORTANTE: Estos pasos son fundamentales para que la creación de la reserva funcione correctamente
        // 1. Asegurar que el componente reconozca el tipo y método de pago seleccionados
        onRemovePaymentType();
        onRemovePaymentMethod();
        onSelectPaymentMethod(localSelectedMethod);
        
        // 2. Actualizar el contexto global del formulario con el paymentIntentId
        // Esto es CRÍTICO: use-summary-booking.ts verifica este valor antes de crear la reserva
        setPayment({
          method: 'card',
          type: 'full' as unknown as PaymentTypeEnum,
          processed: true,
          paymentIntentId: result.paymentIntentId,
          status: 'completed',
          selectedPaymentMethod: localSelectedMethod
        });
        
        // Agregar paymentIntentId a localSelectedMethod para que se propague mejor
        const enhancedMethod = {
          ...localSelectedMethod,
          // Usar una propiedad adicional segura para evitar errores de tipo
          _additionalData: {
            paymentIntentId: result.paymentIntentId
          }
        };
        
        // Llamar de nuevo a onSelectPaymentMethod con el método enriquecido
        onSelectPaymentMethod(enhancedMethod);
        
        // Log adicional para verificar la actualización
        console.log('[MobilePaymentContainer] Estado de pago global actualizado con PaymentIntent:', {
          paymentIntentId: result.paymentIntentId,
          method: 'card', 
          type: 'full'
        });
        
        // 10. Avanzar al siguiente paso
        console.log('[MobilePaymentContainer] Avanzando al siguiente paso con pago procesado:', {
          paymentIntentId: result.paymentIntentId
        });
        
        // Avanzar al siguiente paso con los datos de pago enriquecidos
        onNext({
          ...paymentData,
          selectedPaymentMethod: enhancedMethod  // Usar el método enriquecido
        });
      } catch (error: any) {
        // Manejar errores
        toast.dismiss('payment-processing');
        console.error('[MobilePaymentContainer] Error procesando pago:', error);
        
        // Log detallado para depuración
        console.error('[MobilePaymentContainer] Detalles completos:', {
          stack: error.stack,
          message: error.message,
          timestamp: new Date().toISOString()
        });
        
        toast.error(`Error al procesar el pago: ${error.message || 'Error desconocido'}`);
      }
      
      return;
    }

    // Flujo para pago con seña (30% del total)
    if (localSelectedType === 'deposit' && localSelectedMethod) {
      console.log('[MobilePaymentContainer] Iniciando procesamiento de pago con seña (30%)');
      
      try {
        // 1. Mostrar indicador de carga
        toast.loading('Procesando pago de seña...', { id: 'deposit-payment-processing' });
        
        // 2. Verificar que tengamos los datos necesarios
        // Buscar el customerId en todas las fuentes posibles
        const effectiveCustomerId = 
          stripeData.customerId || 
          customerInfo?.customerId || 
          customerInfo?.stripeCustomerId;
        
        // Log para depuración
        console.log('[MobilePaymentContainer] Datos de customerId para seña:', {
          fromState: stripeData.customerId,
          fromHook: customerInfo?.customerId,
          fromHookAlt: customerInfo?.stripeCustomerId,
          effective: effectiveCustomerId
        });
        
        if (!effectiveCustomerId) {
          console.error('[MobilePaymentContainer] No se encontró customer_id en ninguna de las fuentes disponibles');
          throw new Error('No se encontró información del cliente de Stripe necesaria para procesar el pago con seña');
        }
        
        // 3. Importar el servicio de pago con seña
        const { depositPaymentService } = await import('@/services/deposit-payment-client.service');
        
        // 4. Procesar el pago con seña
        setIsProcessingPayment(true);
        
        const totalAmount = calculations.total;
        const depositPercentage = 30; // 30% de seña por defecto
        const depositAmount = totalAmount * (depositPercentage / 100);
        
        console.log('Procesando pago con seña (30%) on-session con tarjeta guardada:', {
          cardId: localSelectedMethod.id,
          last4: localSelectedMethod.last4,
          brand: localSelectedMethod.brand,
          totalAmount,
          depositPercentage,
          depositAmount,
          stripeCustomerId: effectiveCustomerId,
          stripeAccountId: stripeAccountId
        });
        
        const result = await depositPaymentService.processPayment({
          paymentMethodId: localSelectedMethod.id,
          amount: depositAmount,             // Monto de la seña (30%)
          totalAmount,                       // Monto total de la reserva
          depositPercentage,                 // Porcentaje de la seña
          empresaId: empresaId,
          description: 'Pago de seña para reserva (30%)',
          stripeCustomerId: effectiveCustomerId,
          stripeAccountId: stripeAccountId as string,
          off_session: false                 // Explícitamente indicamos que el usuario está presente
        });
        
        // 5. Limpiar indicador de carga
        toast.dismiss('deposit-payment-processing');
        
        // 6. Manejar el resultado
        if (!result.success) {
          console.error('[MobilePaymentContainer] Error al procesar pago con seña:', result.error);
          toast.error(result.message || 'Error al procesar el pago con seña');
          setIsProcessingPayment(false);
          return; // No avanzar si hay error
        }
        
        console.log('[MobilePaymentContainer] Pago con seña procesado exitosamente:', {
          paymentIntentId: result.paymentIntentId,
          status: result.chargeStatus,
          depositAmount: result.depositAmount,
          depositPercentage: result.depositPercentage
        });
        
        // 7. Actualizar tipo de pago seleccionado
        setLocalSelectedType(localSelectedType);
        
        // 8. Notificar éxito
        toast.success(`Pago de seña (${depositPercentage}%) procesado correctamente`);
        
        // IMPORTANTE: Guardar el paymentIntentId en localStorage como respaldo
        if (result.paymentIntentId) {
          try {
            localStorage.setItem('lastDepositPaymentIntentId', result.paymentIntentId);
            localStorage.setItem('lastDepositPaymentTimestamp', new Date().toISOString());
            localStorage.setItem('lastDepositPercentage', String(depositPercentage));
            console.log('[MobilePaymentContainer] PaymentIntentId de seña guardado en localStorage como respaldo');
          } catch (storageError) {
            console.warn('[MobilePaymentContainer] No se pudo guardar en localStorage:', storageError);
          }
        }
        
        // 9. Preparar datos para siguiente paso
        const paymentData = {
          paymentType: localSelectedType,
          paymentMethod: localSelectedMethod,
          totalAmount,
          depositAmount: result.depositAmount || depositAmount,
          depositPercentage: result.depositPercentage || depositPercentage,
          stripePaymentMethodId: localSelectedMethod.id,
          empresaId: empresaId,
          paymentIntentId: result.paymentIntentId,
        };
        
        // 10. Avanzar al siguiente paso
        onNext(paymentData);
      } catch (error: any) {
        console.error('[MobilePaymentContainer] Error en procesamiento de pago con seña:', error);
        toast.dismiss('deposit-payment-processing');
        toast.error('Error al procesar el pago con seña: ' + error.message);
        setIsProcessingPayment(false);
      }
      return;
    }
    
    console.log('[MobilePaymentContainer] Avanzando al siguiente paso sin procesar pagos');
    onNext();
  }, [
    currentView, 
    localSelectedType, 
    localSelectedMethod, 
    onNext, 
    calculations, 
    empresaId, 
    setLocalSelectedType,
    toast,
    stripeData,  // Incluir stripeData como dependencia
    customerInfo,  // Incluir customerInfo como dependencia
    stripeAccountId,  // Incluir stripeAccountId como dependencia
    setIsProcessingPayment,
    onRemovePaymentType,
    onRemovePaymentMethod,
    onSelectPaymentMethod,
    useForm
  ]);

  if (viewType !== 'mobile') return null;

  const handlePaymentTypeSelect = (type: PaymentTypeEnum) => {
    console.log(`[MobilePaymentContainer] handlePaymentTypeSelect: ${type}`);
    
    // Actualizar el estado local inmediatamente
    setLocalSelectedType(type);
    
    // El tipo 'guarantee', 'full' y 'deposit' requieren un tratamiento especial
    // NOTA: El tipo 'deposit' debe resultar en un estado de pago 'partial'
    // que se configura en PAYMENT_TYPE_MAPPINGS en src/types/bookings.ts
    // IMPORTANTE: Además, tanto 'deposit', 'full' como 'guarantee' siempre deben usar
    // el método de pago 'card', lo cual se fuerza en use-summary-booking.ts
    const isSpecialType = type === 'guarantee' || type === 'full' || type === 'deposit';

    // Limpieza de estados previos si es necesario
    if (selectedPaymentType && selectedPaymentType.toString() !== type.toString()) {
      console.log(`[MobilePaymentContainer] Removiendo tipo actual: ${selectedPaymentType}`);
      onRemovePaymentType();
    }
    
    // IMPORTANTE: Actualizar el estado global con el tipo de pago
    console.log(`[MobilePaymentContainer] Actualizando tipo de pago global: ${type}`);
    
    // SOLUCIÓN: Para los casos especiales, NO abrimos el modal
    // y en su lugar forzamos la actualización del estado global manualmente
    if (!isSpecialType) {
      // Solo para tipos de pago normales, permitimos que se abra el modal si es necesario
      console.log(`[MobilePaymentContainer] Notificando al padre sobre tipo seleccionado: ${type}`);
      onShowPaymentTypes();
    } else {
      console.log(`[MobilePaymentContainer] Flujo directo para tipo especial: ${type}, evitando modal`);
      // NOTA IMPORTANTE: Aquí no llamamos a onShowPaymentTypes para evitar abrir el modal
      
      // En su lugar, forzamos la actualización del tipo de pago en el estado global
      // a través de cualquier método de pago existente o creando un evento especial
      if (!localSelectedMethod) {
        console.log(`[MobilePaymentContainer] No hay método seleccionado, forzando actualización de tipo = ${type}`);
        
        // SOLUCIÓN CRÍTICA: Crear un evento especial de actualización de tipo
        // que será capturado en SummaryPreview para actualizar el estado global
        if (onSelectPaymentMethod) {
          console.log(`[MobilePaymentContainer] Enviando evento especial de tipo de pago: ${type}`);
          
          // Crear un objeto especial que será interpretado por onSelectPaymentMethod
          // como una instrucción para actualizar solo el tipo de pago
          onSelectPaymentMethod({
            id: `special_type_update_${Date.now()}`,  // ID único para este evento
            type: 'special',  // Marca este objeto como especial
            brand: 'none',  // Valores requeridos pero no usados
            last4: '0000',
            expMonth: 1,
            expYear: 2030,
            name: 'Actualización de tipo',
            description: 'Evento especial para actualizar tipo de pago',
            // La información crítica que necesitamos propagar:
            __paymentContext: {
              selectedPaymentType: type,
              isTypeOnlyUpdate: true  // Marca esto como actualización solo de tipo
            }
          } as any);
        }
        
        // Expandir lista de tarjetas solo para tipo garantía
        setExpandCardList(type === 'guarantee');
      }
    }
    
    // 2. Forzar la actualización del método actual (si existe) para que incluya el nuevo tipo
    if (localSelectedMethod) {
      console.log(`[MobilePaymentContainer] Actualizando método existente con nuevo tipo: ${type}`);
      // Usar casting a any para evitar el error de TypeScript
      onSelectPaymentMethod({
        ...localSelectedMethod,
        // Asegurarnos de que el tipo de pago seleccionado se incluya en la próxima actualización
        // del método de pago (esto es clave para la solución)
        __selectedPaymentType: type
      } as any);
    }
    
    // Si es garantía, podemos mostrar un mensaje informativo
    if (type === 'guarantee') {
      console.log(`[MobilePaymentContainer] Procesando selección de garantía sin modal`);
      
      // Expandir la lista de tarjetas solo para garantía
      setExpandCardList(true);
    } else {
      // Para otros tipos, simplemente actualizamos el estado local
      const typeName = FILTERED_PAYMENT_TYPES.find(t => t.id === type)?.name || type;
      setExpandCardList(false); // No necesitamos expandir la lista para otros tipos
    }
  };

  const isMobilePublic = viewType === "mobile" && isPublicView;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ 
        duration: 0.3, 
        delay: 0.3, 
        ease: "easeOut" 
      }}
      className="fixed inset-0 flex flex-col bg-white dark:bg-neutral-900 overflow-hidden"
    >
      {isMobilePublic && (
        <>
          <MobileNavigation
            theme={theme}
            onPrev={currentView === 'details' ? onPrev : () => setCurrentView('details')}
            isPublicView={isPublicView}
            className="absolute top-6 left-6 z-50"
          />
          <MobileNextButton
            theme={theme}
            onNext={handleNext}
            isDisabled={currentView === 'payment' && (!selectedPaymentType || !selectedPaymentMethod)}
            isPublicView={isPublicView}
            viewType={viewType}
            variant="default"
          />
        </>
      )}

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ 
          duration: 0.3, 
          delay: 0.4, 
          ease: "easeOut" 
        }}
        className="flex-1 overflow-y-auto scrollbar-hide"
      >
        <div className="min-h-full flex flex-col">
          <MobileReservationHeader
            theme={theme}
            total={calculations.total}
          />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: 0.3,
              delay: 0.5,
              ease: "easeOut"
            }}
            className={cn(
              "flex-1 bg-white dark:bg-neutral-900",
              "rounded-t-[2rem] -mt-8",
              "shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.3)]",
              "dark:shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.5)]",
              "relative z-10"
            )}
          >
            <AnimatePresence mode="wait">
              {currentView === 'details' ? (
                <motion.div
                  key="details"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ 
                    duration: 0.3,
                    ease: "easeOut"
                  }}
                  className="divide-y divide-gray-100 dark:divide-gray-800"
                >
                  <div className="px-6 py-6">
                    <ReservationDetails
                      theme={theme}
                      calculations={calculations}
                      viewType={viewType}
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="payment"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ 
                    duration: 0.3,
                    ease: "easeOut"
                  }}
                >
                  <div className="px-6 pt-6 pb-3">
                    {/* Titulo y subtitulo para la sección de pagos */}
                    <SectionTitle 
                      theme={theme}
                      title="Finaliza tu reserva"
                      subtitle="Configura los detalles de pago para confirmar tu reserva"
                    />
                    
                    <PriceBreakdown
                      theme={theme}
                      calculations={calculations}
                      onShowItemsDetails={onShowItemsDetails}
                      viewType={viewType}
                      hideDetails={true}
                    />
                  </div>
                  
                  <div className="px-6 py-4">
                    {/* Selector de tipo de pago con lista desplegable */}
                    <PaymentTypeSelector
                      theme={theme}
                      selectedType={localSelectedType || selectedPaymentType}
                      onSelect={handlePaymentTypeSelect}
                      empresaId={empresaId}
                      onShowPaymentTypes={onShowPaymentTypes}
                      onShowCardModal={onShowPaymentMethods}
                      onRemovePaymentType={onRemovePaymentType}
                    />
                  </div>
                  
                  {/* 
                    En vista móvil no necesitamos PaymentTypeSection porque:
                    1. PaymentTypeSelector ya muestra el tipo seleccionado
                    2. Evitamos duplicar información en la pantalla
                    3. El usuario aún puede cambiar el tipo usando PaymentTypeSelector
                    
                    Sin embargo, en caso de que este componente se reutilice en vista desktop 
                    o se necesite por cualquier motivo en el futuro, lo dejamos condicionalmente
                    visible solo cuando viewType no sea "mobile".
                  */}
                  {viewType !== 'mobile' && selectedPaymentType && (
                    <div className="px-6 py-4" data-payment-type-section>
                      <PaymentTypeSection
                        theme={theme}
                        selectedType={selectedPaymentType}
                        onShowTypes={onShowPaymentTypes}
                        onRemoveType={onRemovePaymentType}
                      />
                    </div>
                  )}
                  
                  <div className="px-6 py-4 pb-24">
                    {/* Título para la sección de método de pago */}
                    <div className="flex items-center justify-between mb-2">
                      <p className={cn(
                        "text-sm font-medium",
                        theme === 'dark' ? "text-gray-300" : "text-gray-700"
                      )}>
                        Selecciona tu método de pago
                      </p>
                    </div>
                    
                    <PaymentSection
                      theme={theme}
                      selectedMethod={localSelectedMethod || selectedPaymentMethod}
                      onShowMethods={onShowPaymentMethods}
                      onUpdateMethod={method => {
                        // Wrapper para convertir a Promise<void> y cumplir con el tipo esperado
                        onSelectPaymentMethod(method);
                        return Promise.resolve();
                      }}
                      onRemoveMethod={onRemovePaymentMethod}
                      viewType={viewType}
                      empresaId={empresaId}
                      directCardSelect={true}
                      disableModal={true}
                      showModalOnSelect={false}
                      expandCardList={expandCardList}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Aplicar el HOC con opciones específicas para móvil
export const MobilePaymentContainer = withResponsiveView(MobilePaymentContainerBase, {
  fullWidth: true,
  disableWrapper: true
});