"use client"

import { motion } from "framer-motion"
import { IconAlertTriangle } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

interface OverlapWarningPopupProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  position: { x: number; y: number }
  overlappingCount: number
}

export function OverlapWarningPopup({
  isOpen,
  onConfirm,
  onCancel,
  position,
  overlappingCount
}: OverlapWarningPopupProps) {
  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed bg-white rounded-lg shadow-lg border p-4"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '320px',
        zIndex: 9999,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-amber-50">
            <IconAlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900">
              Superposición de Reservas
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {overlappingCount === 1 
                ? "Existe una reserva en este horario. ¿Deseas continuar y sobrescribir la reserva existente?"
                : `Existen ${overlappingCount} reservas en este horario. ¿Deseas continuar y sobrescribir las reservas existentes?`
              }
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-all duration-200"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 text-xs font-medium bg-amber-500 text-white hover:bg-amber-600 rounded-md transition-all duration-200"
          >
            Confirmar
          </button>
        </div>
      </div>
    </motion.div>
  )
} 