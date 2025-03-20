'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShiftForm } from '../../context/ShiftFormContext';
import { StepComponentProps } from '../StepRenderer';
import { StepNavigation } from '../../shared/StepNavigation';
import { Button } from '@/components/ui/button';
import { IconCalendar, IconClock, IconLock, IconMapPin, IconCreditCard, IconCash, IconBuildingBank, IconChevronDown } from '@tabler/icons-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// Definición de los métodos de pago disponibles
const PAYMENT_METHODS = {
  cash: {
    icon: IconCash,
    label: 'Efectivo',
    description: 'Paga en efectivo al llegar'
  },
  card: {
    icon: IconCreditCard,
    label: 'Tarjeta',
    description: 'Pago con tarjeta en la recepción'
  },
  transfer: {
    icon: IconBuildingBank,
    label: 'Transferencia',
    description: 'Transferencia bancaria'
  }
};

// Función para formatear la fecha en un formato legible
const formatShiftDate = (dateString: string) => {
  try {
    const date = parseISO(dateString);
    const dayName = format(date, 'EEEE', { locale: es });
    const dayNumber = format(date, 'd');
    const month = format(date, 'MMMM', { locale: es });
    return {
      dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
      dayNumber,
      month
    };
  } catch (error) {
    console.error('Error al parsear la fecha:', error);
    return {
      dayName: 'Día',
      dayNumber: '-',
      month: 'Mes'
    };
  }
};

export function SummaryStep({ 
  onNext, 
  onPrevious, 
  isLastStep, 
  isFirstStep, 
  progress, 
  viewType 
}: StepComponentProps) {
  const { state, dispatch } = useShiftForm();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isContentVisible, setIsContentVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [summarySubStep, setSummarySubStep] = useState<'details' | 'payment'>('details'); 
  const { toast } = useToast();

  // Ref para exponer métodos y estados al componente padre
  const summaryStepRef = useRef<any>({});
  
  // Detectar si es dispositivo móvil
  useEffect(() => {
    // Función para verificar si el dispositivo es móvil
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Verificar al montar
    checkIsMobile();
    
    // Agregar listener para cambios de tamaño
    window.addEventListener('resize', checkIsMobile);
    
    // Limpiar listener al desmontar
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  // Efecto para la animación del contenido
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsContentVisible(true);
    }, 50);
    
    return () => clearTimeout(timer);
  }, []);

  // Verificar la validez de la fecha
  const isValid = (date: Date): boolean => {
    return !isNaN(date.getTime());
  };

  // Manejar selección de método de pago
  const handleSelectPaymentMethod = useCallback((method: string) => {
    setSelectedPaymentMethod(method);
  }, []);

  // Manejar la creación de reserva
  const handleCreateReservation = useCallback(async () => {
    if (isProcessing || !selectedPaymentMethod) {
      if (!selectedPaymentMethod) {
        toast({
          title: 'Método de pago requerido',
          description: 'Por favor, selecciona un método de pago para continuar',
          variant: 'destructive'
        });
      }
      return;
    }
    
    setIsProcessing(true);
    setShowOverlay(true);
    
    try {
      // Simulación temporal de proceso
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Aquí iría la lógica para enviar la reserva de turno
      console.log('Creando reserva con método de pago:', selectedPaymentMethod);
      
      toast({
        title: 'Reserva creada',
        description: 'Tu reserva ha sido procesada correctamente',
        variant: 'default'
      });
      
      onNext();
    } catch (error) {
      console.error('Error al procesar la reserva:', error);
      toast({
        title: 'Error',
        description: 'No se pudo procesar la reserva',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
      setShowOverlay(false);
    }
  }, [isProcessing, selectedPaymentMethod, onNext, toast]);

  // Manejar la navegación entre sub-pasos
  const handleNextSubStep = useCallback(() => {
    if (summarySubStep === 'details') {
      setSummarySubStep('payment');
    } else {
      handleCreateReservation();
    }
  }, [summarySubStep, handleCreateReservation]);

  // Manejar el retroceso entre sub-pasos
  const handlePreviousSubStep = useCallback(() => {
    if (summarySubStep === 'payment') {
      setSummarySubStep('details');
    } else {
      onPrevious();
    }
  }, [summarySubStep, onPrevious]);
  
  // Mantener el ref actualizado con los valores actuales
  useEffect(() => {
    // Función para publicar actualizaciones
    const publishStateUpdate = () => {
      // Actualizar el ref con los datos actuales
      summaryStepRef.current = {
        summarySubStep,
        selectedPaymentMethod,
        isProcessing,
        handleNextSubStep,
        handlePreviousSubStep
      };
      
      // Exponer los datos para el StepRenderer si estamos en vista móvil
      if (isMobile && typeof window !== 'undefined') {
        (window as any).__summaryStepData = summaryStepRef.current;
        
        // Disparar un evento personalizado para que los listeners puedan reaccionar inmediatamente
        const event = new CustomEvent('summary-step-update', { 
          detail: summaryStepRef.current 
        });
        window.dispatchEvent(event);
      }
    };
    
    // Publicar estado al montar y cuando cambian las dependencias
    publishStateUpdate();
    
    // Asegurarse de que el StepRenderer puede detectar cambios reactivamente
    const handleBeforeUnload = () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__summaryStepData;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (typeof window !== 'undefined') {
        delete (window as any).__summaryStepData;
      }
    };
  }, [
    isMobile, 
    summarySubStep, 
    selectedPaymentMethod, 
    isProcessing, 
    handleNextSubStep, 
    handlePreviousSubStep
  ]);

  // Componente para el precio total
  const TotalPriceDisplay = useCallback(() => {
    // Si no hay detalles del turno seleccionado, no renderizar
    if (!state.shiftDetails) return null;
    
    // Formatear el precio
    const price = state.shiftDetails?.price;
    const formatted = price?.toFixed(2);
    const [integerPart, decimalPart] = formatted?.split('.');
    
    return (
      <div className="flex flex-col items-center justify-center py-5 my-4">
        {/* Título de Precio Total */}
        <p className="text-sm font-semibold mb-2 text-gray-500">
          Precio Total
        </p>

        {/* Precio con decimales estilizados */}
        <p className="text-5xl font-semibold leading-none mb-4 text-gray-900">
          €{integerPart}<span className="opacity-40 text-gray-600">.{decimalPart}</span>
        </p>

        {/* Indicador de Pago Seguro */}
        <div className="flex items-center justify-center gap-2">
          <IconLock className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-medium text-gray-500">
            Pago seguro garantizado
          </span>
        </div>
      </div>
    );
  }, [state.shiftDetails]);

  // Renderizado de los detalles de la reserva
  const ReservationDetails = useCallback(() => {
    // Verificamos que tengamos toda la información necesaria
    if (!state.shiftDetails) return null;

    // Usamos los detalles del turno para obtener la fecha
    // Si no tenemos fecha en shiftDetails, usamos la fecha actual (sólo para desarrollo)
    const formattedDate = state.shiftDetails.date 
      ? formatShiftDate(state.shiftDetails.date)
      : formatShiftDate(new Date().toISOString());
    
    const { dayName, dayNumber, month } = formattedDate;
    
    // Verificar si hay artículos seleccionados
    const hasItems = Object.keys(state.selectedItems).length > 0;

    return (
      <div className="space-y-4 rounded-lg border border-gray-200 bg-white/60 overflow-hidden">
        {/* Secciones de detalles con iconos */}
        <div className="p-6 space-y-4">
          {/* Fecha y horario */}
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-md bg-gray-100">
              <IconCalendar className="h-4 w-4 text-gray-500" />
            </div>
            <div className="flex-1">
              <div className="space-y-1 pb-2">
                <p className="text-sm font-semibold text-gray-900">
                  Fecha Seleccionada
                </p>
                <p className="text-sm text-gray-600">
                  {dayName}, {dayNumber} de {month} | {state.shiftDetails?.startTime} - {state.shiftDetails?.endTime}
                </p>
              </div>
              <div className="border-b border-gray-200 my-2" />
            </div>
          </div>

          {/* Ubicación */}
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-md bg-gray-100">
              <IconMapPin className="h-4 w-4 text-gray-500" />
            </div>
            <div className="flex-1">
              <div className="space-y-1 pb-2">
                <p className="text-sm font-semibold text-gray-900">
                  Ubicación del Turno
                </p>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Cancha:</span>{' '}
                    {state.shiftDetails?.courtName}
                  </p>
                </div>
              </div>
              <div className="border-b border-gray-200 my-2" />
            </div>
          </div>

          {/* Detalles del turno */}
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-md bg-gray-100">
              <IconClock className="h-4 w-4 text-gray-500" />
            </div>
            <div className="flex-1">
              <div className="space-y-1 pb-2">
                <p className="text-sm font-semibold text-gray-900">
                  Detalles del Turno
                </p>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Duración:</span>{' '}
                    {state.duration} {state.duration === 1 ? 'hora' : 'horas'}
                  </p>
                </div>
              </div>
              {hasItems && <div className="border-b border-gray-200 my-2" />}
            </div>
          </div>

          {/* Artículos seleccionados */}
          {hasItems && (
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-md bg-gray-100">
                <IconCreditCard className="h-4 w-4 text-gray-500" />
              </div>
              <div className="flex-1">
                <div className="space-y-1 pb-2">
                  <p className="text-sm font-semibold text-gray-900">
                    Artículos Seleccionados
                  </p>
                  <div className="space-y-3 mt-2">
                    {Object.entries(state.selectedItems).map(([itemId, quantity]) => (
                      <div key={itemId} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium">
                            {quantity}
                          </div>
                          <span className="text-sm text-gray-600">{itemId}</span>
                        </div>
                        <span className="text-sm text-gray-600 font-medium">
                          €{(15.99 * quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    <div className="pt-2 mt-2 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">Subtotal Artículos</span>
                        <span className="text-sm font-semibold text-gray-900">
                          €{state.itemsTotalPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }, [state.shiftDetails, state.duration, state.selectedItems, state.itemsTotalPrice]);

  // Componente para la sección de métodos de pago
  const PaymentMethodsSection = useCallback(() => {
    return (
      <div className="space-y-4 rounded-lg border border-gray-200 bg-white/60 overflow-hidden">
        <div className="p-6 space-y-4">
          {Object.entries(PAYMENT_METHODS).map(([key, method]) => {
            const Icon = method.icon;
            const isSelected = selectedPaymentMethod === key;
            
            return (
              <button
                key={key}
                onClick={() => handleSelectPaymentMethod(key)}
                className={cn(
                  "w-full flex items-center p-4 rounded-lg border transition-all duration-200",
                  isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div className="flex items-center flex-1">
                  <div className="flex items-center justify-center h-10 w-10 rounded-md bg-gray-100 text-gray-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900">{method.label}</p>
                    <p className="text-xs text-gray-500">{method.description}</p>
                  </div>
                </div>
                <div className={cn(
                  "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                  isSelected ? "border-blue-500" : "border-gray-300"
                )}>
                  {isSelected && <div className="h-3 w-3 rounded-full bg-blue-500" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }, [selectedPaymentMethod, handleSelectPaymentMethod]);

  // Componente de Layout para Desktop
  const DesktopLayout = useCallback(({ children }: { children: React.ReactNode }) => (
    <div className="w-full max-w-6xl mx-auto">
      {children}
    </div>
  ), []);

  // Renderizado principal
  return (
    <div className="container mx-auto">
      {/* Overlay de procesamiento */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 0.5, 
              ease: "easeInOut"
            }}
            className="fixed inset-0 flex items-center justify-center z-[9999] bg-white/70 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="text-center"
            >
              <div className="flex items-center justify-center">
                {/* Aplicamos la animación a cada letra individualmente con transición de color */}
                {'Simple Link'.split('').map((letter, index) => (
                  <motion.span
                    key={index}
                    className={`text-xl font-medium ${letter === ' ' ? 'mx-1' : ''}`}
                    animate={{
                      color: ['#374151', '#94a3b8', '#374151'], // Transición de color: gris oscuro -> gris claro -> gris oscuro
                      opacity: [1, 0.6, 1]
                    }}
                    transition={{
                      duration: 1.8,
                      times: [0, 0.5, 1], // Distribución del tiempo para cada valor de animación
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: index * 0.07, // Delay sutil entre letras
                    }}
                  >
                    {letter}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {isContentVisible && (
          <motion.div
            key={summarySubStep}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full"
          >
            {isMobile ? (
              // Layout móvil
              <div className="w-full max-w-lg mx-auto px-4 py-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold mb-1 text-gray-900">
                    {summarySubStep === 'details' ? 'Resumen del Turno' : 'Finaliza tu reserva'}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {summarySubStep === 'details' 
                      ? 'Revisa los detalles de tu reserva antes de continuar' 
                      : 'Configura los detalles de pago para confirmar tu reserva'}
                  </p>
                </div>

                {/* Contenido basado en el sub-paso actual */}
                {summarySubStep === 'details' ? (
                  // Sub-paso 1: Detalles de la reserva
                  <>
                    <TotalPriceDisplay />
                    <ReservationDetails />
                  </>
                ) : (
                  // Sub-paso 2: Configuración de pago
                  <>
                    <TotalPriceDisplay />
                    <PaymentMethodsSection />
                  </>
                )}
              </div>
            ) : (
              // Layout desktop - cambia según el sub-paso
              <div className="w-full max-w-6xl mx-auto">
                <div className="flex flex-col w-full h-full">
                  {summarySubStep === 'details' ? (
                    // Vista de detalles (primer sub-paso)
                    <div className="w-full py-8 px-6 overflow-y-auto">
                      <div className="w-full max-w-xl mx-auto">
                        <TotalPriceDisplay />
                        <ReservationDetails />
                      </div>
                    </div>
                  ) : (
                    // Vista de pago (segundo sub-paso)
                    <>
                      {/* Sección superior: Solo precio total */}
                      <div className="w-full py-8 px-6 overflow-y-auto">
                        <div className="w-full max-w-xl mx-auto">
                          <TotalPriceDisplay />
                        </div>
                      </div>
                      
                      {/* Sección: Configuración de pago */}
                      <div className="w-full py-8 px-6 overflow-y-auto">
                        <div className="w-full max-w-xl mx-auto">
                          {/* Título y subtítulo principal */}
                          <div className="mb-6">
                            <h2 className="text-xl font-semibold mb-1 text-gray-900">
                              Finaliza tu reserva
                            </h2>
                            <p className="text-sm text-gray-500">
                              Configura los detalles de pago para confirmar tu reserva
                            </p>
                          </div>
                          
                          <PaymentMethodsSection />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Navegación con StepNavigation adaptada según el sub-paso - Solo para desktop */}
      {!isMobile && (
        <StepNavigation
          onNext={handleNextSubStep}
          onBack={handlePreviousSubStep}
          nextLabel={summarySubStep === 'payment' ? "Confirmar Reserva" : "Continuar"}
          isNextDisabled={summarySubStep === 'payment' && (!selectedPaymentMethod || isProcessing)}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
}
