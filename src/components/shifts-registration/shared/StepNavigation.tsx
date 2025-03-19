'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useShiftForm } from '../context/ShiftFormContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

export interface StepNavigationProps {
  onNext?: () => Promise<void> | void;
  onBack?: () => void;
  nextLabel?: string;
  backLabel?: string;
  showBack?: boolean;
  showNext?: boolean;
  isNextDisabled?: boolean;
  isProcessing?: boolean;
  isFixedToBottom?: boolean;
  className?: string;
}

// Configuración de los pasos y su navegación
const STEP_CONFIG: Record<number, { backStep?: number; nextStep?: number; skipNavigation?: boolean }> = {
  0: { nextStep: 1 }, // Ubicación -> Turnos
  1: { backStep: 0, nextStep: 2 }, // Turnos -> Artículos
  2: { backStep: 1, nextStep: 3 }, // Artículos -> Servicios
  3: { backStep: 2, nextStep: 4 }, // Servicios -> Fecha
  4: { backStep: 3, nextStep: 5 }, // Fecha -> Hora
  5: { backStep: 4, nextStep: 6 }, // Hora -> Resumen
  6: { backStep: 5, nextStep: 7 }, // Resumen -> Confirmación
  7: { backStep: 6 } // Confirmación (paso final)
};

export function StepNavigation({
  onNext,
  onBack,
  nextLabel,
  backLabel = 'Volver',
  showBack = true,
  showNext = true,
  isNextDisabled = false,
  isProcessing = false,
  isFixedToBottom = true,
  className,
}: StepNavigationProps) {
  const { 
    state, 
    nextStep: goToNextStep, 
    prevStep: goToPrevStep,
    goBackToStep 
  } = useShiftForm();
  const currentStep = state.currentStep;
  const config = STEP_CONFIG[currentStep] || {};

  // Si este paso debe ocultar la navegación, no renderizamos nada
  if (config.skipNavigation) {
    return null;
  }

  // Determinar el texto del botón siguiente según el paso actual
  const getNextButtonLabel = () => {
    if (nextLabel) return nextLabel;

    switch (currentStep) {
      case 0:
        return 'Elegir turno';
      case 1:
        return 'Elegir artículos';
      case 2:
        return 'Elegir servicios';
      case 3:
        return 'Elegir fecha';
      case 4:
        return 'Elegir hora';
      case 5:
        return 'Revisar y confirmar';
      case 6:
        return 'Confirmar turno';
      case 7:
        return 'Confirmar turno';
      default:
        return 'Continuar';
    }
  };

  const handleNext = async () => {
    if (isProcessing || isNextDisabled) {
      console.log('StepNavigation: Botón Next deshabilitado', { isProcessing, isNextDisabled });
      return;
    }
    
    try {
      // Evento personalizado para permitir que otros componentes intercepten
      const customEvent = new Event('shift-step-navigation-next', {
        bubbles: true,
        cancelable: true
      });
      
      const wasCancelled = !document.dispatchEvent(customEvent);
      if (wasCancelled) return;
      
      // Lógica específica para cada paso
      // (Por ejemplo, crear la reserva en el último paso)
      if (currentStep === 7) {
        const createBookingEvent = new CustomEvent('create-shift-booking');
        window.dispatchEvent(createBookingEvent);
      }
      
      if (onNext) {
        await onNext();
      } else if (config.nextStep !== undefined) {
        goToNextStep();
      }
    } catch (error) {
      console.error('Error al navegar al siguiente paso:', error);
    }
  };

  const handleBack = () => {
    if (isProcessing) return;
    
    try {
      // Emitir un evento que puede ser cancelado para notificar a otros componentes
      const customEvent = new Event('shift-step-navigation-back', {
        bubbles: true,
        cancelable: true
      });
      
      // Si el evento es cancelado por algún listener, detener la navegación
      const wasCancelled = !document.dispatchEvent(customEvent);
      if (wasCancelled) {
        console.log('StepNavigation: Navegación hacia atrás interceptada por otro componente');
        return;
      }
      
      // Verificar si estamos en el paso 3 (ServiceStep) y el paso de artículos debe omitirse
      if (currentStep === 3 && state.skipItemsStep) {
        console.log('StepNavigation: Detectada navegación hacia atrás desde ServiceStep con skipItemsStep=true');
        
        // Emitir un evento personalizado para indicar que se debe saltar el paso 2 (ItemsStep)
        const skipStepEvent = new CustomEvent('shift-skip-items-step-back', {
          detail: { fromStep: 3, toStep: 1 }
        });
        document.dispatchEvent(skipStepEvent);
        
        // No continuar con la navegación normal, el evento se encargará de ello
        return;
      }
      
      // Navegación normal hacia atrás
      if (onBack) {
        onBack();
      } else if (config.backStep !== undefined) {
        goToPrevStep();
      }
    } catch (error) {
      console.error('Error al navegar al paso anterior:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        isFixedToBottom ? "fixed bottom-0 left-0 right-0" : "relative mt-6",
        "bg-white",
        isFixedToBottom ? "py-6 pt-4" : "py-4 px-4 sm:py-6 sm:px-6", 
        "z-10",
        className
      )}
    >
      <div className={cn(
        "w-full max-w-[var(--container-default)] mx-auto",
        isFixedToBottom && "px-6" 
      )}>
        <div className={cn(
          "flex flex-col sm:flex-row sm:items-center sm:justify-center",
          "gap-3"
        )}>
          {/* Botones para móvil (apilados) y desktop (en línea) */}
          <div className={cn(
            "flex flex-col-reverse sm:flex-row",
            "items-center justify-center",
            "gap-3 w-full sm:w-auto"
          )}>
            {/* En dispositivos móviles, ocultamos el botón Volver completamente */}
            {showBack && config?.backStep !== undefined && (
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={isProcessing}
                className={cn(
                  "hidden sm:flex", 
                  "w-full sm:w-auto sm:min-w-[150px]", 
                  "px-6 py-3 rounded-xl",
                  "items-center justify-center gap-2",
                  "text-sm font-medium",
                  "transition-all duration-200",
                  isProcessing && "opacity-50 cursor-not-allowed"
                )}
              >
                <span>{backLabel}</span>
              </Button>
            )}
            
            {showNext && (
              <Button
                onClick={handleNext}
                disabled={isNextDisabled || isProcessing}
                className={cn(
                  "w-full",
                  // Estilos específicos para móvil (sm:)
                  "sm:w-auto sm:min-w-[150px] sm:px-6 sm:py-3 sm:rounded-xl sm:text-sm", 
                  // Estilos específicos para desktop (<sm)
                  "rounded-lg py-6 text-base font-normal",
                  "shadow-lg backdrop-blur-sm",
                  // Condicionales
                  isNextDisabled || isProcessing
                    ? "!bg-[#A7A4A7] !text-[#dcdcdc] cursor-not-allowed hover:!bg-[#A6A3A6]" 
                    : "!bg-black/90 !text-white hover:!bg-black/80",
                  "disabled:opacity-100",
                  "sm:shadow-none sm:backdrop-blur-none",
                  "sm:bg-black sm:text-white sm:hover:bg-black/90",
                  "sm:disabled:opacity-70",
                  "flex items-center justify-center gap-2",
                  "transition-all duration-200",
                  // Reforzar estilos de deshabilitado
                  (isNextDisabled || isProcessing) && "pointer-events-none opacity-60"
                )}
                style={{
                  transform: 'translate3d(0, 0, 0)',
                  willChange: 'transform',
                }}
              >
                {/* Mostrar "Continuar" en todas las vistas */}
                <span>Continuar</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
