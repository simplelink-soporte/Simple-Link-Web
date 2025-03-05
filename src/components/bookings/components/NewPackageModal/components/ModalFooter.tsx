import { motion } from "framer-motion"
import { IconChevronRight } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import type { PackageStep, EditPackageStep } from "../types"

interface ModalFooterProps {
  currentStep: PackageStep | EditPackageStep
  onBack: () => void
  onContinue: () => void
  isValid?: boolean
  isSubmitting?: boolean
  continueText?: string
  mode?: 'create' | 'edit'
}

export function ModalFooter({
  currentStep,
  onBack,
  onContinue,
  isValid = true,
  isSubmitting = false,
  continueText,
  mode = 'create'
}: ModalFooterProps) {
  return (
    <div className="p-6 border-t">
      <div className="flex justify-between gap-4">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          disabled={isSubmitting}
        >
          Atrás
        </button>
        <button
          onClick={onContinue}
          disabled={!isValid || isSubmitting}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium",
            "bg-black text-white hover:bg-gray-800",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-colors duration-200"
          )}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⏳</span>
              {mode === 'edit' ? 'Guardando...' : 'Creando...'}
            </span>
          ) : (
            continueText || (mode === 'edit' ? 'Guardar Cambios' : 'Continuar')
          )}
        </button>
      </div>
    </div>
  )
} 