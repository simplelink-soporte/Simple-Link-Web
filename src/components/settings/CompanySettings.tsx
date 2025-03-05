"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PlanInfo } from './PlanInfo'
import { useToast } from "@/components/ui/use-toast"
import { ExternalLink } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useBookingCount } from '@/hooks/useBookingCount'
import { useOrganization } from "@/contexts/OrganizationContext"

interface CompanyData {
  name: string
  email: string | null
  phone: string | null
  business_name: string | null
  country: string | null
}

const PAYPAL_SUBSCRIPTION_PORTAL = 'https://www.paypal.com/myaccount/autopay/connect/'

export function CompanySettings() {
  const { toast } = useToast()
  const { user } = useAuth()
  const { organization } = useOrganization()
  const today = new Date().toISOString().split('T')[0]
  
  // Reutilizamos el hook que ya tenemos para verificar el plan
  const { 
    isPro,
    isLoading: isLoadingPlan 
  } = useBookingCount({ 
    empresaId: user?.metadata?.empresa_id || '', 
    date: today 
  })

  const [formData, setFormData] = useState<CompanyData>({
    name: organization?.name || "",
    email: organization?.email || "",
    phone: organization?.phone || "",
    business_name: organization?.business_name || "",
    country: organization?.country || ""
  })

  // Actualizar formData cuando organization cambie
  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name,
        email: organization.email,
        phone: organization.phone,
        business_name: organization.business_name,
        country: organization.country
      })
    }
  }, [organization])

  const handleInputChange = (field: keyof CompanyData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = () => {
    console.log("Guardando cambios:", formData)
  }

  const handleManageSubscription = () => {
    window.open(PAYPAL_SUBSCRIPTION_PORTAL, '_blank')
    
    toast({
      title: "Portal de suscripción",
      description: "Se ha abierto el portal de PayPal en una nueva pestaña para gestionar tu suscripción",
      duration: 5000,
    })
  }

  return (
    <div className="space-y-8">
      {/* Sección de información del plan */}
      <div className="space-y-6">
        <PlanInfo />
      </div>

      {/* Sección de gestión de suscripción - Solo visible para planes PRO */}
      {isPro && !isLoadingPlan && (
        <div className="max-w-[800px] space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-medium">Gestión de Suscripción</h3>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <h4 className="text-sm font-medium text-gray-900">
                Gestionar suscripción
              </h4>
              <p className="text-sm text-gray-500">
                Puedes gestionar tu suscripción, incluyendo la cancelación, directamente desde tu cuenta de PayPal
              </p>
            </div>
            
            <Button
              variant="outline"
              onClick={handleManageSubscription}
              className="w-fit gap-2 text-gray-600 hover:text-gray-700"
            >
              Ir al portal de PayPal
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Información de la empresa */}
      <div className="space-y-4">
        <div className="p-0 mt-4">
          <p className="text-sm text-gray-500 mb-4 leading-relaxed">
            Información general de tu empresa y datos de contacto.
          </p>

          <div className="space-y-4 text-sm">
            <div className="space-y-1">
              <p className="text-gray-500">Nombre de la empresa</p>
              <p className="text-gray-600">{formData.name || "—"}</p>
            </div>

            <div className="space-y-1">
              <p className="text-gray-500">Nombre comercial</p>
              <p className="text-gray-600">{formData.business_name || "—"}</p>
            </div>

            <div className="space-y-1">
              <p className="text-gray-500">Correo electrónico</p>
              <p className="text-gray-600">{formData.email || "—"}</p>
            </div>

            <div className="space-y-1">
              <p className="text-gray-500">Teléfono</p>
              <p className="text-gray-600">{formData.phone || "—"}</p>
            </div>

            <div className="space-y-1">
              <p className="text-gray-500">País</p>
              <p className="text-gray-600">{formData.country || "—"}</p>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="mt-6">
          </div>
        </div>

        {/* Sección de ayuda */}
        <div className="border-t border-gray-100 pt-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm text-gray-900">
              ¿Necesitas ayuda?
            </p>
            <div className="text-sm text-gray-500">
              <p>Contáctenos en:</p>
              <div className="mt-1 space-y-1">
                <p className="text-gray-600">
                  <a 
                    href="mailto:soportesimplelink@gmail.com"
                    className="hover:text-gray-900 transition-colors"
                  >
                    soportesimplelink@gmail.com
                  </a>
                </p>
                <p className="text-gray-600">
                  <a 
                    href="https://www.simple-link.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-gray-900 transition-colors"
                  >
                    www.simple-link.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 