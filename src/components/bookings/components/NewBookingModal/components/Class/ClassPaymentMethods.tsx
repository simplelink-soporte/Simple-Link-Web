  import { motion } from "framer-motion"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { IconCheck, IconPercentage } from "@tabler/icons-react"
import type { ClassPaymentConfig } from "../../types"

interface ClassPaymentMethodsProps {
  config: ClassPaymentConfig
  onChange: (config: ClassPaymentConfig) => void
  onValidationChange: (isValid: boolean) => void
}

const paymentMethods = [
  {
    id: 'pay_at_club' as const,
    label: 'Pagar en el club',
    description: 'Permite reservar sin realizar un pago en el momento'
  },
  {
    id: 'full_payment' as const,
    label: 'Pago Completo',
    description: 'Permite realizar el pago completo de la reserva en el momento'
  },
  {
    id: 'partial_payment' as const,
    label: 'Pago con Seña',
    description: 'Permite reservar realizando una parte del pago'
  },
  {
    id: 'guarantee' as const,
    label: 'Garantía',
    description: 'Permite dejar una tarjeta como garantía para cobrar más tarde'
  }
]

export function ClassPaymentMethods({
  config,
  onChange,
  onValidationChange
}: ClassPaymentMethodsProps) {
  const [guaranteePercentage, setGuaranteePercentage] = useState<number>(
    config.guaranteePercentage || 30
  )
  const [partialPaymentPercentage, setPartialPaymentPercentage] = useState<number>(
    config.partialPaymentPercentage || 20
  )

  useEffect(() => {
    onValidationChange(config.paymentMethods?.length > 0)
  }, [config.paymentMethods, onValidationChange])

  const handlePaymentMethodToggle = (methodId: 'pay_at_club' | 'full_payment' | 'partial_payment' | 'guarantee') => {
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

  const handleGuaranteePercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(100, Math.max(1, parseInt(e.target.value) || 1))
    setGuaranteePercentage(value)
    onChange({
      ...config,
      guaranteePercentage: value,
    })
  }

  const handlePartialPaymentPercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(100, Math.max(1, parseInt(e.target.value) || 1))
    setPartialPaymentPercentage(value)
    onChange({
      ...config,
      partialPaymentPercentage: value,
    })
  }

  const isAllSelected = config.paymentMethods?.length === paymentMethods.length

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <div className="space-y-4">
        {/* Selector de todos/ninguno */}
        <div className="flex justify-end">
          <button
            onClick={isAllSelected ? handleDeselectAll : handleSelectAll}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            {isAllSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
          </button>
        </div>

        {/* Lista de métodos de pago */}
        <div className="space-y-1.5">
          {paymentMethods.map(({ id, label, description }) => (
            <motion.button
              key={id}
              onClick={() => handlePaymentMethodToggle(id)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg transition-all duration-200",
                "border border-gray-200/75 hover:border-gray-300",
                "focus:outline-none focus:ring-1 focus:ring-gray-300",
                config.paymentMethods?.includes(id)
                  ? "bg-gray-50/80"
                  : "bg-white"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={cn(
                    "text-sm font-medium",
                    config.paymentMethods?.includes(id) ? "text-gray-700" : "text-gray-600"
                  )}>
                    {label}
                  </h3>
                  <p className={cn(
                    "text-xs mt-0.5",
                    config.paymentMethods?.includes(id) ? "text-gray-500" : "text-gray-400"
                  )}>
                    {description}
                  </p>
                </div>
                {config.paymentMethods?.includes(id) && (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-4 h-4 rounded-full bg-gray-500 flex items-center justify-center"
                  >
                    <IconCheck className="w-2.5 h-2.5 text-white" />
                  </motion.div>
                )}
              </div>
            </motion.button>
          ))}
        </div>

        {/* Configuración de porcentaje de garantía */}
        {config.paymentMethods?.includes('guarantee') && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 border-t border-gray-100 pt-3"
          >
            <div className="space-y-2">
              <div className="space-y-0.5">
                <h4 className="text-xs font-medium text-gray-600">Configuración de Garantía</h4>
                <p className="text-xs text-gray-400">
                  Define el porcentaje a cobrar como garantía
                </p>
              </div>
              <div className="flex items-center">
                <input
                  id="guaranteePercentage"
                  type="number"
                  min="1"
                  max="100"
                  value={guaranteePercentage}
                  onChange={handleGuaranteePercentageChange}
                  className={cn(
                    "w-16 px-2 py-1 text-sm text-center",
                    "rounded border border-gray-200/75",
                    "focus:outline-none focus:border-gray-300",
                    "transition-all duration-200"
                  )}
                />
                <span className="ml-1.5 text-xs text-gray-500">%</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Configuración de porcentaje de seña */}
        {config.paymentMethods?.includes('partial_payment') && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className={cn(
              "mt-3",
              !config.paymentMethods?.includes('guarantee') && "border-t border-gray-100 pt-3"
            )}
          >
            <div className="space-y-2">
              <div className="space-y-0.5">
                <h4 className="text-xs font-medium text-gray-600">Configuración de Seña</h4>
                <p className="text-xs text-gray-400">
                  Define el porcentaje del precio total como seña
                </p>
              </div>
              <div className="flex items-center">
                <input
                  id="partialPaymentPercentage"
                  type="number"
                  min="1"
                  max="100"
                  value={partialPaymentPercentage}
                  onChange={handlePartialPaymentPercentageChange}
                  className={cn(
                    "w-16 px-2 py-1 text-sm text-center",
                    "rounded border border-gray-200/75",
                    "focus:outline-none focus:border-gray-300",
                    "transition-all duration-200"
                  )}
                />
                <span className="ml-1.5 text-xs text-gray-500">%</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {(!config.paymentMethods || config.paymentMethods.length === 0) && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-gray-400 text-center"
        >
          Selecciona al menos un método de pago para continuar
        </motion.p>
      )}
    </motion.div>
  )
}
