"use client"

import { motion } from "framer-motion"
import { IconChevronRight, IconCash, IconCreditCard, IconBuildingBank, IconLoader2 } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { useClassRegistration } from "../context/ClassRegistrationContext"
import { StepContainer } from '../shared/StepContainer'
import { StepHeader } from '../shared/StepSection'
import type { PaymentMethod } from "../types/models"
import { useClassBooking } from "@/hooks/useClassBooking"
import { useToast } from "@/components/ui/use-toast"
import { useState } from "react"

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
    description: 'Pago con tarjeta en la recepción'
  },
  transfer: {
    icon: IconBuildingBank,
    label: 'Transferencia',
    description: 'Transferencia bancaria'
  }
}

export function PaymentStep() {
  const { state, updateState, goToStep } = useClassRegistration()
  const [isProcessing, setIsProcessing] = useState(false)
  const { submitClassBooking } = useClassBooking()
  const { toast } = useToast()

  // Seleccionar solo los métodos de pago disponibles para la clase
  const availableMethods = Object.entries(PAYMENT_METHODS)
    .filter(([key]) => 
      state.selectedClass?.availablePaymentMethods?.includes(key as PaymentMethod)
    )

  const handlePaymentClick = (method: PaymentMethod) => {
    // Si el método ya está seleccionado, lo deseleccionamos
    if (state.selectedPayment === method) {
      updateState({ type: 'SELECT_PAYMENT', payload: null })
    } else {
      updateState({ type: 'SELECT_PAYMENT', payload: method })
    }
  }

  const handleNext = async () => {
    if (isProcessing || !state.selectedPayment) return
    
    setIsProcessing(true)
    
    try {
      // Procesar la creación de reservas con el método de pago seleccionado
      const result = await submitClassBooking({
        paymentMethod: state.selectedPayment
      })
      
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive'
        })
        return
      }
      
      // Solo avanzar al paso de confirmación si la reserva fue exitosa
      goToStep('confirmation')
    } catch (error: any) {
      toast({
        title: 'Error', 
        description: error?.message || 'Error al procesar el pago',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }
  
  const handleBack = () => {
    goToStep('session')
  }

  return (
    <StepContainer>
      <StepHeader
        title="Método de pago"
        subtitle="Selecciona cómo quieres pagar tus clases"
      />

      <div className="w-full mt-5 flex flex-col items-center gap-8">
        {state.selectedClass ? (
          <div className="grid gap-3">
            {availableMethods.map(([method, info]) => {
              const isSelected = state.selectedPayment === method
              const Icon = info.icon
              
              return (
                <motion.button
                  key={method}
                  onClick={() => handlePaymentClick(method as PaymentMethod)}
                  className={cn(
                    "bg-card hover:bg-accent/50 rounded-lg p-4 w-full min-w-[300px]",
                    "border border-border hover:border-accent transition-colors",
                    "flex items-start gap-4 text-left",
                    isSelected && "border-primary bg-primary/5"
                  )}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={cn(
                    "p-2 rounded-full",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                    <Icon size={20} stroke={1.5} />
                  </div>
                  
                  <div>
                    <p className="font-medium text-foreground">{info.label}</p>
                    <p className="text-sm text-muted-foreground mt-1">{info.description}</p>
                  </div>
                </motion.button>
              )
            })}
          </div>
        ) : (
          <div className="text-center">
            <p className="text-muted-foreground">No hay métodos de pago disponibles</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mt-4 w-full max-w-sm">
          <motion.button
            onClick={handleBack}
            whileHover={{ x: -1 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "px-5 py-2.5 rounded-lg",
              "bg-accent/50 hover:bg-accent",
              "text-accent-foreground font-medium",
              "flex justify-center items-center gap-2"
            )}
          >
            Anterior
          </motion.button>
          
          <motion.button
            onClick={handleNext}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            disabled={!state.selectedPayment || isProcessing}
            className={cn(
              "w-full max-w-sm",
              "px-5 py-2.5 rounded-lg",
              "bg-primary hover:bg-primary/90",
              "text-primary-foreground",
              "transition-colors",
              "flex items-center justify-center gap-2",
              "text-sm font-medium",
              (!state.selectedPayment || isProcessing) && "opacity-50 cursor-not-allowed"
            )}
          >
            {isProcessing ? (
              <>
                <IconLoader2 size={16} className="animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                Confirmar pago
                <IconChevronRight size={16} />
              </>
            )}
          </motion.button>
        </div>
      </div>
    </StepContainer>
  )
} 