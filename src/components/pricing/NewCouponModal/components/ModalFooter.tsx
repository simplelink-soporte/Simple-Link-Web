import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface ModalFooterProps {
  currentStep: number
  totalSteps: number
  onBack: () => void
  onNext: () => void
  onClose: () => void
  mode: 'create' | 'edit'
}

export function ModalFooter({ 
  currentStep, 
  totalSteps,
  onBack,
  onNext,
  onClose,
  mode
}: ModalFooterProps) {
  const isLastStep = currentStep === totalSteps - 1

  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.35, duration: 0.3 }}
      className="p-6 border-t bg-white"
    >
      <div className="flex gap-3">
        {currentStep > 0 ? (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onBack}
            className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
          >
            Atrás
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </motion.button>
        )}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNext}
          className={cn(
            "flex-1 bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors",
            "flex items-center justify-center gap-2"
          )}
        >
          <span>
            {isLastStep ? (mode === 'create' ? 'Crear Cupón' : 'Guardar Cambios') : 'Continuar'}
          </span>
        </motion.button>
      </div>
    </motion.div>
  )
}