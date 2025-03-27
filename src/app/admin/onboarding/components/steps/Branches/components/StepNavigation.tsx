import React from 'react'
import { cn } from '@/lib/utils'

interface StepNavigationProps {
  currentStep: number;
  onPrevious: () => void;
  onNext: () => void;
  onSave: () => void;
  onFinish: () => void;
  isNextDisabled?: boolean;
  isSaveDisabled?: boolean;
  isFinishDisabled?: boolean;
  isSubmitting?: boolean;
}

/**
 * Componente para la navegación entre pasos del formulario con estilo minimalista
 */
export function StepNavigation({
  currentStep,
  onPrevious,
  onNext,
  onSave,
  onFinish,
  isNextDisabled = false,
  isSaveDisabled = false,
  isFinishDisabled = false,
  isSubmitting = false
}: StepNavigationProps) {
  // Clase base para todos los botones
  const buttonBaseClass = "text-sm font-medium transition-colors hover:text-gray-900 focus:outline-none";
  const disabledClass = "opacity-50 cursor-not-allowed";

  return (
    <div className="flex justify-between pt-6 border-t border-gray-100 mt-8">
      <button 
        type="button"
        onClick={onPrevious}
        className={cn(
          buttonBaseClass,
          "text-gray-500"
        )}
      >
        <span>Anterior</span>
      </button>

      {currentStep === 1 && (
        <button
          type="button"
          onClick={onNext}
          disabled={isNextDisabled}
          className={cn(
            buttonBaseClass,
            "text-gray-700",
            isNextDisabled && disabledClass
          )}
        >
          <span>Siguiente</span>
        </button>
      )}

      {currentStep === 2 && (
        <button
          type="button"
          onClick={onSave}
          disabled={isSaveDisabled || isSubmitting}
          className={cn(
            buttonBaseClass,
            "text-gray-700",
            (isSaveDisabled || isSubmitting) && disabledClass
          )}
        >
          {isSubmitting ? (
            <>
              <div className="inline-block h-3.5 w-3.5 border-2 border-t-transparent border-gray-700 rounded-full animate-spin mr-1.5" />
              <span>Guardando...</span>
            </>
          ) : (
            <span>Guardar y Avanzar</span>
          )}
        </button>
      )}

      {currentStep === 3 && (
        <button
          type="button"
          onClick={onFinish}
          disabled={isFinishDisabled || isSubmitting}
          className={cn(
            buttonBaseClass,
            "text-gray-700",
            (isFinishDisabled || isSubmitting) && disabledClass
          )}
        >
          {isSubmitting ? (
            <>
              <div className="inline-block h-3.5 w-3.5 border-2 border-t-transparent border-gray-700 rounded-full animate-spin mr-1.5" />
              <span>Finalizando...</span>
            </>
          ) : (
            <span>Finalizar</span>
          )}
        </button>
      )}
    </div>
  )
} 