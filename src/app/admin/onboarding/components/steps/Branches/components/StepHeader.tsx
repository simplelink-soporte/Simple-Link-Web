import React from 'react'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StepHeaderProps {
  title: string;
  description: string;
  onBack: () => void;
}

/**
 * Componente para mostrar el encabezado minimalista de cada paso
 */
export function StepHeader({ title, description, onBack }: StepHeaderProps) {
  return (
    <div className="mb-8">
      <div className="relative mb-2">
        <div className="max-w-5xl mx-auto px-8 py-2">
          <button
            type="button"
            onClick={onBack}
            className={cn(
              "text-gray-500 p-1 rounded-full hover:bg-gray-100/50 transition-colors",
              "focus:outline-none focus:ring-0"
            )}
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      <div className="px-8 max-w-5xl mx-auto">
        <h2 className="text-base font-medium text-gray-900/90">{title}</h2>
        <p className="text-xs text-gray-500/80 mt-1">
          {description}
        </p>
      </div>
    </div>
  )
} 