'use client'

import { OnboardingProvider } from "./context/OnboardingContext"
import { OnboardingCompletedWarning } from "@/components/ui/onboarding-completed-warning"
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus"

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Usar el hook centralizado para el estado de onboarding
  const { data: onboardingStatus } = useOnboardingStatus()
  
  return (
    <OnboardingProvider empresaId={onboardingStatus?.id}>
      <OnboardingCompletedWarning show={onboardingStatus?.isCompleted || false} />
      {children}
    </OnboardingProvider>
  )
} 