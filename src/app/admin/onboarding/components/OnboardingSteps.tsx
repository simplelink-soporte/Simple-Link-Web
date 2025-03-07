'use client'

import { useState } from "react"
import { useOnboarding } from "@/app/admin/onboarding/context/OnboardingContext"
import { CompanyStep } from "@/app/admin/onboarding/components/steps/CompanyStep"
import { SucursalSelection } from "@/app/admin/onboarding/components/steps/Branches/Sucursal-Selection"
import { BranchesStep } from "@/app/admin/onboarding/components/steps/Branches/BranchesStep"
import { IntegrationsStep } from "@/app/admin/onboarding/components/steps/IntegrationsStep"
import { FinalStep } from "@/app/admin/onboarding/components/steps/FinalStep"
import { motion, AnimatePresence } from "framer-motion"
import { Planes } from "@/app/admin/onboarding/components/steps/Planes"
import { PayPalProvider } from "@/components/providers/paypal-provider"

export function OnboardingSteps() {
  const { 
    currentStep, 
    completedSteps,
    setCurrentBranchId, 
    steps,
    setCurrentStep 
  } = useOnboarding()
  
  const [branchSubStep, setBranchSubStep] = useState<'selection' | 'details'>('selection')

  const isOnboardingComplete = completedSteps.every(step => step === true)

  const handleConfigureBranch = () => {
    if (!completedSteps[1]) {
      setBranchSubStep('details')
    }
  }

  const handleReturnToSelection = () => {
    if (!completedSteps[1]) {
      setBranchSubStep('selection')
      setCurrentBranchId(null)
    }
  }

  const renderBranchesStep = () => {
    if (branchSubStep === 'selection') {
      return (
        <SucursalSelection 
          onNext={() => {}}
          onConfigureBranch={handleConfigureBranch}
        />
      )
    }
    return (
      <BranchesStep 
        onReturnToSelection={handleReturnToSelection}
      />
    )
  }

  const renderStep = () => {
    if (isOnboardingComplete) {
      return <FinalStep />
    }

    switch (currentStep) {
      case 0:
        return <CompanyStep />
      case 1:
        return renderBranchesStep()
      case 2:
        return <IntegrationsStep />
      case 3:
        return (
          <PayPalProvider>
            <Planes />
          </PayPalProvider>
        )
      default:
        return <FinalStep />
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto md:pl-8">
      <AnimatePresence mode="wait">
        <motion.div
          key={isOnboardingComplete ? 'final' : currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-white rounded-xl md:p-6"
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>
    </div>
  )
} 