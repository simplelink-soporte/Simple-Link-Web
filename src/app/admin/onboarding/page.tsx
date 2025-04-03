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
    <div className="flex h-screen overflow-hidden">
      {/* Barra lateral - Solo visible en desktop */}
      <aside className="hidden md:block w-[35%] max-w-[600px] min-w-[400px] bg-black flex-shrink-0 relative">
        {/* Elemento diagonal decorativo */}
        <div className="absolute top-0 right-0 h-full w-full overflow-hidden">
          <div className="absolute top-0 right-0 h-full bg-white transform skew-x-6 origin-top-left" style={{
            width: '145px'
          }}></div>
        </div>
        
        <div className="relative h-full flex flex-col p-10 z-10">
          <div className="mb-12">
            <h2 className="text-white text-xl font-semibold mb-2">Configuración Inicial</h2>
            <p className="text-gray-300 text-sm">Complete los siguientes pasos para configurar su cuenta.</p>
          </div>
          
          <nav className="flex-1">
            <StepsList />
          </nav>

          <div className="mt-auto pt-6">
            <Button 
              variant="ghost" 
              className={cn(
                "text-sm text-gray-300",
                "hover:text-white hover:bg-gray-800",
                "transition-colors"
              )}
              onClick={() => setShowFAQ(true)}
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              Ayuda
            </Button>
          </div>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 h-full overflow-y-auto bg-white">
        <MobileHeader />
        <div className="flex items-center justify-start h-full p-4 pl-12">
          <OnboardingSteps />
        </div>
      </main>

      <FAQDialog 
        open={showFAQ} 
        onOpenChange={setShowFAQ} 
      />

      <OnboardingDialog />
    </div>
  )
} 