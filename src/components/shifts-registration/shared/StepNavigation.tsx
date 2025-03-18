'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useShiftForm } from '../context/ShiftFormContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface StepNavigationProps {
  onNext?: () => Promise<void> | void;
  onBack?: () => void;
  nextLabel?: string;
  backLabel?: string;
  showBack?: boolean;
  showNext?: boolean;
  isNextDisabled?: boolean;
  isProcessing?: boolean;
  isFixedToBottom?: boolean;
}

// Configuración de los pasos y su navegación
const STEP_CONFIG: Record<number, { backStep?: number; nextStep?: number; skipNavigation?: boolean }> = {
  0: { nextStep: 1 }, // Servicio -> Fecha
  1: { backStep: 0, nextStep: 2 }, // Fecha -> Horario
  2: { backStep: 1, nextStep: 3 }, // Horario -> Confirmación
  3: { backStep: 2 } // Confirmación (paso final)
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
  isFixedToBottom = true
}: StepNavigationProps) {
  const { state, nextStep: goToNextStep, prevStep: goToPrevStep } = useShiftForm();
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
        return 'Elegir fecha';
      case 1:
        return 'Elegir horario';
      case 2:
        return 'Revisar y confirmar';
      case 3:
        return 'Confirmar turno';
      default:
        return 'Continuar';
    }
  };

  const handleNext = async () => {
    if (isProcessing || isNextDisabled) return;
    
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
      if (currentStep === 3) {
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
      const customEvent = new Event('shift-step-navigation-back', {
        bubbles: true,
        cancelable: true
      });
      
      const wasCancelled = !document.dispatchEvent(customEvent);
      if (wasCancelled) return;
      
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
        "py-4 px-4 sm:py-6 sm:px-6",
        "border-t border-gray-100",
        "z-10",
        isFixedToBottom && "shadow-[0_-4px_10px_rgba(0,0,0,0.05)]"
      )}
    >
      <div className="w-full max-w-[var(--container-default)] mx-auto">
        <div className={cn(
          "flex flex-col sm:flex-row sm:items-center sm:justify-between",
          "gap-3"
        )}>
          {/* Botones para móvil (apilados) y desktop (en línea) */}
          <div className={cn(
            "flex flex-col-reverse sm:flex-row",
            "items-center justify-center sm:justify-start",
            "gap-3 w-full sm:w-auto"
          )}>
            {showBack && config?.backStep !== undefined && (
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={isProcessing}
                className={cn(
                  "w-full sm:w-auto",
                  "px-6 py-3 rounded-xl",
                  "flex items-center justify-center gap-2",
                  "text-sm font-medium",
                  "transition-all duration-200",
                  isProcessing && "opacity-50 cursor-not-allowed"
                )}
              >
                <ChevronLeft size={16} className="text-gray-500" />
                <span>{backLabel}</span>
              </Button>
            )}
            
            {showNext && (
              <Button
                onClick={handleNext}
                disabled={isNextDisabled || isProcessing}
                className={cn(
                  "w-full sm:w-auto",
                  "px-6 py-3 rounded-xl",
                  "flex items-center justify-center gap-2",
                  "text-sm font-medium",
                  "transition-all duration-200",
                  (isNextDisabled || isProcessing) && "opacity-70 cursor-not-allowed"
                )}
              >
                <span>{getNextButtonLabel()}</span>
                <ChevronRight size={16} className="text-white/80" />
              </Button>
            )}
          </div>
          
          {/* Indicador de paso (solo visible en desktop) */}
          <div className="hidden sm:block text-sm text-gray-500">
            Paso {currentStep + 1} de {Object.keys(STEP_CONFIG).length}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
