  import { motion } from "framer-motion"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { IconCheck } from "@tabler/icons-react"
import type { ClassPaymentConfig } from "../../types"

interface ClassPaymentMethodsProps {
  config: ClassPaymentConfig
  onChange: (config: ClassPaymentConfig) => void
  onValidationChange: (isValid: boolean) => void
}

const paymentMethods = [
  {
    id: 'cash' as const,
    label: 'Pagar en la sede',
    description: 'El cliente paga al llegar'
  },
  {
    id: 'card' as const,
    label: 'Mercado Pago',
    description: 'Pago por medio de Mercado Pago'
  },
  {
    id: 'transfer' as const,
    label: 'Transferencia',
    description: 'Transferencia bancaria'
  }
]

export function ClassPaymentMethods({
  config,
  onChange,
  onValidationChange
}: ClassPaymentMethodsProps) {
  useEffect(() => {
    onValidationChange(config.paymentMethods?.length > 0)
  }, [config.paymentMethods, onValidationChange])

  const handlePaymentMethodToggle = (methodId: 'cash' | 'card' | 'transfer') => {
    const currentMethods = config.paymentMethods || []
    const newMethods = currentMethods.includes(methodId)
      ? currentMethods.filter(id => id !== methodId)
      : [...currentMethods, methodId]

    onChange({
      ...config,
      paymentMethods: newMethods,
      paymentStatus: 'pending'
    })
  }

  const handleSelectAll = () => {
    const allMethodIds = paymentMethods.map(method => method.id)
    onChange({
      ...config,
      paymentMethods: allMethodIds,
      paymentStatus: 'pending'
    })
  }

  const handleDeselectAll = () => {
    onChange({
      ...config,
      paymentMethods: [],
      paymentStatus: 'pending'
    })
  }

  const isAllSelected = config.paymentMethods?.length === paymentMethods.length

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="space-y-4">
        <div className="flex justify-end mb-4">
          <button
            onClick={isAllSelected ? handleDeselectAll : handleSelectAll}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            {isAllSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
          </button>
        </div>

        <div className="grid gap-3">
          {paymentMethods.map(({ id, label, description }) => (
            <motion.button
              key={id}
              onClick={() => handlePaymentMethodToggle(id)}
              className={cn(
                "w-full p-4 text-left rounded-lg border transition-all duration-200",
                "hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500",
                config.paymentMethods?.includes(id)
                  ? "bg-gray-50 border-gray-200"
                  : "bg-white border-gray-200 hover:border-gray-300"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={cn(
                    "font-medium",
                    config.paymentMethods?.includes(id) ? "text-gray-700" : "text-gray-700"
                  )}>
                    {label}
                  </h3>
                  <p className={cn(
                    "text-sm mt-0.5",
                    config.paymentMethods?.includes(id) ? "text-gray-600" : "text-gray-500"
                  )}>
                    {description}
                  </p>
                </div>
                {config.paymentMethods?.includes(id) && (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-5 h-5 rounded-full bg-gray-500 flex items-center justify-center"
                  >
                    <IconCheck className="w-3 h-3 text-white" />
                  </motion.div>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {(!config.paymentMethods || config.paymentMethods.length === 0) && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[13px] text-gray-400 text-center"
        >
          Selecciona al menos un método de pago para continuar
        </motion.p>
      )}
    </motion.div>
  )
} 






