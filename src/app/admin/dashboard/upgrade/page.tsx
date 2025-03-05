"use client"

import { PaymentForm } from "./components/PaymentForm"
import { PlanFeatures } from "./components/PlanFeatures"
import { PayPalProvider } from "@/components/providers/paypal-provider"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

const PRO_FEATURES = [
  {
    title: "Reportes avanzados",
    description: "Análisis detallado del rendimiento de tu negocio"
  },
  {
    title: "Soporte prioritario 24/7",
    description: "Asistencia técnica inmediata cuando la necesites"
  },
  {
    title: "Múltiples sedes",
    description: "Gestiona todas tus ubicaciones desde un solo lugar"
  },
  {
    title: "API personalizada",
    description: "Integra tu sistema con otras aplicaciones"
  },
  {
    title: "Personalización avanzada",
    description: "Adapta la plataforma a tu marca"
  }
]

export default function UpgradePage() {
  const router = useRouter()

  const handlePaymentSubmit = (data: any) => {
    console.log('Payment data:', data)
    // Disparar el evento de éxito
    const event = new Event('subscription:success')
    window.dispatchEvent(event)
    // Redirigir después de un pequeño delay
    setTimeout(() => {
      router.back()
    }, 500)
  }

  const handlePaymentCancel = () => {
    router.back()
  }

  return (
    <PayPalProvider>
      <div className="relative flex h-full bg-white">
        {/* Contenido principal */}
        <div className="w-[500px] flex-shrink-0 p-6">
          <PlanFeatures
            planName="Pro"
            subtitle="Haz más con bloques, archivos e integraciones ilimitadas."
            features={PRO_FEATURES}
          />
        </div>
        <div className="flex-1 px-12 py-8 overflow-y-auto">
          <PaymentForm
            planName="Pro"
            onSubmit={handlePaymentSubmit}
            onCancel={handlePaymentCancel}
          />
        </div>
      </div>
    </PayPalProvider>
  )
} 