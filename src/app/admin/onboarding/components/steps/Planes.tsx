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
import { useAuth } from '@/contexts/AuthContext'
import type { PlanType } from '@/types/supabase'
import { onboardingCompanyService } from "@/services/onboardingCompanyService"

interface PlanFeature {
  name: string
  included: boolean
}

interface Plan {
  name: string
  prices: {
    monthly: number
    quarterly: number
    annually: number
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
      quarterly: 0,
      annually: 0
    },
    description: "Perfecto para empezar a gestionar tu club",
    features: [
      { name: "Hasta tres sedes", included: true },
      { name: "Hasta 5 pistas", included: true },
      { name: "200 reservas mensuales", included: true },
      { name: "Actualizaciones de software continuas", included: false },
    ],
  },
  {
    name: "Pro",
    prices: {
      monthly: PAYPAL_CONFIG.SUBSCRIPTION_PLANS.PRO_MONTHLY.price,
      quarterly: PAYPAL_CONFIG.SUBSCRIPTION_PLANS.PRO_QUARTERLY.price,
      annually: PAYPAL_CONFIG.SUBSCRIPTION_PLANS.PRO_ANNUALLY.price
    },
    description: "Lo que necesitas para escalar tu negocio",
    isPopular: true,
    features: [
      { name: "Reservas ilimitadas", included: true },
      { name: "Sin límite de pistas", included: true },
      { name: "Nuevas actualizaciones como Torneo, Membresías, etc.", included: true },
      { name: "Soporte prioritario 24/7", included: true },
    ],
  },
]

export function Planes() {
  const { completeAndAdvance, formData, updateFormData } = useOnboarding()
  const { user, updateUserMetadata } = useAuth()
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'quarterly' | 'annually'>('quarterly')
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
      if (!user) {
        console.error('❌ No hay usuario autenticado')
        toast({
          variant: "destructive",
          title: "Error al actualizar el plan",
          description: "No se pudo identificar el usuario. Por favor, inicia sesión nuevamente."
        })
        return
      }

      // Primero intentamos obtener el empresa_id de los metadatos
      let empresaId = user.user_metadata?.empresa_id || user.metadata?.empresa_id

      // Si no está en los metadatos, intentamos obtenerlo de la base de datos
      if (!empresaId) {
        console.log('📍 Buscando empresa_id en la base de datos...')
        const { data: empresa, error } = await onboardingCompanyService.getOrCreateCompany(user.id)
        
        if (error) {
          console.error('❌ Error al obtener empresa:', error)
          throw new Error('No se pudo obtener la información de la empresa')
        }

        if (!empresa?.id) {
          throw new Error('No se encontró el ID de la empresa')
        }

        empresaId = empresa.id
        console.log('✅ empresa_id obtenido de la base de datos:', empresaId)
      }

      console.log('📍 Procesando suscripción con empresa_id:', empresaId)
      
      // Calculamos la fecha de expiración
      const expiresAt = new Date()
      switch (billingPeriod) {
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
        switch (billingPeriod) {
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

      // Crear la suscripción con todos los datos de PayPal
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
        await empresaService.updatePlanType(empresaId, 'PRO')
        
        // Actualizar metadatos del usuario
        await updateUserMetadata({
          plan_type: 'PRO',
          plan_updated_at: new Date().toISOString(),
          empresa_id: empresaId
        })

        console.log('✅ Plan y suscripción actualizados exitosamente')
        setShowSuccessPayment(true)
      }
    } catch (error: any) {
      console.error('❌ Error al actualizar la suscripción:', error)
      toast({
        variant: "destructive",
        title: "Error al actualizar el plan",
        description: error.message || "Hubo un problema al actualizar tu plan. Por favor, contacta con soporte."
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
    // Actualizar el formData con la información del plan seleccionado
    updateFormData({
      plan: selectedPlan,
      planPrice: {
        interval: billingPeriod,
        amount: (() => {
          switch (billingPeriod) {
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
      }
    })
    
    // Completar este paso y avanzar al siguiente (FinalStep)
    completeAndAdvance(3)
    
    // No necesitamos redirigir aquí, ya que completeAndAdvance manejará 
    // la navegación automáticamente después de generar el enlace
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
      <div className="space-y-8 max-w-[1200px] mx-auto">
        {/* Header Section */}
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-medium">
              Elige tu plan
            </h2>
            <p className="text-sm text-muted-foreground">
              Selecciona el plan que mejor se adapte a tus necesidades
            </p>
          </div>
          
          <div className="flex justify-center">
            <SelectOption 
              value={billingPeriod}
              onValueChange={setBillingPeriod}
            />
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[900px] mx-auto">
          {plans.map((plan) => (
            <Card 
              key={plan.name}
              className={cn(
                "flex flex-col h-full p-6",
                plan.isPopular && "ring-1 ring-primary",
                selectedPlan === plan.name && "ring-2 ring-primary",
                plan.name === "Pro" ? "order-first md:order-last" : "order-last md:order-first"
              )}
            >
              {/* Plan Header */}
              <div className="space-y-4 mb-8">
                <div>
                  <h3 className="text-lg font-medium">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {plan.description}
                  </p>
                </div>

                <div className="pt-4 border-t">
                  {plan.prices[billingPeriod] === 0 ? (
                    <div className="text-2xl font-medium">Gratis</div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-medium">
                        {plan.prices[billingPeriod]}€
                      </span>
                      <span className="text-sm text-muted-foreground">
                        /{billingPeriod === 'monthly' ? 'mes' : billingPeriod === 'quarterly' ? 'trimestre' : 'año'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Features */}
              <div className="flex-grow">
                <div className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <div 
                      key={index} 
                      className={cn(
                        "text-sm flex items-center justify-between",
                        feature.included 
                          ? "text-muted-foreground" 
                          : "text-muted-foreground/40"
                      )}
                    >
                      <span className={cn(
                        feature.included ? "" : "text-muted-foreground/40"
                      )}>{feature.name}</span>
                      {!feature.included && (
                        <span className="text-xs text-muted-foreground/60 ml-2">(Pro)</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-8">
                {plan.name === 'Free' ? (
                  <Button 
                    className="w-full"
                    variant={plan.isPopular ? "default" : "outline"}
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
            </Card>
          ))}
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Todos los precios incluyen IVA. Puedes cancelar o cambiar tu plan en cualquier momento.
        </p>
      </div>
    </motion.div>
  )
}