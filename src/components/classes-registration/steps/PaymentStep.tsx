"use client"

import { motion } from "framer-motion"
import { IconChevronRight, IconCash, IconCreditCard, IconBuildingBank } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { useClassRegistration } from "../context/ClassRegistrationContext"
import { StepContainer } from '../shared/StepContainer'
import { StepHeader } from '../shared/StepSection'
import type { PaymentMethod } from "../types/models"

const PAYMENT_METHODS: Record<PaymentMethod, {
  icon: typeof IconCash
  label: string
  description: string
}> = {
  cash: {
    icon: IconCash,
    label: 'Efectivo',
    description: 'Paga en efectivo al llegar a la clase'
  },
  card: {
    icon: IconCreditCard,
    label: 'Tarjeta',
    description: 'Paga con tarjeta de crédito o débito'
  },
  transfer: {
    icon: IconBuildingBank,
    label: 'Transferencia',
    description: 'Realiza una transferencia bancaria'
  }
}

export function PaymentStep() {
  const { state, selectPayment, goToStep } = useClassRegistration()

  if (!state.selectedClass) {
    goToStep('class')
    return null
  }

  const handlePaymentClick = (method: PaymentMethod) => {
    // Si el método ya está seleccionado, lo deseleccionamos
    if (state.selectedPayment === method) {
      selectPayment(null)
    } else {
      selectPayment(method)
    }
  }

  const handleNext = () => {
    // Aquí iría la lógica para procesar el pago
    console.log('Procesando pago...')
    goToStep('confirmation')
  }

  const handleBack = () => {
    goToStep('summary')
  }

  // Filtrar los métodos de pago disponibles
  const availableMethods = Object.entries(PAYMENT_METHODS)
    .filter(([method]) => state.selectedClass?.availablePaymentMethods.includes(method as PaymentMethod))

  return (
    <StepContainer stepId="payment">
      <div className="w-full max-w-[var(--container-default)] mx-auto px-[var(--padding-container-mobile)] sm:px-[var(--padding-container-tablet)] lg:px-[var(--padding-container-desktop)]">
        <StepHeader 
          title="Elige tu método de pago"
          subtitle="Selecciona cómo deseas pagar tu clase"
        />

        <div className="mt-6 flex flex-col gap-4 max-w-2xl mx-auto">
          {/* Grid de métodos de pago */}
          <div className="grid gap-3">
            {availableMethods.map(([method, info]) => {
              const isSelected = state.selectedPayment === method
              const Icon = info.icon
              
              return (
                <motion.button
                  key={method}
                  onClick={() => handlePaymentClick(method as PaymentMethod)}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "relative w-full p-4 rounded-lg border text-left",
                    "transition-all duration-200",
                    isSelected
                      ? "bg-gray-50 border-gray-900/10 shadow-sm"
                      : "bg-white border-gray-200 hover:border-gray-300"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <Icon className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-gray-900">
                        {info.label}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {info.description}
                      </p>
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>

          {/* Botones */}
          <div className="flex flex-col items-center gap-3">
            <motion.button
              onClick={handleNext}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              disabled={!state.selectedPayment}
              className={cn(
                "w-full max-w-sm",
                "px-5 py-2.5 rounded-lg",
                "bg-white border border-gray-200",
                "text-gray-800 hover:text-gray-900",
                "hover:border-gray-300 hover:bg-gray-50",
                "transition-all duration-200",
                "flex items-center justify-center gap-2",
                "text-sm font-medium",
                !state.selectedPayment && "opacity-50 cursor-not-allowed"
              )}
            >
              <span>Confirmar pago</span>
              <IconChevronRight className="w-4 h-4" strokeWidth={2} />
            </motion.button>

            <motion.button
              onClick={handleBack}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className={cn(
                "text-sm text-gray-600 hover:text-gray-900",
                "transition-colors duration-200"
              )}
            >
              <span>Volver</span>
            </motion.button>
          </div>
        </div>
      </div>
    </StepContainer>
  )
} 