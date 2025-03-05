'use client'

import * as React from "react"
import { Check, Sparkles, X, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { useState } from "react"
import { motion } from "framer-motion"
import { SelectOption } from "@/components/ui/selectoption"
import { PayPalSubscriptionButton } from "@/components/ui/paypal-subscription-button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useOnboarding } from "../../context/OnboardingContext"
import { SuccessPayment } from "./SuccessPayment"
import { empresaService } from "@/services/empresaService"
import { useToast } from "@/components/ui/use-toast"
import { subscriptionService } from "@/services/subscriptionService"
import { PAYPAL_CONFIG } from '@/config/paypal'

interface PlanFeature {
  name: string
  included: boolean
}

interface Plan {
  name: string
  prices: {
    monthly: number
    quarterly: number
  }
  description: string
  extraInfo?: {
    title: string
    subtitle: string
    tooltip: string
  }
  features: PlanFeature[]
  isPopular?: boolean
  upcomingFeatures?: string[]
}

const plans: Plan[] = [
  {
    name: "Free",
    prices: {
      monthly: 0,
      quarterly: 0
    },
    description: "Perfecto para empezar a gestionar tu club",
    extraInfo: {
      title: "Plan Básico",
      subtitle: "Prueba gratuita sin límite de tiempo",
      tooltip: "Sin necesidad de tarjeta de crédito"
    },
    features: [
      { name: "1 sede", included: true },
      { name: "Hasta 5 pistas", included: true },
      { name: "20 reservas diarias", included: true },
      { name: "Panel de administración", included: true },
      { name: "Hasta 100 usuarios registrados", included: true },
      { name: "Soporte por email", included: true },
      { name: "Link de reserva", included: true },
      { name: "Personalización", included: false },
    ],
  },
  {
    name: "Pro",
    prices: {
      monthly: 24.70,
      quarterly: 69.69
    },
    description: "Todo lo que necesitas para escalar tu negocio",

    isPopular: true,
    features: [
      { name: "Pistas ilimitadas", included: true },
      { name: "Reservas ilimitadas", included: true },
      { name: "Panel de administración", included: true },
      { name: "Usuarios ilimitados", included: true },
      { name: "Soporte por email y teléfono", included: true },
      { name: "Link de reserva personalizado", included: true },
    ],
    upcomingFeatures: [
      "Nuevos estilos del formulario de reserva",
      "Vista de estadísticas avanzadas",
      "Módulo de torneos"
    ]
  },
]

export function Planes() {
  const { completeAndAdvance, formData } = useOnboarding()
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'quarterly'>('quarterly')
  const [showSuccessPayment, setShowSuccessPayment] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<'Free' | 'Pro'>()
  const { toast } = useToast()

  const handleSelectPlan = (planName: 'Free' | 'Pro') => {
    setSelectedPlan(planName)
    if (planName === 'Free') {
      completeAndAdvance(3)
    }
  }

  const handlePayPalSuccess = async (data: any) => {
    try {
      const userId = process.env.NEXT_PUBLIC_DEFAULT_USER_ID
      if (!userId) {
        console.error('❌ No se encontró el ID del usuario en las variables de entorno')
        toast({
          variant: "destructive",
          title: "Error al actualizar el plan",
          description: "No se pudo identificar el usuario. Por favor, contacta con soporte."
        })
        return
      }

      console.log('📍 Datos recibidos de PayPal:', data)
      
      const empresa = await empresaService.getEmpresaByUserId(userId)
      
      // Calculamos la fecha de expiración
      const expiresAt = new Date()
      if (billingPeriod === 'monthly') {
        expiresAt.setMonth(expiresAt.getMonth() + 1)
      } else {
        expiresAt.setMonth(expiresAt.getMonth() + 3)
      }

      const planType = billingPeriod === 'monthly' ? 'Pro Mensual' : 'Pro Trimestral'
      const paymentAmount = billingPeriod === 'monthly' 
        ? PAYPAL_CONFIG.SUBSCRIPTION_PLANS.PRO_MONTHLY.price
        : PAYPAL_CONFIG.SUBSCRIPTION_PLANS.PRO_QUARTERLY.price

      // Primero creamos la suscripción
      await subscriptionService.updatePayPalDetails({
        empresaId: empresa.id,
        subscriptionId: data.subscriptionID,
        subscriptionExpiresAt: expiresAt,
        paymentAmount
      })

      // Si la suscripción se creó exitosamente, actualizamos el plan
      await empresaService.updatePlanType(empresa.id, planType)
      
      console.log('✅ Plan y suscripción actualizados exitosamente')
      setShowSuccessPayment(true)
    } catch (error) {
      console.error('❌ Error al actualizar la suscripción:', error)
      toast({
        variant: "destructive",
        title: "Error al actualizar el plan",
        description: "Hubo un problema al actualizar tu plan. Por favor, contacta con soporte."
      })
    }
  }

  const handlePayPalError = (error: unknown) => {
    console.error('Error en la suscripción:', error)
    setSelectedPlan(undefined)
    toast({
      variant: "destructive",
      title: "Error en el pago",
      description: "Hubo un problema al procesar el pago. Por favor, intenta de nuevo."
    })
  }

  const handleSuccessComplete = () => {
    completeAndAdvance(3)
  }

  if (showSuccessPayment) {
    return <SuccessPayment onComplete={handleSuccessComplete} />
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 md:p-6"
    >
      <div className="space-y-6 max-w-[1400px] mx-auto">
        {/* Header Section */}
        <div className="text-center px-4 md:px-6 pb-4">
          <h2 className="text-2xl font-semibold tracking-tight mb-1.5">
            Elige tu plan
          </h2>
          <p className="text-sm text-muted-foreground/80 max-w-md mx-auto mb-4">
            Selecciona el plan que mejor se adapte a tus necesidades. ¡Comienza gratis!
          </p>
          
          <div className="flex justify-center mb-4">
            <SelectOption 
              value={billingPeriod}
              onValueChange={setBillingPeriod}
            />
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-w-[1200px] mx-auto px-2 md:px-0">
          {plans.map((plan) => (
            <Card 
              key={plan.name}
              className={cn(
                "relative bg-background p-4 md:p-6",
                plan.isPopular && "shadow-lg ring-1 ring-border/50",
                plan.prices.monthly === 0 && "border border-border",
                selectedPlan === plan.name && "ring-2 ring-primary",
                plan.name === "Pro" ? "order-first md:order-last" : "order-last md:order-first"
              )}
            >
              {plan.isPopular && billingPeriod === 'quarterly' && (
                <div className="absolute -top-3 left-4 md:left-6 inline-flex items-center rounded-full bg-black px-3 py-1 text-xs text-white">
                  <Sparkles className="mr-1 h-3 w-3" />
                  10% de descuento
                </div>
              )}

              {/* Plan Content */}
              <div className="flex flex-col h-full">
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{plan.name}</h3>
                    {plan.extraInfo && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>{plan.extraInfo.tooltip}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>

                  <div className="mt-2 flex items-baseline">
                    {plan.prices[billingPeriod] === 0 ? (
                      <span className="text-2xl font-bold">Gratis</span>
                    ) : (
                      <>
                        {billingPeriod === 'quarterly' && plan.prices.monthly > 0 && (
                          <span className="text-lg line-through text-muted-foreground/70 mr-2">
                            {(plan.prices.monthly * 3).toFixed(2)}€
                          </span>
                        )}
                        <span className="text-3xl font-bold">{plan.prices[billingPeriod]}€</span>
                        <span className="ml-1 text-sm text-muted-foreground">
                          /{billingPeriod === 'monthly' ? 'mes' : 'trimestre'}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                </div>

                <div className="mb-4">
                  {plan.name === 'Free' ? (
                    <Button 
                      className="w-full"
                      variant="outline"
                      onClick={() => handleSelectPlan('Free')}
                    >
                      Comenzar gratis
                    </Button>
                  ) : (
                    <PayPalSubscriptionButton
                      planType={billingPeriod}
                      onSuccess={handlePayPalSuccess}
                      onError={handlePayPalError}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      {feature.included ? (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-muted-foreground/50" />
                      )}
                      <span className={cn(
                        !feature.included && "text-muted-foreground"
                      )}>
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </div>

                {plan.upcomingFeatures && (
                  <div className="mt-4 pt-3 border-t border-border/50">
                    <p className="text-xs font-medium mb-2">
                      Próximas actualizaciones:
                    </p>
                    <ul className="space-y-1.5">
                      {plan.upcomingFeatures.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="h-1 w-1 rounded-full bg-gray-500"></div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        <p className="text-xs text-center text-muted-foreground px-4 md:px-0">
          Todos los precios incluyen IVA. Puedes cancelar o cambiar tu plan en cualquier momento.
          {" "}
          <span className="font-medium">
            El plan gratuito no requiere tarjeta de crédito.
          </span>
        </p>
      </div>
    </motion.div>
  )
}