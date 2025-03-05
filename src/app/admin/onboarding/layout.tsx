'use client'

import { OnboardingProvider } from "./context/OnboardingContext"
import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { OnboardingCompletedWarning } from "@/components/ui/onboarding-completed-warning"

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = useAuth()
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState(false)

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        if (!user) return

        const { data: empresa, error } = await supabase
          .from('empresas')
          .select('onboarding')
          .eq('auth_user_id', user.id)
          .single()

        if (error) {
          console.error('Error al verificar estado del onboarding:', error)
          return
        }

        setIsOnboardingCompleted(empresa?.onboarding === 'Completo')
      } catch (error) {
        console.error('Error al verificar estado del onboarding:', error)
      }
    }

    checkOnboardingStatus()
  }, [user])

  return (
    <OnboardingProvider>
      <OnboardingCompletedWarning show={isOnboardingCompleted} />
      {children}
    </OnboardingProvider>
  )
} 