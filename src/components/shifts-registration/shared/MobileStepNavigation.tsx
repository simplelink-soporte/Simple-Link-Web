import React from 'react';
import { StepNavigation, StepNavigationProps } from './StepNavigation';
import { cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useShiftForm } from '../context/ShiftFormContext';

interface MobileStepNavigationProps extends Omit<StepNavigationProps, 'showBack'> {
  showBackButton?: boolean;
}

/**
 * Versión móvil del navegador de pasos que muestra:
 * 1. El botón "Volver" en la parte superior izquierda (sin título)
 * 2. El botón "Continuar" en el footer con fondo negro
 */
export function MobileStepNavigation({
  onBack,
  backLabel = 'Volver',
  showBackButton = true,
  ...props
}: MobileStepNavigationProps) {
  const { state } = useShiftForm();
  const currentStep = state.currentStep;
  
  // Función para manejar la acción de volver
  const handleBack = () => {
    if (props.isProcessing) return;
    
    try {
      const customEvent = new Event('shift-step-navigation-back', {
        bubbles: true,
        cancelable: true
      });
      
      const wasCancelled = !document.dispatchEvent(customEvent);
      if (wasCancelled) return;
      
      if (onBack) {
        onBack();
      }
    } catch (error) {
      console.error('Error al navegar al paso anterior:', error);
    }
  };

  return (
    <>
      {/* Header con solo botón de volver con icono (sin texto ni borde) */}
      {showBackButton && (
        <div className="fixed top-0 left-0 right-0 bg-white z-20 py-2 px-4">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              disabled={props.isProcessing}
              className="p-2 h-9 w-9 rounded-full"
            >
              <ArrowLeft size={24} className="text-gray-600" />
              <span className="sr-only">{backLabel}</span>
            </Button>
          </div>
        </div>
      )}
      
      {/* Footer solo con el botón de continuar */}
      <StepNavigation
        {...props}
        // No mostrar NUNCA el botón de volver en el footer
        showBack={false}
        // Asegurarse de que esté fijo en la parte inferior
        isFixedToBottom={true}
        // Personalizar con clases adicionales
        className="py-4 px-4 shadow-md"
        onBack={undefined} // Evitar duplicación de funcionalidad
        // IMPORTANTE: Asegurar explícitamente que isNextDisabled se pase correctamente
        isNextDisabled={props.isNextDisabled === undefined ? false : props.isNextDisabled}
      />
    </>
  );
}
