"use client"

import { AnimatePresence } from 'framer-motion'
import { useClassRegistration } from '../context/ClassRegistrationContext'
import { PackageSelectionStep } from './PackageSelectionStep'
import { ClassSelectionStep } from './ClassSelectionStep'
import { SessionStep } from './SessionStep'
import { SummaryStep } from './SummaryStep'
// PaymentStep eliminado del flujo
import { ConfirmationStep } from './ConfirmationStep'
import { NoCreditsClass } from './noCreditsClass'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import { cn } from '@/lib/utils'
import { useBookingCount } from '@/hooks/useBookingCount'

export function StepRenderer() {
  const { state, organization, isLoading: isLoadingContext } = useClassRegistration()

  // Obtener el estado de los créditos
  const { isLoading: isLoadingBookingCount } = useBookingCount({ 
    empresaId: organization?.id || '', 
    date: new Date().toISOString().split('T')[0],
    enabled: !!organization?.id
  })

  // Mostrar loading mientras se carga el contexto o los créditos
  if (isLoadingContext || isLoadingBookingCount || !organization) {
    return (
      <div className={cn(
        "w-full h-full",
        "flex flex-col items-center justify-center",
        "relative"
      )}>
        <LoadingSpinner />
        <p className="text-sm text-gray-500 mt-4">
          Cargando información...
        </p>
      </div>
    )
  }

  return (
    <div className={cn(
      "w-full h-full",
      "flex flex-col",
      "relative"
    )}>
      {/* Contenedor principal de los pasos */}
      <div className={cn(
        "w-full flex-1",
        "flex flex-col",
        "min-h-0" // Importante para el scroll
      )}>
        {/* Contenedor del contenido del paso */}
        <AnimatePresence mode="wait">
          {state.step === 'noCredits' && <NoCreditsClass />}
          {state.step === 'package' && <PackageSelectionStep organization={organization} />}
          {state.step === 'class' && <ClassSelectionStep />}
          {state.step === 'session' && <SessionStep />}
          {state.step === 'summary' && <SummaryStep />}
          {/* PaymentStep eliminado del flujo */}
          {state.step === 'confirmation' && <ConfirmationStep />}
        </AnimatePresence>
      </div>
    </div>
  )
} 