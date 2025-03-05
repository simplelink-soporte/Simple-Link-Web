'use client'

import React, { useEffect, useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { MobileWarning } from '@/components/ui/mobile-warning'
import { StripeWarningToast } from '@/components/ui/stripe-warning-toast'
import { SuccessSubscriptionToast } from '@/components/ui/success-subscription-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useOrganization } from '@/contexts/OrganizationContext'
import { useQuery } from '@tanstack/react-query'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user } = useAuth()
  const { organization } = useOrganization()
  const [showSuccessToast, setShowSuccessToast] = useState(false)

  // Efecto para manejar el mensaje de éxito de la suscripción
  useEffect(() => {
    const handleSubscriptionSuccess = () => {
      setShowSuccessToast(true)
    }

    // Escuchar el evento personalizado
    window.addEventListener('subscription:success', handleSubscriptionSuccess)

    return () => {
      window.removeEventListener('subscription:success', handleSubscriptionSuccess)
    }
  }, [])

  // Consulta para verificar la conexión de Stripe
  const { data: stripeConnection } = useQuery({
    queryKey: ['stripeConnection', organization?.id],
    queryFn: async () => {
      try {
        if (!organization?.id) return null
        
        const response = await fetch(`/api/stripe/connection/${organization.id}`)
        if (!response.ok) return null
        
        const data = await response.json()
        return data?.id ? data : null
      } catch (error) {
        console.error('Error al verificar conexión de Stripe:', error)
        return null
      }
    },
    enabled: !!organization?.id
  })

  return (
    <div className="relative flex min-h-screen">
      <MobileWarning />
      <Sidebar />
      <main className="flex-1 lg:pl-[240px]">
        <div className="container p-8">{children}</div>
      </main>
      <StripeWarningToast show={!!organization && !stripeConnection} />
      <SuccessSubscriptionToast
        show={showSuccessToast}
        planName="Pro"
        onClose={() => setShowSuccessToast(false)}
      />
    </div>
  )
}
