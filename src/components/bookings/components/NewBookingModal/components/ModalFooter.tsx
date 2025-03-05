import { motion } from "framer-motion"
import { IconChevronRight } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import type { BookingStep } from "../types"
import { Button } from "@/components/ui/button"

interface ModalFooterProps {
  currentStep: BookingStep
  onBack: () => void
  onContinue: () => void
  isValid: boolean
  continueText?: string
  isSubmitting?: boolean
  show?: boolean
}

export function ModalFooter({
  currentStep,
  onBack,
  onContinue,
  isValid,
  continueText = 'Continuar',
  isSubmitting = false,
  show = true
}: ModalFooterProps) {
  if (!show) return null;

  return (
    <div className="relative pt-6 pb-6">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gray-100/85" />
      <div className="flex justify-between gap-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className={cn(
            "px-8 py-2 text-sm",
            "text-gray-500 hover:text-gray-700 text-sm",
            "hover:bg-transparent",
            "transition-colors duration-200",
            "disabled:opacity-50"
          )}
          disabled={isSubmitting}
        >
          Atrás
        </Button>
        <Button
          onClick={onContinue}
          disabled={!isValid || isSubmitting}
          variant="ghost"
          className={cn(
            "px-4 py-2 text-sm font-medium",
            "text-gray-600 hover:text-gray-900",
            "hover:bg-transparent",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-colors duration-200"
          )}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⏳</span>
              Guardando...
            </span>
          ) : (
            continueText
          )}
        </Button>
      </div>
    </div>
  )
} 