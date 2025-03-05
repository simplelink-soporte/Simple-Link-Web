"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { PayPalSubscriptionButton } from "@/components/ui/paypal-subscription-button"
import { PayPalProvider } from "@/components/providers/paypal-provider"
import { subscriptionService } from "@/services/subscriptionService"
import { empresaService } from "@/services/empresaService"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/components/ui/use-toast"
import { PAYPAL_CONFIG } from "@/config/paypal"
import Image from "next/image"

type BillingPeriod = "monthly" | "quarterly" | "annually"

interface BillingOption {
  id: BillingPeriod
  title: string
  price: number
  monthlyPrice?: number
  period: string
  savings?: string
}

interface PaymentFormProps {
  planName: string
  onSubmit: (data: any) => void
  onCancel: () => void
}

export function PaymentForm({
  planName,
  onSubmit,
  onCancel
}: PaymentFormProps) {
  const [selectedBilling, setSelectedBilling] = useState<BillingPeriod>("quarterly")
  const [isProcessing, setIsProcessing] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  const billingOptions: BillingOption[] = [
    {
      id: "monthly",
      title: "Pago mensual",
      price: PAYPAL_CONFIG.SUBSCRIPTION_PLANS.PRO_MONTHLY.price,
      period: "/mes"
    },
    {
      id: "quarterly",
      title: "Pago trimestral",
      price: PAYPAL_CONFIG.SUBSCRIPTION_PLANS.PRO_QUARTERLY.price,
      monthlyPrice: PAYPAL_CONFIG.SUBSCRIPTION_PLANS.PRO_QUARTERLY.price / 3,
      period: "/mes",
      savings: "Ahorra 10%"
    },
    {
      id: "annually",
      title: "Pago anual",
      price: PAYPAL_CONFIG.SUBSCRIPTION_PLANS.PRO_ANNUALLY.price,
      monthlyPrice: PAYPAL_CONFIG.SUBSCRIPTION_PLANS.PRO_ANNUALLY.price / 12,
      period: "/mes",
      savings: "Ahorra 35%"
    }
  ]

  const handlePayPalSuccess = async (data: any) => {
    try {
      setIsProcessing(true)

      if (!user?.metadata?.empresa_id) {
        throw new Error('No se encontró el ID de la empresa')
      }

      const empresaId = user.metadata.empresa_id

      // Calculamos la fecha de expiración basada en el período seleccionado
      const expiresAt = new Date()
      switch (selectedBilling) {
        case 'monthly':
          expiresAt.setMonth(expiresAt.getMonth() + 1)
          break
        case 'quarterly':
          expiresAt.setMonth(expiresAt.getMonth() + 3)
          break
        case 'annually':
          expiresAt.setFullYear(expiresAt.getFullYear() + 1)
          break
      }

      const paymentAmount = (() => {
        switch (selectedBilling) {
          case 'monthly':
            return PAYPAL_CONFIG.SUBSCRIPTION_PLANS.PRO_MONTHLY.price
          case 'quarterly':
            return PAYPAL_CONFIG.SUBSCRIPTION_PLANS.PRO_QUARTERLY.price
          case 'annually':
            return PAYPAL_CONFIG.SUBSCRIPTION_PLANS.PRO_ANNUALLY.price
          default:
            return PAYPAL_CONFIG.SUBSCRIPTION_PLANS.PRO_MONTHLY.price
        }
      })()

      // Usar el mismo servicio que en Planes.tsx
      const subscription = await subscriptionService.updatePayPalDetails({
        empresaId,
        subscriptionId: data.subscriptionID,
        subscriptionExpiresAt: expiresAt,
        paymentAmount,
        paypalData: {
          ...data,
          subscriptionID: data.subscriptionID,
          lastPaymentDate: new Date().toISOString(),
          nextPaymentDate: expiresAt.toISOString()
        }
      })

      if (subscription) {
        // Actualizar el plan de la empresa
        await empresaService.updatePlanType(empresaId, 'PRO' as const)
        
        // Llamar a onSubmit inmediatamente
        onSubmit(data)
      }
    } catch (error: any) {
      console.error('❌ Error al procesar la suscripción:', error)
      toast({
        variant: "destructive",
        title: "Error al procesar la suscripción",
        description: error.message || "Hubo un problema al procesar tu suscripción.",
        duration: 5000,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePayPalError = (error: unknown) => {
    setIsProcessing(false)
    console.error('Error en el pago:', error)
    toast({
      variant: "destructive",
      title: "Error en el pago",
      description: "Hubo un problema al procesar el pago. Por favor, intenta de nuevo.",
      duration: 5000,
    })
  }

  return (
    <PayPalProvider>
      <div className="w-full max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="space-y-6">
            <div className="flex items-start">
              <Image
                src="/images/Miroodles - Sticker 5.png"
                alt="Upgrade illustration"
                width={80}
                height={80}
                className="object-contain -ml-2"
              />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-medium text-zinc-900 font-mono tracking-tight">
                Actualizar a {planName}
              </h2>
              <p className="text-sm text-zinc-500 font-mono leading-relaxed">
                Con SimpleLink Pro podrás gestionar más reservas y clientes de una manera mucho más eficiente y moderna.
              </p>
            </div>
          </div>

          {/* Billing Options */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-zinc-700 font-mono tracking-tight">
              Opciones de facturación
            </h3>
            <div className="space-y-2">
              {billingOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSelectedBilling(option.id)}
                  className={cn(
                    "w-full px-4 py-3 rounded-lg border transition-all duration-200",
                    "hover:bg-zinc-50/80",
                    selectedBilling === option.id
                      ? "border-zinc-200 bg-zinc-50/80"
                      : "border-zinc-100"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1.5 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-zinc-800 font-mono">
                          {option.title}
                        </span>
                        {option.savings && (
                          <span className="text-[10px] font-medium text-zinc-600 font-mono bg-zinc-100/80 px-1.5 py-0.5 rounded-full">
                            {option.savings}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-medium text-zinc-900 font-mono">
                            €{(option.monthlyPrice || option.price).toFixed(2)}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {option.period}
                          </span>
                        </div>
                        {option.monthlyPrice && (
                          <p className="text-[10px] text-zinc-500 text-left font-mono">
                            Total: €{option.price.toFixed(2)}
                            {option.id === 'quarterly' ? ' / trimestre' : ' / año'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Mensaje de recomendación para plan anual */}
            {selectedBilling === "annually" && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "mt-2 p-3 rounded-lg",
                  "bg-gradient-to-br from-zinc-50/60 to-zinc-50/30",
                  "border border-zinc-100/30"
                )}
              >
                <div className="space-y-1">
                  <p className="text-xs font-medium text-zinc-800 font-mono">
                    Mejor elección
                  </p>
                  <p className="text-[10px] leading-relaxed text-zinc-700/75 font-mono">
                    El plan anual te ofrece el mejor valor, con un ahorro significativo del 35% y la tranquilidad de tener todas las funcionalidades PRO aseguradas por un año completo.
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          {/* PayPal Button Section */}
          <div className="space-y-4">
            {isProcessing && (
              <div className="text-center text-sm text-zinc-500">
                Procesando tu pago...
              </div>
            )}
            <div className="rounded-xl border-2 border-zinc-100 p-4">
              <PayPalSubscriptionButton
                planType={selectedBilling}
                onSuccess={handlePayPalSuccess}
                onError={handlePayPalError}
              />
            </div>
          </div>

          {/* Cancel Button */}
          <div className="space-y-4 pt-4 border-t border-zinc-200">
            <Button
              variant="outline"
              onClick={onCancel}
              className="w-full font-mono text-sm"
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <p className="text-xs text-zinc-500 text-center font-mono">
              Al continuar, aceptas nuestros términos y condiciones.
            </p>
          </div>
        </motion.div>
      </div>
    </PayPalProvider>
  )
} 