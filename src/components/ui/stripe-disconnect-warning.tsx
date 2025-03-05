"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface StripeDisconnectWarningProps {
  show: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function StripeDisconnectWarning({ show, onConfirm, onCancel }: StripeDisconnectWarningProps) {
  if (!show) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-white/50 backdrop-blur-sm"
          onClick={onCancel}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className={cn(
            "relative w-full max-w-[400px]",
            "bg-white rounded-xl px-6 py-6",
            "shadow-2xl",
            "flex flex-col items-center",
            "mx-auto"
          )}
        >
          <div className="w-12 h-12 mb-4 bg-red-50 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          
          <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">
            ¿Desconectar Stripe?
          </h3>
          
          <p className="text-sm text-gray-600 text-center max-w-[300px] mb-6">
            Si desconectas tu cuenta de Stripe, tus clientes no podrán realizar pagos en línea al reservar. Esta acción puede afectar a las reservas futuras.
          </p>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="text-gray-600 hover:text-gray-900"
              onClick={onCancel}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirm}
            >
              Sí, desconectar
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
} 