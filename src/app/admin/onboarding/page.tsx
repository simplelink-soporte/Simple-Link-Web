'use client'

import { useState } from 'react'
import { OnboardingSteps } from './components/OnboardingSteps'
import { StepsList } from './components/StepsList'
import { FAQDialog } from './components/FAQ'
import { OnboardingDialog } from './components/Dialogs/OnboardingDialog'
import { Button } from '@/components/ui/button'
import { HelpCircle, Check, Building2, MapPin, CreditCard, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOnboarding } from './context/OnboardingContext'
import { motion } from 'framer-motion'

function MobileHeader() {
  const { currentStep, steps, completedSteps } = useOnboarding()
  
  const isComplete = completedSteps.every(step => step === true)
  
  if (isComplete) {
    return null
  }
  
  return (
    <div className="px-4 py-8 bg-white md:hidden">
      <div className="flex flex-col items-center gap-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            type: "spring",
            stiffness: 200,
            damping: 15
          }}
          className="text-xl font-medium"
        >
        </motion.div>

        <div className="space-y-1 text-center">
          <p className="text-sm font-medium text-gray-500">
            Paso {currentStep + 1} de {steps.length}
          </p>
          <h2 className="text-xl font-semibold tracking-tight">
            {steps[currentStep]}
          </h2>
        </div>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  const [showFAQ, setShowFAQ] = useState(false)

  return (
    <div className="min-h-screen bg-white">
      {/* Barra lateral - Solo visible en desktop */}
      <div className="fixed top-0 bottom-0 w-96 bg-gray-50 p-8 border-r border-gray-200 hidden md:flex md:flex-col">
        <div className="mb-12">
          <h2 className="text-gray-900 text-xl font-semibold mb-2">Configuración Inicial</h2>
          <p className="text-gray-500 text-sm">Complete los siguientes pasos para configurar su cuenta.</p>
        </div>
        
        <nav className="flex-1">
          <StepsList />
        </nav>

        <div className="mt-auto pt-6">
          <Button 
            variant="ghost" 
            className={cn(
              "text-sm text-gray-500",
              "hover:text-gray-900 hover:bg-gray-100",
              "transition-colors"
            )}
            onClick={() => setShowFAQ(true)}
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            Ayuda
          </Button>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex flex-col min-h-screen md:pl-96">
        <MobileHeader />
        <main className="flex-1 flex items-center justify-center bg-white">
          <div className="w-full">
            <OnboardingSteps />
          </div>
        </main>
      </div>

      <FAQDialog 
        open={showFAQ} 
        onOpenChange={setShowFAQ} 
      />

      <OnboardingDialog />
    </div>
  )
} 