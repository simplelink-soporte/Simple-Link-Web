import { motion, AnimatePresence } from "framer-motion"
import { IconAlertTriangle } from "@tabler/icons-react"

interface ConfirmationModalProps {
  isOpen: boolean
  title: string
  description: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmationModal({
  isOpen,
  title,
  description,
  onConfirm,
  onCancel
}: ConfirmationModalProps) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[60]"
        onClick={onCancel}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute bg-white rounded-lg shadow-lg border w-[280px]"
          style={{
            top: "calc(50% + 20px)",
            left: "50%",
            transform: "translate(-50%, -50%)"
          }}
          onClick={e => e.stopPropagation()}
        >
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-50 rounded-full">
                <IconAlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex-1 pt-1">
                <h4 className="text-sm font-medium text-gray-900">
                  {title}
                </h4>
                <p className="mt-1 text-xs text-gray-500">
                  {description}
                </p>
              </div>
            </div>

            <div className="flex justify-end items-center gap-2 mt-4">
              <button
                onClick={onCancel}
                className="px-2.5 py-1.5 text-xs text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                className="px-2.5 py-1.5 text-xs bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
} 