import React from 'react'
import { cn } from '@/lib/utils'

interface StepIndicatorProps {
  currentStep: number;
  totalSteps?: number;
}

/**
 * Componente que muestra el indicador de pasos actual de forma minimalista
 */
export function StepIndicator({ currentStep, totalSteps = 2 }: StepIndicatorProps) {
  return (
    <div className="max-w-5xl mx-auto px-8 mb-6">
      <div className="flex items-center gap-2 w-36 ml-0">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
          <div 
            key={step} 
            className={cn(
              "h-1 rounded-full transition-all duration-300 ease-in-out flex-1",
              currentStep === step 
                ? "bg-gray-500/70" 
                : currentStep > step 
                  ? "bg-gray-400/50" 
                  : "bg-gray-200/40"
            )}
          />
        ))}
      </div>
    </div>
  )
} 